import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

// Relative Location: in the standalone server request.url carries the
// container's bind address (0.0.0.0:3000), not the public host.
const redirectTo = (path: string) =>
  new NextResponse(null, { status: 307, headers: { Location: path } });

// generateLink replaces the user's previous token, so simultaneous visitors
// would invalidate each other's links: issue and verify them one at a time
// (the admin runs as a single server process).
let queue: Promise<unknown> = Promise.resolve();
function oneAtATime<T>(task: () => Promise<T>): Promise<T> {
  const run = queue.then(task, task);
  queue = run.catch(() => undefined);
  return run;
}

/**
 * Public demo: signs the visitor in as the DEMO_USER_ID account without a
 * password (a magic link is generated and verified server-side, nothing is
 * e-mailed). proxy.ts sends every signed-out visitor here while DEMO_USER_ID
 * is set; unset it to close the demo and bring the login page back.
 */
export async function GET(request: NextRequest) {
  const demoUserId = process.env.DEMO_USER_ID;
  if (!demoUserId) return redirectTo('/login');

  // Same-origin paths only, so the demo can't be used as an open redirect.
  // Parse like a browser does (`/\host`, tabs, `//host` all change the host).
  const base = 'http://demo.invalid';
  const parsed = new URL(request.nextUrl.searchParams.get('next') ?? '/', base);
  const target = parsed.origin === base ? parsed.pathname + parsed.search : '/';

  // /login would bounce straight back here, so failures end with a page.
  const unavailable = () =>
    new NextResponse('Демо временно недоступно', {
      status: 503,
      headers: { 'Content-Type': 'text/plain; charset=utf-8', 'X-Robots-Tag': 'noindex, nofollow' },
    });

  const admin = createAdminClient();
  const { data: found, error: userError } = await admin.auth.admin.getUserById(demoUserId);
  const email = found?.user?.email;
  if (userError || !email) return unavailable();

  const response = redirectTo(target);
  response.headers.set('X-Robots-Tag', 'noindex, nofollow');
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );
  const signedIn = await oneAtATime(async () => {
    const { data: link, error: linkError } = await admin.auth.admin.generateLink({
      type: 'magiclink',
      email,
    });
    const hash = link?.properties?.hashed_token;
    if (linkError || !hash) return false;
    const { error: verifyError } = await supabase.auth.verifyOtp({
      token_hash: hash,
      type: 'magiclink',
    });
    return !verifyError;
  });
  return signedIn ? response : unavailable();
}

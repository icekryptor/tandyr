// Shared guard for Edge Functions that only cron / server code may call.
//
// The gateway's JWT check (VERIFY_JWT) also accepts the public anon key and
// any user session, so each function must require the service-role key itself.

export function requireServiceRole(req: Request): Response | null {
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const auth = req.headers.get('Authorization') ?? '';
  if (!serviceKey || auth !== `Bearer ${serviceKey}`) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  return null;
}

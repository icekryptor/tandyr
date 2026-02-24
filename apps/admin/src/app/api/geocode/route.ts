import { NextRequest, NextResponse } from 'next/server';

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org';

function formatAddress(item: any): string {
  const addr = item.address;
  if (!addr) return item.display_name;

  const parts: string[] = [];
  const seen = new Set<string>();

  const add = (value?: string) => {
    if (value && !seen.has(value)) {
      seen.add(value);
      parts.push(value);
    }
  };

  add(addr.road);
  add(addr.house_number);
  add(addr.suburb || addr.city_district);
  add(addr.city || addr.town || addr.village);
  add(addr.state !== (addr.city || addr.town || addr.village) ? addr.state : undefined);

  if (parts.length === 0) return item.display_name;

  add(addr.postcode);

  return parts.join(', ');
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');
  const lon = searchParams.get('lon');
  const lat = searchParams.get('lat');

  if (!query && (!lon || !lat)) {
    return NextResponse.json({ error: 'Missing q or lon/lat params' }, { status: 400 });
  }

  const headers = { 'User-Agent': 'TandyrAdmin/1.0' };

  try {
    if (query) {
      const params = new URLSearchParams({
        q: query,
        format: 'json',
        addressdetails: '1',
        limit: '5',
        countrycodes: 'ru',
        'accept-language': 'ru',
      });

      const res = await fetch(`${NOMINATIM_URL}/search?${params}`, { headers });
      if (!res.ok) {
        return NextResponse.json({ error: `Nominatim error: ${res.status}` }, { status: res.status });
      }

      const data = await res.json();
      const results = data.map((item: any) => ({
        address: formatAddress(item),
        lon: parseFloat(item.lon),
        lat: parseFloat(item.lat),
      }));

      return NextResponse.json({ results });
    } else {
      const params = new URLSearchParams({
        lat: lat!,
        lon: lon!,
        format: 'json',
        addressdetails: '1',
        'accept-language': 'ru',
        zoom: '18',
      });

      const res = await fetch(`${NOMINATIM_URL}/reverse?${params}`, { headers });
      if (!res.ok) {
        return NextResponse.json({ error: `Nominatim error: ${res.status}` }, { status: res.status });
      }

      const data = await res.json();
      const results = data.display_name
        ? [{ address: formatAddress(data), lon: parseFloat(data.lon), lat: parseFloat(data.lat) }]
        : [];

      return NextResponse.json({ results });
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

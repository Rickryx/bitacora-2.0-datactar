export const config = {
  runtime: 'edge',
};

export default async function handler(req: Request) {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  try {
    const body = await req.json();
    const { log, nexus_endpoint, api_key, test } = body;

    if (!nexus_endpoint || !api_key) {
      return new Response(
        JSON.stringify({ error: 'Missing nexus_endpoint or api_key' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Supabase Edge Functions require the Supabase anon key in gateway headers.
    // The dc_live_ key goes to the bridge function in the body for internal validation.
    const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || '';

    const payload = test
      ? { test: true, api_key }
      : { event: 'log.created', source: 'bitacora', api_key, data: log };

    const nexusResponse = await fetch(nexus_endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseAnonKey,          // Supabase gateway auth
        'Authorization': `Bearer ${api_key}`, // dc_live_ key as bearer for bridge
        'x-api-key': api_key,               // alternative header bridge may check
      },
      body: JSON.stringify(payload),
    });

    if (!nexusResponse.ok) {
      const errorText = await nexusResponse.text();
      return new Response(
        JSON.stringify({ error: `Nexus responded with ${nexusResponse.status}: ${errorText}` }),
        { status: nexusResponse.status, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const result = await nexusResponse.json().catch(() => ({}));
    return new Response(JSON.stringify({ success: true, ...result }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

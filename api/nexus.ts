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

    // The Nexus bridge (Datactar's Supabase project) validates dc_live_ internally.
    // We send it in all common auth header formats so the bridge can pick whichever it expects.
    const payload = test
      ? { test: true, api_key }
      : { event: 'log.created', source: 'bitacora', api_key, data: log };

    const nexusResponse = await fetch(nexus_endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${api_key}`,
        'x-api-key': api_key,
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

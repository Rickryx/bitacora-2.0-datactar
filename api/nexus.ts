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

    // Bridge validates the source via x-api-key header (SHA-256 hashed, stored in sources table).
    // api_key does NOT go in the body — only in the header.
    const headers = {
      'Content-Type': 'application/json',
      'x-api-key': api_key,
    };

    // Ping: validate key only. Log: full event payload.
    const payload = test
      ? { event: 'ping' }
      : {
          event: 'log.created',
          data: {
            id: log.id,
            type: (log.type || 'security_log').toLowerCase(),
            title: log.title || 'Evento de Bitácora',
            subtitle: log.subtitle || '',
            description: log.description || '',
            details: log.details || {},
            media_urls: log.media_urls || [],
          },
        };

    const nexusResponse = await fetch(nexus_endpoint, {
      method: 'POST',
      headers,
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

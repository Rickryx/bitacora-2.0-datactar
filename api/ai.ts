
import { OpenAI } from 'openai';

export const config = {
    runtime: 'edge',
};

export default async function handler(req: Request) {
    if (req.method !== 'POST') {
        return new Response('Method Not Allowed', { status: 405 });
    }

    try {
        const apiKey = process.env.OPENAI_API_KEY;

        if (!apiKey) {
            console.error('CRITICAL: OPENAI_API_KEY is missing in environment');
            return new Response(JSON.stringify({
                error: 'Falta la configuración de OpenAI (API KEY). Por favor, agrégala en las variables de entorno de Vercel.'
            }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        const openai = new OpenAI({ apiKey });
        const { transcription, mode, context } = await req.json();

        if (mode === 'query') {
            const completion = await openai.chat.completions.create({
                messages: [
                    {
                        role: "system",
                        content: `Eres Bitácora AI, asistente para administradores de seguridad. 
            Responde preguntas basadas en los siguientes registros. 
            Sé conciso, directo y profesional.
            
            REGISTROS:
            ${JSON.stringify(context)}`
                    },
                    { role: "user", content: transcription }
                ],
                model: "gpt-4o-mini",
            });
            return new Response(JSON.stringify({ content: completion.choices[0].message.content }), {
                headers: { 'Content-Type': 'application/json' },
            });
        }

        // Default: Process transcription into structured data
        const completion = await openai.chat.completions.create({
            messages: [
                {
                    role: "system",
                    content: `You are an AI assistant for a security guard logbook app. 
          Analyze the text and extract JSON.
          Identify type: "VISITOR", "INCIDENT", "ROUND", "DELIVERY", "SERVICE", "PROVEEDOR", or "INFO".
          
          Descriptions:
          - VISITOR: Persona que viene a visitar una unidad.
          - INCIDENT: Fallas, robos, incendios, problemas de seguridad.
          - ROUND: Recorrido de vigilancia.
          - DELIVERY: Paquetes, comida, correspondencia.
          - SERVICE: Mantenimiento técnico, reparaciones programadas.
          - PROVEEDOR: Suministro de insumos recurrentes (agua, gas, papelería, etc).
          - INFO: Notas informativas, llamadas de administración, mensajes para otros turnos, avisos generales.

          JSON format:
          {
            "type": "VISITOR" | "INCIDENT" | "ROUND" | "DELIVERY" | "SERVICE" | "PROVEEDOR" | "INFO",
            "summary": "Short title",
            "details": {
              "name": "Name",
              "visitorType": "VISITOR" | "SERVICE" | "DELIVERY" | "PROVEEDOR" | "INFO" | "OTHER",
              "idNumber": "ID",
              "destination": "Unit",
              "plate": "Plate",
              "description": "Full description"
            }
          }`
                },
                { role: "user", content: transcription }
            ],
            model: "gpt-4o-mini",
            response_format: { type: "json_object" }
        });

        return new Response(completion.choices[0].message.content, {
            headers: { 'Content-Type': 'application/json' },
        });

    } catch (error: any) {
        console.error('AI Proxy Error:', error);
        return new Response(JSON.stringify({ error: error.message || 'Error interno en el proxy de IA' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
}

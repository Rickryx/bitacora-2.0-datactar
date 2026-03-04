/**
 * AI Service Proxy
 * Direct communication with OpenAI is disabled for security (Production).
 * All requests are routed through a secure server-side proxy (/api/ai).
 */

export const processVoiceTranscription = async (transcription: string) => {
    try {
        const response = await fetch('/api/ai', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ transcription })
        });

        if (!response.ok) {
            let errorMessage = 'Error en el Proxy de IA';
            try {
                const contentType = response.headers.get('content-type');
                if (contentType && contentType.includes('application/json')) {
                    const errorData = await response.json();
                    errorMessage = errorData.error || errorMessage;
                } else {
                    const textError = await response.text();
                    if (textError) {
                        try {
                            const parsed = JSON.parse(textError);
                            errorMessage = parsed.error || textError;
                        } catch (e) {
                            errorMessage = textError;
                        }
                    }
                    console.error('Non-JSON error response:', textError);
                }
            } catch (e) {
                console.error('Error parsing AI error response:', e);
            }
            throw new Error(errorMessage);
        }

        const text = await response.text();
        if (!text) {
            throw new Error('La respuesta de la IA está vacía');
        }

        try {
            return JSON.parse(text);
        } catch (e) {
            console.error('Error parsing AI success response:', text);
            throw new Error('Error al procesar la respuesta exitosa de la IA');
        }
    } catch (error: any) {
        console.error("Error processing with AI Proxy:", error);
        alert("Error de IA: " + error.message);
        return null;
    }
};

export const queryLogsWithAI = async (query: string, logData: any[]) => {
    try {
        const logsReduced = logData.map(l => ({
            fecha: l.created_at,
            tipo: l.type,
            titulo: l.title,
            descripcion: l.description,
            entidad: l.entities?.name,
            estado: l.status,
            critico: l.critical_level
        })).slice(0, 50);

        const response = await fetch('/api/ai', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                transcription: query,
                mode: 'query',
                context: logsReduced
            })
        });

        if (!response.ok) {
            let errorMessage = 'Lo siento, hubo un error consultando los datos mediante el proxy de seguridad.';
            try {
                const contentType = response.headers.get('content-type');
                if (contentType && contentType.includes('application/json')) {
                    const errorData = await response.json();
                    errorMessage = errorData.error || errorMessage;
                }
            } catch (e) { }
            throw new Error(errorMessage);
        }

        const data = await response.json();
        return data.content;
    } catch (error: any) {
        console.error("Error in queryLogsWithAI (Proxy):", error);
        return error.message || "Lo siento, hubo un error consultando los datos.";
    }
};

// Dies ist die Hauptfunktion, die Vercel bei jeder Anfrage an /api/chat ausführt.
// KORRIGIERT: Wir verwenden jetzt "export default", um die Funktion für ES-Module bereitzustellen.
export default async function handler(req, res) {
    // --- CORS-Header setzen ---
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // --- Preflight-Anfrage (OPTIONS) behandeln ---
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // Wir erlauben nur POST-Anfragen für die eigentliche Logik.
    if (req.method !== 'POST') {
        return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
    }

    try {
        // --- 1. API-Schlüssel und Daten vorbereiten ---
        const { GEMINI_API_KEY } = process.env;

        if (!GEMINI_API_KEY) {
            console.error("Fehler: GEMINI_API_KEY ist nicht in den Vercel Environment Variables gesetzt.");
            return res.status(500).json({ error: "API-Schlüssel ist auf dem Server nicht konfiguriert." });
        }

        // Wir nehmen nur den Chat-Verlauf vom Frontend.
        const { history } = req.body;

        if (!history) {
            return res.status(400).json({ error: "Fehlerhafte Anfrage: 'history' fehlt." });
        }

        // --- 2. Anfrage an die Google API senden ---
        const googleApiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;

        // FINALE KORREKTUR: Wir erstellen die Anweisung für die KI direkt hier auf dem Server,
        // um jegliche Formatierungsfehler vom Frontend auszuschließen.
        const serverSystemInstruction = {
            parts: [{
                text: "Du bist eine immer hilfsbereite 'Lernprozessbegleitung'. Deine Aufgabe ist es, komplexe Themen einfach und verständlich zusammenzufassen. Du begleitest das Lernen der dir anvertrauten Menschen und ebnest ihnen den Weg. Deine Antworten sind klar, ermutigend und auf den Punkt gebracht. Verwende einfache Sprache und gelegentlich Analogien, um das Verständnis zu erleichtern."
            }]
        };

        const requestPayload = {
            contents: history,
            systemInstruction: serverSystemInstruction, // Wir verwenden die neue, saubere Anweisung.
            generationConfig: {
                temperature: 0.7,
                maxOutputTokens: 1000,
            }
        };

        const googleResponse = await fetch(googleApiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestPayload)
        });

        // --- 3. Antwort verarbeiten ---
        if (!googleResponse.ok) {
            const errorText = await googleResponse.text();
            console.error(`Google API Fehler: ${googleResponse.status}`, errorText);
            throw new Error(`Fehler von Google API: ${errorText}`);
        }

        const data = await googleResponse.json();
        
        return res.status(200).json(data);

    } catch (error) {
        console.error("Ein interner Fehler ist im /api/chat Endpunkt aufgetreten:", error.message);
        return res.status(500).json({ error: error.message });
    }
};



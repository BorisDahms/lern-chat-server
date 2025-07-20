/ Dies ist die Hauptfunktion, die Vercel bei jeder Anfrage an /api/chat ausführt.
module.exports = async (req, res) => {
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

        const { history, systemInstruction } = req.body;

        if (!history || !systemInstruction) {
            return res.status(400).json({ error: "Fehlerhafte Anfrage: 'history' oder 'systemInstruction' fehlt." });
        }

        // --- 2. Anfrage an die Google API senden ---
        const googleApiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;

        // KORRIGIERT: Wir kombinieren die Systemanweisung und den Verlauf in einem einzigen Array.
        // Dies ist eine alternative, oft robustere Methode, die Daten zu senden.
        const requestPayload = {
            contents: [systemInstruction, ...history],
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

        // VERBESSERTE FEHLERBEHANDLUNG: Wenn die Google API einen Fehler meldet...
        if (!googleResponse.ok) {
            // ...versuchen wir, die Fehlerdetails als JSON zu lesen, um mehr Infos zu bekommen.
            const errorData = await googleResponse.json();
            console.error(`Google API Fehler: ${googleResponse.status}`, JSON.stringify(errorData, null, 2));
            const errorMessage = errorData?.error?.message || "Unbekannter Fehler von der Google API.";
            // Wir werfen einen neuen Fehler mit der Nachricht von Google.
            throw new Error(errorMessage);
        }

        const data = await googleResponse.json();
        
        // Die erfolgreiche Antwort von Google wird an das Frontend zurückgesendet.
        return res.status(200).json(data);

    } catch (error) {
        // Dieser Block fängt jetzt auch die detaillierten Fehler von der Google API ab.
        console.error("Ein interner Fehler ist im /api/chat Endpunkt aufgetreten:", error.message);
        return res.status(500).json({ error: error.message });
    }
};


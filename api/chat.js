// Wir importieren node-fetch nicht mehr, da es in der Vercel-Umgebung bereits vorhanden ist.

// Dies ist die Hauptfunktion, die Vercel bei jeder Anfrage an /api/chat ausführt.
module.exports = async (req, res) => {
    // --- CORS-Header setzen ---
    // Diese Header erlauben Anfragen von jeder Webseite. Das verhindert Cross-Origin-Fehler.
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*'); // Erlaubt alle Domains
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // --- Preflight-Anfrage (OPTIONS) behandeln ---
    // Der Browser sendet diese Anfrage vor der eigentlichen POST-Anfrage, um die CORS-Regeln zu prüfen.
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // Wir erlauben nur POST-Anfragen für die eigentliche Logik.
    if (req.method !== 'POST') {
        return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
    }

    try {
        // --- 1. API-Schlüssel und Daten vorbereiten ---
        
        // Der API-Schlüssel wird direkt aus den Vercel Environment Variables geladen.
        const { GEMINI_API_KEY } = process.env;

        // Prüfen, ob der API-Schlüssel in Vercel hinterlegt wurde.
        if (!GEMINI_API_KEY) {
            console.error("Fehler: GEMINI_API_KEY ist nicht in den Vercel Environment Variables gesetzt.");
            // Sende eine klare Fehlermeldung, die im Frontend angezeigt werden kann.
            return res.status(500).json({ error: "API-Schlüssel ist auf dem Server nicht konfiguriert." });
        }

        // Die Daten (Verlauf und Systemanweisung) aus dem Frontend auslesen.
        const { history, systemInstruction } = req.body;

        // Prüfen, ob die notwendigen Daten vom Frontend gesendet wurden.
        if (!history || !systemInstruction) {
            return res.status(400).json({ error: "Fehlerhafte Anfrage: 'history' oder 'systemInstruction' fehlt." });
        }

        // --- 2. Anfrage an die Google API senden ---

        // Die URL für die Google API.
        const googleApiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;

        // Die Daten, die an Google gesendet werden.
        const requestPayload = {
            contents: [systemInstruction, ...history],
            generationConfig: {
                temperature: 0.7,
                maxOutputTokens: 1000,
            }
        };

        const googleResponse = await fetch(googleApiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestPayload)
        });

        // --- 3. Antwort verarbeiten ---

        // Fehlerbehandlung, falls die Google API ein Problem meldet.
        if (!googleResponse.ok) {
            const errorDetails = await googleResponse.text();
            console.error(`Google API Fehler: ${googleResponse.status}`, errorDetails);
            throw new Error(`Anfrage an die Google API ist fehlgeschlagen.`);
        }

        const data = await googleResponse.json();
        
        // Die erfolgreiche Antwort von Google wird an das Frontend zurückgesendet.
        return res.status(200).json(data);

    } catch (error) {
        // Falls irgendetwas anderes schiefgeht, loggen wir den Fehler auf dem Server...
        console.error("Ein interner Fehler ist im /api/chat Endpunkt aufgetreten:", error);
        // ...und senden eine allgemeine Fehlermeldung an den Nutzer.
        return res.status(500).json({ error: error.message });
    }
};
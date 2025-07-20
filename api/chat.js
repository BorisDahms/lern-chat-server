// Wir importieren node-fetch, um Anfragen an die Google API zu senden.
const fetch = require('node-fetch');

// Dies ist die Hauptfunktion, die Vercel bei jeder Anfrage an /api/chat ausführt.
// Sie ersetzt die gesamte express-Server-Logik (app.listen, etc.).
module.exports = async (req, res) => {
    // Wir erlauben nur POST-Anfragen, da wir Daten empfangen.
    if (req.method !== 'POST') {
        res.setHeader('Allow', ['POST']);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }

    try {
        // Der API-Schlüssel wird direkt aus den Vercel Environment Variables geladen.
        // Der Name muss exakt "GEMINI_API_KEY" lauten.
        const API_KEY = process.env.GEMINI_API_KEY;

        // Prüfen, ob der API-Schlüssel in Vercel hinterlegt wurde.
        if (!API_KEY) {
            console.error("Fehler: GEMINI_API_KEY ist nicht in den Vercel Environment Variables gesetzt.");
            return res.status(500).json({ error: "API-Schlüssel ist auf dem Server nicht konfiguriert." });
        }

        // Die Daten (Verlauf und Systemanweisung) aus dem Frontend auslesen.
        // req.body wird von Vercel automatisch bereitgestellt.
        const { history, systemInstruction } = req.body;

        // Die Anfrage an die Google Gemini API. Diese Logik bleibt gleich.
        const googleResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: [systemInstruction, ...history],
                generationConfig: {
                    temperature: 0.7,
                    maxOutputTokens: 1000,
                }
            })
        });

        // Fehlerbehandlung, falls die Google API ein Problem meldet.
        if (!googleResponse.ok) {
            // Wir versuchen, die genaue Fehlermeldung von Google zu lesen.
            const errorDetails = await googleResponse.text();
            console.error(`Google API Fehler: ${googleResponse.status}`, errorDetails);
            throw new Error(`Anfrage an die Google API ist fehlgeschlagen mit Status ${googleResponse.status}.`);
        }

        const data = await googleResponse.json();
        
        // Die erfolgreiche Antwort von Google wird an das Frontend zurückgesendet.
        res.status(200).json(data);

    } catch (error) {
        // Falls irgendetwas anderes schiefgeht, loggen wir den Fehler auf dem Server...
        console.error("Ein interner Fehler ist im /api/chat Endpunkt aufgetreten:", error);
        // ...und senden eine allgemeine Fehlermeldung an den Nutzer.
        res.status(500).json({ error: error.message });
    }
};

// KORREKTUR: "import" anstelle von "require" verwenden, passend zur package.json
import { GoogleGenerativeAI } from "@google/generative-ai";

// Initialisieren das SDK mit dem API-Schlüssel aus den Umgebungsvariablen
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export default async function handler(req, res) {
    // --- CORS-Header setzen (unverändert) ---
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    if (req.method !== 'POST') {
        return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
    }

    try {
        // --- 1. Modell und Systemanweisung definieren ---
        const systemInstruction = "Du bist eine immer hilfsbereite 'Lernprozessbegleitung'. Deine Aufgabe ist es, komplexe Themen einfach und verständlich zusammenzufassen. Du begleitest das Lernen der dir anvertrauten Menschen und ebnest ihnen den Weg. Deine Antworten sind klar, ermutigend und auf den Punkt gebracht. Verwende einfache Sprache und gelegentlich Analogien, um das Verständnis zu erleichtern.";
        
        const model = genAI.getGenerativeModel({ 
            model: "gemini-pro",
            systemInstruction: systemInstruction,
        });

        // --- 2. Chat-Verlauf vorbereiten ---
        const { history } = req.body;
        if (!history) {
            return res.status(400).json({ error: "Fehlerhafte Anfrage: 'history' fehlt." });
        }
        
        const lastUserMessage = history.pop();
        const userPrompt = lastUserMessage.parts[0].text;
        const chatHistory = history;

        // --- 3. Chat starten und Nachricht senden ---
        const chat = model.startChat({
            history: chatHistory,
            generationConfig: {
                maxOutputTokens: 1000,
                temperature: 0.7,
            },
        });

        const result = await chat.sendMessage(userPrompt);
        const response = await result.response;
        const text = response.text();

        // --- 4. Antwort zurücksenden (im Google-API-Format, damit das Frontend sie versteht) ---
        const frontendResponse = {
            candidates: [{
                content: {
                    parts: [{ text: text }],
                    role: "model"
                }
            }]
        };
        
        return res.status(200).json(frontendResponse);

    } catch (error) {
        console.error("Ein Fehler ist im /api/chat Endpunkt aufgetreten:", error);
        return res.status(500).json({ error: error.message || "Ein interner Fehler ist aufgetreten." });
    }
};

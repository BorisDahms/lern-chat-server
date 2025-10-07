import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export default async function handler(req, res) {
    // CORS Headers
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
        const model = genAI.getGenerativeModel({ 
            // Das korrekte, aktuelle Modell
            model: "gemini-2-pro",
            systemInstruction: "Du bist eine immer hilfsbereite 'Lernprozessbegleitung'. Deine Aufgabe ist es, komplexe Themen einfach und verständlich zusammenzufassen. Du begleitest das Lernen der dir anvertrauten Menschen und ebnest ihnen den Weg. Deine Antworten sind klar, ermutigend und auf den Punkt gebracht. Verwende einfache Sprache und gelegentlich Analogien, um das Verständnis zu erleichtern.",
        });

        const { history } = req.body;
        if (!history) {
            return res.status(400).json({ error: "Fehlerhafte Anfrage: 'history' fehlt." });
        }
        
        const lastUserMessage = history.pop();
        const userPrompt = lastUserMessage.parts[0].text;
        const chatHistory = history;

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
        console.error("Google AI API Fehler:", error);
        return res.status(500).json({ error: error.message || "Ein interner Fehler ist aufgetreten." });
    }
};

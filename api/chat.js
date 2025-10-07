// Import der offiziellen Google Cloud Vertex AI Bibliothek
import { VertexAI } from '@google-cloud/aiplatform';

export default async function handler(req, res) {
    // --- CORS-Header setzen ---
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
        // --- 1. Vertex AI Client initialisieren ---
        // Die Bibliothek verwendet die Umgebungsvariablen automatisch
        const vertex_ai = new VertexAI({
            project: process.env.GOOGLE_PROJECT_ID,
            location: 'us-central1',
        });

        // --- 2. Modell und Konfiguration definieren ---
        const generativeModel = vertex_ai.getGenerativeModel({
            model: 'gemini-2.5-pro', // Das Modell, das Sie im Model Garden gefunden haben
            systemInstruction: {
                parts: [{ text: "Du bist eine immer hilfsbereite 'Lernprozessbegleitung'. Deine Aufgabe ist es, komplexe Themen einfach und verständlich zusammenzufassen. Du begleitest das Lernen der dir anvertrauten Menschen und ebnest ihnen den Weg. Deine Antworten sind klar, ermutigend und auf den Punkt gebracht. Verwende einfache Sprache und gelegentlich Analogien, um das Verständnis zu erleichtern." }]
            }
        });

        // --- 3. Anfrage senden ---
        const { history } = req.body;
        if (!history) {
            return res.status(400).json({ error: "Fehlerhafte Anfrage: 'history' fehlt." });
        }
        
        const result = await generativeModel.generateContent({
            contents: history
        });

        // --- 4. Antwort extrahieren und korrekt formatieren ---
        // Wir stellen sicher, dass eine Antwort vorhanden ist, bevor wir darauf zugreifen
        if (!result.response || !result.response.candidates || result.response.candidates.length === 0) {
            throw new Error("Keine gültige Antwort von der API erhalten.");
        }
        const responseText = result.response.candidates[0].content.parts[0].text;
        
        const frontendResponse = {
            candidates: [{
                content: {
                    parts: [{ text: responseText }],
                    role: "model"
                }
            }]
        };

        return res.status(200).json(frontendResponse);

    } catch (error) {
        console.error("Vertex AI API Fehler:", error);
        return res.status(500).json({ error: error.message || "Ein interner Fehler ist aufgetreten." });
    }
};

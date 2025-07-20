import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Konfiguration laden
dotenv.config();

const app = express();
const port = 3000;

// Middleware
app.use(cors()); // Erlaubt Anfragen von anderen Adressen (deiner Webseite)
app.use(express.json()); // Ermöglicht das Lesen von JSON im Request-Body

// Google AI initialisieren
const genAI = new GoogleGenerativeAI(process.env.API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

// Die Route, die der Chatbot auf der Webseite ansprechen wird
app.post('/chat', async (req, res) => {
  try {
    const userInput = req.body.message;

    if (!userInput) {
      return res.status(400).json({ error: 'Nachricht fehlt.' });
    }

    const result = await model.generateContent(userInput);
    const response = await result.response;
    const text = response.text();

    res.json({ reply: text });

  } catch (error) {
    console.error("Fehler bei der AI-Anfrage:", error);
    res.status(500).json({ error: 'Fehler bei der Kommunikation mit der KI.' });
  }
});

app.listen(port, () => {
  console.log(`Server läuft auf http://localhost:${port}`);
});
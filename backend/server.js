import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";
import fetch, { Headers, Request } from 'node-fetch';

// Global fetch, Headers ve Request ayarları
globalThis.fetch = fetch;
globalThis.Headers = Headers;
globalThis.Request = Request;

dotenv.config();

const app = express();
app.use(cors({
    origin: '*',
    methods: 'GET,POST',
    allowedHeaders: 'Content-Type,Authorization'
}));

app.use(express.json());

const apiKey = process.env.GEMINI_API_KEY;
let model;
const defaultSystemInstruction = "Merhaba! Samimi ve doğal bir şekilde sohbet et. Karşı tarafı rahatlatan, dostça ve arkadaşça bir dil kullan. Yalnızlık hissini hafifletmek için empati kur ve samimi bir sohbet atmosferi yarat. Nazik ol ve karşı tarafı dinleyerek konuş. Cevapların sıcak ve çok içten olsun.";

const initializeModel = (systemInstruction) => {
    model = new GoogleGenerativeAI(apiKey).getGenerativeModel({
        model: "gemini-1.5-flash",
        systemInstruction: systemInstruction || defaultSystemInstruction,
    });
};

// İlk başlatma
initializeModel();

const generationConfig = {
    temperature: 1,
    topP: 0.95,
    topK: 64,
    maxOutputTokens: 8192,
    responseMimeType: "text/plain",
};

const safetySettings = [
    {
        category: HarmCategory.HARM_CATEGORY_HARASSMENT,
        threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
    },
    {
        category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
        threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
    },
    {
        category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
        threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
    },
    {
        category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
        threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
    },
];

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

const getResultText = (result) => {
    try {
        if (result && result.response && result.response.candidates && result.response.candidates.length > 0) {
            const parts = result.response.candidates[0].content.parts;
            if (Array.isArray(parts)) {
                return parts.map(part => part.text).join(' ');
            }
        }
    } catch (error) {
        console.error('Error processing response parts:', error);
    }
    return null;
};

const generateSummary = async (content) => {
    // Bu fonksiyonu özetleme API'sine bağlayarak özelleştirin
    return `Özet: ${content}`;
};

const translateText = async (text, targetLanguage) => {
    // Bu fonksiyonu çeviri API'sine bağlayarak özelleştirin
    return `Çevrilen metin (${targetLanguage}): ${text}`;
};

app.post('/gemini', async (req, res) => {
    try {
        const { history, prompt } = req.body;

        let systemInstruction = defaultSystemInstruction;

        if (prompt.startsWith('!özet')) {
            const content = prompt.replace('!özet ', '');
            const summary = await generateSummary(content);
            return res.json({ text: summary });
        } else if (prompt.startsWith('!çevir')) {
            const parts = prompt.split(' ');
            const text = parts.slice(1, parts.length - 1).join(' ');
            const targetLanguage = parts[parts.length - 1];
            const translation = await translateText(text, targetLanguage);
            return res.json({ text: translation });
        } else if (prompt.startsWith('!soru')) {
            systemInstruction = "Kullanıcının sorduğu soruya kısa ve net bir yanıt ver.";
        } else if (prompt.startsWith('!duygu')) {
            systemInstruction = "Girilen metnin duygusal tonunu analiz et.";
        } else if (prompt.startsWith('!component')) {
            systemInstruction = "Belirtilen framework ve TailwindCSS kullanarak bir bileşen oluştur.";
        } else if (prompt.startsWith('!hesapla')) {
            systemInstruction = "Girilen matematiksel ifadeyi hesapla.";
        } else if (prompt.startsWith('!wiki')) {
            systemInstruction = "Belirtilen terim hakkında Wikipedia'dan bilgi getir.";
        } else if (prompt.startsWith('!film')) {
            systemInstruction = "Belirtilen film hakkında bilgi ver ve önerilerde bulun.";
        } else if (prompt.startsWith('!şaka')) {
            systemInstruction = "Rastgele bir şaka yap.";
        }

        initializeModel(systemInstruction);

        const formattedHistory = history
            .filter(entry => entry && entry.text)
            .map(entry => ({
                role: entry.role,
                parts: [{ text: entry.text }]
            }));

        const chatSession = model.startChat({
            generationConfig,
            safetySettings,
            history: formattedHistory,
        });

        await delay(500);

        const result = await chatSession.sendMessage(prompt);
        const text = getResultText(result);

        if (text) {
            res.json({ text });
        } else {
            res.status(500).json({ error: 'No valid response found' });
        }
    } catch (error) {
        console.error('Error occurred:', error);
        res.status(500).json({ error: 'An error occurred. Please try again later.' });
    }
});

app.listen(5000, () => {
    console.log("Server is running on port 5000");
});

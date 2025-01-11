import {GoogleGenerativeAI, HarmCategory, HarmBlockThreshold} from '@google/generative-ai'
import config from '../config/index.js';
import {convertOpenAIToGeminiPrompt} from "../utils/index.js";

const apiKey = config.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(apiKey);
const safetySettings = [
    {
        category: HarmCategory.HARM_CATEGORY_HARASSMENT,
        threshold: HarmBlockThreshold.BLOCK_NONE,
    },
    {
        category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
        threshold: HarmBlockThreshold.BLOCK_NONE,
    },
    {
        category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
        threshold: HarmBlockThreshold.BLOCK_NONE,
    },
    {
        category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
        threshold: HarmBlockThreshold.BLOCK_NONE,
    },
];

const generationConfig = {
    temperature: 1,
    topP: 0.95,
    topK: 40,
    maxOutputTokens: 8192,
    responseMimeType: "text/plain",
};


export async function createGeminiChatCompletion(prompt) {
    const {history, systemInstruction, message} = convertOpenAIToGeminiPrompt(prompt);

    const model = genAI.getGenerativeModel({
        model: config.GEMINI_COMPLETION_MODEL,
        safetySettings: safetySettings,
        systemInstruction:systemInstruction
    });

    const chatSession = model.startChat({
        generationConfig,
        history: history,
    });

    const result = await chatSession.sendMessage(message);
    console.log(JSON.stringify(result, null, 2));
    return result
}

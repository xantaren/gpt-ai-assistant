import {GoogleGenerativeAI, HarmCategory} from '@google/generative-ai'
import config from '../config/index.js';
import {convertOpenAIToGeminiPrompt} from "../utils/index.js";

const apiKey = config.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(apiKey);
const safetySettings = [
    {
        category: HarmCategory.HARM_CATEGORY_HARASSMENT,
        threshold: "OFF",
    },
    {
        category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
        threshold: "OFF",
    },
    {
        category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
        threshold: "OFF",
    },
    {
        category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
        threshold: "OFF",
    },
];

const generationConfig = {
    temperature: 0.9,
    topP: 0.7,
    topK: 80,
    maxOutputTokens: 8192,
    responseMimeType: "text/plain",
};


export async function createGeminiChatCompletion(prompt) {
    let {history, systemInstruction, message} = convertOpenAIToGeminiPrompt(prompt);

    const model = genAI.getGenerativeModel({
        model: config.GEMINI_COMPLETION_MODEL,
        safetySettings: safetySettings,
        systemInstruction:systemInstruction,
    });

    if (config.ENABLE_GEMINI_GROUNDING_SEARCH) {
        model.tools = [
            {googleSearch: {}}
        ];
    }

    const keywords = ['查一下'];
    const containsGroundingSearchKeyword = message.some(obj =>
        'text' in obj && keywords.some(keyword => obj.text.includes(keyword))
    );
    if (config.ENABLE_GEMINI_GROUNDING_SEARCH && containsGroundingSearchKeyword) {
        console.info('History truncated for grounding search')
        history = history.slice(Math.max(history.length - 4, 0))
    }

    const chatSession = model.startChat({
        generationConfig,
        history: history,
    });

    const result = await chatSession.sendMessage(message);
    console.log(JSON.stringify(result, null, 2));
    return result
}

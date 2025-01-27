import {GoogleGenerativeAI, HarmCategory} from '@google/generative-ai'
import config from '../config/index.js';
import {convertOpenAIToGeminiPrompt} from "../utils/index.js";
import Logger from '../utils/logger.js';
import fs from "fs";
import mime from "mime";

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
        Logger.info('History truncated for grounding search');
        history = history.slice(Math.max(history.length - 4, 0))
    }

    const chatSession = model.startChat({
        generationConfig,
        history: history,
    });

    const result = await chatSession.sendMessage(message);
    Logger.json('Gemini response', result);
    return result;
}

export async function transcribeAudio(audioFilePath) {
    const model = genAI.getGenerativeModel({
        model: config.GEMINI_COMPLETION_MODEL,
        safetySettings: safetySettings,
        systemInstruction:'You are an Chinese and English audio transcriber',
    });

    try {
        // Read the audio file
        const audioBytes = fs.readFileSync(audioFilePath);
        const mimeType = mime.lookup(audioFilePath) || 'application/octet-stream'; // Get MIME type

        const audioData = {
            inlineData: {
                data: audioBytes.toString('base64'),
                mimeType: mimeType,
            },
        };

        const prompt = 'Generate a transcript of the speech in this audio. Chinese should only be Traditional Chinese' +
            'Output only the transcribed text, nothing else.';

        const result = await model.generateContent([prompt, audioData]);
        const response = result.response;

        if (response.candidates && response.candidates.length > 0) {
            const transcript = response.candidates[0].content.parts[0].text;
            Logger.info('Transcript:', transcript);
            return transcript;
        } else {
            Logger.error('No transcript found in the response.');
            Logger.error('Full response:', response);
            return null;
        }
    } catch (error) {
        Logger.error('Error transcribing audio:', error);
        return null;
    }
}

import {GoogleGenerativeAI, HarmCategory} from '@google/generative-ai'
import config from '../config/index.js';
import {convertOpenAIToGeminiPrompt} from "../utils/index.js";
import Logger from '../utils/logger.js';
import fs from "fs";
import mime from "mime";

// Error types specific to Gemini API
const GEMINI_ERROR_TYPES = {
  RATE_LIMIT: 'RATE_LIMIT',
  INVALID_REQUEST: 'INVALID_REQUEST',
  MODEL_LOAD_ERROR: 'MODEL_LOAD_ERROR',
  INTERNAL_ERROR: 'INTERNAL_ERROR'
};

// Retry configuration
const RETRY_CONFIG = {
  maxRetries: 3,
  initialDelayMs: 1000,
  maxDelayMs: 5000
};

// Rate limiting configuration
const RATE_LIMIT = {
  requestsPerMinute: 60,
  requestQueue: [],
  lastRequestTime: 0
};

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


async function handleGeminiError(error) {
  const errorMessage = error.message || 'Unknown error';
  
  if (errorMessage.includes('quota exceeded') || errorMessage.includes('rate limit')) {
    return { type: GEMINI_ERROR_TYPES.RATE_LIMIT, message: 'Rate limit exceeded' };
  } else if (errorMessage.includes('invalid request')) {
    return { type: GEMINI_ERROR_TYPES.INVALID_REQUEST, message: 'Invalid request parameters' };
  } else if (errorMessage.includes('model loading failed')) {
    return { type: GEMINI_ERROR_TYPES.MODEL_LOAD_ERROR, message: 'Failed to load model' };
  }
  
  return { type: GEMINI_ERROR_TYPES.INTERNAL_ERROR, message: errorMessage };
}

async function executeWithRetry(operation) {
  let lastError;
  let delay = RETRY_CONFIG.initialDelayMs;

  for (let attempt = 0; attempt < RETRY_CONFIG.maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      const errorInfo = await handleGeminiError(error);
      
      if (errorInfo.type === GEMINI_ERROR_TYPES.INVALID_REQUEST) {
        throw error; // Don't retry invalid requests
      }
      
      if (attempt < RETRY_CONFIG.maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, delay));
        delay = Math.min(delay * 2, RETRY_CONFIG.maxDelayMs);
      }
    }
  }
  
  throw lastError;
}

async function checkRateLimit() {
  const now = Date.now();
  const timeWindow = 60000; // 1 minute in milliseconds
  
  // Clean up old requests from queue
  RATE_LIMIT.requestQueue = RATE_LIMIT.requestQueue.filter(
    time => now - time < timeWindow
  );
  
  if (RATE_LIMIT.requestQueue.length >= RATE_LIMIT.requestsPerMinute) {
    const oldestRequest = RATE_LIMIT.requestQueue[0];
    const waitTime = timeWindow - (now - oldestRequest);
    await new Promise(resolve => setTimeout(resolve, waitTime));
  }
  
  RATE_LIMIT.requestQueue.push(now);
}

export async function createGeminiChatCompletion(prompt) {
    let {history, systemInstruction, message} = convertOpenAIToGeminiPrompt(prompt);

    const model = genAI.getGenerativeModel({
        model: config.GEMINI_COMPLETION_MODEL,
        safetySettings: safetySettings,
        systemInstruction:systemInstruction,
    });

    if (config.ENABLE_GEMINI_GROUNDING_SEARCH) {
        model.tools = [
            {
                googleSearch: {
                    description: 'Use this whenever the user\'s query includes search related keyword'
                    + ' or the user\'s query would require fact checking such as time, weather, or recent events, '
                    + ' whether or not the chat history contains such information.'
                }
            }
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

    await checkRateLimit();
    const result = await executeWithRetry(async () => {
      const response = await chatSession.sendMessage(message);
      return response;
    });
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

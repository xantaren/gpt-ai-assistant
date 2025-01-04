import axios from 'axios';
import FormData from 'form-data';
import config from '../config/index.js';
import { handleFulfilled, handleRejected, handleRequest } from './utils/index.js';

export const ROLE_SYSTEM = 'system';
export const ROLE_AI = 'assistant';
export const ROLE_HUMAN = 'user';

export const FINISH_REASON_STOP = 'stop';
export const FINISH_REASON_LENGTH = 'length';

export const IMAGE_SIZE_256 = '256x256';
export const IMAGE_SIZE_512 = '512x512';
export const IMAGE_SIZE_1024 = '1024x1024';

export const MODEL_WHISPER_1 = 'whisper-1';
export const MODEL_DALL_E_3 = 'dall-e-3';

const client = createClient();
let lazyOpenAiClient = null; // create lazily

const hasImage = ({ messages }) => (
  messages.some(({ content }) => (
    Array.isArray(content) && content.some((item) => item.image_url)
  ))
);

const createChatCompletion = ({
  messages,
  temperature = config.OPENAI_COMPLETION_TEMPERATURE,
  maxTokens = config.OPENAI_COMPLETION_MAX_TOKENS,
  frequencyPenalty = config.OPENAI_COMPLETION_FREQUENCY_PENALTY,
  presencePenalty = config.OPENAI_COMPLETION_PRESENCE_PENALTY,
}) => {
  const body = {
    model: hasImage({ messages })
        ? config.OPENAI_VISION_MODEL
        : config.ENABLE_GEMINI_COMPLETION
            ? config.GEMINI_COMPLETION_MODEL
            : config.OPENAI_COMPLETION_MODEL,
    messages,
    temperature,
    max_tokens: maxTokens,
  };

  // Only OpenAI supports these, not Gemini
  if (!config.ENABLE_GEMINI_COMPLETION) {
    body.frequency_penalty = frequencyPenalty;
    body.presence_penalty = presencePenalty;
  }

  return client.post(config.ENABLE_GEMINI_COMPLETION ? '/chat/completions' : '/v1/chat/completions', body);
};

const createImage = ({
  model = config.OPENAI_IMAGE_GENERATION_MODEL,
  prompt,
  size = config.OPENAI_IMAGE_GENERATION_SIZE,
  quality = config.OPENAI_IMAGE_GENERATION_QUALITY,
  n = 1,
}) => {
  // set image size to 1024 when using the DALL-E 3 model and the requested size is 256 or 512.
  if (model === MODEL_DALL_E_3 && [IMAGE_SIZE_256, IMAGE_SIZE_512].includes(size)) {
    size = IMAGE_SIZE_1024;
  }

  return getOpenAiClient().post('/v1/images/generations', {
    model,
    prompt,
    size,
    quality,
    n,
  });
};

const createAudioTranscriptions = ({
  buffer,
  file,
  model = MODEL_WHISPER_1,
}) => {
  const formData = new FormData();
  formData.append('file', buffer, file);
  formData.append('model', model);
  return getOpenAiClient().post('/v1/audio/transcriptions', formData.getBuffer(), {
    headers: formData.getHeaders(),
  });
};

// TODO: refactor as strategies or factories for multi model support
function createClient(forceUseOpenAi = false) {
  // Don't use Gemini for unsupported features like audio transcribe and image generation
  const shouldUseGemini = config.ENABLE_GEMINI_COMPLETION && !forceUseOpenAi;
  if (config.APP_DEBUG) console.info(`Is Gemini client [${shouldUseGemini}]`);

  const client = axios.create({
    baseURL: shouldUseGemini ? config.GEMINI_BASE_URL : config.OPENAI_BASE_URL,
    timeout: config.OPENAI_TIMEOUT,
    headers: {
      'Accept-Encoding': 'gzip, deflate, compress',
    },
  });

  client.interceptors.request.use((c) => {
    c.headers.Authorization = `Bearer ${shouldUseGemini ? config.GEMINI_API_KEY : config.OPENAI_API_KEY}`;
    return handleRequest(c);
  });

  client.interceptors.response.use(handleFulfilled, (err) => {
    if (err.response?.data?.error?.message) {
      err.message = err.response.data.error.message;
    }
    return handleRejected(err);
  });

  return client;
}

const getOpenAiClient = () => {
  if (!lazyOpenAiClient) {
    if (config.ENABLE_GEMINI_COMPLETION) {
      lazyOpenAiClient = createClient(true); // Only create new OpenAI client if we've enabled Gemini
    } else {
      lazyOpenAiClient = client; // Otherwise reuse existing OpenAI client
    }
  }
  return lazyOpenAiClient;
};

export {
  createAudioTranscriptions,
  createChatCompletion,
  createImage,
};

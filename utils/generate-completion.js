import config from '../config/index.js';
import { MOCK_TEXT_OK } from '../constants/mock.js';
import { createChatCompletion, FINISH_REASON_STOP } from '../services/openai.js';
import {convertGeminiToOpenAICompletionResponse} from "./prompt-converter.js";

class Completion {
  text;

  finishReason;

  constructor({
    text,
    finishReason,
  }) {
    this.text = text;
    this.finishReason = finishReason;
  }

  get isFinishReasonStop() {
    return this.finishReason === FINISH_REASON_STOP;
  }
}

/**
 * @param {Object} param
 * @param {Prompt} param.prompt
 * @returns {Promise<Completion>}
 */
const generateCompletion = async ({
  prompt,
}) => {
  if (config.APP_ENV !== 'production') return new Completion({ text: MOCK_TEXT_OK });
  const response = await createChatCompletion({ messages: prompt.messages });
  let data;
  let isResultGrounded;
  if (config.ENABLE_GEMINI_COMPLETION) {
    data = convertGeminiToOpenAICompletionResponse(response.response);
    if (Object.keys(response?.response?.candidates[0]?.groundingMetadata).length) {
      isResultGrounded = true;
    }
  } else {
    data = response.data;
  }
  const [choice] = data.choices;
  return new Completion({
    text: choice.message.content.trim() + (isResultGrounded ? '✅' : ''),
    finishReason: choice.finish_reason || choice.finishReason,
  });
};

export default generateCompletion;

import { encode } from 'gpt-3-encoder';
import config from '../../config/index.js';
import { t } from '../../locales/index.js';
import { ROLE_AI, ROLE_HUMAN, ROLE_SYSTEM } from '../../services/openai.js';
import {addMark, getCurrentTime} from '../../utils/index.js';
import Message from './message.js';

const MAX_MESSAGES = config.APP_MAX_PROMPT_MESSAGES + 3;
const MAX_TOKENS = config.APP_MAX_PROMPT_TOKENS;

export const ROLE_SYSTEM_CONTENT =
    `${t('__COMPLETION_DEFAULT_TIME_PROMPT')}\n${config.APP_INIT_PROMPT || t('__COMPLETION_DEFAULT_SYSTEM_PROMPT')}`

class Prompt {

  messages = [];

  constructor(setEmpty = false) {
    if (setEmpty) return;
    this
      .write(ROLE_SYSTEM, ROLE_SYSTEM_CONTENT)
      .write(ROLE_HUMAN, `${t('__COMPLETION_DEFAULT_HUMAN_PROMPT')(config.HUMAN_NAME)}${config.HUMAN_INIT_PROMPT}`)
      .write(ROLE_AI, `${t('__COMPLETION_DEFAULT_AI_PROMPT')(config.BOT_NAME)}${config.BOT_INIT_PROMPT}`);
  }

  /**
   * @returns {Message}
   */
  get lastMessage() {
    return this.messages.length > 0 ? this.messages[this.messages.length - 1] : null;
  }

  get tokenCount() {
    const encoded = encode(this.toString());
    return encoded.length;
  }

  erase() {
    if (this.messages.length > 0) {
      this.messages.pop();
    }
    return this;
  }

  /**
   * @param {string} role
   * @param {string} content
   */
  write(role, content = '') {
    if (config.APP_DEBUG) {
      let msg = `Message length: [${this.messages.length}]. Token count: [${this.tokenCount}].`;
      console.info(msg);
    }
    if (this.messages.length >= MAX_MESSAGES || this.tokenCount >= MAX_TOKENS) {
      this.messages.splice(3, 1);
    }
    for (const message of this.messages) {
      if (message.role === ROLE_SYSTEM) {
        message.content = replaceWithCurrentDate(message.content);
        break; // Assuming there would only be one system prompt
      }
    }
    this.messages.push(new Message({ role, content: addMark(content) }));
    return this;
  }

  /**
   * @param {string} role
   * @param {string} content
   */
  writeImage(role, content = '') {
    const imageContent = [
      {
        type: 'text',
        text: t('__COMPLETION_VISION'),
      },
      {
        type: 'image_url',
        image_url: {
          url: content,
        },
      },
    ];
    this.messages.push(new Message({ role, content: imageContent }));
    return this;
  }

  /**
   * @param {string} content
   */
  patch(content) {
    this.messages[this.messages.length - 1].content += content;
  }

  toString() {
    return this.messages.map((sentence) => sentence.toString()).join('');
  }
}

export function replaceWithCurrentDate(inputString) {
  return inputString.replace(/\[\[.*?\]\]/, `[[${getCurrentTime()}]]`);
}

export default Prompt;

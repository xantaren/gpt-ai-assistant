import Prompt, {replaceWithCurrentDate, ROLE_SYSTEM_CONTENT} from './prompt.js';
import Message from "./message.js";
import {getPrompts, setPrompts} from "../repository/index.js";
import config from "../../config/index.js";
import {truncate} from "../../utils/index.js";
import { ROLE_HUMAN, ROLE_SYSTEM } from "../../services/openai.js";
import {t} from "../../locales/index.js";

const prompts = new Map();
const MESSAGES_TO_LOG = 100;
const MESSAGES_KEPT_ON_HEAD_AND_TAIL = Math.floor(MESSAGES_TO_LOG / 2);

/**
 * @param {string} userId
 * @returns {Prompt}
 */
const getPrompt = (userId) => {
  const retrievedPromptsObj = getPrompts(userId);
  const storedPrompt = retrievedPromptsObj[userId];
  if (storedPrompt) {
    // Initialize a completely empty prompt to prevent stored and default prompts from overlapping or duplicating each other
    const newPrompt = new Prompt(true);
    let messageLength = storedPrompt.messages?.length;
    if (config.APP_DEBUG) console.info(`Set prompt from storage to memory for [${truncate(userId, 8)}], length: [${messageLength}]`);
    let count = 1;
    storedPrompt.messages.forEach((message) => {
      const newMessage = new Message(message);
      handleSystemPrompt(newMessage, newPrompt, count, messageLength);
      handleExpiredImagePrompt(newMessage, newPrompt, count, messageLength);
      newPrompt.messages.push(newMessage);
      count++;
    })
    return newPrompt;
  }
  // A new prompt with default system, human and assistant message
  return new Prompt();
}

function handleSystemPrompt(newMessage, newPrompt, count, messageLength) {
  if (newMessage.role === ROLE_SYSTEM && config.ALLOW_SYSTEM_PROMPT_OVERWRITE) {
    newMessage.content = replaceWithCurrentDate(ROLE_SYSTEM_CONTENT);
  }
  if (config.APP_DEBUG
      && (count < MESSAGES_KEPT_ON_HEAD_AND_TAIL || count > messageLength - MESSAGES_KEPT_ON_HEAD_AND_TAIL)) {
    if (config.APP_DEBUG) console.info(`${count} of ${messageLength}: [${newMessage.role}] ${newMessage.content}`);
  }
}

function handleExpiredImagePrompt(newMessage, newPrompt, count, messageLength) {
  const numberOfTrailingMessages = messageLength - count;
  if (newMessage.role === ROLE_HUMAN
      && numberOfTrailingMessages >= config.MAX_TRAILING_MESSAGES
      && Array.isArray(newMessage.content)
      && newMessage.content.some(item => item.type === "image_url")) {
    newMessage.content = newMessage.content = t('__IMAGE_MESSAGE_PLACEHOLDER');
    if (config.APP_DEBUG) console.info(`Image Base64 omitted due to trailing Messages exceeding [${config.MAX_TRAILING_MESSAGES}]`);
  }
}

/**
 * @param {string} userId
 * @param {Prompt} prompt
 */
const setPrompt = async (userId, prompt) => {
  const newPrompt = {};
  newPrompt[userId] = prompt;
  await setPrompts(userId, newPrompt).then(() => {
    if (config.APP_DEBUG) console.info(`Successfully set prompt for [${truncate(userId, 8)}], length: [${prompt.messages?.length}]`);
  });
};

/**
 * @param {string} userId
 */
const removePrompt = async (userId) => {
  const newPrompt = {};
  newPrompt[userId] = new Prompt();
  await setPrompts(userId, newPrompt).then(() => {
    if (config.APP_DEBUG) console.info(`Successfully reset prompt for [${truncate(userId, 8)}]`);
  });
};

export {
  Prompt,
  getPrompt,
  setPrompt,
  removePrompt,
};

export default prompts;

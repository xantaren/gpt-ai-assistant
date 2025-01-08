import Prompt, {replaceWithCurrentDate, ROLE_SYSTEM_CONTENT} from './prompt.js';
import Message from "./message.js";
import {getPrompts, setPrompts} from "../repository/index.js";
import config from "../../config/index.js";
import {truncate} from "../../utils/index.js";
import {ROLE_SYSTEM} from "../../services/openai.js";

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
      if (newMessage.role === ROLE_SYSTEM && config.ALLOW_SYSTEM_PROMPT_OVERWRITE) {
        newMessage.content = replaceWithCurrentDate(ROLE_SYSTEM_CONTENT);
      }
      newPrompt.messages.push(newMessage);
      if (config.APP_DEBUG
          && (count < MESSAGES_KEPT_ON_HEAD_AND_TAIL || count > messageLength - MESSAGES_KEPT_ON_HEAD_AND_TAIL)) {
        console.info(`${count} of ${messageLength}: [${newMessage.role}] ${newMessage.content}`);
      }
      count++;
    })
    return newPrompt;
  }
  // A new prompt with default system, human and assistant message
  return new Prompt();
}

/**
 * @param {string} userId
 * @param {Prompt} prompt
 */
const setPrompt = (userId, prompt) => {
  (async () => {
    const newPrompt = {};
    newPrompt[userId] = prompt;
    await setPrompts(userId, newPrompt).then(() => {
      if (config.APP_DEBUG) console.info(`Successfully set prompt for [${truncate(userId, 8)}], length: [${prompt.messages?.length}]`);
    });
  })()
};

/**
 * @param {string} userId
 */
const removePrompt = (userId) => {
  (async () => {
    const newPrompt = {};
    newPrompt[userId] = new Prompt();
    await setPrompts(userId, newPrompt).then(() => {
      if (config.APP_DEBUG) console.info(`Successfully reset prompt for [${truncate(userId, 8)}]`);
    });
  })()
};

export {
  Prompt,
  getPrompt,
  setPrompt,
  removePrompt,
};

export default prompts;

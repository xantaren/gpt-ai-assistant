import Prompt from './prompt.js';
import Message from "./message.js";
import {getPrompts, setPrompts} from "../repository/index.js";
import config from "../../config/index.js";
import {ROLE_HUMAN} from "../../services/openai.js";

const prompts = new Map();

/**
 * @param {string} userId
 * @returns {Prompt}
 */
const getPrompt = (userId) => {
  if (prompts.get(userId)) {
    if (config.APP_DEBUG) {
      console.info(`Retrieved prompt for [${userId}] from memory, length: [${prompts.get(userId).messages?.length}]`);
    }
    return prompts.get(userId);
  }
  // Set to empty prompt to prevent duplicating messages created on object initialization
  prompts.set(userId, new Prompt(true));
  const retrievedPromptsObj = getPrompts();
  if (config.APP_DEBUG) console.info(`retrievedPromptsObj: ${JSON.stringify(retrievedPromptsObj)}`);
  const prompt = retrievedPromptsObj[userId];
  if (prompt) {
    if (config.APP_DEBUG) console.info(`Set prompt from storage to memory for [${userId}], length: [${prompt.messages?.length}]`);
    prompt.messages.forEach((message) => {
      const newMessage = new Message(message);
      prompts.get(userId).messages.push(newMessage);
    })
  } else {
    // No existing prompt, create prompt with default messages
    prompts.set(userId, new Prompt());
  }
  return prompts.get(userId);
}

/**
 * @param {string} userId
 * @param {Prompt} prompt
 */
const setPrompt = (userId, prompt) => {
  (async () => {
    const newPrompt = {};
    newPrompt[userId] = prompt;
    await setPrompts(newPrompt).then(() => {
      prompts.set(userId, prompt);
      if (config.APP_DEBUG) console.info(`Successfully set prompt for [${userId}], length: [${prompt.messages?.length}]`);
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
    await setPrompts(newPrompt).then(() => {
      prompts.delete(userId);
      if (config.APP_DEBUG) console.info(`Successfully deleted prompt for [${userId}]`);
    });
  })()
};

const printPrompts = () => {
  if (Array.from(prompts.keys()).length < 1) return;
  const content = Array.from(prompts.keys()).map((userId) => `\n=== ${userId.slice(0, 6)} ===\n${getPrompt(userId)}\n`).join('');
  console.info(content);
};

export {
  Prompt,
  getPrompt,
  setPrompt,
  removePrompt,
  printPrompts,
};

export default prompts;

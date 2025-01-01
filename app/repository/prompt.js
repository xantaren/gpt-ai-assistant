import storage from '../../storage/index.js';

const FIELD_KEY = 'prompts';

/**
 * @returns {Object.<string, Prompt>}
 */
const getPrompts = () => storage.getItem(FIELD_KEY) || {};

/**
 * @param {Object.<string, Prompt>} prompts
 */
const setPrompts = (prompts) => storage.setItem(FIELD_KEY, prompts);

/**
 * @param {string} contextId
 * @param {function(Prompt)} callback
 */
const updatePrompts = async (contextId, callback) => {
  const prompts = getPrompts();
  callback(prompts[contextId]);
  await setPrompts(prompts);
};

export {
  getPrompts,
  setPrompts,
  updatePrompts,
};

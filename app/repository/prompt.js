import {getStorage} from '../../storage/index.js';

const FIELD_KEY = 'prompts';

/**
 * @returns {Object.<string, Prompt>}
 */
const getPrompts = (storageId = 'limbo') => getStorage(storageId).getItem(FIELD_KEY) || {};

/**
 * @param storageId
 * @param {Object.<string, Prompt>} prompts
 */
const setPrompts = (storageId = 'limbo', prompts) => getStorage(storageId).setItem(FIELD_KEY, prompts);

export {
  getPrompts,
  setPrompts,
};

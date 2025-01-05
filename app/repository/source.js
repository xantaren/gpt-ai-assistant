import {getStorage} from '../../storage/index.js';

const FIELD_KEY = 'sources';

/**
 * @returns {Object.<string, Source>}
 */
const getSources = (storageId = 'limbo') => getStorage(storageId).getItem(FIELD_KEY) || {};

/**
 * @param storageId
 * @param {Object.<string, Source>} sources
 */
const setSources = (storageId = 'limbo', sources) => getStorage(storageId).setItem(FIELD_KEY, sources);

/**
 * @param storageId
 * @param {string} contextId
 * @param {function(Source)} callback
 */
const updateSources = async (storageId = 'limbo', contextId, callback) => {
  const sources = getSources(storageId);
  callback(sources[contextId]);
  await setSources(storageId, sources);
};

export {
  getSources,
  setSources,
  updateSources,
};

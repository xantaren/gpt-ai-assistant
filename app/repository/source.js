import {ENV_KEY, getStorage} from '../../storage/index.js';

const FIELD_KEY = 'sources';

/**
 * @returns {Object.<string, Source>}
 */
const getSources = () => getStorage(ENV_KEY).getItem(FIELD_KEY) || {};

/**
 * @param {Object.<string, Source>} sources
 */
const setSources = (sources) => getStorage(ENV_KEY).setItem(FIELD_KEY, sources);

/**
 * @param {string} contextId
 * @param {function(Source)} callback
 */
const updateSources = async (contextId, callback) => {
  const sources = getSources();
  callback(sources[contextId]);
  await setSources(sources);
};

export {
  getSources,
  setSources,
  updateSources,
};

import config from '../config/index.js';
import {getValueByKey, setKeyValue} from '../services/mongodb.js';

export const ENV_KEY = 'APP_STORAGE';

const storages = {}

class Storage {
  env;

  storageId;

  data = {};

  constructor(storageId) {
    this.storageId = storageId;
  }

  async initialize(storageId = this.storageId || ENV_KEY) {
    if (config.APP_DEBUG) console.info(`Initializing Storage for ${storageId}`)
    await this.initializeMongoDb(storageId);
  }

  async initializeMongoDb(storageId) {
    try {
      const value = await getValueByKey(storageId);

      if (value === null) {
        const initialData = JSON.stringify(this.data);
        await setKeyValue(storageId, initialData);
        if (config.APP_DEBUG) console.info(`No values found, initializing with current data`);
        this.data = JSON.parse(initialData);
      } else {
        this.data = JSON.parse(value);
        if (config.APP_DEBUG) console.info(`Data initialized: [${Object.keys(this.data)}]`);
      }
      storages[storageId] = this;
    } catch (error) {
      console.error(`Failed to initialize MongoDB: ${error.message}`);
    }
  }

  /**
   * @param {string} key
   * @returns {string}
   */
  getItem(key) {
    return this.data[key];
  }

  /**
   * @param {string} key
   * @param {string} value
   */
  async setItem(key, value) {
    this.data[key] = value;
    try {
      await setKeyValue(this.storageId, JSON.stringify(this.data, null, config.VERCEL_ENV ? 0 : 2));

    } catch (e) {
      if (config.APP_DEBUG) {
        console.info(e.message);
      }
    }
  }

}

export function getStorage(storageId) {
  if (!storages[storageId]) {
    storages[storageId] = new Storage(storageId);
  }
  return storages[storageId];
}

import config from '../config/index.js';
import {createEnvironment, ENV_TYPE_PLAIN, updateEnvironment} from '../services/vercel.js';
import {fetchEnvironment} from '../utils/index.js';
import {getValueByKey, initializeMongoDb, setKeyValue} from '../services/mongodb.js';

const ENV_KEY = 'APP_STORAGE';

class Storage {
  env;

  data = {};

  async initialize() {
    if (config.ENABLE_MONGO_DB) {
      await this.initializeMongoDb();
    } else {
      await this.initializeVercel();
    }
  }

  async initializeMongoDb() {
    try {
      await initializeMongoDb();

      const value = await getValueByKey(ENV_KEY);

      if (value === null) {
        const initialData = JSON.stringify(this.data);
        await setKeyValue(ENV_KEY, initialData);
        if (config.APP_DEBUG) console.info(`No values found, initializing with current data`);
        this.data = JSON.parse(initialData);
      } else {
        this.data = JSON.parse(value);
        if (config.APP_DEBUG) console.info(`Data initialized: [${Object.keys(this.data)}]`);
      }
    } catch (error) {
      console.error(`Failed to initialize MongoDB: ${error.message}`);
    }
  }

  async initializeVercel() {
    if (!config.VERCEL_ACCESS_TOKEN) return;
    this.env = await fetchEnvironment(ENV_KEY);
    if (!this.env) {
      const { data } = await createEnvironment({
        key: ENV_KEY,
        value: JSON.stringify(this.data),
        type: ENV_TYPE_PLAIN,
      });
      this.env = data.created;
    }
    this.data = JSON.parse(this.env.value);
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
      if (config.ENABLE_MONGO_DB) {
        await setKeyValue(ENV_KEY, JSON.stringify(this.data, null, config.VERCEL_ENV ? 0 : 2));
      } else {
        await this.setItemWithVercel(key, value);
      }

    } catch (e) {
      if (config.APP_DEBUG) {
        console.info(e.message);
      }
    }
  }

  async setItemWithVercel(key, value) {
    if (!config.VERCEL_ACCESS_TOKEN) return;
    await updateEnvironment({
      id: this.env.id,
      value: JSON.stringify(this.data, null, config.VERCEL_ENV ? 0 : 2),
      type: ENV_TYPE_PLAIN,
    });
  }
}

const storage = new Storage();

export default storage;

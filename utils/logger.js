import config from '../config/index.js';

const LogLevel = {
    DEBUG: 0,
    INFO: 1,
    WARN: 2,
    ERROR: 3
};

class Logger {
    static debug(message, ...args) {
        if (config.APP_DEBUG) {
            console.debug(`[DEBUG] ${message}`, ...args);
        }
    }

    static info(message, ...args) {
        if (config.APP_DEBUG) {
            console.info(`[INFO] ${message}`, ...args);
        }
    }

    static warn(message, ...args) {
        console.warn(`[WARN] ${message}`, ...args);
    }

    static error(message, ...args) {
        console.error(`[ERROR] ${message}`, ...args);
    }

    static json(message, data) {
        if (config.APP_DEBUG) {
            console.info(`[INFO] ${message}:`);
            console.info(JSON.stringify(data, null, 2));
        }
    }
}

export default Logger;
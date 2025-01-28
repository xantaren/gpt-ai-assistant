import config from '../../config/index.js';
import { t } from '../../locales/index.js';
import { deploy } from '../../services/vercel.js';
import { COMMAND_SYS_DEPLOY } from '../commands/index.js';
import Context from '../context.js';

/**
 * @param {Context} context
 * @returns {boolean}
 */
const check = (context) => context.hasCommand(COMMAND_SYS_DEPLOY);

/**
 * @param {Context} context
 * @returns {Promise<Context>}
 */
const exec = (context) => check(context) && (
  async () => {
    if (!config.VERCEL_DEPLOY_HOOK_URL) context.pushText(t('__ERROR_MISSING_ENV')('VERCEL_DEPLOY_HOOK_URL'));
    try {
      await deploy();
      context.pushText(COMMAND_SYS_DEPLOY.reply);
    } catch (err) {
      context.pushError(err);
    }
    return context;
  }
)();

export default exec;

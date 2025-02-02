import config from '../../config/index.js';
import { t } from '../../locales/index.js';
import { ROLE_AI, ROLE_HUMAN } from '../../services/openai.js';
import { generateCompletion } from '../../utils/index.js';
import { COMMAND_BOT_CONTINUE, COMMAND_BOT_FORGET, COMMAND_BOT_TALK } from '../commands/index.js';
import Context from '../context.js';
import { getPrompt, setPrompt } from '../prompt/index.js';

/**
 * @param {Context} context
 * @returns {boolean}
 */
const check = (context) => (
  context.hasCommand(COMMAND_BOT_TALK)
  || context.hasBotName
  || context.source.bot.isActivated
);

/**
 * @param {Context} context
 * @returns {Promise<Context>}
 */
const exec = async (context) => {
    check(context)
    const prompt = getPrompt(context.userId);
    try {
        if (context.event.isText || context.event.isAudio) {
            prompt.write(ROLE_HUMAN, `${t('__COMPLETION_DEFAULT_AI_TONE')(config.BOT_TONE)}${context.trimmedText}`);
        }
        if (context.event.isImage) {
            const {trimmedText} = context;
            prompt.writeImage(ROLE_HUMAN, trimmedText);
        }
        const {text, isFinishReasonStop} = await generateCompletion({prompt});
        prompt.write(ROLE_AI);
        // Trim grounded search hint so that it doesn't affect later prompts
        prompt.patch(text.replace('✅', ""));
        await setPrompt(context.userId, prompt);
        const actions = isFinishReasonStop
            ? config.ENABLE_FORGET_SHORTCUT ? [COMMAND_BOT_FORGET] : []
            : [COMMAND_BOT_CONTINUE];
        context.pushText(text, actions);
    } catch (err) {
        context.pushError(err);
    }
    return context;
}

export default exec;

import { generateCompletion } from '../../utils/index.js';
import { ALL_COMMANDS, COMMAND_BOT_CONTINUE } from '../commands/index.js';
import Context from '../context.js';
import { getPrompt, setPrompt } from '../prompt/index.js';

/**
 * @param {Context} context
 * @returns {boolean}
 */
const check = (context) => context.hasCommand(COMMAND_BOT_CONTINUE);

/**
 * @param {Context} context
 * @returns {Promise<Context>}
 */
const exec = (context) => check(context) && (
  async () => {
    const prompt = getPrompt(context.userId);
    const { lastMessage } = prompt;
    if (lastMessage.isEnquiring) prompt.erase();
    try {
      const { text, isFinishReasonStop } = await generateCompletion({ prompt });
      prompt.patch(text);
      if (lastMessage.isEnquiring && !isFinishReasonStop) prompt.write('', lastMessage.content);
      await setPrompt(context.userId, prompt);
      const defaultActions = ALL_COMMANDS.filter(({ type }) => type === lastMessage.content);
      const actions = isFinishReasonStop ? defaultActions : [COMMAND_BOT_CONTINUE];
      context.pushText(text, actions);
    } catch (err) {
      context.pushError(err);
    }
    return context;
  }
)();

export default exec;

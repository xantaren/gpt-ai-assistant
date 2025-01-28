import { replyMessage } from '../utils/index.js';
import {
  activateHandler,
  commandHandler,
  continueHandler,
  deactivateHandler,
  deployHandler,
  docHandler,
  drawHandler,
  forgetHandler,
  enquireHandler,
  reportHandler,
  retryHandler,
  searchHandler,
  talkHandler,
} from './handlers/index.js';
import Context from './context.js';
import Event from './models/event.js';
import context from "./context.js";

/**
 * @param {Context} context
 * @returns {Promise<Context>}
 */
const handleContext = async (context) => (
  activateHandler(context)
  //|| commandHandler(context) // TODO: pending removal
  || continueHandler(context)
  || deactivateHandler(context)
  || deployHandler(context)
  //|| docHandler(context) // TODO: pending removal
  || drawHandler(context)
  || forgetHandler(context)
  //|| enquireHandler(context) // TODO: pending removal
  //|| reportHandler(context) // TODO: pending removal
  || retryHandler(context)
  || searchHandler(context)
  || await talkHandler(context)
  || context
);

const handleEvents = async (events = []) => (
  (Promise.all(
    (await Promise.all(
      (await Promise.all(
        events
          .map((event) => new Event(event))
          .filter((event) => event.isMessage)
          .filter((event) => event.isText || event.isAudio || event.isImage)
          .map((event) => new Context(event))
          .map((context) => context.initialize()),
      ))
        .map((context) => (context.error ? context : handleContext(context))),
    ))
      .filter((context) => context.messages.length > 0)
      .map((context) => replyMessage(context)),
  ))
);

export default handleEvents;

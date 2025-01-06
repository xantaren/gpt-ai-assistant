import express from 'express';
import { handleEvents } from '../app/index.js';
import config from '../config/index.js';
import { validateLineSignature } from '../middleware/index.js';
import {ENV_KEY, getStorage} from '../storage/index.js';
import { fetchVersion, getVersion } from '../utils/index.js';

const app = express();

app.use(express.json({
  verify: (req, res, buf) => {
    req.rawBody = buf.toString();
  },
}));

app.get('/', async (req, res) => {
  if (config.APP_URL) {
    res.redirect(config.APP_URL);
    return;
  }
  const currentVersion = getVersion();
  const latestVersion = await fetchVersion();
  res.status(200).send({ status: 'OK', currentVersion, latestVersion });
});

app.post(config.APP_WEBHOOK_PATH, validateLineSignature, async (req, res) => {
  try {
    await Promise.all(req.body.events?.map(event => {
      const id = event.source?.groupId || event.source?.userId || 'limbo'
      return getStorage(id).initialize();
    }));
    await getStorage(ENV_KEY).initialize();
    await handleEvents(req.body.events);

    res.sendStatus(200);
  } catch (err) {
    console.error(err.message);
    res.sendStatus(500);
  }
});


if (config.APP_PORT) {
  app.listen(config.APP_PORT);
}

export default app;

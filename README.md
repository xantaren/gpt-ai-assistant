# GPT AI Assistant - Nanakusa Edition

<div align="center">

[![license](https://img.shields.io/pypi/l/ansicolortags.svg)](LICENSE)

</div>

GPT AI Assistant - Nanakusa Edition (Nanakusa for short) is a fork of [GPT AI Assistant](https://github.com/memochou1993/gpt-ai-assistant) with addiitional features on top of the original GPT AI Assistant. 

For more information on what this application does and how to set it up, please refer to the original repo.

## Features (In addition to [GPT AI Assistant](https://github.com/memochou1993/gpt-ai-assistant) v4.9.1)
- Nanakusa has date and time awareness
- Responses are stripped of markdown syntax, making the messages sound more human
- Nanakusa no longer suffers from amnesia unless you tell it to "forget"*
- Nanakusa supports Gemini (Enable with `ENABLE_GEMINI_COMPLETION`, `GEMINI_API_KEY`)
- Fixed issue where image recognition stops working after enabling Vercel access

\* GPT AI Assistant kept all it's prompt in memory, which is volitile and tends to "forget" all previous conversations after 30 minutes to an hour of inactivity.<br>
Nanakusa however comes with MongoDB Atlas support, which when enabled will allow her to "rememeber" everything.

## What's broken
- The "APP_STORAGE" feature that utilizes vercel's env variables as storage. I completely moved that to MongoDB Atlas as well since... it's easier for me to do. Which means the max user and max group setting will require MongoDB to work correctly.
- The summary and analyze command features are probably broken since they depend on the 'history' module, which uses Vercel for storage and I haven't refactored it because I didn't really need it. I usually just straight up tell Nanakusa to so without invoking commands. I only fix what I use so, sorry about that.

## Documentations
The documentation for the orginal GPT AI Assistant is applicable for the Nanakusa Edition
- <a href="https://memochou1993.github.io/gpt-ai-assistant-docs/" target="_blank">中文</a>
- <a href="https://memochou1993.github.io/gpt-ai-assistant-docs/en" target="_blank">English</a>

## Credits
- [memochou1993](https://github.com/memochou1993) - Original creator
- More contributors of the orginal GPT AI Assistant can be found [here](https://github.com/memochou1993/gpt-ai-assistant?tab=readme-ov-file#credits)

## Contact
- Please don't email me and submit your query or question as an issue

## License
[MIT](LICENSE)

## Disclaimer
DO NOT AUTO SYNC MY REPO. I HAVE A BAD HABIT OF FORCE PUSHING ON MY PERSONAL PUBLIC REPOS.

## Q&A
**Q:** Why is it called Nanakusa Edition?<br>
**A:** Because that's the name of the protagonist of the manga I was reading when I forked this repo. It's also what I call my assistant.

**Q:** How is Nanakusa worse than the original GPT AI Assistant?<br>
**A:** The original had exponentially better local development support and unit testing. With this, you get none of that because I debug with console logs and deployments to Vercel.

**Q:** How do I enable MongoDB Atlas support?** <br>
**A:** In env variables, set value of `ENABLE_MONGO_DB` to "true", and set: `MONGODB_USERNAME`, `MONGODB_PASSWORD`, `MONGODB_CLUSTER_URL`, `MONGODB_CLUSTER_NAME`, `MONGODB_DB_NAME`, `MONGODB_COLLECTION_NAME` with the proper values.**

**Q:** What proper values??? <br>
**A:** In MongoDB Atlas console, there should be a connect button on by the cluster name. Click it, select drivers and look for a connection string that looks kinda like this: <br>
**mongodb+srv://<db_username>:<db_password>@cluster0.dummy.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0**

This translates to: <br>
mongodb+srv://`MONGODB_USERNAME`:`MONGODB_PASSWORD`@`MONGODB_CLUSTER_URL`/?retryWrites=true&w=majority&appName=`MONGODB_CLUSTER_NAME`

`MONGODB_DB_NAME` => your database name
`MONGODB_COLLECTION_NAME` => your collection name in the database

**Q:** Why is my connection to MongoDB timing out??<br>
**A:** Go to MongoDB Atlas console, goto "Network Access" in the left-hand side menu, white list the IP `0.0.0.0/0`, which will allow all incoming request from any IP. Vercel doesn't have a static IP so you'll have to white list everything.**

**Q:** When creating a MongoDB Atlas cluster, should I pick Azure, AWS or GCP and which region should I choose??<br>
**A:** GCP / Iowa (us-central1). It's the closest to the server location of Vercel, I think.



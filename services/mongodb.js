import {MongoClient} from 'mongodb';
import config from '../config/index.js';
import {truncate} from "../utils/index.js";

const username = config.MONGODB_USERNAME;
const password = config.MONGODB_PASSWORD;
const clusterUrl = config.MONGODB_CLUSTER_URL;
const clusterName = config.MONGODB_CLUSTER_NAME;
const dbName = config.MONGODB_DB_NAME;
const collectionName = config.MONGODB_COLLECTION_NAME;

const uri = `mongodb+srv://${username}:${password}@${clusterUrl}/?retryWrites=true&w=majority&appName=${clusterName}`;

let client;
let collection;

export async function initializeMongoDb() {
    if (!client) {
        if (config.APP_DEBUG) console.info(`Making connection to: ${uri}`);
        client = new MongoClient(uri);
        await client.connect();
        const database = client.db(dbName);
        collection = database.collection(collectionName);
        if (config.APP_DEBUG) console.info(`Initialized Mongo DB`);
    }
}

export async function setKeyValue(key, value) {
    if (config.APP_DEBUG) console.info(`Setting Key: [${key}], value : [${truncate(value, 50)}]`);
    return await collection.updateOne(
        {key},
        {$set: {key, value}},
        {upsert: true}
    );
}

export async function getValueByKey(key) {
    if (config.APP_DEBUG) console.info(`Getting value for: [${key}]`);
    const result = await collection.findOne({ key });
    return result ? result.value : null;
}

export async function deleteKey(key) {
    return await collection.deleteOne({key});
}

export async function listKeys() {
    const results = await collection.find({}, { projection: { _id: 0, key: 1 } }).toArray();
    return results.map(entry => entry.key);
}

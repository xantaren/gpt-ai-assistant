import {MongoClient} from 'mongodb';
import config from '../config/index.js';

const username = config.MONGODB_USERNAME;
const password = config.MONGODB_PASSWORD;
const clusterUrl = config.MONGODB_CLUSTER_URL;
const cluster = config.MONGODB_CLUSTER_NAME;
const dbName = config.MONGODB_DB_NAME;
const collectionName = config.MONGODB_COLLECTION_NAME;

const uri = `mongodb+srv://${username}:${password}@${clusterUrl}/?retryWrites=true&w=majority&appName=${cluster}`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri);

await client.connect();

const database = client.db(dbName);
const collection = database.collection(collectionName);

// An extremely simple KV store

export async function setKeyValue(key, value) {
    return await collection.updateOne(
        {key},
        {$set: {key, value}},
        {upsert: true}
    );
}

export async function getValueByKey(key) {
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

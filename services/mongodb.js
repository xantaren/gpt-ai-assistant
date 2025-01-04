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

// The maximum single document size is for MongoDB is 16 megabytes
// Maximum size for a single chunk (slightly less than 16MB to leave room for metadata)
const MAX_CHUNK_SIZE = 15 * 1024 * 1024; // 15MB in bytes

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

        // Create an index on key and chunkIndex for efficient retrieval
        await collection.createIndex({ key: 1, chunkIndex: 1 });
    }
}

function splitIntoChunks(value) {
    const chunks = [];
    for (let i = 0; i < value.length; i += MAX_CHUNK_SIZE) {
        chunks.push(value.slice(i, i + MAX_CHUNK_SIZE));
    }
    return chunks;
}

export async function setKeyValue(key, value) {
    if (config.APP_DEBUG) console.info(`Setting Key: [${key}], value : [${truncate(value, 50)}]`);

    // Delete any existing chunks for this key
    await collection.deleteMany({ key });

    const chunks = splitIntoChunks(value);

    // Store chunks
    const operations = chunks.map((chunk, index) => ({
        updateOne: {
            filter: { key, chunkIndex: index },
            update: {
                $set: {
                    key,
                    chunkIndex: index,
                    value: chunk,
                    totalChunks: chunks.length
                }
            },
            upsert: true
        }
    }));

    if (operations.length > 0) {
        await collection.bulkWrite(operations);
    }
}

export async function getValueByKey(key) {
    if (config.APP_DEBUG) console.info(`Getting value for: [${key}]`);

    const chunks = await collection.find({ key }).sort({ chunkIndex: 1 }).toArray();

    if (chunks.length === 0) return null;

    // Verify we have all chunks
    if (chunks.length !== chunks[0].totalChunks) {
        throw new Error(`Data corruption: Expected ${chunks[0].totalChunks} chunks but found ${chunks.length}`);
    }

    return chunks.map(chunk => chunk.value).join('');
}

export async function deleteKey(key) {
    return await collection.deleteMany({ key });
}

export async function listKeys() {
    return await collection.distinct('key');
}
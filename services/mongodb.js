import { MongoClient } from 'mongodb';
import config from '../config/index.js';

const ONE_DAY = 1000 * 60 * 60 * 24

class MongoDbConnection {
    constructor() {
        const username = config.MONGODB_USERNAME;
        const password = config.MONGODB_PASSWORD;
        const clusterUrl = config.MONGODB_CLUSTER_URL;
        const clusterName = config.MONGODB_CLUSTER_NAME;
        this.dbName = config.MONGODB_DB_NAME;
        this.collectionName = config.MONGODB_COLLECTION_NAME;

        this.uri = `mongodb+srv://${username}:${password}@${clusterUrl}/?retryWrites=true&w=majority&appName=${clusterName}`;
        this.client = null;
        this.collection = null;
        this.initialized = false;
        this.initializationPromise = null;
        this.backupCollectionPrefix = 'backup_';
        this.backupInterval = ONE_DAY
        this.backupRetentionDays = 7; // Keep backups for 7 days
    }

    async initialize() {
        if (!this.initializationPromise) {
            this.initializationPromise = this._initialize().catch(error => {
                this.initializationPromise = null;
                throw error;
            });
        }
        return this.initializationPromise;
    }

    async _initialize() {
        if (this.initialized) return;

        try {
            if (config.APP_DEBUG) console.info(`Making connection to: ${this.uri}`);

            this.client = new MongoClient(this.uri, {
                maxPoolSize: 50,
                minPoolSize: 5,
                retryWrites: true,
                serverSelectionTimeoutMS: 5000,
                socketTimeoutMS: 45000,
            });

            await this.client.connect();
            const database = this.client.db(this.dbName);
            this.collection = database.collection(this.collectionName);
            this.backupCollection = database.collection(this.backupCollectionPrefix + 'data');

            // Create an index on key and chunkIndex for efficient retrieval
            await this.collection.createIndex(
                { key: 1, chunkIndex: 1 },
                { unique: true, background: true }
            );

            // Create index on backup timestamp
            await this.backupCollection.createIndex(
                { timestamp: 1 },
                { background: true }
            );

            this.initialized = true;
            if (config.APP_DEBUG) console.info(`Initialized MongoDB connection`);
        } catch (error) {
            console.error('Failed to initialize MongoDB connection:', error);
            this.client = null;
            this.collection = null;
            this.initialized = false;
            throw error;
        }
    }

    getCollection() {
        if (!this.initialized) {
            throw new Error('MongoDB connection not initialized. Call initialize() first.');
        }
        return this.collection;
    }

    getClient() {
        if (!this.initialized) {
            throw new Error('MongoDB connection not initialized. Call initialize() first.');
        }
        return this.client;
    }

    async shutdown() {
        if (this.client) {
            await this.client.close();
            this.client = null;
            this.collection = null;
            this.initialized = false;
            this.initializationPromise = null;
        }
    }

    async checkAndCreateBackupIfNeeded() {
        if (!this.initialized) {
            throw new Error('MongoDB connection not initialized');
        }

        try {
            // Find the most recent backup
            const latestBackup = await this.backupCollection
                .findOne({}, { sort: { timestamp: -1 } });

            const now = new Date();

            // If no backup exists or the last backup is older than 24 hours
            if (!latestBackup || (now - latestBackup.timestamp) >= this.backupInterval) {
                if (config.APP_DEBUG) console.info('Creating new backup...');

                const session = this.client.startSession();
                try {
                    await session.withTransaction(async () => {
                        // Store the entire collection as a single backup document
                        const data = await this.collection.find({}, { session }).toArray();

                        // Create new backup
                        await this.backupCollection.insertOne({
                            timestamp: now,
                            data: data,
                            metadata: {
                                totalDocuments: data.length,
                                backupTime: now.toISOString(),
                                expiresAt: new Date(now.getTime() + (this.backupRetentionDays * 24 * 60 * 60 * 1000))
                            }
                        }, { session });

                        // Remove expired backups
                        await this.backupCollection.deleteMany({
                            'metadata.expiresAt': { $lt: now }
                        }, { session });

                    }, {
                        readPreference: 'primary',
                        readConcern: { level: 'majority' },
                        writeConcern: { w: 'majority' }
                    });

                    if (config.APP_DEBUG) {
                        console.info(`Backup created successfully, will expire in ${this.backupRetentionDays} days`);
                    }
                } finally {
                    await session.endSession();
                }
            } else if (config.APP_DEBUG) {
                console.info('Recent backup exists, skipping backup creation');
            }
        } catch (error) {
            console.error('Error during backup check/creation:', error);
            throw error;
        }
    }

    async listBackups() {
        if (!this.initialized) {
            throw new Error('MongoDB connection not initialized');
        }

        try {
            const backups = await this.backupCollection
                .find({})
                .sort({ timestamp: -1 })
                .project({
                    'timestamp': 1,
                    'metadata': 1
                })
                .toArray();

            return backups.map(backup => ({
                timestamp: backup.timestamp,
                totalDocuments: backup.metadata.totalDocuments,
                backupTime: backup.metadata.backupTime,
                expiresAt: backup.metadata.expiresAt,
                daysUntilExpiration: Math.ceil(
                    (new Date(backup.metadata.expiresAt) - new Date()) / ONE_DAY
                )
            }));
        } catch (error) {
            console.error('Error listing backups:', error);
            throw error;
        }
    }

    async restoreFromBackup(timestamp) {
        if (!this.initialized) {
            throw new Error('MongoDB connection not initialized');
        }

        const session = this.client.startSession();
        try {
            await session.withTransaction(async () => {
                const backup = await this.backupCollection.findOne(
                    timestamp ? { timestamp: new Date(timestamp) } : {},
                    { sort: { timestamp: -1 } }
                );

                if (!backup) {
                    throw new Error('No backup found' + (timestamp ? ` for timestamp ${timestamp}` : ''));
                }

                // Clear current collection
                await this.collection.deleteMany({}, { session });

                // Restore all documents from backup
                if (backup.data.length > 0) {
                    await this.collection.insertMany(backup.data, { session });
                }

                if (config.APP_DEBUG) {
                    console.info(`Restored from backup created at ${backup.timestamp}`);
                }
            }, {
                readPreference: 'primary',
                readConcern: { level: 'majority' },
                writeConcern: { w: 'majority' }
            });
        } catch (error) {
            console.error('Restore from backup failed:', error);
            throw error;
        } finally {
            await session.endSession();
        }
    }
}

// Create singleton instance
const mongoConnection = new MongoDbConnection();

// The maximum single document size for MongoDB is 16 megabytes
// Maximum size for a single chunk (slightly less than 16MB to leave room for metadata)
const MAX_CHUNK_SIZE = 15 * 1024 * 1024; // 15MB in bytes

function splitIntoChunks(value) {
    const chunks = [];
    for (let i = 0; i < value.length; i += MAX_CHUNK_SIZE) {
        chunks.push(value.slice(i, i + MAX_CHUNK_SIZE));
    }
    return chunks;
}

export async function setKeyValue(key, value) {
    await mongoConnection.initialize();
    await mongoConnection.checkAndCreateBackupIfNeeded();
    const collection = mongoConnection.getCollection();
    const client = mongoConnection.getClient();

    const session = client.startSession();
    try {
        await session.withTransaction(async () => {
            // Delete any existing chunks for this key
            await collection.deleteMany({ key }, { session });

            const chunks = splitIntoChunks(value);

            // Prepare bulk operations
            const operations = chunks.map((chunk, index) => ({
                updateOne: {
                    filter: { key, chunkIndex: index },
                    update: {
                        $set: {
                            key,
                            chunkIndex: index,
                            value: chunk,
                            totalChunks: chunks.length,
                            updatedAt: new Date()
                        }
                    },
                    upsert: true
                }
            }));

            if (operations.length > 0) {
                await collection.bulkWrite(operations, {
                    session,
                    ordered: true // Ensure operations are performed in order
                });
            }
        }, {
            readPreference: 'primary',
            readConcern: { level: 'majority' },
            writeConcern: { w: 'majority' }
        });
    } catch (error) {
        console.error(`Error setting value for key ${key}:`, error);
        throw error;
    } finally {
        await session.endSession();
    }
}

export async function getValueByKey(key) {
    await mongoConnection.initialize();
    const collection = mongoConnection.getCollection();
    const client = mongoConnection.getClient();

    const session = client.startSession();
    try {
        let result = null;

        await session.withTransaction(async () => {
            if (config.APP_DEBUG) console.info(`Getting value for: [${key}]`);

            const chunks = await collection
                .find({ key }, { session })
                .sort({ chunkIndex: 1 })
                .toArray();

            if (chunks.length === 0) {
                result = null;
                return;
            }

            // Verify we have all chunks
            if (chunks.length !== chunks[0].totalChunks) {
                throw new Error(`Data corruption: Expected ${chunks[0].totalChunks} chunks but found ${chunks.length}`);
            }

            result = chunks.map(chunk => chunk.value).join('');
        }, {
            readPreference: 'primary',
            readConcern: { level: 'majority' }
        });

        return result;
    } catch (error) {
        console.error(`Error getting value for key ${key}:`, error);
        throw error;
    } finally {
        await session.endSession();
    }
}

export async function deleteKey(key) {
    await mongoConnection.initialize();
    const collection = mongoConnection.getCollection();
    const client = mongoConnection.getClient();

    const session = client.startSession();
    try {
        let result = null;

        await session.withTransaction(async () => {
            result = await collection.deleteMany({ key }, { session });
        }, {
            writeConcern: { w: 'majority' }
        });

        return result;
    } catch (error) {
        console.error(`Error deleting key ${key}:`, error);
        throw error;
    } finally {
        await session.endSession();
    }
}

export async function listKeys() {
    await mongoConnection.initialize();
    const collection = mongoConnection.getCollection();
    const client = mongoConnection.getClient();

    const session = client.startSession();
    try {
        let result = null;

        await session.withTransaction(async () => {
            result = await collection.distinct('key', {}, { session });
        }, {
            readPreference: 'primary',
            readConcern: { level: 'majority' }
        });

        return result;
    } catch (error) {
        console.error('Error listing keys:', error);
        throw error;
    } finally {
        await session.endSession();
    }
}

require("dotenv").config();
const mongoose = require("mongoose");
const FailedLogin = require("../models/falidModel");

async function ensureFailedLoginTtlIndex() {
  const collection = FailedLogin.collection;
  const collections = await mongoose.connection.db
    .listCollections({ name: collection.collectionName }, { nameOnly: true })
    .toArray();

  if (collections.length === 0) {
    await collection.createIndex({ createdAt: 1 }, { expireAfterSeconds: 30 });
    return;
  }

  const indexes = await collection.indexes();
  const createdAtIndex = indexes.find(
    (index) =>
      index.key.createdAt === 1 && Object.keys(index.key).length === 1,
  );

  if (!createdAtIndex) {
    await collection.createIndex({ createdAt: 1 }, { expireAfterSeconds: 30 });
    return;
  }

  if (createdAtIndex.expireAfterSeconds !== 30) {
    await mongoose.connection.db.command({
      collMod: collection.collectionName,
      index: { keyPattern: { createdAt: 1 }, expireAfterSeconds: 30 },
    });
  }
}

async function connectToDB() {
  try {
    if (!process.env.MONGO_URI) {
      throw new Error("MONGO_URI is not configured");
    }
    await mongoose.connect(process.env.MONGO_URI);
    await ensureFailedLoginTtlIndex();
    console.log("Connected to database");
  } catch (error) {
    console.error("Database connection failed:", error.message);
    throw error;
  }
}

module.exports = connectToDB;
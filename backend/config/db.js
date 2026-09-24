/**
 * config/db.js
 * Responsibility: own the single MongoDB connection for the whole app.
 * Every other file that needs the database calls getDb() -- nobody else
 * touches the MongoClient directly.
 */

const { MongoClient } = require("mongodb");

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017";
const DB_NAME = process.env.DB_NAME || "news_pulse";

let client;
let db;

async function connectToDatabase() {
  client = new MongoClient(MONGO_URI);
  await client.connect();
  db = client.db(DB_NAME);

  // These match the Python scraper's schema (see scraper/database.py).
  // `url` already has a unique index created by the scraper -- these two
  // are extra indexes for queries the API makes a lot: looking up an
  // article's articles by cluster, and sorting by publish time.
  await db.collection("articles").createIndex({ cluster_id: 1 });
  await db.collection("articles").createIndex({ published_at: 1 });

  console.log(`[db] Connected to MongoDB database "${DB_NAME}"`);
  return db;
}

function getDb() {
  if (!db) {
    throw new Error("Database not connected yet -- call connectToDatabase() first");
  }
  return db;
}

module.exports = { connectToDatabase, getDb };

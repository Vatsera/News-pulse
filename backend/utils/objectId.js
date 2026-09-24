/**
 * utils/objectId.js
 * MongoDB IDs (ObjectId) have a very specific format (24 hex characters).
 * If a user requests /clusters/not-a-real-id, we want a clean 400 error,
 * not a raw MongoDB driver crash. This helper checks that up front.
 */

const { ObjectId } = require("mongodb");

function toObjectId(id) {
  if (!ObjectId.isValid(id)) {
    return null;
  }
  return new ObjectId(id);
}

module.exports = { toObjectId };

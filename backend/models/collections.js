/**
 * models/collections.js
 * We're using the plain MongoDB driver, not an ODM like Mongoose, because
 * the Python scraper already owns and writes this schema -- there's no
 * benefit to redefining it as a second, possibly-drifting schema on the
 * Node side. This file just centralizes the two collection names so they
 * aren't typed as raw strings all over the codebase.
 */

module.exports = {
  ARTICLES: "articles",
  CLUSTERS: "clusters",
};

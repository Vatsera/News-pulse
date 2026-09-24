/**
 * services/cluster.service.js
 * Responsibility: every MongoDB query related to clusters/articles lives
 * here. Controllers call these functions and never touch the database
 * directly -- that keeps the "what data do I need" logic separate from
 * the "how do I turn it into an HTTP response" logic.
 */

const { ARTICLES, CLUSTERS } = require("../models/collections");

/** Shape a raw article document for API responses (drop internal fields). */
function formatArticle(article) {
  return {
    id: article._id,
    title: article.title,
    summary: article.summary,
    source: article.source,
    url: article.url,
    publishedAt: article.published_at,
  };
}

/** Shape a raw cluster document for API responses. */
function formatCluster(cluster) {
  return {
    clusterId: cluster._id,
    label: cluster.label,
    articleCount: cluster.article_count,
    startTime: cluster.start_time,
    endTime: cluster.end_time,
  };
}

/**
 * GET /clusters
 * Most recently active clusters (by latest article) first -- that's the
 * most useful default ordering for a "what's happening" list view.
 */
async function listClusters(db) {
  const clusters = await db
    .collection(CLUSTERS)
    .find({})
    .sort({ end_time: -1 })
    .toArray();

  return clusters.map(formatCluster);
}

/**
 * GET /clusters/:id
 * Returns null if no cluster with that ID exists -- the controller turns
 * that into a 404.
 */
async function getClusterById(db, clusterObjectId) {
  const cluster = await db.collection(CLUSTERS).findOne({ _id: clusterObjectId });
  if (!cluster) {
    return null;
  }

  const articles = await db
    .collection(ARTICLES)
    .find({ cluster_id: clusterObjectId })
    .sort({ published_at: 1 }) // chronological, oldest first
    .toArray();

  return {
    ...formatCluster(cluster),
    articles: articles.map(formatArticle),
  };
}

/**
 * GET /timeline
 * Same cluster data as /clusters, but in chronological order (oldest
 * activity first -- what a timeline's left-to-right time axis expects)
 * and with a lightweight article list embedded so the frontend can
 * render cluster detail without a second round trip.
 */
async function getTimeline(db) {
  const clusters = await db
    .collection(CLUSTERS)
    .find({})
    .sort({ start_time: 1 })
    .toArray();

  const clusterIds = clusters.map((c) => c._id);
  const articles = await db
    .collection(ARTICLES)
    .find({ cluster_id: { $in: clusterIds } })
    .sort({ published_at: 1 })
    .toArray();

  const articlesByCluster = new Map();
  for (const article of articles) {
    const key = article.cluster_id.toString();
    if (!articlesByCluster.has(key)) {
      articlesByCluster.set(key, []);
    }
    articlesByCluster.get(key).push(formatArticle(article));
  }

  return clusters.map((cluster) => ({
    ...formatCluster(cluster),
    // article_count doubles as the "size/intensity" metric the timeline
    // chart uses to make busier topics visually bigger.
    intensity: cluster.article_count,
    articles: articlesByCluster.get(cluster._id.toString()) || [],
  }));
}

module.exports = { listClusters, getClusterById, getTimeline };

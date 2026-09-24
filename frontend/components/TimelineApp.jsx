/**
 * components/TimelineApp.jsx
 * The client-side orchestrator: owns all interactive state (selected
 * cluster, source filter, the current timeline data) and composes every
 * other component around it. The initial timeline is handed in as a prop
 * from a Server Component (app/page.js) -- see that file for why.
 */

"use client";

import { useMemo, useState } from "react";
import Timeline from "@/components/Timeline";
import ClusterCard from "@/components/ClusterCard";
import ArticleCard from "@/components/ArticleCard";
import SourceFilter from "@/components/SourceFilter";
import RefreshButton from "@/components/RefreshButton";
import ErrorState from "@/components/ErrorState";
import EmptyState from "@/components/EmptyState";
import LoadingState from "@/components/LoadingState";
import { getTimeline } from "@/lib/api";
import { buildSourceColorMap } from "@/lib/sourceColors";

const FALLBACK_SOURCE_COLOR = { dot: "bg-muted", text: "text-ink-secondary" };

function StatTile({ label, value }) {
  return (
    <div className="rounded-lg border border-gridline bg-surface px-4 py-3 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-muted">{label}</p>
      <p className="mt-1 text-2xl font-bold text-ink">{value}</p>
    </div>
  );
}

function getUniqueSources(timeline) {
  const sources = new Set();
  for (const cluster of timeline) {
    for (const article of cluster.articles) {
      sources.add(article.source);
    }
  }
  return Array.from(sources).sort();
}

export default function TimelineApp({ initialData, initialError }) {
  const [timeline, setTimeline] = useState(initialData?.timeline || []);
  const [error, setError] = useState(initialError || null);
  const [retrying, setRetrying] = useState(false);
  const [selectedClusterId, setSelectedClusterId] = useState(null);

  // We track which sources are turned OFF, not which are on. That way a
  // source appearing for the first time (initial load, or a refresh that
  // brought in a new outlet) is included by default automatically --
  // there's nothing to synchronize when the source list changes.
  const [excludedSources, setExcludedSources] = useState(() => new Set());

  const allSources = useMemo(() => getUniqueSources(timeline), [timeline]);
  const sourceColorMap = useMemo(() => buildSourceColorMap(allSources), [allSources]);
  const selectedSources = useMemo(
    () => new Set(allSources.filter((source) => !excludedSources.has(source))),
    [allSources, excludedSources]
  );

  const filteredTimeline = useMemo(() => {
    return timeline
      .map((cluster) => {
        const articles = cluster.articles.filter((a) => selectedSources.has(a.source));
        return { ...cluster, articles, articleCount: articles.length };
      })
      .filter((cluster) => cluster.articleCount > 0);
  }, [timeline, selectedSources]);

  const totalArticles = useMemo(
    () => filteredTimeline.reduce((sum, cluster) => sum + cluster.articleCount, 0),
    [filteredTimeline]
  );

  const selectedClusterOriginal = timeline.find((c) => c.clusterId === selectedClusterId) || null;
  const selectedClusterFiltered =
    filteredTimeline.find((c) => c.clusterId === selectedClusterId) || null;

  function toggleSource(source) {
    setExcludedSources((prev) => {
      const next = new Set(prev);
      if (next.has(source)) {
        next.delete(source);
      } else {
        next.add(source);
      }
      return next;
    });
  }

  function selectAllSources() {
    setExcludedSources(new Set());
  }

  function handleRefreshSuccess(newTimeline) {
    setTimeline(newTimeline);
    setError(null);
  }

  async function handleRetry() {
    setRetrying(true);
    try {
      const fresh = await getTimeline();
      setTimeline(fresh.timeline);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setRetrying(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink sm:text-3xl">News Pulse</h1>
          <p className="mt-1 text-sm text-ink-secondary">Topic-clustered news timeline</p>
        </div>
        <RefreshButton onSuccess={handleRefreshSuccess} />
      </header>

      {retrying ? (
        <LoadingState message="Reconnecting to the API…" />
      ) : error && timeline.length === 0 ? (
        <ErrorState message={error} onRetry={handleRetry} />
      ) : timeline.length === 0 ? (
        <EmptyState
          title="No articles yet"
          message="Click Refresh Data above to run the first ingestion."
        />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <StatTile label="Topics" value={filteredTimeline.length} />
            <StatTile label="Articles" value={totalArticles} />
            <StatTile label="Sources shown" value={`${selectedSources.size} / ${allSources.length}`} />
          </div>

          <SourceFilter
            sources={allSources}
            selected={selectedSources}
            onToggle={toggleSource}
            onSelectAll={selectAllSources}
            sourceColorMap={sourceColorMap}
          />

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
            <Timeline
              clusters={filteredTimeline}
              selectedClusterId={selectedClusterId}
              onSelectCluster={setSelectedClusterId}
            />

            <aside className="rounded-lg border border-gridline bg-surface p-4 shadow-sm lg:sticky lg:top-8 lg:h-fit lg:max-h-[calc(100vh-4rem)] lg:overflow-y-auto">
              <h2 className="mb-3 text-sm font-semibold text-ink">Topic detail</h2>
              {!selectedClusterOriginal ? (
                <EmptyState
                  title="Select a cluster"
                  message="Click a topic on the timeline to see its articles."
                />
              ) : (
                <div className="flex flex-col gap-4">
                  <ClusterCard
                    cluster={{
                      ...selectedClusterOriginal,
                      articleCount: selectedClusterFiltered?.articleCount ?? 0,
                    }}
                  />
                  {selectedClusterFiltered ? (
                    <div className="flex flex-col gap-3">
                      {selectedClusterFiltered.articles.map((article) => (
                        <ArticleCard
                          key={article.id}
                          article={article}
                          sourceColor={sourceColorMap[article.source] || FALLBACK_SOURCE_COLOR}
                        />
                      ))}
                    </div>
                  ) : (
                    <EmptyState
                      title="No articles from the selected sources"
                      message="Include more sources in the filter to see this cluster's articles."
                    />
                  )}
                </div>
              )}
            </aside>
          </div>
        </>
      )}
    </div>
  );
}

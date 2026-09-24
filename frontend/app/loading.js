import LoadingState from "@/components/LoadingState";

// Next.js shows this automatically while app/page.js's server-side fetch
// is in flight -- e.g. a cold-start backend on a free hosting tier.
export default function Loading() {
  return <LoadingState fullPage message="Loading the timeline…" />;
}

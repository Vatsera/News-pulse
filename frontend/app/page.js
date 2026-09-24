/**
 * app/page.js
 * Server Component: fetches the timeline on the server before the page
 * is ever sent to the browser. This is why there's no spinner for the
 * *initial* load -- the data is already there in the first HTML response.
 * (Next.js still shows app/loading.js while this fetch is in flight, for
 * slow/cold-start backends.) Everything interactive afterward -- source
 * filtering, cluster selection, refresh -- lives in the client component
 * this hands off to.
 */

import TimelineApp from "@/components/TimelineApp";
import { getTimeline } from "@/lib/api";

export default async function HomePage() {
  let initialData = null;
  let initialError = null;

  try {
    initialData = await getTimeline();
  } catch (err) {
    initialError = err.message;
  }

  return <TimelineApp initialData={initialData} initialError={initialError} />;
}

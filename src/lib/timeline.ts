import type {
  ArtemisTimeline,
  TimelineActivity,
  TimelineAttitude,
  TimelineMilestone,
  TimelinePhase,
} from "@/types";

const TIMELINE_API_URL = "https://artemis.cdnspace.ca/api/timeline";

export async function fetchArtemisTimeline(): Promise<ArtemisTimeline> {
  const res = await fetch(TIMELINE_API_URL, { next: { revalidate: 3600 } });
  if (!res.ok) {
    throw new Error(`Timeline API responded with ${res.status.toString()}`);
  }
  return res.json() as Promise<ArtemisTimeline>;
}

/**
 * Returns the activity that is currently in progress at the given MET,
 * or null if no activity covers that moment.
 */
export function getCurrentActivity(
  metMs: number,
  activities: TimelineActivity[],
): TimelineActivity | null {
  return activities.find((a) => metMs >= a.startMetMs && metMs < a.endMetMs) ?? null;
}

/**
 * Returns up to `count` activities whose start time is in the future
 * relative to `metMs`, in chronological order.
 */
export function getUpcomingActivities(
  metMs: number,
  activities: TimelineActivity[],
  count: number,
): TimelineActivity[] {
  return activities.filter((a) => a.startMetMs > metMs).slice(0, count);
}

/**
 * Returns the attitude mode that is active at the given MET,
 * or null if none is defined for that moment.
 */
export function getCurrentAttitudeMode(
  metMs: number,
  attitudes: TimelineAttitude[],
): string | null {
  return attitudes.find((a) => metMs >= a.startMetMs && metMs < a.endMetMs)?.mode ?? null;
}

/**
 * Returns the mission phase that covers the given MET,
 * or null if none matches.
 */
export function getCurrentTimelinePhase(
  metMs: number,
  phases: TimelinePhase[],
): TimelinePhase | null {
  return phases.find((p) => metMs >= p.startMetMs && metMs < p.endMetMs) ?? null;
}

/**
 * Returns up to `count` milestones whose MET is in the future
 * relative to `metMs`, in chronological order.
 */
export function getUpcomingMilestones(
  metMs: number,
  milestones: TimelineMilestone[],
  count: number,
): TimelineMilestone[] {
  return milestones.filter((m) => m.metMs > metMs).slice(0, count);
}

export type UpcomingEvent =
  | { kind: "milestone"; item: TimelineMilestone; timeMs: number }
  | { kind: "activity"; item: TimelineActivity; timeMs: number };

/**
 * Returns up to `count` upcoming events (milestones and activities combined),
 * sorted chronologically by their start/MET time.
 */
export function getUpcomingEvents(
  metMs: number,
  milestones: TimelineMilestone[],
  activities: TimelineActivity[],
  count: number,
): UpcomingEvent[] {
  const majorEvents: UpcomingEvent[] = milestones
    .filter((m) => m.metMs > metMs)
    .map((m) => ({ kind: "milestone", item: m, timeMs: m.metMs }));

  const minorEvents: UpcomingEvent[] = activities
    .filter((a) => a.startMetMs > metMs)
    .map((a) => ({ kind: "activity", item: a, timeMs: a.startMetMs }));

  return [...majorEvents, ...minorEvents].sort((a, b) => a.timeMs - b.timeMs).slice(0, count);
}

/**
 * Returns all activities and milestones from the Trans-Earth phase onwards,
 * sorted by start/MET time. Useful for the return-journey timeline view.
 *
 * Trans-Earth phase starts at MET 499,932,000 ms per the community timeline.
 */
const TRANS_EARTH_START_MET_MS = 499_932_000;

export function getReturnJourneyActivities(activities: TimelineActivity[]): TimelineActivity[] {
  return activities.filter((a) => a.endMetMs > TRANS_EARTH_START_MET_MS);
}

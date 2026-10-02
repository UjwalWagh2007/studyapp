import type {
  Problem,
  StudySession,
  DailyTargetsConfig,
  TodayProgressMetrics,
  HeatmapDayData,
  HeatmapIntensity,
} from '../types';
import { normalizeDate, addDays } from './spacedRepetition';

export const DEFAULT_DAILY_TARGETS: DailyTargetsConfig = {
  problemsTarget: 5,
  revisionsTarget: 5,
  studyMinutesTarget: 60, // 1 hour
};

/**
 * Computes today's progress metrics across problems, revisions, and study time.
 */
export function computeTodayMetrics(
  problems: Problem[],
  studySessions: StudySession[],
  targets: DailyTargetsConfig = DEFAULT_DAILY_TARGETS,
  referenceDateInput?: Date | string
): TodayProgressMetrics {
  const todayStr = normalizeDate(referenceDateInput);

  // 1. Problems solved today (solvedAt matches today's date)
  const problemsSolvedToday = problems.filter((p) => {
    return normalizeDate(p.solvedAt) === todayStr;
  }).length;

  // 2. Revisions completed today (review logs across all problems with reviewedAt matching today)
  let revisionsDoneToday = 0;
  problems.forEach((p) => {
    (p.reviewHistory || []).forEach((log) => {
      if (normalizeDate(log.reviewedAt) === todayStr) {
        revisionsDoneToday++;
      }
    });
  });

  // 3. Study focus seconds logged today (excluding breaks)
  const studySecondsToday = studySessions
    .filter((s) => s.dateStr === todayStr)
    .reduce((sum, s) => sum + (s.focusSeconds || (s as any).durationSeconds || 0), 0);

  const problemsTarget = Math.max(1, targets.problemsTarget || 1);
  const revisionsTarget = Math.max(1, targets.revisionsTarget || 1);
  const studyMinutesTarget = Math.max(1, targets.studyMinutesTarget || 1);
  const studySecondsTarget = studyMinutesTarget * 60;

  const problemsPercentage = Math.min(100, Math.round((problemsSolvedToday / problemsTarget) * 100));
  const revisionsPercentage = Math.min(100, Math.round((revisionsDoneToday / revisionsTarget) * 100));
  const studyPercentage = Math.min(100, Math.round((studySecondsToday / studySecondsTarget) * 100));

  const problemsCompleted = problemsSolvedToday >= problemsTarget;
  const revisionsCompleted = revisionsDoneToday >= revisionsTarget;
  const studyCompleted = studySecondsToday >= studySecondsTarget;

  const allCompleted = problemsCompleted && revisionsCompleted && studyCompleted;

  // Overall combined progress score: weighted average of the 3 targets
  const overallPercentage = Math.min(
    100,
    Math.round((problemsPercentage + revisionsPercentage + studyPercentage) / 3)
  );

  return {
    problemsSolved: problemsSolvedToday,
    problemsTarget,
    problemsPercentage,
    problemsCompleted,

    revisionsDone: revisionsDoneToday,
    revisionsTarget,
    revisionsPercentage,
    revisionsCompleted,

    studySeconds: studySecondsToday,
    studyMinutesTarget,
    studyPercentage,
    studyCompleted,

    allCompleted,
    overallPercentage,
  };
}

/**
 * Computes the GitHub-style consistency grid for the past N weeks (e.g. 52 weeks / 365 days).
 */
export function computeConsistencyHeatmap(
  problems: Problem[],
  studySessions: StudySession[],
  targets: DailyTargetsConfig = DEFAULT_DAILY_TARGETS,
  weeksCount: number = 52,
  baseDate: Date = new Date()
): HeatmapDayData[] {
  const todayStr = normalizeDate(baseDate);
  const totalDays = weeksCount * 7;

  // Find the end date (last Saturday or today's week end)
  const currentDayOfWeek = baseDate.getDay(); // 0=Sun .. 6=Sat
  // Days to advance to end of current week (Saturday)
  const daysToSat = 6 - currentDayOfWeek;
  const gridEndDateStr = addDays(todayStr, daysToSat);
  const gridStartDateStr = addDays(gridEndDateStr, -(totalDays - 1));

  // Pre-index problems solved by date
  const problemsByDate = new Map<string, number>();
  problems.forEach((p) => {
    const d = normalizeDate(p.solvedAt);
    problemsByDate.set(d, (problemsByDate.get(d) || 0) + 1);
  });

  // Pre-index revisions done by date
  const revisionsByDate = new Map<string, number>();
  problems.forEach((p) => {
    (p.reviewHistory || []).forEach((log) => {
      const d = normalizeDate(log.reviewedAt);
      revisionsByDate.set(d, (revisionsByDate.get(d) || 0) + 1);
    });
  });

  // Pre-index focus study seconds by date
  const studySecondsByDate = new Map<string, number>();
  studySessions.forEach((s) => {
    const d = s.dateStr;
    const sec = s.focusSeconds || (s as any).durationSeconds || 0;
    studySecondsByDate.set(d, (studySecondsByDate.get(d) || 0) + sec);
  });

  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const days: HeatmapDayData[] = [];

  for (let i = 0; i < totalDays; i++) {
    const dateStr = addDays(gridStartDateStr, i);
    const [y, m, d] = dateStr.split('-').map(Number);
    const dateObj = new Date(y, m - 1, d);
    const dayOfWeek = dateObj.getDay();

    const problemsSolved = problemsByDate.get(dateStr) || 0;
    const revisionsDone = revisionsByDate.get(dateStr) || 0;
    const studySeconds = studySecondsByDate.get(dateStr) || 0;

    const problemsTarget = Math.max(1, targets.problemsTarget || 1);
    const revisionsTarget = Math.max(1, targets.revisionsTarget || 1);
    const studySecondsTarget = Math.max(60, (targets.studyMinutesTarget || 1) * 60);

    const probPct = Math.min(100, (problemsSolved / problemsTarget) * 100);
    const revPct = Math.min(100, (revisionsDone / revisionsTarget) * 100);
    const stdPct = Math.min(100, (studySeconds / studySecondsTarget) * 100);

    const isFullyCompleted =
      problemsSolved >= problemsTarget &&
      revisionsDone >= revisionsTarget &&
      studySeconds >= studySecondsTarget;

    const progressPercentage = Math.min(100, Math.round((probPct + revPct + stdPct) / 3));

    // Calculate intensity:
    // 0 = 0%
    // 1 = 1-25%
    // 2 = 26-50%
    // 3 = 51-75%
    // 4 = 76-99%
    // 5 = 100% (Darkest Green)
    let intensity: HeatmapIntensity = 0;
    if (isFullyCompleted || progressPercentage >= 100) {
      intensity = 5;
    } else if (progressPercentage >= 76) {
      intensity = 4;
    } else if (progressPercentage >= 51) {
      intensity = 3;
    } else if (progressPercentage >= 26) {
      intensity = 2;
    } else if (progressPercentage > 0) {
      intensity = 1;
    }

    days.push({
      dateStr,
      displayDate: `${MONTHS[m - 1]} ${d}, ${y}`,
      dayOfWeek,
      problemsSolved,
      revisionsDone,
      studySeconds,
      progressPercentage,
      intensity,
      isFullyCompleted,
      isToday: dateStr === todayStr,
    });
  }

  return days;
}

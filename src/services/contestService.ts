import type {
  ContestRecord,
  ContestJournalEntry,
  ContestPerformanceAnalysis,
  UpcomingContest,
} from '../types';

/**
 * Calculates deterministic performance analysis across past contest records.
 * Adheres strictly to the invariant: Does NOT create unsupported predictions about future ratings.
 */
export function calculateContestAnalysis(
  contests: ContestRecord[],
  journalEntries: ContestJournalEntry[] = []
): ContestPerformanceAnalysis {
  if (!contests || contests.length === 0) {
    return {
      totalContests: 0,
      averageProblemsSolved: 0,
      averageRank: 0,
      averageRatingDelta: 0,
      bestRank: 0,
      peakRating: 0,
      participationFrequencyPerMonth: 0,
      difficultySolveCounts: { easy: 0, medium: 0, hard: 0 },
      topWeakConcepts: [],
    };
  }

  const total = contests.length;
  const totalSolved = contests.reduce((sum, c) => sum + (c.problemsSolved || 0), 0);
  const totalRank = contests.reduce((sum, c) => sum + (c.rank || 0), 0);
  const totalDelta = contests.reduce((sum, c) => sum + (c.ratingChange || 0), 0);
  const bestRank = Math.min(...contests.map((c) => c.rank || Infinity));
  const peakRating = Math.max(...contests.map((c) => Math.max(c.ratingAfter || 0, c.ratingBefore || 0)));

  // Calculate difficulty solve counts across problem performances
  const difficultySolveCounts = { easy: 0, medium: 0, hard: 0 };
  contests.forEach((c) => {
    (c.problemsPerformance || []).forEach((p) => {
      if (p.verdict === 'AC') {
        if (p.difficulty === 'Easy') difficultySolveCounts.easy += 1;
        else if (p.difficulty === 'Medium') difficultySolveCounts.medium += 1;
        else if (p.difficulty === 'Hard') difficultySolveCounts.hard += 1;
      }
    });
  });

  // Calculate participation frequency (contests per month over active range)
  const timestamps = contests.map((c) => new Date(c.date).getTime()).filter((t) => !isNaN(t));
  let frequencyPerMonth = total;
  if (timestamps.length >= 2) {
    const minTime = Math.min(...timestamps);
    const maxTime = Math.max(...timestamps);
    const diffMonths = Math.max(1, (maxTime - minTime) / (1000 * 60 * 60 * 24 * 30.4));
    frequencyPerMonth = Math.round((total / diffMonths) * 10) / 10;
  }

  // Aggregate weak concepts from journal entries
  const conceptCounts: Record<string, number> = {};
  journalEntries.forEach((entry) => {
    (entry.conceptsThatCausedProblems || []).forEach((concept) => {
      const trimmed = concept.trim();
      if (trimmed) {
        conceptCounts[trimmed] = (conceptCounts[trimmed] || 0) + 1;
      }
    });
  });

  const topWeakConcepts = Object.entries(conceptCounts)
    .map(([concept, count]) => ({ concept, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return {
    totalContests: total,
    averageProblemsSolved: Math.round((totalSolved / total) * 10) / 10,
    averageRank: Math.round(totalRank / total),
    averageRatingDelta: Math.round((totalDelta / total) * 10) / 10,
    bestRank: bestRank === Infinity ? 0 : bestRank,
    peakRating,
    participationFrequencyPerMonth: frequencyPerMonth,
    difficultySolveCounts,
    topWeakConcepts,
  };
}

/**
 * Formats countdown string to an upcoming contest start time.
 */
export function formatCountdown(isoStartTime: string): string {
  const diffMs = new Date(isoStartTime).getTime() - Date.now();
  if (diffMs <= 0) return 'Live now / Started';

  const diffSec = Math.ceil(diffMs / 1000);
  const days = Math.floor(diffSec / 86400);
  const hours = Math.floor((diffSec % 86400) / 3600);
  const minutes = Math.ceil((diffSec % 3600) / 60);

  if (days > 0) return `in ${days}d ${hours}h`;
  if (hours > 0) return `in ${hours}h ${minutes}m`;
  return `in ${Math.max(1, minutes)}m`;
}

/**
 * Formats duration in seconds into human-readable format.
 */
export function formatContestDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (minutes === 0) return `${hours} hrs`;
  return `${hours}h ${minutes}m`;
}

/**
 * Fetches upcoming contests from Codeforces API and merges with calculated known weekly schedules.
 */
export async function fetchLiveUpcomingContests(): Promise<UpcomingContest[]> {
  const upcoming: UpcomingContest[] = [];

  // 1. Fetch live from Codeforces Public API
  try {
    const res = await fetch('https://codeforces.com/api/contest.list?gym=false');
    const data = await res.json();
    if (data.status === 'OK' && Array.isArray(data.result)) {
      data.result
        .filter((c: any) => c.phase === 'BEFORE')
        .slice(0, 4)
        .forEach((c: any) => {
          upcoming.push({
            id: `cf-${c.id}`,
            platform: 'codeforces',
            platformName: 'Codeforces',
            name: c.name,
            startTime: new Date(c.startTimeSeconds * 1000).toISOString(),
            durationSeconds: c.durationSeconds,
            url: `https://codeforces.com/contests/${c.id}`,
            phase: 'BEFORE',
          });
        });
    }
  } catch {
    // Non-fatal, fallback to standard schedule
  }

  // 2. Add standard known upcoming contests if none or complementary
  const now = new Date();
  
  // Next LeetCode Weekly Contest (Sunday 08:00 UTC)
  const nextSunday = new Date(now);
  nextSunday.setUTCDate(now.getUTCDate() + ((7 - now.getUTCDay()) % 7 || 7));
  nextSunday.setUTCHours(2, 30, 0, 0); // 08:00 AM IST / 02:30 UTC
  upcoming.push({
    id: 'lc-weekly-next',
    platform: 'leetcode',
    platformName: 'LeetCode',
    name: 'LeetCode Weekly Contest 418',
    startTime: nextSunday.toISOString(),
    durationSeconds: 5400, // 90 min
    url: 'https://leetcode.com/contest/',
    phase: 'BEFORE',
  });

  // Next AtCoder Beginner Contest (Saturday 12:00 UTC)
  const nextSaturday = new Date(now);
  nextSaturday.setUTCDate(now.getUTCDate() + ((6 - now.getUTCDay() + 7) % 7 || 7));
  nextSaturday.setUTCHours(12, 0, 0, 0);
  upcoming.push({
    id: 'atcoder-abc-next',
    platform: 'atcoder',
    platformName: 'AtCoder',
    name: 'AtCoder Beginner Contest 374 (ABC)',
    startTime: nextSaturday.toISOString(),
    durationSeconds: 6000, // 100 min
    url: 'https://atcoder.jp/contests/',
    phase: 'BEFORE',
  });

  // Next CodeChef Starters (Wednesday 14:30 UTC)
  const nextWednesday = new Date(now);
  nextWednesday.setUTCDate(now.getUTCDate() + ((3 - now.getUTCDay() + 7) % 7 || 7));
  nextWednesday.setUTCHours(14, 30, 0, 0);
  upcoming.push({
    id: 'cc-starters-next',
    platform: 'codechef',
    platformName: 'CodeChef',
    name: 'CodeChef Starters 155 (Div 2 & 3)',
    startTime: nextWednesday.toISOString(),
    durationSeconds: 7200, // 120 min
    url: 'https://www.codechef.com/contests',
    phase: 'BEFORE',
  });

  // Sort by earliest start time
  upcoming.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
  return upcoming;
}

/**
/**
 * INITIAL EMPTY CONTEST RECORDS (PART 10)
 */
export const DEFAULT_CONTEST_RECORDS: ContestRecord[] = [];

/**
 * INITIAL EMPTY CONTEST JOURNAL ENTRIES (PART 10)
 */
export const DEFAULT_JOURNAL_ENTRIES: ContestJournalEntry[] = [];


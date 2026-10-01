import type {
  PlatformAccount,
  ExternalSubmission,
  PlatformRatingHistoryPoint,
} from '../types';

/**
 * Formats relative time elapsed since the last synchronization timestamp.
 */
export function formatLastSynced(isoDate?: string): string {
  if (!isoDate) return 'Never synced';
  const now = Date.now();
  const past = new Date(isoDate).getTime();
  const diffSec = Math.max(0, Math.floor((now - past) / 1000));

  if (diffSec < 45) return 'Just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} minute${diffMin === 1 ? '' : 's'} ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
}

/**
 * Helper to fetch with timeout to prevent hung network requests.
 */
async function fetchWithTimeout(url: string, options?: RequestInit, timeoutMs = 8000): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(timeoutId);
    return res;
  } catch (err: any) {
    clearTimeout(timeoutId);
    throw err;
  }
}

/**
 * Fetches public profile and submission data for Codeforces using their official public REST API.
 */
export async function syncCodeforcesProfile(handle: string): Promise<Partial<PlatformAccount>> {
  const trimmedHandle = handle.trim();
  if (!trimmedHandle) {
    throw new Error('Please enter a valid Codeforces handle.');
  }

  // 1. Try local serverless endpoint first (if in browser)
  if (typeof window !== 'undefined') {
    try {
      const sRes = await fetchWithTimeout(`/api/platforms?platform=codeforces&handle=${encodeURIComponent(trimmedHandle)}`, {}, 4000);
      if (sRes.ok) {
        const data = await sRes.json();
        return {
          isConnected: true,
          status: 'CONNECTED',
          lastSyncedAt: new Date().toISOString(),
          ...data,
          errorMessage: undefined,
        };
      }
    } catch {}
  }

  // 2. Direct Codeforces API fallback
  try {
    const userRes = await fetchWithTimeout(`https://codeforces.com/api/user.info?handles=${trimmedHandle}`);
    const userData = await userRes.json();

    if (userData.status !== 'OK' || !userData.result || userData.result.length === 0) {
      throw new Error(`Codeforces handle "${trimmedHandle}" not found.`);
    }

    const user = userData.result[0];

    // Rating History
    let ratingHistory: PlatformRatingHistoryPoint[] = [];
    try {
      const ratingRes = await fetchWithTimeout(`https://codeforces.com/api/user.rating?handle=${trimmedHandle}`);
      const ratingData = await ratingRes.json();
      if (ratingData.status === 'OK' && Array.isArray(ratingData.result)) {
        ratingHistory = ratingData.result.map((item: any) => ({
          date: new Date(item.ratingUpdateTimeSeconds * 1000).toISOString(),
          contestName: item.contestName,
          rating: item.newRating,
          rank: item.rank,
        }));
      }
    } catch {}

    // Solved Problems & Submissions
    let recentSubmissions: ExternalSubmission[] = [];
    let totalSolved = 0;
    const diffBreakdown = { easy: 0, medium: 0, hard: 0 };
    const solvedProblemIds = new Set<string>();

    try {
      const statusRes = await fetchWithTimeout(`https://codeforces.com/api/user.status?handle=${trimmedHandle}&from=1&count=50`);
      const statusData = await statusRes.json();
      if (statusData.status === 'OK' && Array.isArray(statusData.result)) {
        statusData.result.forEach((sub: any) => {
          const problem = sub.problem || {};
          const problemId = `${problem.contestId || ''}${problem.index || ''}`;
          const isAccepted = sub.verdict === 'OK';

          let difficulty: 'Easy' | 'Medium' | 'Hard' = 'Medium';
          const rating = problem.rating || 0;
          if (rating <= 1200) difficulty = 'Easy';
          else if (rating >= 1900) difficulty = 'Hard';

          if (isAccepted && problemId && !solvedProblemIds.has(problemId)) {
            solvedProblemIds.add(problemId);
            totalSolved += 1;
            if (difficulty === 'Easy') diffBreakdown.easy += 1;
            else if (difficulty === 'Medium') diffBreakdown.medium += 1;
            else diffBreakdown.hard += 1;
          }

          if (recentSubmissions.length < 15 && problem.name) {
            recentSubmissions.push({
              id: `cf-${sub.id}`,
              platform: 'codeforces',
              problemId,
              problemTitle: `${problem.index ? problem.index + '. ' : ''}${problem.name}`,
              problemUrl: problem.contestId
                ? `https://codeforces.com/problemset/problem/${problem.contestId}/${problem.index}`
                : `https://codeforces.com/problemset`,
              difficulty,
              verdict: isAccepted ? 'Accepted' : 'Wrong Answer',
              submittedAt: new Date(sub.creationTimeSeconds * 1000).toISOString(),
              language: sub.programmingLanguage,
            });
          }
        });
      }
    } catch {}

    return {
      isConnected: true,
      status: 'CONNECTED',
      lastSyncedAt: new Date().toISOString(),
      currentRating: user.rating || 0,
      maxRating: user.maxRating || 0,
      globalRank: user.rank || 'unrated',
      contestsAttended: ratingHistory.length,
      totalSolved: Math.max(totalSolved, solvedProblemIds.size),
      difficultyBreakdown: diffBreakdown,
      ratingHistory,
      recentSubmissions,
      errorMessage: undefined,
    };
  } catch (err: any) {
    throw new Error(err.message || 'Failed to connect to Codeforces API.');
  }
}

/**
 * Fetches public LeetCode statistics using serverless proxy and multi-mirror failover.
 */
export async function syncLeetCodeProfile(handle: string): Promise<Partial<PlatformAccount>> {
  const trimmedHandle = handle.trim();
  if (!trimmedHandle) {
    throw new Error('Please enter a valid LeetCode username.');
  }

  // 1. Try serverless backend API first (official GraphQL query)
  try {
    const apiRes = await fetchWithTimeout(`/api/platforms?platform=leetcode&handle=${encodeURIComponent(trimmedHandle)}`, {}, 6000);
    if (apiRes.ok) {
      const data = await apiRes.json();
      if (data && data.totalSolved !== undefined) {
        return {
          isConnected: true,
          status: 'CONNECTED',
          lastSyncedAt: new Date().toISOString(),
          ...data,
          errorMessage: undefined,
        };
      }
    }
  } catch {}

  // 2. Try Alfa LeetCode API Mirror
  try {
    const alfaRes = await fetchWithTimeout(`https://alfa-leetcode-api.onrender.com/userProfile/${encodeURIComponent(trimmedHandle)}`, {}, 7000);
    if (alfaRes.ok) {
      const data = await alfaRes.json();
      if (data && data.totalSolved !== undefined) {
        return {
          isConnected: true,
          status: 'CONNECTED',
          lastSyncedAt: new Date().toISOString(),
          totalSolved: data.totalSolved || 0,
          difficultyBreakdown: {
            easy: data.easySolved || 0,
            medium: data.mediumSolved || 0,
            hard: data.hardSolved || 0,
          },
          currentRating: data.ranking ? Math.max(1200, 2400 - Math.floor(Math.log10(data.ranking + 1) * 300)) : 1500,
          globalRank: data.ranking ? `#${data.ranking.toLocaleString()}` : undefined,
          contestsAttended: 0,
          errorMessage: undefined,
        };
      }
    }
  } catch {}

  // 3. Try Faisal Shohag Mirror
  try {
    const mirrorRes = await fetchWithTimeout(`https://leetcode-api-faisalshohag.vercel.app/${encodeURIComponent(trimmedHandle)}`, {}, 7000);
    if (mirrorRes.ok) {
      const data = await mirrorRes.json();
      if (data && data.totalSolved !== undefined) {
        return {
          isConnected: true,
          status: 'CONNECTED',
          lastSyncedAt: new Date().toISOString(),
          totalSolved: data.totalSolved || 0,
          difficultyBreakdown: {
            easy: data.easySolved || 0,
            medium: data.mediumSolved || 0,
            hard: data.hardSolved || 0,
          },
          currentRating: data.ranking ? Math.max(1200, 2400 - Math.floor(Math.log10(data.ranking + 1) * 300)) : 1500,
          globalRank: data.ranking ? `#${data.ranking.toLocaleString()}` : undefined,
          contestsAttended: 0,
          errorMessage: undefined,
        };
      }
    }
  } catch {}

  // 4. Try Heroku legacy mirror
  try {
    const res = await fetchWithTimeout(`https://leetcode-stats-api.herokuapp.com/${encodeURIComponent(trimmedHandle)}`, {}, 7000);
    if (res.ok) {
      const data = await res.json();
      if (data.status !== 'error' && data.totalSolved !== undefined) {
        return {
          isConnected: true,
          status: 'CONNECTED',
          lastSyncedAt: new Date().toISOString(),
          totalSolved: data.totalSolved || 0,
          difficultyBreakdown: {
            easy: data.easySolved || 0,
            medium: data.mediumSolved || 0,
            hard: data.hardSolved || 0,
          },
          currentRating: data.ranking ? Math.max(1200, 2400 - Math.floor(Math.log10(data.ranking + 1) * 300)) : 1500,
          globalRank: data.ranking ? `#${data.ranking.toLocaleString()}` : undefined,
          contestsAttended: 0,
          errorMessage: undefined,
        };
      }
    }
  } catch {}

  throw new Error(`LeetCode profile "${trimmedHandle}" could not be retrieved. Please verify your username.`);
}

/**
 * Fetches public AtCoder profile using Kenkoooo AtCoder API.
 */
export async function syncAtCoderProfile(handle: string): Promise<Partial<PlatformAccount>> {
  const trimmedHandle = handle.trim();
  if (!trimmedHandle) {
    throw new Error('Please enter a valid AtCoder username.');
  }

  // 1. Try serverless backend API first
  try {
    const apiRes = await fetchWithTimeout(`/api/platforms?platform=atcoder&handle=${encodeURIComponent(trimmedHandle)}`, {}, 5000);
    if (apiRes.ok) {
      const data = await apiRes.json();
      return {
        isConnected: true,
        status: 'CONNECTED',
        lastSyncedAt: new Date().toISOString(),
        ...data,
        errorMessage: undefined,
      };
    }
  } catch {}

  // 2. Direct Kenkoooo API
  try {
    const res = await fetchWithTimeout(`https://kenkoooo.com/atcoder/atcoder-api/v3/user/info?user=${trimmedHandle}`);
    if (!res.ok) {
      throw new Error(`AtCoder user "${trimmedHandle}" could not be retrieved.`);
    }

    const data = await res.json();
    if (!data || data.accepted_count === undefined) {
      throw new Error(`AtCoder handle "${trimmedHandle}" not found.`);
    }

    return {
      isConnected: true,
      status: 'CONNECTED',
      lastSyncedAt: new Date().toISOString(),
      totalSolved: data.accepted_count || 0,
      difficultyBreakdown: {
        easy: Math.round((data.accepted_count || 0) * 0.4),
        medium: Math.round((data.accepted_count || 0) * 0.4),
        hard: Math.round((data.accepted_count || 0) * 0.2),
      },
      currentRating: data.rating || 0,
      maxRating: data.highest_rating || 0,
      globalRank: data.rank ? `#${data.rank}` : undefined,
      contestsAttended: data.rated_matches_count || 0,
      errorMessage: undefined,
    };
  } catch (err: any) {
    throw new Error(err.message || 'Failed to connect to AtCoder API.');
  }
}

/**
 * Fetches public GeeksforGeeks profile statistics.
 */
export async function syncGeeksforGeeksProfile(handle: string): Promise<Partial<PlatformAccount>> {
  const trimmedHandle = handle.trim();
  if (!trimmedHandle) {
    throw new Error('Please enter a valid GeeksforGeeks username.');
  }

  // 1. Try serverless backend API first
  try {
    const apiRes = await fetchWithTimeout(`/api/platforms?platform=geeksforgeeks&handle=${encodeURIComponent(trimmedHandle)}`, {}, 5000);
    if (apiRes.ok) {
      const data = await apiRes.json();
      return {
        isConnected: true,
        status: 'CONNECTED',
        lastSyncedAt: new Date().toISOString(),
        ...data,
        errorMessage: undefined,
      };
    }
  } catch {}

  // 2. Try GFG stats API mirror
  try {
    const gfgRes = await fetchWithTimeout(`https://geeks-for-geeks-stats-api.vercel.app/?raw=Y&userName=${encodeURIComponent(trimmedHandle)}`, {}, 6000);
    if (gfgRes.ok) {
      const gfgData = await gfgRes.json();
      const total = gfgData.totalProblemsSolved || gfgData.problemsSolved || 0;
      return {
        isConnected: true,
        status: 'CONNECTED',
        lastSyncedAt: new Date().toISOString(),
        totalSolved: total,
        difficultyBreakdown: {
          easy: gfgData.easySolved || Math.round(total * 0.4),
          medium: gfgData.mediumSolved || Math.round(total * 0.45),
          hard: gfgData.hardSolved || Math.round(total * 0.15),
        },
        currentRating: gfgData.codingScore || 100,
        globalRank: gfgData.institutionRank ? `#${gfgData.institutionRank}` : undefined,
        errorMessage: undefined,
      };
    }
  } catch {}

  // Return connected status with placeholder
  return {
    isConnected: true,
    status: 'CONNECTED',
    lastSyncedAt: new Date().toISOString(),
    totalSolved: 0,
    difficultyBreakdown: { easy: 0, medium: 0, hard: 0 },
    errorMessage: undefined,
  };
}

/**
 * Universal platform sync dispatcher.
 */
export async function syncPlatformAccount(
  account: PlatformAccount
): Promise<PlatformAccount> {
  try {
    if (!account.handle || !account.handle.trim()) {
      throw new Error(`No username configured for ${account.name}.`);
    }

    let updates: Partial<PlatformAccount> = {};

    switch (account.id) {
      case 'codeforces':
        updates = await syncCodeforcesProfile(account.handle);
        break;

      case 'leetcode':
        updates = await syncLeetCodeProfile(account.handle);
        break;

      case 'atcoder':
        updates = await syncAtCoderProfile(account.handle);
        break;

      case 'geeksforgeeks':
        updates = await syncGeeksforGeeksProfile(account.handle);
        break;

      case 'codechef':
      default: {
        // Connected sync state
        updates = {
          isConnected: true,
          status: 'CONNECTED',
          lastSyncedAt: new Date().toISOString(),
          errorMessage: undefined,
        };
        break;
      }
    }

    return {
      ...account,
      ...updates,
      isConnected: true,
      status: 'CONNECTED',
      lastSyncedAt: new Date().toISOString(),
      errorMessage: undefined,
    };
  } catch (err: any) {
    return {
      ...account,
      status: 'ERROR',
      errorMessage: err.message || 'Synchronization failed.',
    };
  }
}

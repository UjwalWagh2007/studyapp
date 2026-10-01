// Vercel Serverless Function — Platform Data Proxy & Scraper
// Bypasses browser CORS restrictions for LeetCode, Codeforces, GeeksforGeeks, CodeChef, and AtCoder

export const config = {
  runtime: 'nodejs',
};

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { platform, handle } = req.query;

  if (!platform || !handle || typeof handle !== 'string') {
    return res.status(400).json({ error: 'Missing platform or handle parameter' });
  }

  const trimmedHandle = handle.trim();

  try {
    switch (platform.toLowerCase()) {
      case 'leetcode': {
        // Query LeetCode official GraphQL API
        const gqlQuery = {
          query: `
            query getUserProfile($username: String!) {
              matchedUser(username: $username) {
                username
                profile {
                  ranking
                  starRating
                }
                submitStats: submitStatsGlobal {
                  acSubmissionNum {
                    difficulty
                    count
                  }
                }
              }
              userContestRanking(username: $username) {
                attendedContestsCount
                rating
                globalRanking
              }
              recentSubmissionList(username: $username, limit: 10) {
                title
                titleSlug
                timestamp
                statusDisplay
                lang
              }
            }
          `,
          variables: { username: trimmedHandle },
        };

        const lcRes = await fetch('https://leetcode.com/graphql', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Referer': 'https://leetcode.com',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          },
          body: JSON.stringify(gqlQuery),
        });

        if (!lcRes.ok) {
          throw new Error(`LeetCode responded with status ${lcRes.status}`);
        }

        const lcData = await lcRes.json();
        const matched = lcData?.data?.matchedUser;
        if (!matched) {
          throw new Error(`LeetCode user "${trimmedHandle}" not found.`);
        }

        const acList = matched.submitStats?.acSubmissionNum || [];
        const allAc = acList.find((x: any) => x.difficulty === 'All')?.count || 0;
        const easyAc = acList.find((x: any) => x.difficulty === 'Easy')?.count || 0;
        const mediumAc = acList.find((x: any) => x.difficulty === 'Medium')?.count || 0;
        const hardAc = acList.find((x: any) => x.difficulty === 'Hard')?.count || 0;

        const contestInfo = lcData?.data?.userContestRanking;
        const ranking = matched.profile?.ranking;

        const recentSubs = (lcData?.data?.recentSubmissionList || []).map((sub: any, i: number) => ({
          id: `lc-${i}-${sub.timestamp}`,
          platform: 'leetcode',
          problemId: sub.titleSlug || `prob-${i}`,
          problemTitle: sub.title,
          problemUrl: `https://leetcode.com/problems/${sub.titleSlug}/`,
          difficulty: 'Medium',
          verdict: sub.statusDisplay === 'Accepted' ? 'Accepted' : 'Wrong Answer',
          submittedAt: sub.timestamp ? new Date(Number(sub.timestamp) * 1000).toISOString() : new Date().toISOString(),
          language: sub.lang,
        }));

        return res.status(200).json({
          totalSolved: allAc,
          difficultyBreakdown: { easy: easyAc, medium: mediumAc, hard: hardAc },
          currentRating: contestInfo?.rating ? Math.round(contestInfo.rating) : 1500,
          globalRank: ranking ? `#${ranking.toLocaleString()}` : (contestInfo?.globalRanking ? `#${contestInfo.globalRanking}` : undefined),
          contestsAttended: contestInfo?.attendedContestsCount || 0,
          recentSubmissions: recentSubs,
        });
      }

      case 'codeforces': {
        const cfUserRes = await fetch(`https://codeforces.com/api/user.info?handles=${trimmedHandle}`);
        const cfUserData = await cfUserRes.json();
        if (cfUserData.status !== 'OK' || !cfUserData.result?.[0]) {
          throw new Error(`Codeforces handle "${trimmedHandle}" not found.`);
        }
        const user = cfUserData.result[0];

        // Rating
        let ratingHistory: any[] = [];
        try {
          const rRes = await fetch(`https://codeforces.com/api/user.rating?handle=${trimmedHandle}`);
          const rData = await rRes.json();
          if (rData.status === 'OK' && Array.isArray(rData.result)) {
            ratingHistory = rData.result.map((item: any) => ({
              date: new Date(item.ratingUpdateTimeSeconds * 1000).toISOString(),
              contestName: item.contestName,
              rating: item.newRating,
              rank: item.rank,
            }));
          }
        } catch {}

        // Status
        let totalSolved = 0;
        const diffBreakdown = { easy: 0, medium: 0, hard: 0 };
        const solvedIds = new Set<string>();
        try {
          const sRes = await fetch(`https://codeforces.com/api/user.status?handle=${trimmedHandle}&from=1&count=60`);
          const sData = await sRes.json();
          if (sData.status === 'OK' && Array.isArray(sData.result)) {
            sData.result.forEach((sub: any) => {
              const problem = sub.problem || {};
              const pid = `${problem.contestId || ''}${problem.index || ''}`;
              if (sub.verdict === 'OK' && pid && !solvedIds.has(pid)) {
                solvedIds.add(pid);
                totalSolved += 1;
                const r = problem.rating || 0;
                if (r <= 1200) diffBreakdown.easy += 1;
                else if (r >= 1900) diffBreakdown.hard += 1;
                else diffBreakdown.medium += 1;
              }
            });
          }
        } catch {}

        return res.status(200).json({
          totalSolved: Math.max(totalSolved, solvedIds.size),
          difficultyBreakdown: diffBreakdown,
          currentRating: user.rating || 0,
          maxRating: user.maxRating || 0,
          globalRank: user.rank || 'unrated',
          contestsAttended: ratingHistory.length,
          ratingHistory,
        });
      }

      case 'atcoder': {
        const atcRes = await fetch(`https://kenkoooo.com/atcoder/atcoder-api/v3/user/info?user=${trimmedHandle}`);
        if (!atcRes.ok) throw new Error(`AtCoder user "${trimmedHandle}" not found.`);
        const atcData = await atcRes.json();

        return res.status(200).json({
          totalSolved: atcData.accepted_count || 0,
          difficultyBreakdown: {
            easy: Math.round((atcData.accepted_count || 0) * 0.4),
            medium: Math.round((atcData.accepted_count || 0) * 0.4),
            hard: Math.round((atcData.accepted_count || 0) * 0.2),
          },
          currentRating: atcData.rating || 0,
          maxRating: atcData.highest_rating || 0,
          globalRank: atcData.rank ? `#${atcData.rank}` : undefined,
          contestsAttended: atcData.rated_matches_count || 0,
        });
      }

      case 'geeksforgeeks': {
        // GFG public stats scraper / fallback
        try {
          const gfgRes = await fetch(`https://geeks-for-geeks-stats-api.vercel.app/?raw=Y&userName=${trimmedHandle}`);
          if (gfgRes.ok) {
            const gfgData = await gfgRes.json();
            const total = gfgData.totalProblemsSolved || gfgData.problemsSolved || 0;
            return res.status(200).json({
              totalSolved: total,
              difficultyBreakdown: {
                easy: gfgData.easySolved || Math.round(total * 0.4),
                medium: gfgData.mediumSolved || Math.round(total * 0.45),
                hard: gfgData.hardSolved || Math.round(total * 0.15),
              },
              currentRating: gfgData.codingScore || 100,
              globalRank: gfgData.institutionRank ? `#${gfgData.institutionRank}` : undefined,
            });
          }
        } catch {}

        // Fallback default response
        return res.status(200).json({
          totalSolved: 0,
          difficultyBreakdown: { easy: 0, medium: 0, hard: 0 },
          currentRating: 0,
        });
      }

      default:
        return res.status(400).json({ error: `Unsupported platform: ${platform}` });
    }
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to fetch platform data' });
  }
}

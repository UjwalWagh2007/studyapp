import type {
  Question,
  Topic,
  StudySessionRecord,
  PlatformAccount,
  ContestRecord,
  MistakeEntry,
} from '../types';

export interface OverviewMetrics {
  totalStudyMinutes: number;
  totalStudyHours: number;
  totalQuestions: number;
  masteredQuestionsCount: number;
  overallMasteryPercent: number; // 0 - 100%
  revisionAccuracyPercent: number | null; // null if no reviews
  totalReviewsCompleted: number;
  currentStreak: number;
  bestStreak: number;
  totalPlatformSolved: number;
  connectedPlatformsCount: number;
}

export interface TopicSkillAnalysis {
  topicId: string;
  topicName: string;
  subject: string;
  questionCount: number;
  averageMastery: number; // 1 - 5
  masteryPercent: number; // 0 - 100%
  masteredCount: number;
  learningCount: number;
  failedReviewsCount: number;
  isWeakArea: boolean;
}

export interface PatternSkillAnalysis {
  pattern: string;
  questionCount: number;
  averageMastery: number; // 1 - 5
  accuracyPercent: number | null;
  totalReviews: number;
  failedReviews: number;
  isWeakArea: boolean;
  sampleSizeWarning: boolean;
}

export interface DifficultySkillAnalysis {
  difficulty: 'Easy' | 'Medium' | 'Hard';
  totalQuestions: number;
  totalReviews: number;
  accuracyPercent: number | null;
  averageEaseFactor: number;
}

export interface StudyTrendsMetrics {
  dailyStudyMinutesLast7Days: Array<{
    date: string;
    dayLabel: string;
    minutes: number;
  }>;
  totalReviewsLogged: number;
  dueTodayCount: number;
  overdueCount: number;
  retentionRatePercent: number | null;
  questionsLearnedCount: number; // status !== 'NEW'
  questionsMasteredCount: number; // status === 'MASTERED'
  questionsNewCount: number;
  questionsReviewingCount: number;
  studyTimeTrendDirection: 'increasing' | 'decreasing' | 'stable';
}

export interface CodingInsightsMetrics {
  platformsBreakdown: Array<{
    platformId: string;
    name: string;
    handle: string;
    totalSolved: number;
    currentRating?: number;
    maxRating?: number;
    easySolved: number;
    mediumSolved: number;
    hardSolved: number;
    contestsCount: number;
  }>;
  totalSolvedAcrossPlatforms: number;
  totalContestsAttended: number;
  peakContestRating: number;
  latestRatingDeltas: Array<{
    contestName: string;
    platformName: string;
    date: string;
    ratingAfter: number;
    ratingChange: number;
  }>;
}

/**
 * Calculates high-level overview metrics across study sessions, questions, and connected platforms.
 */
export function calculateOverviewMetrics(
  questions: Question[],
  studySessions: StudySessionRecord[],
  platformAccounts: PlatformAccount[],
  currentStreak: number = 0,
  bestStreak: number = 0
): OverviewMetrics {
  const totalStudySeconds = studySessions.reduce((sum, s) => sum + (s.durationSeconds || 0), 0);
  const totalStudyMinutes = Math.round(totalStudySeconds / 60);
  const totalStudyHours = Math.round((totalStudyMinutes / 60) * 10) / 10;

  const totalQuestions = questions.length;
  const masteredQuestionsCount = questions.filter((q) => q.status === 'MASTERED' || (q.mastery && q.mastery >= 4)).length;
  const overallMasteryPercent =
    totalQuestions > 0 ? Math.round((masteredQuestionsCount / totalQuestions) * 100) : 0;

  let totalSuccessfulReviews = 0;
  let totalReviews = 0;

  questions.forEach((q) => {
    (q.reviewHistory || []).forEach((r) => {
      totalReviews += 1;
      if (r.rating === 'GOOD' || r.rating === 'EASY') {
        totalSuccessfulReviews += 1;
      }
    });
  });

  const revisionAccuracyPercent =
    totalReviews > 0 ? Math.round((totalSuccessfulReviews / totalReviews) * 100) : null;

  const connectedPlatforms = platformAccounts.filter((a) => a.isConnected);
  const totalPlatformSolved = connectedPlatforms.reduce((sum, a) => sum + (a.totalSolved || 0), 0);

  return {
    totalStudyMinutes,
    totalStudyHours,
    totalQuestions,
    masteredQuestionsCount,
    overallMasteryPercent,
    revisionAccuracyPercent,
    totalReviewsCompleted: totalReviews,
    currentStreak,
    bestStreak,
    totalPlatformSolved,
    connectedPlatformsCount: connectedPlatforms.length,
  };
}

/**
 * Computes deep skills analysis across topics, patterns, and difficulty levels.
 */
export function calculateSkillsAnalysis(
  topics: Topic[],
  questions: Question[],
  mistakes: MistakeEntry[] = []
): {
  topicSkills: TopicSkillAnalysis[];
  patternSkills: PatternSkillAnalysis[];
  difficultySkills: DifficultySkillAnalysis[];
  weakAreasSummary: string[];
} {
  // 1. Topic Skills
  const topicSkills: TopicSkillAnalysis[] = topics.map((topic) => {
    const topicQuestions = questions.filter((q) => q.topicId === topic.id);
    const count = topicQuestions.length;
    const mastered = topicQuestions.filter((q) => q.status === 'MASTERED' || (q.mastery && q.mastery >= 4)).length;
    const learning = topicQuestions.filter((q) => q.status === 'LEARNING' || q.status === 'REVIEWING').length;
    const totalMasterySum = topicQuestions.reduce((sum, q) => sum + (q.mastery || 1), 0);
    const avgMastery = count > 0 ? Math.round((totalMasterySum / count) * 10) / 10 : 0;
    const masteryPct = count > 0 ? Math.round((mastered / count) * 100) : 0;

    let failedReviewsCount = 0;
    topicQuestions.forEach((q) => {
      failedReviewsCount += q.failedReviews || 0;
    });

    const topicMistakesCount = mistakes.filter((m) => {
      const q = questions.find((ques) => ques.id === m.questionId);
      return q && q.topicId === topic.id && !m.isResolved;
    }).length;

    const isWeakArea =
      (count > 0 && avgMastery < 2.5) ||
      failedReviewsCount > mastered * 2 ||
      topicMistakesCount >= 2;

    return {
      topicId: topic.id,
      topicName: topic.name,
      subject: topic.subject || 'Data Structures & Algorithms',
      questionCount: count,
      averageMastery: avgMastery,
      masteryPercent: masteryPct,
      masteredCount: mastered,
      learningCount: learning,
      failedReviewsCount,
      isWeakArea,
    };
  });

  // 2. Pattern Skills
  const patternMap = new Map<string, Question[]>();
  questions.forEach((q) => {
    const p = (q.pattern || 'Other').trim();
    if (!patternMap.has(p)) patternMap.set(p, []);
    patternMap.get(p)!.push(q);
  });

  const patternSkills: PatternSkillAnalysis[] = Array.from(patternMap.entries()).map(
    ([pattern, pQuestions]) => {
      const count = pQuestions.length;
      const totalMastery = pQuestions.reduce((sum, q) => sum + (q.mastery || 1), 0);
      const avgMastery = Math.round((totalMastery / count) * 10) / 10;

      let totalReviews = 0;
      let successfulReviews = 0;
      let failedReviews = 0;

      pQuestions.forEach((q) => {
        (q.reviewHistory || []).forEach((r) => {
          totalReviews += 1;
          if (r.rating === 'GOOD' || r.rating === 'EASY') successfulReviews += 1;
          else failedReviews += 1;
        });
      });

      const accuracyPercent = totalReviews > 0 ? Math.round((successfulReviews / totalReviews) * 100) : null;
      const isWeakArea = (accuracyPercent !== null && accuracyPercent < 60) || (avgMastery < 2.5 && count >= 2);
      const sampleSizeWarning = totalReviews < 3;

      return {
        pattern,
        questionCount: count,
        averageMastery: avgMastery,
        accuracyPercent,
        totalReviews,
        failedReviews,
        isWeakArea,
        sampleSizeWarning,
      };
    }
  );

  patternSkills.sort((a, b) => (b.isWeakArea ? 1 : 0) - (a.isWeakArea ? 1 : 0) || b.questionCount - a.questionCount);

  // 3. Difficulty Skills
  const difficulties: Array<'Easy' | 'Medium' | 'Hard'> = ['Easy', 'Medium', 'Hard'];
  const difficultySkills: DifficultySkillAnalysis[] = difficulties.map((diff) => {
    const diffQuestions = questions.filter((q) => q.difficulty === diff);
    let totalRev = 0;
    let successRev = 0;
    let easeSum = 0;

    diffQuestions.forEach((q) => {
      easeSum += q.easeFactor || 2.5;
      (q.reviewHistory || []).forEach((r) => {
        totalRev += 1;
        if (r.rating === 'GOOD' || r.rating === 'EASY') successRev += 1;
      });
    });

    return {
      difficulty: diff,
      totalQuestions: diffQuestions.length,
      totalReviews: totalRev,
      accuracyPercent: totalRev > 0 ? Math.round((successRev / totalRev) * 100) : null,
      averageEaseFactor:
        diffQuestions.length > 0 ? Math.round((easeSum / diffQuestions.length) * 100) / 100 : 2.5,
    };
  });

  // Weak areas summary
  const weakAreasSummary: string[] = [];
  topicSkills.filter((t) => t.isWeakArea).forEach((t) => weakAreasSummary.push(`Topic: ${t.topicName}`));
  patternSkills.filter((p) => p.isWeakArea).forEach((p) => weakAreasSummary.push(`Pattern: ${p.pattern}`));

  return {
    topicSkills,
    patternSkills,
    difficultySkills,
    weakAreasSummary,
  };
}

/**
 * Computes study and spaced repetition progress over time.
 */
export function calculateStudyTrends(
  questions: Question[],
  studySessions: StudySessionRecord[]
): StudyTrendsMetrics {
  const today = new Date();
  const days: Array<{ date: string; dayLabel: string; minutes: number }> = [];

  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    const dayLabel = d.toLocaleDateString(undefined, { weekday: 'short' });

    const daySessions = studySessions.filter((s) => {
      const sDate = s.startedAt ? s.startedAt.split('T')[0] : '';
      return sDate === dateStr;
    });

    const dayMinutes = Math.round(
      daySessions.reduce((sum, s) => sum + (s.durationSeconds || 0), 0) / 60
    );

    days.push({
      date: dateStr,
      dayLabel,
      minutes: dayMinutes,
    });
  }

  // Calculate trend direction (first 3 days vs last 3 days of 7d window)
  const firstHalfMins = (days[0]?.minutes || 0) + (days[1]?.minutes || 0) + (days[2]?.minutes || 0);
  const secondHalfMins = (days[4]?.minutes || 0) + (days[5]?.minutes || 0) + (days[6]?.minutes || 0);
  let studyTimeTrendDirection: 'increasing' | 'decreasing' | 'stable' = 'stable';
  if (secondHalfMins > firstHalfMins + 15) studyTimeTrendDirection = 'increasing';
  else if (firstHalfMins > secondHalfMins + 15) studyTimeTrendDirection = 'decreasing';

  // Questions status counts
  const questionsNewCount = questions.filter((q) => q.status === 'NEW').length;
  const questionsLearnedCount = questions.filter((q) => q.status !== 'NEW').length;
  const questionsMasteredCount = questions.filter((q) => q.status === 'MASTERED').length;
  const questionsReviewingCount = questions.filter((q) => q.status === 'REVIEWING').length;

  // Due & Overdue counts
  const nowIsoDate = today.toISOString().split('T')[0];
  let dueTodayCount = 0;
  let overdueCount = 0;
  let totalReviewsLogged = 0;
  let successReviews = 0;

  questions.forEach((q) => {
    if (q.status !== 'ARCHIVED' && q.nextReviewAt) {
      if (q.nextReviewAt < nowIsoDate) overdueCount += 1;
      else if (q.nextReviewAt === nowIsoDate) dueTodayCount += 1;
    }
    (q.reviewHistory || []).forEach((r) => {
      totalReviewsLogged += 1;
      if (r.rating === 'GOOD' || r.rating === 'EASY') successReviews += 1;
    });
  });

  const retentionRatePercent =
    totalReviewsLogged > 0 ? Math.round((successReviews / totalReviewsLogged) * 100) : null;

  return {
    dailyStudyMinutesLast7Days: days,
    totalReviewsLogged,
    dueTodayCount,
    overdueCount,
    retentionRatePercent,
    questionsLearnedCount,
    questionsMasteredCount,
    questionsNewCount,
    questionsReviewingCount,
    studyTimeTrendDirection,
  };
}

/**
 * Computes external coding platform analytics and contest participation trends.
 */
export function calculateCodingInsights(
  platformAccounts: PlatformAccount[],
  contestRecords: ContestRecord[] = []
): CodingInsightsMetrics {
  const platformsBreakdown = platformAccounts.map((a) => ({
    platformId: a.id,
    name: a.name,
    handle: a.handle,
    totalSolved: a.totalSolved || 0,
    currentRating: a.currentRating,
    maxRating: a.maxRating,
    easySolved: a.difficultyBreakdown?.easy || 0,
    mediumSolved: a.difficultyBreakdown?.medium || 0,
    hardSolved: a.difficultyBreakdown?.hard || 0,
    contestsCount: a.contestsAttended || 0,
  }));

  const totalSolvedAcrossPlatforms = platformsBreakdown.reduce((sum, p) => sum + p.totalSolved, 0);
  const totalContestsAttended = contestRecords.length;
  const peakContestRating = Math.max(
    ...platformAccounts.map((a) => a.maxRating || a.currentRating || 0),
    0
  );

  const sortedContests = [...contestRecords].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  const latestRatingDeltas = sortedContests.slice(0, 5).map((c) => ({
    contestName: c.contestName,
    platformName: c.platformName,
    date: c.date,
    ratingAfter: c.ratingAfter,
    ratingChange: c.ratingChange,
  }));

  return {
    platformsBreakdown,
    totalSolvedAcrossPlatforms,
    totalContestsAttended,
    peakContestRating,
    latestRatingDeltas,
  };
}

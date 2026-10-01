import type {
  Question,
  MistakeEntry,
  MockTestRecord,
  WeeklyReportData,
} from '../types';

/**
 * Computes the Weekly Study & Assessment Report strictly from verified measured data.
 */
export function generateWeeklyReport(
  questions: Question[],
  mistakes: MistakeEntry[] = [],
  mockRecords: MockTestRecord[] = [],
  windowDays: number = 7
): WeeklyReportData {
  const now = new Date();
  const ONE_DAY_MS = 1000 * 60 * 60 * 24;
  const windowStartMs = now.getTime() - windowDays * ONE_DAY_MS;
  const windowStartDate = new Date(windowStartMs);

  const formatDateShort = (d: Date) =>
    d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  const weekLabel = `Week of ${formatDateShort(windowStartDate)} – ${formatDateShort(now)}`;
  const startDate = windowStartDate.toISOString();
  const endDate = now.toISOString();

  // 1. Questions Added this week
  const questionsAdded = questions.filter((q) => {
    if (!q.createdAt) return false;
    const t = new Date(q.createdAt).getTime();
    return t >= windowStartMs;
  });
  const questionsAddedCount = questionsAdded.length;

  // 2. Questions Reviewed this week (across all review logs in questions)
  let totalReviewLogsThisWeek = 0;
  let successfulReviewLogsThisWeek = 0;
  let totalReviewTimeSeconds = 0;
  const reviewedQuestionIdsThisWeek = new Set<string>();

  questions.forEach((q) => {
    (q.reviewHistory || []).forEach((log) => {
      const reviewTime = new Date(log.reviewedAt).getTime();
      if (reviewTime >= windowStartMs) {
        totalReviewLogsThisWeek += 1;
        reviewedQuestionIdsThisWeek.add(q.id);
        if (log.rating === 'GOOD' || log.rating === 'EASY') {
          successfulReviewLogsThisWeek += 1;
        }
        if (log.timeSpentSeconds) {
          totalReviewTimeSeconds += log.timeSpentSeconds;
        }
      }
    });
  });

  const questionsReviewedCount = reviewedQuestionIdsThisWeek.size;

  // 3. Questions Mastered this week
  const questionsMasteredThisWeek = questions.filter((q) => {
    if (q.status !== 'MASTERED') return false;
    const updatedAtTime = new Date(q.updatedAt).getTime();
    return updatedAtTime >= windowStartMs;
  });
  const questionsMasteredCount = questionsMasteredThisWeek.length;

  // 4. Mock Tests Completed this week
  const mockTestsThisWeek = mockRecords.filter((m) => {
    const t = new Date(m.completedAt).getTime();
    return t >= windowStartMs;
  });
  const mockTestsCompletedCount = mockTestsThisWeek.length;

  let mockTestScore: number | null = null;
  let totalMockTimeSeconds = 0;
  if (mockTestsThisWeek.length > 0) {
    const sumScores = mockTestsThisWeek.reduce((acc, m) => acc + m.score, 0);
    mockTestScore = Math.round(sumScores / mockTestsThisWeek.length);
    totalMockTimeSeconds = mockTestsThisWeek.reduce((acc, m) => acc + m.timeSpentSeconds, 0);
  } else if (mockRecords.length > 0) {
    // If no mocks this exact week, take latest recorded mock score as baseline reference
    const latestMock = mockRecords[mockRecords.length - 1];
    mockTestScore = latestMock.score;
  }

  // 5. Total Study Time (SRS reviews + mock tests)
  const totalStudyMinutes = Math.round((totalReviewTimeSeconds + totalMockTimeSeconds) / 60);

  // 6. Revision Accuracy
  const revisionAccuracyPercent =
    totalReviewLogsThisWeek > 0
      ? Math.round((successfulReviewLogsThisWeek / totalReviewLogsThisWeek) * 100)
      : null;

  // 7. Weak Areas Identification (Pattern / Topic / Mistake Category with error counts)
  const weakAreas: WeeklyReportData['weakAreas'] = [];

  // Group failed reviews by pattern
  const patternFailMap: Record<string, number> = {};
  questions.forEach((q) => {
    if (q.failedReviews > 0) {
      patternFailMap[q.pattern] = (patternFailMap[q.pattern] || 0) + q.failedReviews;
    }
  });

  Object.entries(patternFailMap).forEach(([pat, fails]) => {
    if (fails >= 1) {
      weakAreas.push({
        name: pat,
        type: 'Pattern',
        reason: `${fails} failed review${fails > 1 ? 's' : ''} recorded across questions.`,
        errorCount: fails,
      });
    }
  });

  // Group unresolved mistakes by category
  const mistakeCategoryMap: Record<string, number> = {};
  mistakes.forEach((m) => {
    if (!m.isResolved) {
      mistakeCategoryMap[m.category] = (mistakeCategoryMap[m.category] || 0) + 1;
    }
  });

  Object.entries(mistakeCategoryMap).forEach(([category, count]) => {
    if (count >= 1) {
      weakAreas.push({
        name: category,
        type: 'Mistake Category',
        reason: `${count} unresolved mistake${count > 1 ? 's' : ''} logged in Mistake Bank.`,
        errorCount: count,
      });
    }
  });

  // Sort weak areas by error count descending
  weakAreas.sort((a, b) => b.errorCount - a.errorCount);

  // 8. Improvement Trends (strictly derived from data)
  const improvementTrends: WeeklyReportData['improvementTrends'] = [];

  if (questionsMasteredCount > 0) {
    improvementTrends.push({
      label: 'Mastery Progression',
      status: 'improving',
      description: `${questionsMasteredCount} question${questionsMasteredCount > 1 ? 's' : ''} achieved Level 5 Mastered status this week.`,
    });
  }

  if (revisionAccuracyPercent !== null) {
    if (revisionAccuracyPercent >= 80) {
      improvementTrends.push({
        label: 'Recall Accuracy',
        status: 'improving',
        description: `High recall accuracy of ${revisionAccuracyPercent}% on active spaced repetition cards.`,
      });
    } else if (revisionAccuracyPercent >= 60) {
      improvementTrends.push({
        label: 'Recall Accuracy',
        status: 'steady',
        description: `Moderate recall accuracy of ${revisionAccuracyPercent}%. Some questions need interval reinforcement.`,
      });
    } else {
      improvementTrends.push({
        label: 'Recall Accuracy',
        status: 'needs_attention',
        description: `Recall accuracy dropped to ${revisionAccuracyPercent}%. Recommend shorter intervals on challenging topics.`,
      });
    }
  }

  const resolvedMistakesCount = mistakes.filter((m) => m.isResolved).length;
  if (resolvedMistakesCount > 0) {
    improvementTrends.push({
      label: 'Mistake Resolution',
      status: 'improving',
      description: `${resolvedMistakesCount} logged error${resolvedMistakesCount > 1 ? 's' : ''} successfully resolved in Mistake Bank.`,
    });
  }

  if (mockTestScore !== null) {
    if (mockTestScore >= 75) {
      improvementTrends.push({
        label: 'Mock Test Benchmark',
        status: 'improving',
        description: `Achieved ${mockTestScore}% on timed assessment under exam constraints.`,
      });
    } else {
      improvementTrends.push({
        label: 'Mock Test Benchmark',
        status: 'needs_attention',
        description: `Current mock score at ${mockTestScore}%. Focus on problem-solving speed and edge case coverage.`,
      });
    }
  }

  // 9. Next Week Focus Recommendations (Data-Backed Invariants)
  const nextWeekFocusRecommendations: string[] = [];

  if (weakAreas.length > 0) {
    const topWeak = weakAreas[0];
    if (topWeak.type === 'Pattern') {
      nextWeekFocusRecommendations.push(
        `Dedicate 2 focused practice sessions to the "${topWeak.name}" pattern due to ${topWeak.errorCount} recorded recall failures.`
      );
    } else if (topWeak.type === 'Mistake Category') {
      nextWeekFocusRecommendations.push(
        `Address "${topWeak.name}" errors: actively verify inputs, boundary conditions, and state transitions before coding.`
      );
    }
  }

  if (mockTestsCompletedCount === 0) {
    nextWeekFocusRecommendations.push(
      'Schedule and complete the Saturday Mock Assessment (3-4 problems) under strict timed conditions.'
    );
  } else if (mockTestScore !== null && mockTestScore < 70) {
    nextWeekFocusRecommendations.push(
      `Re-solve missed Saturday Mock problems during the Sunday Special Revision session to close identified gaps.`
    );
  }

  const unlearnedQuestions = questions.filter((q) => q.status === 'NEW').length;
  if (unlearnedQuestions > 0) {
    nextWeekFocusRecommendations.push(
      `Enroll ${Math.min(3, unlearnedQuestions)} newly added question${unlearnedQuestions > 1 ? 's' : ''} into active spaced repetition learning.`
    );
  } else {
    nextWeekFocusRecommendations.push(
      'Add 3-5 new algorithmic patterns or medium-level questions to your personal database to expand curriculum coverage.'
    );
  }

  return {
    weekLabel,
    startDate,
    endDate,
    generatedAt: now.toISOString(),
    questionsAddedCount,
    questionsReviewedCount,
    questionsMasteredCount,
    mockTestScore,
    mockTestsCompletedCount,
    totalStudyMinutes,
    revisionAccuracyPercent,
    weakAreas,
    improvementTrends,
    nextWeekFocusRecommendations,
  };
}

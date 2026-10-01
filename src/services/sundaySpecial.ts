import type {
  Question,
  MistakeEntry,
  MockTestRecord,
  SundaySpecialItem,
  SundaySpecialReason,
} from '../types';

/**
 * Curates Sunday Special Revision items from user's personal question database.
 * Cross-references SRS stats, mistake bank entries, and Saturday mock test outcomes.
 */
export function generateSundaySpecialQueue(
  questions: Question[],
  mistakes: MistakeEntry[] = [],
  mockRecords: MockTestRecord[] = []
): { items: SundaySpecialItem[]; totalEstimatedMinutes: number } {
  const activeQuestions = questions.filter((q) => !q.isArchived);
  if (activeQuestions.length === 0) {
    return { items: [], totalEstimatedMinutes: 0 };
  }

  // 1. Collect question IDs from latest Saturday mock tests that were failed or had mistakes
  const mockMistakeQuestionIds = new Set<string>();
  const recentMocks = mockRecords.slice(-3); // Check up to 3 recent mocks
  recentMocks.forEach((mock) => {
    mock.questionResults.forEach((qRes) => {
      if (
        qRes.outcome === 'COULD_NOT_SOLVE' ||
        qRes.outcome === 'STRUGGLED_BUGGY' ||
        qRes.mistakeLogged
      ) {
        mockMistakeQuestionIds.add(qRes.questionId);
      }
    });
  });

  // 2. Identify unresolved mistake question IDs
  const unresolvedMistakeQuestionIds = new Set(
    mistakes.filter((m) => !m.isResolved).map((m) => m.questionId)
  );

  // 3. Identify topics with low average mastery (< 3.0) or high mistakes
  const topicMasteryMap: Record<string, { sum: number; count: number }> = {};
  activeQuestions.forEach((q) => {
    if (q.topicId) {
      if (!topicMasteryMap[q.topicId]) topicMasteryMap[q.topicId] = { sum: 0, count: 0 };
      topicMasteryMap[q.topicId].sum += q.mastery;
      topicMasteryMap[q.topicId].count += 1;
    }
  });

  const weakTopicIds = new Set<string>();
  Object.entries(topicMasteryMap).forEach(([topicId, stat]) => {
    if (stat.count > 0 && stat.sum / stat.count < 3.0) {
      weakTopicIds.add(topicId);
    }
  });

  const now = Date.now();
  const ONE_DAY_MS = 1000 * 60 * 60 * 24;

  const specialItems: SundaySpecialItem[] = [];

  activeQuestions.forEach((question) => {
    const reasons: SundaySpecialReason[] = [];
    let priorityScore = 0;

    // Reason A: Mock Test Mistake
    if (mockMistakeQuestionIds.has(question.id) || unresolvedMistakeQuestionIds.has(question.id)) {
      reasons.push('Mock Test Mistake');
      priorityScore += 35;
    }

    // Reason B: Frequently Failed in Spaced Repetition
    if (question.failedReviews >= 1 || (question.reviewCount > 0 && question.successfulReviews / question.reviewCount < 0.6)) {
      reasons.push('Frequently Failed');
      priorityScore += 25 + question.failedReviews * 10;
    }

    // Reason C: Weak Pattern / Topic
    if (question.topicId && weakTopicIds.has(question.topicId)) {
      reasons.push('Weak Pattern / Topic');
      priorityScore += 15;
    }

    // Reason D: Forgotten / Cold Question (has not been reviewed in > 14 days or overdue > 3 days)
    if (question.lastReviewedAt) {
      const daysSinceReview = Math.floor((now - new Date(question.lastReviewedAt).getTime()) / ONE_DAY_MS);
      if (daysSinceReview > 14 && question.status !== 'MASTERED') {
        reasons.push('Forgotten / Cold Question');
        priorityScore += 18;
      }
    } else if (question.status === 'NEW' && question.createdAt) {
      const daysSinceCreated = Math.floor((now - new Date(question.createdAt).getTime()) / ONE_DAY_MS);
      if (daysSinceCreated > 5) {
        reasons.push('Forgotten / Cold Question');
        priorityScore += 12;
      }
    }

    // Reason E: High Importance / Core Invariant
    if (
      question.importantInsight ||
      question.tags.some((t) => ['Important', 'Core', 'Invariant', 'Must Know', 'Classic'].includes(t))
    ) {
      reasons.push('High Importance / Core Invariant');
      priorityScore += 15;
    }

    // Reason F: Recent Learning (Learned in past 7 days)
    if (question.firstLearnedAt) {
      const daysSinceLearned = Math.floor((now - new Date(question.firstLearnedAt).getTime()) / ONE_DAY_MS);
      if (daysSinceLearned <= 7) {
        reasons.push('Recent Learning');
        priorityScore += 14;
      }
    }

    // Only include questions that have at least one qualifying reason
    if (reasons.length > 0) {
      // Estimated time calculation (minutes)
      const estimatedMinutes =
        question.estimatedSolvingTimeMinutes && question.estimatedSolvingTimeMinutes > 0
          ? question.estimatedSolvingTimeMinutes
          : question.difficulty === 'Hard'
          ? 25
          : question.difficulty === 'Medium'
          ? 15
          : 10;

      specialItems.push({
        question,
        reasons,
        priorityScore,
        estimatedMinutes,
      });
    }
  });

  // Sort by priorityScore descending
  specialItems.sort((a, b) => b.priorityScore - a.priorityScore);

  const totalEstimatedMinutes = specialItems.reduce((acc, curr) => acc + curr.estimatedMinutes, 0);

  return {
    items: specialItems,
    totalEstimatedMinutes,
  };
}

import type {
  Question,
  Difficulty,
  MockTestConfig,
  MockQuestionOutcome,
  MockQuestionResult,
  MockTestRecord,
  MistakeEntry,
} from '../types';

/**
 * Heuristic weight calculator to prioritize questions for a mock test.
 * Prioritizes:
 * 1. Previously difficult questions (failed reviews, low mastery)
 * 2. Questions that need reinforcement (low ease factor, low consecutive successes)
 * 3. Weak patterns (patterns with frequent mistakes or fails)
 * 4. Recently learned questions needing recall testing
 */
export function calculateQuestionMockWeight(
  question: Question,
  mistakes: MistakeEntry[] = []
): number {
  let weight = 10;

  // 1. Previously difficult & failed reviews
  if (question.failedReviews > 0) {
    weight += question.failedReviews * 15;
  }

  // 2. Low mastery (0-2 mastery gets higher test priority)
  if (question.mastery <= 1) {
    weight += 20;
  } else if (question.mastery === 2) {
    weight += 12;
  } else if (question.mastery === 3) {
    weight += 5;
  } else if (question.mastery >= 5) {
    weight -= 5; // Mastered questions selected less frequently in mocks
  }

  // 3. Reinforcement need (low ease factor)
  if (question.easeFactor < 2.3) {
    weight += 15;
  } else if (question.easeFactor < 2.5) {
    weight += 8;
  }

  // 4. Low consecutive successes
  if (question.consecutiveSuccesses === 0 && question.reviewCount > 0) {
    weight += 10;
  }

  // 5. Linked mistake entries
  const questionMistakes = mistakes.filter((m) => m.questionId === question.id);
  const unresolvedMistakes = questionMistakes.filter((m) => !m.isResolved);
  weight += unresolvedMistakes.length * 12;
  weight += questionMistakes.length * 4;

  // 6. Recency boost (learned within the past 21 days)
  if (question.firstLearnedAt || question.createdAt) {
    const createdDate = new Date(question.firstLearnedAt || question.createdAt);
    const daysSince = Math.max(0, Math.floor((Date.now() - createdDate.getTime()) / (1000 * 60 * 60 * 24)));
    if (daysSince <= 7) {
      weight += 14;
    } else if (daysSince <= 21) {
      weight += 8;
    }
  }

  return Math.max(1, weight);
}

/**
 * Calculates difficulty slots based on total count and selected distribution mode.
 */
export function getDifficultySlotTargets(
  count: number,
  distribution: MockTestConfig['difficultyDistribution']
): { Easy: number; Medium: number; Hard: number } {
  if (count <= 0) return { Easy: 0, Medium: 0, Hard: 0 };

  if (distribution === 'Balanced') {
    if (count === 1) return { Easy: 0, Medium: 1, Hard: 0 };
    if (count === 2) return { Easy: 1, Medium: 1, Hard: 0 };
    if (count === 3) return { Easy: 1, Medium: 1, Hard: 1 };
    if (count === 4) return { Easy: 1, Medium: 2, Hard: 1 };
    if (count === 5) return { Easy: 1, Medium: 3, Hard: 1 };
    // General case: 25% Easy, 50% Medium, 25% Hard
    const easy = Math.max(1, Math.round(count * 0.25));
    const hard = Math.max(1, Math.round(count * 0.25));
    const medium = Math.max(1, count - easy - hard);
    return { Easy: easy, Medium: medium, Hard: hard };
  }

  if (distribution === 'Mostly Medium') {
    if (count === 1) return { Easy: 0, Medium: 1, Hard: 0 };
    if (count === 2) return { Easy: 0, Medium: 2, Hard: 0 };
    if (count === 3) return { Easy: 1, Medium: 2, Hard: 0 };
    const easy = Math.max(0, Math.floor(count * 0.2));
    const hard = Math.max(0, Math.floor(count * 0.2));
    const medium = Math.max(1, count - easy - hard);
    return { Easy: easy, Medium: medium, Hard: hard };
  }

  if (distribution === 'Hard Heavy') {
    if (count === 1) return { Easy: 0, Medium: 0, Hard: 1 };
    if (count === 2) return { Easy: 0, Medium: 1, Hard: 1 };
    if (count === 3) return { Easy: 0, Medium: 1, Hard: 2 };
    const easy = Math.max(0, Math.floor(count * 0.15));
    const hard = Math.max(1, Math.round(count * 0.55));
    const medium = Math.max(1, count - easy - hard);
    return { Easy: easy, Medium: medium, Hard: hard };
  }

  // 'All Difficulties' - no strict quotas, all slots pooled
  return { Easy: count, Medium: count, Hard: count };
}

/**
 * Generates an optimized Mock Test question list strictly from personal question database.
 */
export function generateMockTest(
  questions: Question[],
  config: MockTestConfig,
  mistakes: MistakeEntry[] = []
): { selectedQuestions: Question[]; candidateCount: number; warningMessage?: string } {
  // 1. Filter out archived questions
  let candidates = questions.filter((q) => !q.isArchived);

  // 2. Filter by topic selection if specified
  if (config.selectedTopicIds && config.selectedTopicIds.length > 0) {
    candidates = candidates.filter((q) => config.selectedTopicIds.includes(q.topicId));
  }

  // 3. Filter by pattern selection if specified
  if (config.selectedPatterns && config.selectedPatterns.length > 0) {
    candidates = candidates.filter((q) => config.selectedPatterns.includes(q.pattern));
  }

  const candidateCount = candidates.length;
  if (candidateCount === 0) {
    return {
      selectedQuestions: [],
      candidateCount: 0,
      warningMessage: 'No matching questions found in your personal database for the selected filters.',
    };
  }

  // 4. Calculate weighted score for each candidate
  const scoredCandidates = candidates.map((q) => ({
    question: q,
    weight: calculateQuestionMockWeight(q, mistakes),
  }));

  // Sort candidates by weight descending (with slight deterministic entropy)
  const sortedCandidates = [...scoredCandidates].sort((a, b) => b.weight - a.weight);

  const targetCount = Math.min(config.questionCount, candidates.length);

  if (config.difficultyDistribution === 'All Difficulties') {
    // Pick top targetCount by weight
    const selected = sortedCandidates.slice(0, targetCount).map((item) => item.question);
    return { selectedQuestions: selected, candidateCount };
  }

  // Structured difficulty quota selection
  const slots = getDifficultySlotTargets(targetCount, config.difficultyDistribution);
  const selected: Question[] = [];
  const selectedIds = new Set<string>();

  const difficulties: Difficulty[] = ['Easy', 'Medium', 'Hard'];

  // Fill targeted quota for each difficulty
  difficulties.forEach((diff) => {
    const quota = slots[diff] || 0;
    if (quota <= 0) return;

    const matchingForDiff = sortedCandidates.filter(
      (item) => item.question.difficulty === diff && !selectedIds.has(item.question.id)
    );

    const picked = matchingForDiff.slice(0, quota);
    picked.forEach((item) => {
      selected.push(item.question);
      selectedIds.add(item.question.id);
    });
  });

  // If we still need more questions because a specific difficulty quota lacked candidates,
  // backfill from remaining highest-weighted candidates of any difficulty
  if (selected.length < targetCount) {
    const remaining = sortedCandidates.filter((item) => !selectedIds.has(item.question.id));
    const needed = targetCount - selected.length;
    const backfill = remaining.slice(0, needed);
    backfill.forEach((item) => {
      selected.push(item.question);
      selectedIds.add(item.question.id);
    });
  }

  // Order test questions smoothly: Easy -> Medium -> Hard (standard assessment ordering)
  const difficultyOrder: Record<Difficulty, number> = { Easy: 1, Medium: 2, Hard: 3 };
  selected.sort((a, b) => difficultyOrder[a.difficulty] - difficultyOrder[b.difficulty]);

  return {
    selectedQuestions: selected,
    candidateCount,
    warningMessage:
      selected.length < config.questionCount
        ? `Selected ${selected.length} questions (only ${candidateCount} questions available matching filters).`
        : undefined,
  };
}

/**
 * Outcome scoring multipliers:
 * - SOLVED_CLEANLY: 100% credit
 * - SOLVED_WITH_HINTS: 65% credit
 * - STRUGGLED_BUGGY: 35% credit
 * - COULD_NOT_SOLVE / UNATTEMPTED: 0% credit
 */
export const OUTCOME_SCORE_MAP: Record<MockQuestionOutcome, number> = {
  SOLVED_CLEANLY: 1.0,
  SOLVED_WITH_HINTS: 0.65,
  STRUGGLED_BUGGY: 0.35,
  COULD_NOT_SOLVE: 0.0,
  UNATTEMPTED: 0.0,
};

/**
 * Outcome difficulty base points:
 * Easy: 20 pts
 * Medium: 35 pts
 * Hard: 50 pts
 */
export const DIFFICULTY_BASE_POINTS: Record<Difficulty, number> = {
  Easy: 20,
  Medium: 35,
  Hard: 50,
};

/**
 * Calculates complete results and performance breakdown upon submitting a mock test.
 */
export function calculateMockResults(
  config: MockTestConfig,
  results: MockQuestionResult[],
  timeSpentSeconds: number
): MockTestRecord {
  const totalQuestions = results.length;

  let totalEarnedPoints = 0;
  let totalMaxPoints = 0;

  let solvedCount = 0;
  let partiallySolvedCount = 0;
  let failedCount = 0;

  const diffMap: Record<Difficulty, { total: number; solved: number }> = {
    Easy: { total: 0, solved: 0 },
    Medium: { total: 0, solved: 0 },
    Hard: { total: 0, solved: 0 },
  };

  const patternMap: Record<string, { total: number; solved: number }> = {};

  results.forEach((res) => {
    const basePoints = DIFFICULTY_BASE_POINTS[res.difficulty] || 30;
    const multiplier = OUTCOME_SCORE_MAP[res.outcome] ?? 0;
    const earned = basePoints * multiplier;

    totalEarnedPoints += earned;
    totalMaxPoints += basePoints;

    // Difficulty breakdown
    if (diffMap[res.difficulty]) {
      diffMap[res.difficulty].total += 1;
      if (res.outcome === 'SOLVED_CLEANLY' || res.outcome === 'SOLVED_WITH_HINTS') {
        diffMap[res.difficulty].solved += 1;
      }
    }

    // Pattern breakdown
    const patternKey = res.pattern || 'Other';
    if (!patternMap[patternKey]) {
      patternMap[patternKey] = { total: 0, solved: 0 };
    }
    patternMap[patternKey].total += 1;
    if (res.outcome === 'SOLVED_CLEANLY' || res.outcome === 'SOLVED_WITH_HINTS') {
      patternMap[patternKey].solved += 1;
    }

    // Outcome counts
    if (res.outcome === 'SOLVED_CLEANLY') {
      solvedCount += 1;
    } else if (res.outcome === 'SOLVED_WITH_HINTS' || res.outcome === 'STRUGGLED_BUGGY') {
      partiallySolvedCount += 1;
    } else {
      failedCount += 1;
    }
  });

  const rawScore = totalMaxPoints > 0 ? Math.round((totalEarnedPoints / totalMaxPoints) * 100) : 0;
  const accuracyPercent =
    totalQuestions > 0
      ? Math.round(((solvedCount + partiallySolvedCount * 0.5) / totalQuestions) * 100)
      : 0;

  const patternBreakdown = Object.entries(patternMap).map(([pattern, data]) => ({
    pattern,
    total: data.total,
    solved: data.solved,
  }));

  return {
    id: 'mock-' + Math.random().toString(36).substring(2, 9),
    title: config.title || 'Weekly Assessment Mock',
    completedAt: new Date().toISOString(),
    timeLimitMinutes: config.timeLimitMinutes,
    timeSpentSeconds,
    totalQuestions,
    score: rawScore,
    accuracyPercent,
    solvedCount,
    partiallySolvedCount,
    failedCount,
    difficultyBreakdown: {
      easy: diffMap.Easy,
      medium: diffMap.Medium,
      hard: diffMap.Hard,
    },
    patternBreakdown,
    questionResults: results,
  };
}

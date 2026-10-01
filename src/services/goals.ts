import type {
  StudyGoal,
  Question,
  StudySessionRecord,
  MockTestRecord,
  DailyTargetsConfig,
  TodayStudyMetrics,
} from '../types';

/**
 * Calculates current progress for a goal based on real application database entities.
 */
export function calculateGoalProgress(
  goal: StudyGoal,
  questions: Question[],
  sessions: StudySessionRecord[] = [],
  mockTests: MockTestRecord[] = []
): { currentValue: number; progressPercent: number; isCompleted: boolean } {
  if (!goal.autoTrack && goal.currentValue !== undefined) {
    const currentValue = goal.currentValue;
    const progressPercent =
      goal.targetValue > 0
        ? Math.min(100, Math.round((currentValue / goal.targetValue) * 100))
        : 0;
    return {
      currentValue,
      progressPercent,
      isCompleted: currentValue >= goal.targetValue,
    };
  }

  let currentValue = 0;

  switch (goal.type) {
    case 'DSA_QUESTIONS': {
      // Total active questions in personal DB
      currentValue = questions.filter((q) => !q.isArchived).length;
      break;
    }

    case 'CONTESTS': {
      // Total completed mock assessments / contests
      currentValue = mockTests.length;
      break;
    }

    case 'STUDY_HOURS': {
      // Sum hours across all logged focus sessions + SRS review time
      let totalSeconds = sessions.reduce((acc, s) => acc + s.durationSeconds, 0);
      questions.forEach((q) => {
        q.reviewHistory.forEach((r) => {
          if (r.timeSpentSeconds) totalSeconds += r.timeSpentSeconds;
        });
      });
      mockTests.forEach((m) => {
        totalSeconds += m.timeSpentSeconds;
      });
      currentValue = Math.round((totalSeconds / 3600) * 10) / 10;
      break;
    }

    case 'MASTERED_PATTERNS': {
      // Unique patterns that have at least one question marked as MASTERED
      const masteredPatterns = new Set<string>();
      questions.forEach((q) => {
        if (q.status === 'MASTERED' && q.pattern) {
          masteredPatterns.add(q.pattern);
        }
      });
      currentValue = masteredPatterns.size;
      break;
    }

    case 'REVISIONS_COMPLETED': {
      // Total reviews recorded across all questions
      let count = 0;
      questions.forEach((q) => {
        count += q.reviewHistory.length;
      });
      currentValue = count;
      break;
    }

    case 'CUSTOM':
    default: {
      currentValue = goal.currentValue ?? 0;
      break;
    }
  }

  const progressPercent =
    goal.targetValue > 0
      ? Math.min(100, Math.round((currentValue / goal.targetValue) * 100))
      : 0;

  return {
    currentValue,
    progressPercent,
    isCompleted: currentValue >= goal.targetValue,
  };
}

/**
 * Computes today's study metrics dynamically from today's actual activity.
 */
export function getTodayMetrics(
  targets: DailyTargetsConfig,
  questions: Question[],
  sessions: StudySessionRecord[] = [],
  streakDays: number = 0
): TodayStudyMetrics {
  const todayStr = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

  // 1. New Questions added or first learned today
  const newQuestionsCompleted = questions.filter((q) => {
    if (!q.createdAt) return false;
    const createdDate = q.createdAt.split('T')[0];
    const firstLearnedDate = q.firstLearnedAt ? q.firstLearnedAt.split('T')[0] : null;
    return createdDate === todayStr || firstLearnedDate === todayStr;
  }).length;

  // 2. Revisions completed today (review logs matching today's date)
  let revisionsCompleted = 0;
  let reviewTimeSeconds = 0;

  questions.forEach((q) => {
    q.reviewHistory.forEach((r) => {
      if (r.reviewedAt && r.reviewedAt.split('T')[0] === todayStr) {
        revisionsCompleted += 1;
        if (r.timeSpentSeconds) reviewTimeSeconds += r.timeSpentSeconds;
      }
    });
  });

  // 3. Study time completed today (focus sessions + review logs)
  let sessionTimeSeconds = 0;
  sessions.forEach((s) => {
    if (s.startedAt && s.startedAt.split('T')[0] === todayStr) {
      sessionTimeSeconds += s.durationSeconds;
    }
  });

  const totalStudyMinutesToday = Math.round((reviewTimeSeconds + sessionTimeSeconds) / 60);

  return {
    newQuestionsTarget: targets.newQuestionsTarget,
    newQuestionsCompleted,
    revisionsTarget: targets.revisionsTarget,
    revisionsCompleted,
    studyTimeTargetMinutes: targets.studyTimeTargetMinutes,
    studyTimeCompletedMinutes: totalStudyMinutesToday,
    streakDays,
  };
}

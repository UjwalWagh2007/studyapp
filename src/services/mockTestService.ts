import type {
  Problem,
  MockTest,
  MockTestQuestion,
  MockTestDay,
  MockQuestionSelfAssessment,
  MockTestTimeAnalytics,
} from '../types';
import { normalizeDate } from './spacedRepetition';

/**
 * Calculates Monday 00:00:00 through Sunday 23:59:59 for a given reference date.
 */
export function getWeekInfo(refDate: Date = new Date()): {
  weekKey: string;
  weekLabel: string;
  mondayDate: Date;
  fridayDate: Date;
  saturdayDateStr: string;
  sundayDateStr: string;
  isWeekendOrFridayPast: boolean;
} {
  const d = new Date(refDate);
  const dayOfWeek = d.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat

  // Monday offset: if Sun (0), offset is -6. Otherwise 1 - dayOfWeek
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  
  const monday = new Date(d);
  monday.setDate(d.getDate() + diffToMonday);
  monday.setHours(0, 0, 0, 0);

  const friday = new Date(monday);
  friday.setDate(monday.getDate() + 4);
  friday.setHours(23, 59, 59, 999);

  const saturday = new Date(monday);
  saturday.setDate(monday.getDate() + 5);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  const mondayStr = normalizeDate(monday);
  const fridayStr = normalizeDate(friday);
  const saturdayDateStr = normalizeDate(saturday);
  const sundayDateStr = normalizeDate(sunday);

  const monMonth = monday.toLocaleDateString('en-US', { month: 'short' });
  const friMonth = friday.toLocaleDateString('en-US', { month: 'short' });
  const year = friday.getFullYear();

  const weekLabel = monMonth === friMonth
    ? `Week of ${monMonth} ${monday.getDate()} – ${friday.getDate()}, ${year}`
    : `Week of ${monMonth} ${monday.getDate()} – ${friMonth} ${friday.getDate()}, ${year}`;

  const weekKey = `${mondayStr}_to_${fridayStr}`;
  const isWeekendOrFridayPast = dayOfWeek === 0 || dayOfWeek === 6 || (dayOfWeek === 5 && d.getHours() >= 17);

  return {
    weekKey,
    weekLabel,
    mondayDate: monday,
    fridayDate: friday,
    saturdayDateStr,
    sundayDateStr,
    isWeekendOrFridayPast,
  };
}

/**
 * Extracts problems solved between Monday 00:00:00 and Friday 23:59:59.
 */
export function getMonFriSolvedProblems(
  problems: Problem[],
  mondayDate: Date,
  fridayDate: Date
): Problem[] {
  const monTime = mondayDate.getTime();
  const friTime = fridayDate.getTime();

  return problems.filter((p) => {
    if (!p.solvedAt) return false;
    const solvedTime = new Date(p.solvedAt).getTime();
    return solvedTime >= monTime && solvedTime <= friTime;
  });
}

/**
 * Fisher-Yates array shuffle.
 */
function shuffleArray<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/**
 * Generates balanced Saturday and Sunday mock tests from Monday–Friday solved problems.
 * If tests already exist for the given weekKey, returns existing tests so questions remain fixed.
 */
export function generateWeeklyMockTests(
  problems: Problem[],
  existingTests: MockTest[],
  refDate: Date = new Date()
): {
  saturdayTest: MockTest | null;
  sundayTest: MockTest | null;
  eligibleProblemsCount: number;
  weekLabel: string;
} {
  const week = getWeekInfo(refDate);

  // Check if tests already exist for this weekKey
  const existingSat = existingTests.find(
    (t) => t.weekKey === week.weekKey && t.testDay === 'SATURDAY'
  );
  const existingSun = existingTests.find(
    (t) => t.weekKey === week.weekKey && t.testDay === 'SUNDAY'
  );

  if (existingSat && existingSun) {
    return {
      saturdayTest: existingSat,
      sundayTest: existingSun,
      eligibleProblemsCount: existingSat.questions.length + existingSun.questions.length,
      weekLabel: week.weekLabel,
    };
  }

  // Get eligible Mon-Fri solved problems
  const eligibleProblems = getMonFriSolvedProblems(problems, week.mondayDate, week.fridayDate);

  if (eligibleProblems.length === 0) {
    return {
      saturdayTest: existingSat || null,
      sundayTest: existingSun || null,
      eligibleProblemsCount: 0,
      weekLabel: week.weekLabel,
    };
  }

  // Group by difficulty: Easy, Medium, Hard
  const easyPool = shuffleArray(eligibleProblems.filter((p) => p.difficulty === 'Easy'));
  const mediumPool = shuffleArray(eligibleProblems.filter((p) => p.difficulty === 'Medium'));
  const hardPool = shuffleArray(eligibleProblems.filter((p) => p.difficulty === 'Hard'));

  const satProblems: Problem[] = [];
  const sunProblems: Problem[] = [];

  const distributeBucket = (bucket: Problem[]) => {
    bucket.forEach((p, idx) => {
      if (idx % 2 === 0) {
        satProblems.push(p);
      } else {
        sunProblems.push(p);
      }
    });
  };

  distributeBucket(easyPool);
  distributeBucket(mediumPool);
  distributeBucket(hardPool);

  // If one test is empty while we only had 1 problem, satProblems has 1, sunProblems has 0 (or vice versa)
  const shuffledSat = shuffleArray(satProblems);
  const shuffledSun = shuffleArray(sunProblems);

  const nowIso = new Date().toISOString();

  const createTestObject = (
    day: MockTestDay,
    schedDate: string,
    probs: Problem[]
  ): MockTest => {
    const questions: MockTestQuestion[] = probs.map((p, idx) => ({
      problemId: p.id,
      title: p.title,
      topicName: p.topicName,
      difficulty: p.difficulty,
      pattern: p.pattern,
      link: p.link,
      order: idx + 1,
      isCompleted: false,
      timeSpentSeconds: 0,
    }));

    const easyTotal = probs.filter((p) => p.difficulty === 'Easy').length;
    const mediumTotal = probs.filter((p) => p.difficulty === 'Medium').length;
    const hardTotal = probs.filter((p) => p.difficulty === 'Hard').length;

    return {
      id: `mock-${week.weekKey}-${day}`,
      weekKey: week.weekKey,
      weekLabel: week.weekLabel,
      testDay: day,
      scheduledDate: schedDate,
      status: 'NOT_STARTED',
      questions,
      currentQuestionIndex: 0,
      totalTimeSeconds: 0,
      score: 0,
      maxScore: questions.length,
      percentage: 0,
      easyScore: 0,
      easyTotal,
      mediumScore: 0,
      mediumTotal,
      hardScore: 0,
      hardTotal,
      createdAt: nowIso,
      updatedAt: nowIso,
    };
  };

  const saturdayTest = existingSat || createTestObject('SATURDAY', week.saturdayDateStr, shuffledSat);
  const sundayTest = existingSun || createTestObject('SUNDAY', week.sundayDateStr, shuffledSun);

  return {
    saturdayTest,
    sundayTest,
    eligibleProblemsCount: eligibleProblems.length,
    weekLabel: week.weekLabel,
  };
}

/**
 * Returns current live question elapsed seconds using real ISO timestamps.
 */
export function getLiveQuestionTime(
  question: MockTestQuestion,
  isActiveQuestion: boolean,
  activeStartedAt?: string,
  now: Date = new Date()
): number {
  if (!isActiveQuestion || !activeStartedAt) {
    return question.timeSpentSeconds || 0;
  }
  const startTimeMs = new Date(activeStartedAt).getTime();
  const elapsedSecs = Math.max(0, Math.floor((now.getTime() - startTimeMs) / 1000));
  return (question.timeSpentSeconds || 0) + elapsedSecs;
}

/**
 * Starts or switches active question timer.
 */
export function setActiveQuestion(
  test: MockTest,
  targetIndex: number,
  now: Date = new Date()
): MockTest {
  const nowIso = now.toISOString();
  let updatedQuestions = [...test.questions];

  // If a question was actively ticking, flush its elapsed time
  if (test.activeQuestionStartedAt && test.status === 'IN_PROGRESS') {
    const currIdx = test.currentQuestionIndex;
    const currQ = updatedQuestions[currIdx];
    if (currQ) {
      const liveTime = getLiveQuestionTime(currQ, true, test.activeQuestionStartedAt, now);
      updatedQuestions[currIdx] = {
        ...currQ,
        timeSpentSeconds: liveTime,
      };
    }
  }

  const targetQ = updatedQuestions[targetIndex];
  if (targetQ && !targetQ.startedAt) {
    updatedQuestions[targetIndex] = {
      ...targetQ,
      startedAt: nowIso,
    };
  }

  return {
    ...test,
    questions: updatedQuestions,
    currentQuestionIndex: targetIndex,
    activeQuestionStartedAt: test.status === 'IN_PROGRESS' ? nowIso : undefined,
    status: test.status === 'NOT_STARTED' ? 'IN_PROGRESS' : test.status,
    startedAt: test.startedAt || nowIso,
    updatedAt: nowIso,
  };
}

/**
 * Starts the overall Mock Test.
 */
export function startMockTest(
  test: MockTest,
  startIndex: number = 0,
  now: Date = new Date()
): MockTest {
  const nowIso = now.toISOString();
  const updatedQuestions = test.questions.map((q, idx) => {
    if (idx === startIndex) {
      return { ...q, startedAt: q.startedAt || nowIso };
    }
    return q;
  });

  return {
    ...test,
    status: 'IN_PROGRESS',
    currentQuestionIndex: startIndex,
    activeQuestionStartedAt: nowIso,
    startedAt: test.startedAt || nowIso,
    questions: updatedQuestions,
    updatedAt: nowIso,
  };
}

/**
 * Pauses the mock test (e.g. taking a pause/break).
 */
export function pauseMockTest(
  test: MockTest,
  now: Date = new Date()
): MockTest {
  if (test.status !== 'IN_PROGRESS') return test;
  const nowIso = now.toISOString();

  let updatedQuestions = [...test.questions];
  const currQ = updatedQuestions[test.currentQuestionIndex];
  if (currQ && test.activeQuestionStartedAt) {
    const liveTime = getLiveQuestionTime(currQ, true, test.activeQuestionStartedAt, now);
    updatedQuestions[test.currentQuestionIndex] = {
      ...currQ,
      timeSpentSeconds: liveTime,
    };
  }

  return {
    ...test,
    status: 'PAUSED',
    activeQuestionStartedAt: undefined,
    questions: updatedQuestions,
    updatedAt: nowIso,
  };
}

/**
 * Resumes a paused mock test.
 */
export function resumeMockTest(
  test: MockTest,
  now: Date = new Date()
): MockTest {
  if (test.status !== 'PAUSED') return test;
  const nowIso = now.toISOString();

  return {
    ...test,
    status: 'IN_PROGRESS',
    activeQuestionStartedAt: nowIso,
    updatedAt: nowIso,
  };
}

/**
 * Marks a question completed with user's self assessment.
 */
export function completeQuestion(
  test: MockTest,
  questionIndex: number,
  assessment: MockQuestionSelfAssessment,
  now: Date = new Date()
): MockTest {
  const nowIso = now.toISOString();
  let updatedQuestions = [...test.questions];
  const targetQ = updatedQuestions[questionIndex];

  if (!targetQ) return test;

  const isCurrentActive = test.currentQuestionIndex === questionIndex && Boolean(test.activeQuestionStartedAt);
  const finalTime = getLiveQuestionTime(targetQ, isCurrentActive, test.activeQuestionStartedAt, now);

  updatedQuestions[questionIndex] = {
    ...targetQ,
    isCompleted: true,
    assessment,
    timeSpentSeconds: finalTime,
    completedAt: nowIso,
  };

  // If next question exists, we can optionally advance
  return {
    ...test,
    questions: updatedQuestions,
    activeQuestionStartedAt: isCurrentActive ? nowIso : test.activeQuestionStartedAt,
    updatedAt: nowIso,
  };
}

/**
 * Finalizes and completes the entire mock test.
 */
export function finishMockTest(
  test: MockTest,
  now: Date = new Date()
): MockTest {
  const nowIso = now.toISOString();
  let updatedQuestions = [...test.questions];

  // Flush active question if still ticking
  if (test.activeQuestionStartedAt && test.status === 'IN_PROGRESS') {
    const currQ = updatedQuestions[test.currentQuestionIndex];
    if (currQ) {
      const live = getLiveQuestionTime(currQ, true, test.activeQuestionStartedAt, now);
      updatedQuestions[test.currentQuestionIndex] = {
        ...currQ,
        timeSpentSeconds: live,
      };
    }
  }

  let totalTimeSecs = 0;
  let score = 0;
  let easyScore = 0;
  let easyTotal = 0;
  let mediumScore = 0;
  let mediumTotal = 0;
  let hardScore = 0;
  let hardTotal = 0;

  updatedQuestions.forEach((q) => {
    totalTimeSecs += q.timeSpentSeconds || 0;

    const isSolved = q.assessment === 'SOLVED_INDEPENDENTLY';
    const isPartial = q.assessment === 'NEEDED_HELP';

    const points = isSolved ? 1 : isPartial ? 0.5 : 0;
    score += points;

    if (q.difficulty === 'Easy') {
      easyTotal++;
      easyScore += points;
    } else if (q.difficulty === 'Medium') {
      mediumTotal++;
      mediumScore += points;
    } else if (q.difficulty === 'Hard') {
      hardTotal++;
      hardScore += points;
    }
  });

  const maxScore = updatedQuestions.length;
  const percentage = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;

  return {
    ...test,
    status: 'COMPLETED',
    questions: updatedQuestions,
    activeQuestionStartedAt: undefined,
    totalTimeSeconds: totalTimeSecs,
    score,
    maxScore,
    percentage,
    easyScore,
    easyTotal,
    mediumScore,
    mediumTotal,
    hardScore,
    hardTotal,
    completedAt: nowIso,
    updatedAt: nowIso,
  };
}

/**
 * Calculates detailed time analytics for a completed mock test.
 */
export function computeMockTestAnalytics(test: MockTest): MockTestTimeAnalytics {
  const questions = test.questions;
  const totalTimeSeconds = test.totalTimeSeconds || questions.reduce((sum, q) => sum + (q.timeSpentSeconds || 0), 0);
  const averageTimeSeconds = questions.length > 0 ? Math.round(totalTimeSeconds / questions.length) : 0;

  let fastest: { title: string; seconds: number } | undefined;
  let slowest: { title: string; seconds: number } | undefined;

  questions.forEach((q) => {
    const sec = q.timeSpentSeconds || 0;
    if (sec > 0) {
      if (!fastest || sec < fastest.seconds) {
        fastest = { title: q.title, seconds: sec };
      }
      if (!slowest || sec > slowest.seconds) {
        slowest = { title: q.title, seconds: sec };
      }
    }
  });

  return {
    totalTimeSeconds,
    averageTimeSeconds,
    fastestQuestion: fastest,
    slowestQuestion: slowest,
  };
}

/**
 * Formats seconds into human-readable representation (e.g. 1h 12m or 5m 29s or 42s).
 */
export function formatTestDuration(totalSecs: number): string {
  const hours = Math.floor(totalSecs / 3600);
  const mins = Math.floor((totalSecs % 3600) / 60);
  const secs = totalSecs % 60;

  if (hours > 0) {
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  }
  if (mins > 0) {
    return secs > 0 ? `${mins}m ${String(secs).padStart(2, '0')}s` : `${mins}m`;
  }
  return `${secs}s`;
}

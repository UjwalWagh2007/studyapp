import { describe, it, expect } from 'vitest';
import {
  getWeekInfo,
  getMonFriSolvedProblems,
  generateWeeklyMockTests,
  startMockTest,
  setActiveQuestion,
  completeQuestion,
  finishMockTest,
  computeMockTestAnalytics,
} from './mockTestService';
import type { Problem } from '../types';

describe('mockTestService', () => {
  const createMockProblem = (
    id: string,
    title: string,
    difficulty: 'Easy' | 'Medium' | 'Hard',
    solvedAt: string
  ): Problem => ({
    id,
    topicId: 'top-1',
    topicName: 'DSA',
    title,
    difficulty,
    solvedAt,
    createdAt: solvedAt,
    updatedAt: solvedAt,
    status: 'LEARNING',
    currentIntervalDays: 1,
    easeFactor: 2.5,
    reviewCount: 0,
    reviewHistory: [],
  });

  it('correctly calculates Monday 00:00 through Friday 23:59 for a given week', () => {
    // Reference date: Wednesday Oct 7, 2026
    const refDate = new Date('2026-10-07T12:00:00.000Z');
    const week = getWeekInfo(refDate);

    expect(week.saturdayDateStr).toBe('2026-10-10');
    expect(week.sundayDateStr).toBe('2026-10-11');
    expect(week.mondayDate.getDay()).toBe(1); // Monday
    expect(week.fridayDate.getDay()).toBe(5); // Friday
  });

  it('filters only problems solved between Monday and Friday of that week', () => {
    const monday = new Date('2026-10-05T00:00:00.000Z');
    const friday = new Date('2026-10-09T23:59:59.999Z');

    const problems: Problem[] = [
      createMockProblem('p1', 'Mon Problem', 'Easy', '2026-10-05T10:00:00.000Z'),
      createMockProblem('p2', 'Wed Problem', 'Medium', '2026-10-07T14:30:00.000Z'),
      createMockProblem('p3', 'Fri Problem', 'Hard', '2026-10-09T18:00:00.000Z'),
      createMockProblem('p4', 'Previous Week', 'Easy', '2026-10-02T10:00:00.000Z'), // out of bounds
      createMockProblem('p5', 'Saturday Problem', 'Easy', '2026-10-10T10:00:00.000Z'), // out of bounds
    ];

    const eligible = getMonFriSolvedProblems(problems, monday, friday);
    expect(eligible.map((p) => p.id)).toEqual(['p1', 'p2', 'p3']);
  });

  it('splits weekly problems ~50/50 between Saturday and Sunday tests with balanced difficulty', () => {
    const problems: Problem[] = [
      createMockProblem('e1', 'Easy 1', 'Easy', '2026-10-05T10:00:00.000Z'),
      createMockProblem('e2', 'Easy 2', 'Easy', '2026-10-06T10:00:00.000Z'),
      createMockProblem('m1', 'Medium 1', 'Medium', '2026-10-07T10:00:00.000Z'),
      createMockProblem('m2', 'Medium 2', 'Medium', '2026-10-08T10:00:00.000Z'),
      createMockProblem('h1', 'Hard 1', 'Hard', '2026-10-09T10:00:00.000Z'),
    ];

    const refDate = new Date('2026-10-07T12:00:00.000Z');
    const { saturdayTest, sundayTest, eligibleProblemsCount } = generateWeeklyMockTests(
      problems,
      [],
      refDate
    );

    expect(eligibleProblemsCount).toBe(5);
    expect(saturdayTest).not.toBeNull();
    expect(sundayTest).not.toBeNull();

    // 5 total -> 3 Saturday, 2 Sunday (or 2/3)
    const satCount = saturdayTest!.questions.length;
    const sunCount = sundayTest!.questions.length;
    expect(satCount + sunCount).toBe(5);
    expect(Math.abs(satCount - sunCount)).toBeLessThanOrEqual(1);

    // Both should receive an Easy and a Medium
    expect(saturdayTest!.easyTotal + sundayTest!.easyTotal).toBe(2);
    expect(saturdayTest!.mediumTotal + sundayTest!.mediumTotal).toBe(2);
    expect(saturdayTest!.hardTotal + sundayTest!.hardTotal).toBe(1);
  });

  it('keeps generated tests fixed and does not regenerate when tests exist', () => {
    const problems: Problem[] = [
      createMockProblem('e1', 'Easy 1', 'Easy', '2026-10-05T10:00:00.000Z'),
      createMockProblem('e2', 'Easy 2', 'Easy', '2026-10-06T10:00:00.000Z'),
    ];
    const refDate = new Date('2026-10-07T12:00:00.000Z');
    const firstGen = generateWeeklyMockTests(problems, [], refDate);

    // Call again with first generated tests in existing list
    const secondGen = generateWeeklyMockTests(
      problems,
      [firstGen.saturdayTest!, firstGen.sundayTest!],
      refDate
    );

    expect(secondGen.saturdayTest?.id).toBe(firstGen.saturdayTest?.id);
    expect(secondGen.saturdayTest?.questions[0].problemId).toBe(
      firstGen.saturdayTest?.questions[0].problemId
    );
  });

  it('tracks question timing, handles pause/resume, and accurately scores completed test', () => {
    const problems: Problem[] = [
      createMockProblem('e1', 'Two Sum', 'Easy', '2026-10-05T10:00:00.000Z'),
      createMockProblem('m1', 'Binary Search', 'Medium', '2026-10-06T10:00:00.000Z'),
    ];
    const refDate = new Date('2026-10-07T12:00:00.000Z');
    const { saturdayTest } = generateWeeklyMockTests(problems, [], refDate);
    expect(saturdayTest).not.toBeNull();

    // 1. Start test at 10:00:00
    const t0 = new Date('2026-10-10T10:00:00.000Z');
    let test = startMockTest(saturdayTest!, 0, t0);
    expect(test.status).toBe('IN_PROGRESS');

    // 2. Complete Q0 at 10:04:30 (4m 30s) as SOLVED_INDEPENDENTLY
    const t1 = new Date('2026-10-10T10:04:30.000Z');
    test = completeQuestion(test, 0, 'SOLVED_INDEPENDENTLY', t1);
    expect(test.questions[0].isCompleted).toBe(true);
    expect(test.questions[0].timeSpentSeconds).toBe(270);

    // 3. Switch to Q1 at 10:04:30
    test = setActiveQuestion(test, 1, t1);

    // 4. Complete Q1 at 10:10:00 (5m 30s) as NEEDED_HELP (partial score: 0.5)
    const t2 = new Date('2026-10-10T10:10:00.000Z');
    test = completeQuestion(test, 1, 'NEEDED_HELP', t2);
    expect(test.questions[1].timeSpentSeconds).toBe(330);

    // 5. Finish test
    const finalTest = finishMockTest(test, t2);
    expect(finalTest.status).toBe('COMPLETED');
    expect(finalTest.totalTimeSeconds).toBe(600); // 270 + 330
    expect(finalTest.score).toBe(1.5); // 1 + 0.5
    expect(finalTest.maxScore).toBe(2);
    expect(finalTest.percentage).toBe(75);

    // 6. Check Analytics
    const analytics = computeMockTestAnalytics(finalTest);
    expect(analytics.totalTimeSeconds).toBe(600);
    expect(analytics.averageTimeSeconds).toBe(300);
    expect(analytics.fastestQuestion?.seconds).toBe(270);
    expect(analytics.slowestQuestion?.seconds).toBe(330);
  });
});

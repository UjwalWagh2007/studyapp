import type {
  Question,
  StudySessionRecord,
  MockTestRecord,
  ConsistencyDay,
  StreakStats,
  DailyTargetsConfig,
  HeatmapDayData,
  HeatmapWeekColumn,
  YearConsistencySummary,
  ConsistencyHeatmapData,
  HeatmapIntensityThresholds,
  ActivityIntensityLevel,
} from '../types';

/**
 * Format a Date object to YYYY-MM-DD string consistently in local time.
 */
export function formatDateToYMD(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Centralized, configurable intensity thresholds for Personal Study consistency.
 */
export const DEFAULT_HEATMAP_THRESHOLDS: HeatmapIntensityThresholds = {
  level1: { minRevisions: 1, minQuestions: 1, minStudyMinutes: 15 },
  level2: { minRevisions: 3, minQuestions: 2, minStudyMinutes: 30 },
  level3: { minRevisions: 6, minQuestions: 3, minStudyMinutes: 60, mockTestQualifies: true },
  level4: { minRevisions: 10, minQuestions: 5, minStudyMinutes: 90 },
};

/**
 * Evaluates activity intensity level (0 to 4) based on meaningful study activity.
 * 0 = No activity
 * 1 = Light activity
 * 2 = Moderate activity
 * 3 = Strong activity
 * 4 = Excellent / target completed
 */
export function calculateActivityIntensity(
  activity: {
    revisionsCount: number;
    questionsCount: number;
    studyMinutes: number;
    mockTestsCount?: number;
    targetMet?: boolean;
  },
  thresholds: HeatmapIntensityThresholds = DEFAULT_HEATMAP_THRESHOLDS
): { intensity: ActivityIntensityLevel; intensityLabel: string } {
  const revisions = activity.revisionsCount || 0;
  const questions = activity.questionsCount || 0;
  const minutes = activity.studyMinutes || 0;
  const mocks = activity.mockTestsCount || 0;

  // Level 4: Excellent / Target Completed
  if (
    activity.targetMet ||
    revisions >= thresholds.level4.minRevisions ||
    questions >= thresholds.level4.minQuestions ||
    minutes >= thresholds.level4.minStudyMinutes ||
    (mocks >= 1 && revisions >= 5)
  ) {
    return {
      intensity: 4,
      intensityLabel: activity.targetMet
        ? 'Level 4 — Excellent (Daily Target Met)'
        : 'Level 4 — Excellent Study Activity',
    };
  }

  // Level 3: Strong Activity
  if (
    revisions >= thresholds.level3.minRevisions ||
    questions >= thresholds.level3.minQuestions ||
    minutes >= thresholds.level3.minStudyMinutes ||
    (thresholds.level3.mockTestQualifies && mocks >= 1)
  ) {
    return {
      intensity: 3,
      intensityLabel: 'Level 3 — Strong Activity',
    };
  }

  // Level 2: Moderate Activity
  if (
    revisions >= thresholds.level2.minRevisions ||
    questions >= thresholds.level2.minQuestions ||
    minutes >= thresholds.level2.minStudyMinutes
  ) {
    return {
      intensity: 2,
      intensityLabel: 'Level 2 — Moderate Activity',
    };
  }

  // Level 1: Light Activity
  if (
    revisions >= thresholds.level1.minRevisions ||
    questions >= thresholds.level1.minQuestions ||
    minutes >= thresholds.level1.minStudyMinutes ||
    mocks > 0
  ) {
    return {
      intensity: 1,
      intensityLabel: 'Level 1 — Light Activity',
    };
  }

  // Level 0: No Activity
  return {
    intensity: 0,
    intensityLabel: 'Level 0 — No Logged Activity',
  };
}

/**
 * Checks if a specific day had meaningful completed study activity.
 * Meaningful activities:
 * - >= 1 Spaced Repetition card review
 * - >= 1 New Question added / learned
 * - >= 15 mins focused study session
 * - >= 1 Mock assessment completed
 */
export function getDayActivitySummary(
  dateStr: string, // YYYY-MM-DD
  questions: Question[],
  sessions: StudySessionRecord[] = [],
  mockTests: MockTestRecord[] = []
): {
  isCompleted: boolean;
  meaningfulEventsCount: number;
  studyMinutes: number;
  revisionsCount: number;
  newQuestionsCount: number;
  mockTestsCount: number;
  mockTestsDetails: Array<{ title: string; scorePercent?: number }>;
} {
  let revisionsCount = 0;
  let reviewTimeSeconds = 0;
  let newQuestionsCount = 0;
  let sessionTimeSeconds = 0;
  let mockTestsCount = 0;
  const mockTestsDetails: Array<{ title: string; scorePercent?: number }> = [];

  // Check SRS Reviews
  questions.forEach((q) => {
    (q.reviewHistory || []).forEach((r) => {
      if (r.reviewedAt && r.reviewedAt.startsWith(dateStr)) {
        revisionsCount += 1;
        if (r.timeSpentSeconds) reviewTimeSeconds += r.timeSpentSeconds;
      }
    });
  });

  // Check New Questions
  questions.forEach((q) => {
    const createdDate = q.createdAt ? q.createdAt.split('T')[0] : null;
    const learnedDate = q.firstLearnedAt ? q.firstLearnedAt.split('T')[0] : null;
    if (createdDate === dateStr || learnedDate === dateStr) {
      newQuestionsCount += 1;
    }
  });

  // Check Focus Sessions
  sessions.forEach((s) => {
    if (s.startedAt && s.startedAt.startsWith(dateStr)) {
      sessionTimeSeconds += s.durationSeconds;
    }
  });

  // Check Mock Tests
  mockTests.forEach((m) => {
    if (m.completedAt && m.completedAt.startsWith(dateStr)) {
      mockTestsCount += 1;
      sessionTimeSeconds += m.timeSpentSeconds;
      mockTestsDetails.push({
        title: m.title || `Mock Assessment #${m.id.slice(-4)}`,
        scorePercent: m.accuracyPercent,
      });
    }
  });

  const studyMinutes = Math.round((reviewTimeSeconds + sessionTimeSeconds) / 60);

  // Meaningful events definition:
  const meaningfulEventsCount =
    revisionsCount + newQuestionsCount + mockTestsCount + (studyMinutes >= 15 ? 1 : 0);

  // A day is marked completed if it meets meaningful criteria
  const isCompleted =
    revisionsCount > 0 || newQuestionsCount > 0 || mockTestsCount > 0 || studyMinutes >= 15;

  return {
    isCompleted,
    meaningfulEventsCount,
    studyMinutes,
    revisionsCount,
    newQuestionsCount,
    mockTestsCount,
    mockTestsDetails,
  };
}

/**
 * Calculates complete streak and consistency stats across a rolling 30-day window.
 */
export function calculateStreakStats(
  questions: Question[],
  sessions: StudySessionRecord[] = [],
  mockTests: MockTestRecord[] = [],
  referenceDate: Date = new Date()
): StreakStats {
  const ref = new Date(referenceDate);
  const todayStr = formatDateToYMD(ref);
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // 1. Build last 30 days list
  const last30Days: ConsistencyDay[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate() - i);
    const dateStr = formatDateToYMD(d);
    const summary = getDayActivitySummary(dateStr, questions, sessions, mockTests);

    last30Days.push({
      date: dateStr,
      dayOfWeek: dayNames[d.getDay()],
      dayOfMonth: d.getDate(),
      isCompleted: summary.isCompleted,
      isToday: dateStr === todayStr,
      meaningfulEventsCount: summary.meaningfulEventsCount,
      studyMinutes: summary.studyMinutes,
      revisionsCount: summary.revisionsCount,
      newQuestionsCount: summary.newQuestionsCount,
    });
  }

  // 2. Extract last 7 days
  const last7Days = last30Days.slice(-7);

  // 3. Weekly & Monthly active days
  const weeklyActiveDaysCount = last7Days.filter((d) => d.isCompleted).length;
  const monthlyActiveDaysCount = last30Days.filter((d) => d.isCompleted).length;
  const monthlyConsistencyPercent = Math.round((monthlyActiveDaysCount / 30) * 100);

  // 4. Calculate Current Streak
  // Look backward from today (or yesterday if today has no activity yet)
  let currentStreak = 0;
  let checkIndex = 29; // today in last30Days

  if (last30Days[checkIndex]?.isCompleted) {
    while (checkIndex >= 0 && last30Days[checkIndex]?.isCompleted) {
      currentStreak += 1;
      checkIndex -= 1;
    }
  } else {
    // If today is not yet completed, check if streak from yesterday is still alive
    checkIndex = 28; // yesterday
    while (checkIndex >= 0 && last30Days[checkIndex]?.isCompleted) {
      currentStreak += 1;
      checkIndex -= 1;
    }
  }

  // 5. Calculate Best Streak across the 30-day window
  let bestStreak = 0;
  let tempStreak = 0;
  for (let i = 0; i < last30Days.length; i++) {
    if (last30Days[i].isCompleted) {
      tempStreak += 1;
      if (tempStreak > bestStreak) bestStreak = tempStreak;
    } else {
      tempStreak = 0;
    }
  }

  bestStreak = Math.max(bestStreak, currentStreak);

  return {
    currentStreak,
    bestStreak,
    weeklyActiveDaysCount,
    weeklyTotalDays: 7,
    monthlyActiveDaysCount,
    monthlyTotalDays: 30,
    monthlyConsistencyPercent,
    last7Days,
    last30Days,
  };
}

/**
 * Generates approximately 52 weeks (12 months) of Personal Study consistency heatmap data.
 * Pure function: calculates grid columns, intensity levels, month markers, and motivational stats.
 */
export function generateYearConsistencyHeatmapData(
  questions: Question[],
  sessions: StudySessionRecord[] = [],
  mockTests: MockTestRecord[] = [],
  dailyTargets?: DailyTargetsConfig,
  referenceDate: Date = new Date(),
  thresholds: HeatmapIntensityThresholds = DEFAULT_HEATMAP_THRESHOLDS
): ConsistencyHeatmapData {
  const ref = new Date(referenceDate);
  const todayStr = formatDateToYMD(ref);
  const currentYear = ref.getFullYear();
  const currentMonth = ref.getMonth();

  // We align grid columns by week from Sunday to Saturday.
  // We produce 52 full weeks (52 columns * 7 rows = 364 cells).
  const dayOfWeek = ref.getDay(); // 0 = Sunday, 6 = Saturday
  const startSunday = new Date(
    ref.getFullYear(),
    ref.getMonth(),
    ref.getDate() - (dayOfWeek + 51 * 7)
  );

  const endOfTodayTime = new Date(
    ref.getFullYear(),
    ref.getMonth(),
    ref.getDate(),
    23,
    59,
    59,
    999
  ).getTime();

  const weeks: HeatmapWeekColumn[] = [];
  const monthHeaders: Array<{ label: string; colIndex: number }> = [];
  const daysMap: Record<string, HeatmapDayData> = {};

  const monthNamesShort = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ];

  let lastLabeledMonth = -1;
  let lastLabeledCol = -5;

  let totalRevisions = 0;
  let totalQuestions = 0;
  let totalStudyMinutes = 0;
  let totalMockTests = 0;

  const allPastDays: HeatmapDayData[] = [];

  // Iterate 52 weeks (columns)
  for (let w = 0; w < 52; w++) {
    const weekDays: (HeatmapDayData | null)[] = [];

    for (let d = 0; d < 7; d++) {
      const cellDate = new Date(
        startSunday.getFullYear(),
        startSunday.getMonth(),
        startSunday.getDate() + (w * 7 + d)
      );
      const cellDateStr = formatDateToYMD(cellDate);
      const isToday = cellDateStr === todayStr;
      const isFuture = cellDate.getTime() > endOfTodayTime;

      const m = cellDate.getMonth();
      const dom = cellDate.getDate();

      // Check month header marker: on the first day of a month or col 0
      if (!isFuture && (dom === 1 || (w === 0 && d === 0))) {
        if (m !== lastLabeledMonth && w - lastLabeledCol >= 3) {
          monthHeaders.push({
            label: monthNamesShort[m],
            colIndex: w,
          });
          lastLabeledMonth = m;
          lastLabeledCol = w;
        }
      }

      if (isFuture) {
        const futureDay: HeatmapDayData = {
          date: cellDateStr,
          dayOfWeek: d,
          dayOfMonth: dom,
          month: m,
          year: cellDate.getFullYear(),
          formattedDate: cellDate.toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          }),
          intensity: 0,
          intensityLabel: 'Future Date',
          isCompleted: false,
          isToday: false,
          isFuture: true,
          revisionsCount: 0,
          questionsCount: 0,
          studyMinutes: 0,
          mockTestsCount: 0,
          targetMet: false,
          targetProgressPercent: 0,
          meaningfulEventsCount: 0,
        };
        weekDays.push(futureDay);
        daysMap[cellDateStr] = futureDay;
      } else {
        const summary = getDayActivitySummary(cellDateStr, questions, sessions, mockTests);

        // Daily targets check
        let targetMet = false;
        let targetProgressPercent = 0;
        if (dailyTargets) {
          const qTarget = dailyTargets.newQuestionsTarget || 3;
          const rTarget = dailyTargets.revisionsTarget || 10;
          const tTarget = dailyTargets.studyTimeTargetMinutes || 90;

          const totalTarget = qTarget + rTarget + tTarget;
          const totalAchieved =
            summary.newQuestionsCount + summary.revisionsCount + summary.studyMinutes;
          targetProgressPercent =
            totalTarget > 0 ? Math.min(100, Math.round((totalAchieved / totalTarget) * 100)) : 0;

          targetMet =
            summary.newQuestionsCount >= qTarget &&
            summary.revisionsCount >= rTarget &&
            summary.studyMinutes >= tTarget;
        }

        const { intensity, intensityLabel } = calculateActivityIntensity(
          {
            revisionsCount: summary.revisionsCount,
            questionsCount: summary.newQuestionsCount,
            studyMinutes: summary.studyMinutes,
            mockTestsCount: summary.mockTestsCount,
            targetMet,
          },
          thresholds
        );

        const dayData: HeatmapDayData = {
          date: cellDateStr,
          dayOfWeek: d,
          dayOfMonth: dom,
          month: m,
          year: cellDate.getFullYear(),
          formattedDate: cellDate.toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          }),
          intensity,
          intensityLabel,
          isCompleted: summary.isCompleted,
          isToday,
          isFuture: false,
          revisionsCount: summary.revisionsCount,
          questionsCount: summary.newQuestionsCount,
          studyMinutes: summary.studyMinutes,
          mockTestsCount: summary.mockTestsCount,
          mockTestsDetails: summary.mockTestsDetails,
          targetMet,
          targetProgressPercent,
          meaningfulEventsCount: summary.meaningfulEventsCount,
        };

        weekDays.push(dayData);
        daysMap[cellDateStr] = dayData;
        allPastDays.push(dayData);

        totalRevisions += summary.revisionsCount;
        totalQuestions += summary.newQuestionsCount;
        totalStudyMinutes += summary.studyMinutes;
        totalMockTests += summary.mockTestsCount;
      }
    }

    weeks.push({
      weekIndex: w,
      days: weekDays,
    });
  }

  // Calculate Streak & Longest Streak across all historical days
  let currentStreak = 0;
  let longestStreak = 0;
  let runningStreak = 0;

  for (let i = 0; i < allPastDays.length; i++) {
    if (allPastDays[i].isCompleted) {
      runningStreak += 1;
      if (runningStreak > longestStreak) longestStreak = runningStreak;
    } else {
      runningStreak = 0;
    }
  }

  // Current Streak counting backward from today/yesterday
  const todayDay = allPastDays.find((d) => d.isToday);
  const todayIndex = allPastDays.findIndex((d) => d.isToday);

  if (todayDay && todayDay.isCompleted) {
    let idx = todayIndex;
    while (idx >= 0 && allPastDays[idx].isCompleted) {
      currentStreak += 1;
      idx -= 1;
    }
  } else if (todayIndex > 0) {
    // Check if streak was active yesterday
    let idx = todayIndex - 1;
    while (idx >= 0 && allPastDays[idx].isCompleted) {
      currentStreak += 1;
      idx -= 1;
    }
  }

  longestStreak = Math.max(longestStreak, currentStreak);

  // Active days this rolling year / period
  const activeDaysYear = allPastDays.filter((d) => d.isCompleted).length;
  const totalDaysYear = allPastDays.length;
  const yearConsistencyPercent =
    totalDaysYear > 0 ? Math.round((activeDaysYear / totalDaysYear) * 100) : 0;

  // Active days this month
  const thisMonthDays = allPastDays.filter(
    (d) => d.month === currentMonth && d.year === currentYear
  );
  const activeDaysMonth = thisMonthDays.filter((d) => d.isCompleted).length;
  const totalDaysMonth = thisMonthDays.length;
  const monthConsistencyPercent =
    totalDaysMonth > 0 ? Math.round((activeDaysMonth / totalDaysMonth) * 100) : 0;

  // Current week consistency (Sunday of current week to today)
  const currentWeekDays = weeks[weeks.length - 1]?.days.filter(
    (d): d is HeatmapDayData => d !== null && !d.isFuture
  ) || [];
  const currentWeekActiveDays = currentWeekDays.filter((d) => d.isCompleted).length;
  const currentWeekTotalDays = 7;

  const summary: YearConsistencySummary = {
    currentStreak,
    longestStreak,
    activeDaysYear,
    totalDaysYear,
    yearConsistencyPercent,
    activeDaysMonth,
    totalDaysMonth,
    monthConsistencyPercent,
    currentWeekActiveDays,
    currentWeekTotalDays,
    totalStudyHours: Math.round((totalStudyMinutes / 60) * 10) / 10,
    totalRevisions,
    totalQuestions,
    totalMockTests,
  };

  return {
    weeks,
    allDays: allPastDays,
    monthHeaders,
    summary,
    daysMap,
  };
}

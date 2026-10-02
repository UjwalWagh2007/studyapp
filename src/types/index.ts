// ==========================================================================
// PERSONAL CODING & REVISION SYSTEM TYPES
// ==========================================================================

export type RoutePath = 'dashboard' | 'topics' | 'revision' | 'calendar' | 'sessions' | 'mock-tests';

export type ThemeMode = 'light' | 'dark' | 'system';

export interface UserSettings {
  theme: ThemeMode;
}

export type ToastType = 'success' | 'info' | 'warning' | 'error';

export interface ToastItem {
  id: string;
  title: string;
  message?: string;
  type: ToastType;
  durationMs?: number;
}

// ==========================================================================
// CORE DATA MODELS: TOPIC & PROBLEM
// ==========================================================================

export type Difficulty = 'Easy' | 'Medium' | 'Hard';

export type ProblemStatus = 'LEARNING' | 'REVIEWING' | 'MASTERED';

export type ReviewRating = 'AGAIN' | 'HARD' | 'GOOD' | 'EASY';

export interface ReviewLog {
  id: string;
  problemId: string;
  reviewedAt: string;
  rating: ReviewRating;
  previousInterval: number;
  newInterval: number;
  previousEaseFactor?: number;
  newEaseFactor?: number;
  timeSpentSeconds?: number;
  notes?: string;
}

export interface Topic {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface Problem {
  id: string;
  topicId: string;
  topicName?: string;
  title: string;
  link?: string;
  difficulty: Difficulty;
  pattern?: string;
  solvedAt: string; // ISO date-time string
  createdAt: string;
  updatedAt: string;

  // Spaced Repetition Scheduling metadata
  status: ProblemStatus;
  currentIntervalDays: number;
  easeFactor: number;
  reviewCount: number;
  consecutiveSuccesses?: number;
  successfulReviews?: number;
  failedReviews?: number;
  nextReviewAt?: string; // YYYY-MM-DD
  lastReviewedAt?: string;
  reviewHistory: ReviewLog[];
}

export type CreateProblemInput = {
  topicId: string;
  topicName?: string;
  title: string;
  link?: string;
  difficulty: Difficulty;
  pattern?: string;
  solvedAt: string; // ISO date-time string
  status?: ProblemStatus;
  currentIntervalDays?: number;
  easeFactor?: number;
  reviewCount?: number;
  nextReviewAt?: string;
  reviewHistory?: ReviewLog[];
};

// Aliases for compatibility
export type Question = Problem;
export type CreateQuestionInput = CreateProblemInput;
export type QuestionStatus = ProblemStatus;

// ==========================================================================
// DAILY TARGETS, CONSISTENCY & STUDY SESSIONS TYPES
// ==========================================================================

export interface DailyTargetsConfig {
  problemsTarget: number; // e.g. 5
  revisionsTarget: number; // e.g. 5
  studyMinutesTarget: number; // e.g. 120 minutes (2 hours)
}

export type SessionStatus = 'RUNNING' | 'PAUSED' | 'COMPLETED';

export interface StudySession {
  id: string;
  name: string;
  status: SessionStatus;
  dateStr: string; // YYYY-MM-DD
  startTime: string; // ISO timestamp
  endTime?: string; // ISO timestamp
  focusSeconds: number; // Accumulated focus seconds
  breakSeconds: number; // Accumulated break seconds
  lastStateChangeAt: string; // ISO timestamp of when current state started
  createdAt: string;
  updatedAt: string;
}

export type HeatmapIntensity = 0 | 1 | 2 | 3 | 4 | 5; // 0=0%, 1=1-25%, 2=26-50%, 3=51-75%, 4=76-99%, 5=100% (Darkest Green)

export interface HeatmapDayData {
  dateStr: string; // YYYY-MM-DD
  displayDate: string; // e.g. "Oct 2, 2026"
  dayOfWeek: number; // 0=Sun .. 6=Sat
  problemsSolved: number;
  revisionsDone: number;
  studySeconds: number; // focus study seconds only
  progressPercentage: number;
  intensity: HeatmapIntensity;
  isFullyCompleted: boolean;
  isToday: boolean;
}

export interface TodayProgressMetrics {
  problemsSolved: number;
  problemsTarget: number;
  problemsPercentage: number;
  problemsCompleted: boolean;

  revisionsDone: number;
  revisionsTarget: number;
  revisionsPercentage: number;
  revisionsCompleted: boolean;

  studySeconds: number; // total focus seconds today
  studyMinutesTarget: number;
  studyPercentage: number;
  studyCompleted: boolean;

  allCompleted: boolean;
  overallPercentage: number;
}

// ==========================================================================
// CALENDAR REVISION TYPES
// ==========================================================================

export interface CalendarDayItem {
  dateStr: string; // YYYY-MM-DD
  displayDay: string; // e.g. "Oct 2"
  weekday: string; // e.g. "Thu"
  monthLabel: string;
  dayNumber: number;
  isToday: boolean;
  scheduledProblems: Problem[];
}

// ==========================================================================
// MOCK TESTS DATA MODELS
// ==========================================================================

export type MockTestDay = 'SATURDAY' | 'SUNDAY';
export type MockTestStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'PAUSED' | 'COMPLETED';
export type MockQuestionSelfAssessment = 'SOLVED_INDEPENDENTLY' | 'NEEDED_HELP' | 'COULD_NOT_SOLVE';

export interface MockTestQuestion {
  problemId: string;
  title: string;
  topicName?: string;
  difficulty: Difficulty;
  pattern?: string;
  link?: string;
  order: number;
  isCompleted: boolean;
  assessment?: MockQuestionSelfAssessment;
  timeSpentSeconds: number; // accumulated time on this question
  startedAt?: string; // ISO timestamp
  completedAt?: string; // ISO timestamp
}

export interface MockTest {
  id: string; // e.g. "mock-2026-10-03-SATURDAY"
  weekKey: string; // e.g. "2026-W40"
  weekLabel: string; // e.g. "Week of Sep 28 – Oct 2, 2026"
  testDay: MockTestDay;
  scheduledDate: string; // YYYY-MM-DD
  status: MockTestStatus;
  questions: MockTestQuestion[];
  currentQuestionIndex: number;
  activeQuestionStartedAt?: string; // ISO timestamp if timer actively ticking
  totalTimeSeconds: number;
  score: number; // e.g. 8 (sum of question points)
  maxScore: number; // e.g. 10
  percentage: number; // e.g. 80
  easyScore: number;
  easyTotal: number;
  mediumScore: number;
  mediumTotal: number;
  hardScore: number;
  hardTotal: number;
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MockTestTimeAnalytics {
  totalTimeSeconds: number;
  averageTimeSeconds: number;
  fastestQuestion?: { title: string; seconds: number };
  slowestQuestion?: { title: string; seconds: number };
}

// ==========================================================================
// MULTI-DEVICE PERSISTENCE & SYNC TYPES
// ==========================================================================

export interface DeviceSyncConfig {
  vaultId: string;
  secretKey: string;
  deviceName: string;
  isSyncEnabled: boolean;
  autoSyncIntervalSeconds: number;
  lastSuccessfulSyncAt?: string;
}

export type SyncStatus = 'IDLE' | 'SYNCING' | 'OFFLINE' | 'ERROR' | 'SUCCESS';

export interface SyncPayloadData {
  topics: Topic[];
  problems: Problem[];
  studySessions?: StudySession[];
  dailyTargets?: DailyTargetsConfig;
  mockTests?: MockTest[];
  version: number;
  exportedAt: string;
}

export interface SyncEnvelope {
  vaultId: string;
  deviceId: string;
  timestamp: string;
  data: SyncPayloadData;
}


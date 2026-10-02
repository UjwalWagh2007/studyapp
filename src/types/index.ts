// ==========================================================================
// SIMPLIFIED PERSONAL CODING & REVISION SYSTEM TYPES
// ==========================================================================

export type RoutePath = 'topics' | 'revision' | 'calendar';

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
  pattern: string;
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
  pattern: string;
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
  version: number;
  exportedAt: string;
}

export interface SyncEnvelope {
  vaultId: string;
  deviceId: string;
  timestamp: string;
  data: SyncPayloadData;
}

// ==========================================================================
// NAVIGATION & ROUTING TYPES
// ==========================================================================

export type RoutePath =
  | 'home'
  | 'learn/topics'
  | 'learn/questions'
  | 'learn/resources'
  | 'review/due-today'
  | 'review/calendar'
  | 'test/mock-tests'
  | 'test/mistake-bank'
  | 'track/platforms'
  | 'track/contests'
  | 'insights'
  | 'goals'
  | 'settings';

export type NavGroupKey = 'learn' | 'review' | 'test' | 'track';

export type ThemeMode = 'light' | 'dark' | 'system';

export interface UserSettings {
  userName: string;
  email?: string;
  avatarUrl?: string;
  theme: ThemeMode;
  sidebarCollapsed: boolean;
  compactMode: boolean;
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
// TOPIC & QUESTION MANAGEMENT TYPES (PART 3)
// ==========================================================================

export type Difficulty = 'Easy' | 'Medium' | 'Hard';

export type QuestionSource =
  | 'LeetCode'
  | 'GeeksforGeeks'
  | 'CodeChef'
  | 'Codeforces'
  | 'Other'
  | 'Custom';

export type QuestionStatus =
  | 'NEW'
  | 'LEARNING'
  | 'REVIEWING'
  | 'MASTERED'
  | 'ARCHIVED';

export type StandardPattern =
  | 'Two Pointers'
  | 'Sliding Window'
  | 'Fast & Slow Pointers'
  | 'Merge Intervals'
  | 'Cyclic Sort'
  | 'In-place Reversal of LinkedList'
  | 'Tree BFS'
  | 'Tree DFS'
  | 'Two Heaps'
  | 'Subsets & Backtracking'
  | 'Modified Binary Search'
  | 'Top K Elements'
  | 'K-way Merge'
  | '0/1 Knapsack'
  | 'Unbounded Knapsack'
  | 'Fibonacci DP'
  | 'Longest Common Subsequence DP'
  | 'Palindromic DP'
  | 'Topological Sort'
  | 'Union Find / Disjoint Set'
  | 'Prefix Sum / Monotonic Stack'
  | 'Bit Manipulation'
  | 'Trie'
  | 'Graph Shortest Paths'
  | 'Other';

export interface Topic {
  id: string;
  subject: string; // e.g. "Data Structures & Algorithms"
  name: string; // e.g. "Sliding Window"
  description?: string;
  color?: string;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
}

// ==========================================================================
// SPACED REPETITION ENGINE TYPES (PART 4)
// ==========================================================================

export type ReviewRating = 'AGAIN' | 'HARD' | 'GOOD' | 'EASY';

export interface ReviewLog {
  id: string;
  questionId: string;
  reviewedAt: string; // ISO timestamp
  rating: ReviewRating;
  previousInterval: number; // in days
  newInterval: number; // in days
  previousEaseFactor: number;
  newEaseFactor: number;
  previousMastery: number; // 0 to 5
  newMastery: number; // 0 to 5
  timeSpentSeconds?: number;
  notes?: string;
}

export interface Question {
  id: string;
  title: string;
  subject: string;
  topicId: string;
  topicName: string;
  difficulty: Difficulty;
  pattern: string;
  source: QuestionSource;
  customSource?: string;
  url?: string;
  tags: string[];
  estimatedSolvingTimeMinutes?: number;
  notes: string;
  importantInsight?: string;
  status: QuestionStatus;
  mastery: number; // 0 to 5
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;

  // Spaced Repetition Engine fields (Part 4)
  firstLearnedAt?: string;
  lastReviewedAt?: string;
  nextReviewAt?: string; // YYYY-MM-DD format for clean daily scheduling
  reviewCount: number;
  successfulReviews: number;
  failedReviews: number;
  consecutiveSuccesses: number;
  currentIntervalDays: number;
  easeFactor: number;
  reviewHistory: ReviewLog[];

  // Mistake bank history (Part 6)
  mistakes?: MistakeEntry[];
}

// ==========================================================================
// MISTAKE BANK & ERROR ANALYSIS TYPES (PART 6)
// ==========================================================================

export type MistakeCategory =
  | "Didn't understand problem"
  | "Didn't recognize pattern"
  | "Concept gap"
  | "Logic error"
  | "Coding error"
  | "Edge case"
  | "Complexity mistake"
  | "Time pressure"
  | "Forgot technique"
  | "Other";

export interface MistakeEntry {
  id: string;
  questionId: string;
  questionTitle: string;
  topicId?: string;
  topicName?: string;
  category: MistakeCategory;
  notes: string;
  isResolved: boolean;
  createdAt: string; // ISO
  resolvedAt?: string; // ISO
}

// ==========================================================================
// KNOWLEDGE VAULT & PERSONAL INSIGHTS TYPES (PART 6)
// ==========================================================================

export type InsightCategory =
  | 'Algorithm Invariant'
  | 'Pattern Rule'
  | 'Common Edge Cases'
  | 'Interview Tip'
  | 'Personal Rule';

export interface KnowledgeInsight {
  id: string;
  title: string;
  content: string;
  tags: string[];
  topicId?: string;
  topicName?: string;
  associatedQuestionIds?: string[];
  category?: InsightCategory;
  createdAt: string;
  updatedAt: string;
}

export type CreateQuestionInput = Omit<
  Question,
  | 'id'
  | 'createdAt'
  | 'updatedAt'
  | 'reviewCount'
  | 'successfulReviews'
  | 'failedReviews'
  | 'consecutiveSuccesses'
  | 'currentIntervalDays'
  | 'easeFactor'
  | 'reviewHistory'
> & {
  reviewCount?: number;
  successfulReviews?: number;
  failedReviews?: number;
  consecutiveSuccesses?: number;
  currentIntervalDays?: number;
  easeFactor?: number;
  reviewHistory?: ReviewLog[];
};

export interface QuestionFilterState {
  searchQuery: string;
  subject: string; // 'All' or specific
  topicId: string; // 'All' or specific
  difficulty: string; // 'All' | 'Easy' | 'Medium' | 'Hard'
  pattern: string; // 'All' or specific
  status: string; // 'All' | QuestionStatus
  selectedTags: string[];
}

// ==========================================================================
// DASHBOARD & STUDY PLAN TYPES (PART 2)
// ==========================================================================

export interface TodayStudyMetrics {
  newQuestionsTarget: number;
  newQuestionsCompleted: number;
  revisionsTarget: number;
  revisionsCompleted: number;
  studyTimeTargetMinutes: number;
  studyTimeCompletedMinutes: number;
  streakDays: number;
}

export interface UpcomingScheduleItem {
  id: string;
  title: string;
  category: 'Upcoming Revisions' | 'Saturday Mock Test' | 'Sunday Special Revision';
  dateDisplay: string;
  badgeText: string;
  description: string;
}

export interface ExternalPlatformStatus {
  id: 'leetcode' | 'gfg' | 'codechef' | 'codeforces';
  name: string;
  isConnected: boolean;
  handle?: string;
}

export interface QuickInsights {
  questionsMastered: number;
  revisionAccuracyPercent: number | null;
  weakestPattern: string | null;
  totalStudyHours: number;
}

// ==========================================================================
// MOCK TEST & WEEKLY CADENCE TYPES (PART 7)
// ==========================================================================

export type MockDifficultyDistribution =
  | 'Balanced'
  | 'Mostly Medium'
  | 'Hard Heavy'
  | 'All Difficulties';

export interface MockTestConfig {
  title: string;
  questionCount: number; // e.g. 3 or 4
  timeLimitMinutes: number; // e.g. 60 or 90
  difficultyDistribution: MockDifficultyDistribution;
  selectedTopicIds: string[]; // empty for all
  selectedPatterns: string[]; // empty for all
}

export type MockQuestionOutcome =
  | 'SOLVED_CLEANLY'
  | 'SOLVED_WITH_HINTS'
  | 'STRUGGLED_BUGGY'
  | 'COULD_NOT_SOLVE'
  | 'UNATTEMPTED';

export interface MockQuestionResult {
  questionId: string;
  questionTitle: string;
  difficulty: Difficulty;
  pattern: string;
  topicName: string;
  outcome: MockQuestionOutcome;
  timeSpentSeconds: number;
  notes?: string;
  mistakeLogged?: {
    category: MistakeCategory;
    notes: string;
  };
}

export interface MockTestRecord {
  id: string;
  title: string;
  completedAt: string; // ISO timestamp
  timeLimitMinutes: number;
  timeSpentSeconds: number;
  totalQuestions: number;
  score: number; // 0 to 100
  accuracyPercent: number; // percentage of questions solved (cleanly + hints)
  solvedCount: number;
  partiallySolvedCount: number;
  failedCount: number;
  difficultyBreakdown: {
    easy: { total: number; solved: number };
    medium: { total: number; solved: number };
    hard: { total: number; solved: number };
  };
  patternBreakdown: Array<{
    pattern: string;
    total: number;
    solved: number;
  }>;
  questionResults: MockQuestionResult[];
}

// ==========================================================================
// SUNDAY SPECIAL REVISION TYPES (PART 7)
// ==========================================================================

export type SundaySpecialReason =
  | 'Mock Test Mistake'
  | 'Frequently Failed'
  | 'Weak Pattern / Topic'
  | 'Forgotten / Cold Question'
  | 'High Importance / Core Invariant'
  | 'Recent Learning';

export interface SundaySpecialItem {
  question: Question;
  reasons: SundaySpecialReason[];
  priorityScore: number;
  estimatedMinutes: number;
}

// ==========================================================================
// WEEKLY REPORT TYPES (PART 7)
// ==========================================================================

export interface WeeklyReportData {
  weekLabel: string;
  startDate: string;
  endDate: string;
  generatedAt: string;
  questionsAddedCount: number;
  questionsReviewedCount: number;
  questionsMasteredCount: number;
  mockTestScore: number | null;
  mockTestsCompletedCount: number;
  totalStudyMinutes: number;
  revisionAccuracyPercent: number | null;
  weakAreas: Array<{
    name: string;
    type: 'Pattern' | 'Topic' | 'Mistake Category';
    reason: string;
    errorCount: number;
  }>;
  improvementTrends: Array<{
    label: string;
    status: 'improving' | 'steady' | 'needs_attention';
    description: string;
  }>;
  nextWeekFocusRecommendations: string[];
}

// ==========================================================================
// GOALS, DAILY TARGETS, FOCUS TIMER & STREAK TYPES (PART 8)
// ==========================================================================

export type GoalHorizon = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY' | 'LONG_TERM';

export type GoalType =
  | 'DSA_QUESTIONS'
  | 'CONTESTS'
  | 'STUDY_HOURS'
  | 'MASTERED_PATTERNS'
  | 'REVISIONS_COMPLETED'
  | 'CUSTOM';

export interface StudyGoal {
  id: string;
  title: string;
  description?: string;
  horizon: GoalHorizon;
  type: GoalType;
  targetValue: number;
  unit: string; // e.g. 'questions', 'contests', 'hours', 'patterns', 'revisions', 'rating'
  currentValue?: number; // for manual/custom goals
  autoTrack: boolean; // if true, progress is computed dynamically
  deadline?: string; // YYYY-MM-DD
  isCompleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface DailyTargetsConfig {
  newQuestionsTarget: number; // e.g. 3
  revisionsTarget: number; // e.g. 10
  studyTimeTargetMinutes: number; // e.g. 90
}

export type StudyActivityType =
  | 'Problem Solving'
  | 'Spaced Repetition'
  | 'Mock Assessment'
  | 'Contest Upsolving'
  | 'Theory & Invariants'
  | 'Video / Editorial Reading'
  | 'Other';

export interface StudySessionRecord {
  id: string;
  topicId?: string;
  topicName: string;
  activity: StudyActivityType;
  durationSeconds: number;
  startedAt: string; // ISO
  endedAt: string; // ISO
  notes?: string;
}

export interface ConsistencyDay {
  date: string; // YYYY-MM-DD
  dayOfWeek: string; // 'Mon', 'Tue', etc.
  dayOfMonth: number;
  isCompleted: boolean;
  isToday: boolean;
  meaningfulEventsCount: number;
  studyMinutes: number;
  revisionsCount: number;
  newQuestionsCount: number;
}

export interface StreakStats {
  currentStreak: number;
  bestStreak: number;
  weeklyActiveDaysCount: number; // e.g. 5
  weeklyTotalDays: number; // 7
  monthlyActiveDaysCount: number; // e.g. 22
  monthlyTotalDays: number; // 30
  monthlyConsistencyPercent: number; // e.g. 73%
  last7Days: ConsistencyDay[];
  last30Days: ConsistencyDay[];
}

export type ActivityIntensityLevel = 0 | 1 | 2 | 3 | 4;

export interface HeatmapDayData {
  date: string; // YYYY-MM-DD
  dayOfWeek: number; // 0 (Sun) to 6 (Sat)
  dayOfMonth: number;
  month: number; // 0 to 11
  year: number;
  formattedDate: string; // e.g. "Sep 29, 2026"
  intensity: ActivityIntensityLevel; // 0 (None) to 4 (Excellent / Target Met)
  intensityLabel: string;
  isCompleted: boolean;
  isToday: boolean;
  isFuture: boolean;
  revisionsCount: number;
  questionsCount: number;
  studyMinutes: number;
  mockTestsCount: number;
  mockTestsDetails?: Array<{
    title: string;
    scorePercent?: number;
  }>;
  targetMet: boolean;
  targetProgressPercent: number;
  meaningfulEventsCount: number;
}

export interface HeatmapWeekColumn {
  weekIndex: number;
  days: (HeatmapDayData | null)[]; // 7 days (index 0 = Sun, 6 = Sat)
  monthLabel?: string; // e.g. "Jan", "Feb" if first day of month starts here
}

export interface YearConsistencySummary {
  currentStreak: number;
  longestStreak: number;
  activeDaysYear: number;
  totalDaysYear: number;
  yearConsistencyPercent: number;
  activeDaysMonth: number;
  totalDaysMonth: number;
  monthConsistencyPercent: number;
  currentWeekActiveDays: number;
  currentWeekTotalDays: number;
  totalStudyHours: number;
  totalRevisions: number;
  totalQuestions: number;
  totalMockTests: number;
}

export interface ConsistencyHeatmapData {
  weeks: HeatmapWeekColumn[];
  allDays: HeatmapDayData[];
  monthHeaders: Array<{ label: string; colIndex: number }>;
  summary: YearConsistencySummary;
  daysMap: Record<string, HeatmapDayData>;
}

export interface HeatmapIntensityThresholds {
  level1: { minRevisions: number; minQuestions: number; minStudyMinutes: number };
  level2: { minRevisions: number; minQuestions: number; minStudyMinutes: number };
  level3: { minRevisions: number; minQuestions: number; minStudyMinutes: number; mockTestQualifies: boolean };
  level4: { minRevisions: number; minQuestions: number; minStudyMinutes: number };
}

// ==========================================================================
// EXTERNAL CODING PLATFORMS & CONTEST TRACKING TYPES (PART 9 - SYSTEM B)
// ==========================================================================

export type PlatformId =
  | 'leetcode'
  | 'codeforces'
  | 'codechef'
  | 'geeksforgeeks'
  | 'atcoder';

export type PlatformSyncStatus =
  | 'CONNECTED'
  | 'DISCONNECTED'
  | 'SYNCING'
  | 'ERROR';

export interface PlatformRatingHistoryPoint {
  date: string; // ISO
  contestName: string;
  rating: number;
  rank?: number;
  oldRating?: number;
  ratingChange?: number;
}

export interface ExternalSubmission {
  id: string;
  platform: PlatformId;
  problemId: string;
  problemTitle: string;
  problemUrl: string;
  difficulty: Difficulty;
  verdict: 'Accepted' | 'Wrong Answer' | 'Time Limit' | 'Other';
  submittedAt: string; // ISO
  language?: string;
  isEnrolledInStudySystem?: boolean;
}

export interface PlatformAccount {
  id: PlatformId;
  name: string;
  handle: string;
  isConnected: boolean;
  status: PlatformSyncStatus;
  lastSyncedAt?: string; // ISO
  errorMessage?: string;

  // Retrieved metrics
  totalSolved: number;
  difficultyBreakdown: {
    easy: number;
    medium: number;
    hard: number;
  };
  streakDays: number;
  currentRating?: number;
  maxRating?: number;
  globalRank?: number | string;
  contestsAttended: number;
  ratingHistory: PlatformRatingHistoryPoint[];
  recentSubmissions: ExternalSubmission[];
}

// ==========================================================================
// CONTEST DASHBOARD, RATING HISTORIES & CONTEST JOURNAL (PART 10)
// ==========================================================================

export interface UpcomingContest {
  id: string;
  platform: PlatformId;
  platformName: string;
  name: string;
  startTime: string; // ISO
  durationSeconds: number;
  url: string;
  phase?: 'BEFORE' | 'CODING' | 'FINISHED';
}

export interface ContestProblemPerformance {
  problemIndex: string;
  problemTitle: string;
  difficulty?: Difficulty;
  verdict: 'AC' | 'WA' | 'TLE' | 'UNSOLVED';
  solveTimeMinutes?: number;
  points?: number;
}

export interface ContestRecord {
  id: string;
  platform: PlatformId;
  platformName: string;
  contestId?: string | number;
  contestName: string;
  contestUrl?: string;
  date: string; // ISO
  rank: number;
  totalParticipants?: number;
  ratingBefore: number;
  ratingAfter: number;
  ratingChange: number; // delta (+/-)
  problemsSolved: number;
  totalProblems: number;
  problemsPerformance?: ContestProblemPerformance[];
  journalEntryId?: string;
}

export interface ContestJournalEntry {
  id: string;
  contestId: string; // References ContestRecord.id
  contestName: string;
  platform: PlatformId;
  date: string; // ISO
  whatWentWell: string;
  whatWentWrong: string;
  conceptsThatCausedProblems: string[];
  whatToPractice: string;
  linkedTopicIds: string[];
  linkedPatterns: string[];
  createdAt: string;
  updatedAt: string;
}

export interface ContestPerformanceAnalysis {
  totalContests: number;
  averageProblemsSolved: number;
  averageRank: number;
  averageRatingDelta: number;
  bestRank: number;
  peakRating: number;
  participationFrequencyPerMonth: number;
  difficultySolveCounts: {
    easy: number;
    medium: number;
    hard: number;
  };
  topWeakConcepts: Array<{
    concept: string;
    count: number;
  }>;
}

// ==========================================================================
// UNIFIED CALENDAR & MEANINGFUL NOTIFICATIONS TYPES (PART 12)
// ==========================================================================

export type CalendarActivityType =
  | 'SRS_REVISION'
  | 'WEEKLY_MOCK'
  | 'SUNDAY_SPECIAL'
  | 'STUDY_SESSION'
  | 'UPCOMING_CONTEST'
  | 'GOAL_DEADLINE';

export interface CalendarEventItem {
  id: string;
  type: CalendarActivityType;
  title: string;
  subtitle?: string;
  dateStr: string; // YYYY-MM-DD
  timeStr?: string;
  badgeText: string;
  color: string;
  rawItem?: any;
  actionRoute?: RoutePath;
  actionText?: string;
  externalUrl?: string;
}

export type NotificationCategory =
  | 'SRS_REVISIONS'
  | 'WEEKLY_MOCK'
  | 'SUNDAY_SPECIAL'
  | 'CONTESTS'
  | 'GOALS'
  | 'STREAK';

export interface NotificationItem {
  id: string;
  category: NotificationCategory;
  title: string;
  message: string;
  createdAt: string; // ISO
  isRead: boolean;
  actionRoute?: RoutePath;
  actionText?: string;
  externalUrl?: string;
}

export interface NotificationPreferences {
  enabled: boolean;
  preferredTime: 'MORNING' | 'EVENING' | 'ALL_DAY';
  categories: {
    srsRevisions: boolean;
    weeklyMock: boolean;
    sundaySpecial: boolean;
    contests: boolean;
    goals: boolean;
    streaks: boolean;
  };
}

// ==========================================================================
// DATA EXPORT, IMPORT, BACKUP & RESTORE TYPES (PART 13)
// ==========================================================================

export interface BackupDataSummary {
  totalTopics: number;
  totalQuestions: number;
  totalMistakes: number;
  totalInsights: number;
  totalMockTests: number;
  totalGoals: number;
  totalStudySessions: number;
  totalContestRecords: number;
  totalContestJournal: number;
  totalPlatformAccounts: number;
}

export interface StudyOSBackupPayload {
  version: 1;
  exportedAt: string;
  appName: string;
  summary: BackupDataSummary;
  data: {
    topics: Topic[];
    questions: Question[];
    mistakes: MistakeEntry[];
    insights: KnowledgeInsight[];
    mockTests: MockTestRecord[];
    goals: StudyGoal[];
    dailyTargets: DailyTargetsConfig;
    studySessions: StudySessionRecord[];
    platformAccounts: PlatformAccount[];
    contestRecords: ContestRecord[];
    contestJournal: ContestJournalEntry[];
    notificationPreferences: NotificationPreferences;
    settings: UserSettings;
  };
}

export interface LocalBackupSnapshot {
  id: string;
  label: string;
  createdAt: string;
  summary: BackupDataSummary;
  payload: StudyOSBackupPayload;
  sizeBytes?: number;
}

export type ImportMode = 'OVERWRITE' | 'MERGE';

export interface ImportValidationResult {
  isValid: boolean;
  error?: string;
  summary?: BackupDataSummary;
  payload?: StudyOSBackupPayload;
  fileName?: string;
}

// ==========================================================================
// MULTI-DEVICE SYNC & PRIVATE DEVICE PAIRING TYPES (NO LOGIN/ACCOUNTS)
// ==========================================================================

export type SyncStatus = 'IDLE' | 'SYNCING' | 'SUCCESS' | 'ERROR' | 'OFFLINE';

export interface DeviceSyncConfig {
  vaultId: string; // Private Sync Vault Key e.g. "psync-xxxx-xxxx-xxxx"
  secretKey: string;
  deviceName: string;
  isSyncEnabled: boolean;
  autoSyncIntervalSeconds: number; // e.g. 30
  lastSyncedAt?: string; // ISO
  lastSyncError?: string;
}

export interface SyncPayloadData {
  topics: Topic[];
  questions: Question[];
  mistakes: MistakeEntry[];
  insights: KnowledgeInsight[];
  mockTests: MockTestRecord[];
  goals: StudyGoal[];
  dailyTargets: DailyTargetsConfig;
  studySessions: StudySessionRecord[];
  platformAccounts: PlatformAccount[];
  contestRecords: ContestRecord[];
  contestJournal: ContestJournalEntry[];
  notificationPreferences: NotificationPreferences;
  settings: UserSettings;
  tombstones?: Array<{
    type: 'topic' | 'question' | 'mistake' | 'insight' | 'mock' | 'goal' | 'session' | 'contest';
    id: string;
    deletedAt: string;
  }>;
}

export interface SyncEnvelope {
  version: 2;
  vaultId: string;
  deviceId: string;
  deviceName: string;
  timestamp: string; // ISO
  data: SyncPayloadData;
}




import type {
  Topic,
  Question,
  MistakeEntry,
  KnowledgeInsight,
  MockTestRecord,
  StudyGoal,
  DailyTargetsConfig,
  StudySessionRecord,
  PlatformAccount,
  ContestRecord,
  ContestJournalEntry,
  NotificationPreferences,
  StudyOSBackupPayload,
} from '../types';
import {
  DEFAULT_CONTEST_RECORDS,
  DEFAULT_JOURNAL_ENTRIES,
} from './contestService';
import {
  DEFAULT_NOTIFICATION_PREFERENCES,
} from './notificationService';
import {
  dbSetAll,
  dbSetSingleton,
} from './db';

const STORAGE_VERSION_KEY = 'studyos_storage_version_v3';
const CURRENT_STORAGE_VERSION = '3.0.0_clean';

const TOPICS_KEY = 'studyos_topics_v3';
const QUESTIONS_KEY = 'studyos_questions_v3';
const MISTAKES_KEY = 'studyos_mistakes_v3';
const INSIGHTS_KEY = 'studyos_insights_v3';
const MOCKS_KEY = 'studyos_mocks_v3';
const GOALS_KEY = 'studyos_goals_v3';
const DAILY_TARGETS_KEY = 'studyos_daily_targets_v3';
const STUDY_SESSIONS_KEY = 'studyos_study_sessions_v3';
const PLATFORMS_KEY = 'studyos_platforms_v3';
const CONTEST_RECORDS_KEY = 'studyos_contest_records_v3';
const CONTEST_JOURNAL_KEY = 'studyos_contest_journal_v3';
const NOTIFICATION_PREFS_KEY = 'studyos_notif_prefs_v3';

// Clean initial zero real data defaults (NO hardcoded demo/fake data)
export const DEFAULT_TOPICS: Topic[] = [];
export const DEFAULT_QUESTIONS: Question[] = [];
export const DEFAULT_MISTAKES: MistakeEntry[] = [];
export const DEFAULT_INSIGHTS: KnowledgeInsight[] = [];
export const DEFAULT_MOCKS: MockTestRecord[] = [];
export const DEFAULT_GOALS: StudyGoal[] = [];
export const DEFAULT_STUDY_SESSIONS: StudySessionRecord[] = [];

export const DEFAULT_DAILY_TARGETS: DailyTargetsConfig = {
  newQuestionsTarget: 3,
  revisionsTarget: 10,
  studyTimeTargetMinutes: 90,
};

export const INITIAL_PLATFORMS: PlatformAccount[] = [
  {
    id: 'leetcode',
    name: 'LeetCode',
    handle: '',
    isConnected: false,
    status: 'DISCONNECTED',
    totalSolved: 0,
    difficultyBreakdown: { easy: 0, medium: 0, hard: 0 },
    streakDays: 0,
    contestsAttended: 0,
    ratingHistory: [],
    recentSubmissions: [],
  },
  {
    id: 'codeforces',
    name: 'Codeforces',
    handle: '',
    isConnected: false,
    status: 'DISCONNECTED',
    totalSolved: 0,
    difficultyBreakdown: { easy: 0, medium: 0, hard: 0 },
    streakDays: 0,
    contestsAttended: 0,
    ratingHistory: [],
    recentSubmissions: [],
  },
  {
    id: 'codechef',
    name: 'CodeChef',
    handle: '',
    isConnected: false,
    status: 'DISCONNECTED',
    totalSolved: 0,
    difficultyBreakdown: { easy: 0, medium: 0, hard: 0 },
    streakDays: 0,
    contestsAttended: 0,
    ratingHistory: [],
    recentSubmissions: [],
  },
  {
    id: 'geeksforgeeks',
    name: 'GeeksforGeeks',
    handle: '',
    isConnected: false,
    status: 'DISCONNECTED',
    totalSolved: 0,
    difficultyBreakdown: { easy: 0, medium: 0, hard: 0 },
    streakDays: 0,
    contestsAttended: 0,
    ratingHistory: [],
    recentSubmissions: [],
  },
  {
    id: 'atcoder',
    name: 'AtCoder',
    handle: '',
    isConnected: false,
    status: 'DISCONNECTED',
    totalSolved: 0,
    difficultyBreakdown: { easy: 0, medium: 0, hard: 0 },
    streakDays: 0,
    contestsAttended: 0,
    ratingHistory: [],
    recentSubmissions: [],
  },
];

export const DEFAULT_PLATFORMS: PlatformAccount[] = INITIAL_PLATFORMS;

/**
 * Migration check: If this is the first time running the clean architecture,
 * clean out legacy demo keys.
 */
function ensureStorageCleanMigration(): void {
  try {
    if (typeof localStorage === 'undefined') return;
    const existingVersion = localStorage.getItem(STORAGE_VERSION_KEY);
    if (!existingVersion || existingVersion !== CURRENT_STORAGE_VERSION) {
      // Clear legacy demo keys
      const legacyKeys = [
        'studyos_topics_v2',
        'studyos_questions_v2',
        'studyos_mistakes_v1',
        'studyos_insights_v1',
        'studyos_mocks_v1',
        'studyos_goals_v1',
        'studyos_daily_targets_v1',
        'studyos_study_sessions_v1',
        'studyos_platforms_v1',
        'studyos_contest_records_v1',
        'studyos_contest_journal_v1',
      ];
      legacyKeys.forEach((k) => localStorage.removeItem(k));
      localStorage.setItem(STORAGE_VERSION_KEY, CURRENT_STORAGE_VERSION);
    }
  } catch (err) {
    console.warn('Storage clean check error:', err);
  }
}

// Execute migration check on module load
ensureStorageCleanMigration();

export const StorageService = {
  getTopics(): Topic[] {
    try {
      const raw = localStorage.getItem(TOPICS_KEY);
      if (!raw) return DEFAULT_TOPICS;
      return JSON.parse(raw);
    } catch {
      return DEFAULT_TOPICS;
    }
  },

  saveTopics(topics: Topic[]): void {
    try {
      localStorage.setItem(TOPICS_KEY, JSON.stringify(topics));
      dbSetAll('topics', topics).catch((e) => console.warn('IDB saveTopics error', e));
    } catch (err) {
      console.error('Failed to save topics', err);
    }
  },

  getQuestions(): Question[] {
    try {
      const raw = localStorage.getItem(QUESTIONS_KEY);
      if (!raw) return DEFAULT_QUESTIONS;
      const parsed: Question[] = JSON.parse(raw);
      return parsed.map((q) => ({
        ...q,
        reviewCount: q.reviewCount ?? 0,
        successfulReviews: q.successfulReviews ?? 0,
        failedReviews: q.failedReviews ?? 0,
        consecutiveSuccesses: q.consecutiveSuccesses ?? 0,
        currentIntervalDays: q.currentIntervalDays ?? 0,
        easeFactor: q.easeFactor ?? 2.5,
        reviewHistory: q.reviewHistory ?? [],
      }));
    } catch {
      return DEFAULT_QUESTIONS;
    }
  },

  saveQuestions(questions: Question[]): void {
    try {
      localStorage.setItem(QUESTIONS_KEY, JSON.stringify(questions));
      dbSetAll('questions', questions).catch((e) => console.warn('IDB saveQuestions error', e));
    } catch (err) {
      console.error('Failed to save questions', err);
    }
  },

  getMistakes(): MistakeEntry[] {
    try {
      const raw = localStorage.getItem(MISTAKES_KEY);
      if (!raw) return DEFAULT_MISTAKES;
      return JSON.parse(raw);
    } catch {
      return DEFAULT_MISTAKES;
    }
  },

  saveMistakes(mistakes: MistakeEntry[]): void {
    try {
      localStorage.setItem(MISTAKES_KEY, JSON.stringify(mistakes));
      dbSetAll('mistakes', mistakes).catch((e) => console.warn('IDB saveMistakes error', e));
    } catch (err) {
      console.error('Failed to save mistakes', err);
    }
  },

  getInsights(): KnowledgeInsight[] {
    try {
      const raw = localStorage.getItem(INSIGHTS_KEY);
      if (!raw) return DEFAULT_INSIGHTS;
      return JSON.parse(raw);
    } catch {
      return DEFAULT_INSIGHTS;
    }
  },

  saveInsights(insights: KnowledgeInsight[]): void {
    try {
      localStorage.setItem(INSIGHTS_KEY, JSON.stringify(insights));
      dbSetAll('insights', insights).catch((e) => console.warn('IDB saveInsights error', e));
    } catch (err) {
      console.error('Failed to save insights', err);
    }
  },

  getMockTests(): MockTestRecord[] {
    try {
      const raw = localStorage.getItem(MOCKS_KEY);
      if (!raw) return DEFAULT_MOCKS;
      return JSON.parse(raw);
    } catch {
      return DEFAULT_MOCKS;
    }
  },

  saveMockTests(mocks: MockTestRecord[]): void {
    try {
      localStorage.setItem(MOCKS_KEY, JSON.stringify(mocks));
      dbSetAll('mockTests', mocks).catch((e) => console.warn('IDB saveMockTests error', e));
    } catch (err) {
      console.error('Failed to save mock tests', err);
    }
  },

  getGoals(): StudyGoal[] {
    try {
      const raw = localStorage.getItem(GOALS_KEY);
      if (!raw) return DEFAULT_GOALS;
      return JSON.parse(raw);
    } catch {
      return DEFAULT_GOALS;
    }
  },

  saveGoals(goals: StudyGoal[]): void {
    try {
      localStorage.setItem(GOALS_KEY, JSON.stringify(goals));
      dbSetAll('goals', goals).catch((e) => console.warn('IDB saveGoals error', e));
    } catch (err) {
      console.error('Failed to save goals', err);
    }
  },

  getDailyTargets(): DailyTargetsConfig {
    try {
      const raw = localStorage.getItem(DAILY_TARGETS_KEY);
      if (!raw) return DEFAULT_DAILY_TARGETS;
      return JSON.parse(raw);
    } catch {
      return DEFAULT_DAILY_TARGETS;
    }
  },

  saveDailyTargets(targets: DailyTargetsConfig): void {
    try {
      localStorage.setItem(DAILY_TARGETS_KEY, JSON.stringify(targets));
      dbSetSingleton('dailyTargets', targets).catch((e) => console.warn('IDB saveDailyTargets error', e));
    } catch (err) {
      console.error('Failed to save daily targets', err);
    }
  },

  getStudySessions(): StudySessionRecord[] {
    try {
      const raw = localStorage.getItem(STUDY_SESSIONS_KEY);
      if (!raw) return DEFAULT_STUDY_SESSIONS;
      return JSON.parse(raw);
    } catch {
      return DEFAULT_STUDY_SESSIONS;
    }
  },

  saveStudySessions(sessions: StudySessionRecord[]): void {
    try {
      localStorage.setItem(STUDY_SESSIONS_KEY, JSON.stringify(sessions));
      dbSetAll('studySessions', sessions).catch((e) => console.warn('IDB saveStudySessions error', e));
    } catch (err) {
      console.error('Failed to save study sessions', err);
    }
  },

  getPlatforms(): PlatformAccount[] {
    try {
      const raw = localStorage.getItem(PLATFORMS_KEY);
      if (!raw) return DEFAULT_PLATFORMS;
      return JSON.parse(raw);
    } catch {
      return DEFAULT_PLATFORMS;
    }
  },

  savePlatforms(platforms: PlatformAccount[]): void {
    try {
      localStorage.setItem(PLATFORMS_KEY, JSON.stringify(platforms));
      dbSetAll('platformAccounts', platforms).catch((e) => console.warn('IDB savePlatforms error', e));
    } catch (err) {
      console.error('Failed to save platforms', err);
    }
  },

  getContestRecords(): ContestRecord[] {
    try {
      const raw = localStorage.getItem(CONTEST_RECORDS_KEY);
      if (!raw) return DEFAULT_CONTEST_RECORDS;
      return JSON.parse(raw);
    } catch {
      return DEFAULT_CONTEST_RECORDS;
    }
  },

  saveContestRecords(records: ContestRecord[]): void {
    try {
      localStorage.setItem(CONTEST_RECORDS_KEY, JSON.stringify(records));
      dbSetAll('contestRecords', records).catch((e) => console.warn('IDB saveContestRecords error', e));
    } catch (err) {
      console.error('Failed to save contest records', err);
    }
  },

  getContestJournal(): ContestJournalEntry[] {
    try {
      const raw = localStorage.getItem(CONTEST_JOURNAL_KEY);
      if (!raw) return DEFAULT_JOURNAL_ENTRIES;
      return JSON.parse(raw);
    } catch {
      return DEFAULT_JOURNAL_ENTRIES;
    }
  },

  saveContestJournal(entries: ContestJournalEntry[]): void {
    try {
      localStorage.setItem(CONTEST_JOURNAL_KEY, JSON.stringify(entries));
      dbSetAll('contestJournal', entries).catch((e) => console.warn('IDB saveContestJournal error', e));
    } catch (err) {
      console.error('Failed to save contest journal entries', err);
    }
  },

  getNotificationPreferences(): NotificationPreferences {
    try {
      const raw = localStorage.getItem(NOTIFICATION_PREFS_KEY);
      if (!raw) return DEFAULT_NOTIFICATION_PREFERENCES;
      return JSON.parse(raw);
    } catch {
      return DEFAULT_NOTIFICATION_PREFERENCES;
    }
  },

  saveNotificationPreferences(prefs: NotificationPreferences): void {
    try {
      localStorage.setItem(NOTIFICATION_PREFS_KEY, JSON.stringify(prefs));
      dbSetSingleton('notificationPreferences', prefs).catch((e) =>
        console.warn('IDB saveNotificationPreferences error', e)
      );
    } catch (err) {
      console.error('Failed to save notification preferences', err);
    }
  },

  // Full Data Restore, Reset & Safety Clear
  restoreFullStoragePayload(payload: StudyOSBackupPayload): void {
    try {
      if (payload.data.topics) this.saveTopics(payload.data.topics);
      if (payload.data.questions) this.saveQuestions(payload.data.questions);
      if (payload.data.mistakes) this.saveMistakes(payload.data.mistakes);
      if (payload.data.insights) this.saveInsights(payload.data.insights);
      if (payload.data.mockTests) this.saveMockTests(payload.data.mockTests);
      if (payload.data.goals) this.saveGoals(payload.data.goals);
      if (payload.data.dailyTargets) this.saveDailyTargets(payload.data.dailyTargets);
      if (payload.data.studySessions) this.saveStudySessions(payload.data.studySessions);
      if (payload.data.platformAccounts) this.savePlatforms(payload.data.platformAccounts);
      if (payload.data.contestRecords) this.saveContestRecords(payload.data.contestRecords);
      if (payload.data.contestJournal) this.saveContestJournal(payload.data.contestJournal);
      if (payload.data.notificationPreferences) {
        this.saveNotificationPreferences(payload.data.notificationPreferences);
      }
    } catch (err) {
      console.error('Failed to restore full storage payload', err);
    }
  },

  clearAllStorageData(): void {
    try {
      this.saveTopics([]);
      this.saveQuestions([]);
      this.saveMistakes([]);
      this.saveInsights([]);
      this.saveMockTests([]);
      this.saveGoals([]);
      this.saveDailyTargets(DEFAULT_DAILY_TARGETS);
      this.saveStudySessions([]);
      this.savePlatforms(DEFAULT_PLATFORMS);
      this.saveContestRecords([]);
      this.saveContestJournal([]);
    } catch (err) {
      console.error('Failed to clear storage data', err);
    }
  },

  resetToDefaultDemoData(): void {
    // Reset to clean 0/empty real dataset
    this.clearAllStorageData();
  },
};

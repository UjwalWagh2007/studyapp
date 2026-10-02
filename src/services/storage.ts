import type {
  Topic,
  Problem,
  UserSettings,
} from '../types';
import { dbGetAll, dbSetAll, dbGetSingleton, dbSetSingleton } from './db';

const TOPICS_KEY = 'studyos_topics_v3';
const PROBLEMS_KEY = 'studyos_problems_v3';
const SETTINGS_KEY = 'studyos_settings_v3';

export const DEFAULT_TOPICS: Topic[] = [];
export const DEFAULT_PROBLEMS: Problem[] = [];

export const DEFAULT_SETTINGS: UserSettings = {
  theme: 'dark',
};

/**
 * Migration helper: clean legacy demo keys.
 */
export function ensureStorageCleanMigration(): void {
  if (typeof localStorage === 'undefined') return;
  try {
    const legacyKeys = [
      'studyos_topics_v1',
      'studyos_questions_v1',
      'studyos_topics_v2',
      'studyos_questions_v2',
      'studyos_mistakes_v1',
      'studyos_insights_v1',
      'studyos_mocks_v1',
      'studyos_goals_v1',
      'studyos_daily_targets_v1',
      'studyos_sessions_v1',
      'studyos_platforms_v1',
      'studyos_contests_v1',
      'studyos_contests_journal_v1',
      'studyos_notifications_v1',
      'studyos_notif_prefs_v1',
      'studyos_mistakes_v2',
      'studyos_insights_v2',
      'studyos_mocks_v2',
      'studyos_goals_v2',
      'studyos_daily_targets_v2',
      'studyos_sessions_v2',
      'studyos_platforms_v2',
      'studyos_contests_v2',
      'studyos_contests_journal_v2',
    ];
    legacyKeys.forEach((k) => localStorage.removeItem(k));
  } catch {}
}

export const StorageService = {
  getTopics(): Topic[] {
    try {
      if (typeof localStorage === 'undefined') return DEFAULT_TOPICS;
      const raw = localStorage.getItem(TOPICS_KEY);
      if (!raw) return DEFAULT_TOPICS;
      return JSON.parse(raw);
    } catch {
      return DEFAULT_TOPICS;
    }
  },

  saveTopics(topics: Topic[]): void {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(TOPICS_KEY, JSON.stringify(topics));
      }
      dbSetAll('topics', topics).catch(() => {});
    } catch (err) {
      console.error('Failed to save topics', err);
    }
  },

  getProblems(): Problem[] {
    try {
      if (typeof localStorage === 'undefined') return DEFAULT_PROBLEMS;
      const raw = localStorage.getItem(PROBLEMS_KEY);
      if (!raw) return DEFAULT_PROBLEMS;
      const parsed: Problem[] = JSON.parse(raw);
      return parsed.map((p) => ({
        ...p,
        reviewCount: p.reviewCount ?? 0,
        currentIntervalDays: p.currentIntervalDays ?? 1,
        easeFactor: p.easeFactor ?? 2.5,
        reviewHistory: p.reviewHistory ?? [],
        status: p.status ?? 'LEARNING',
      }));
    } catch {
      return DEFAULT_PROBLEMS;
    }
  },

  saveProblems(problems: Problem[]): void {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(PROBLEMS_KEY, JSON.stringify(problems));
      }
      dbSetAll('problems', problems).catch(() => {});
    } catch (err) {
      console.error('Failed to save problems', err);
    }
  },

  // Aliases for questions during transition
  getQuestions(): Problem[] {
    return this.getProblems();
  },

  saveQuestions(problems: Problem[]): void {
    this.saveProblems(problems);
  },

  getSettings(): UserSettings {
    try {
      if (typeof localStorage === 'undefined') return DEFAULT_SETTINGS;
      const raw = localStorage.getItem(SETTINGS_KEY);
      if (!raw) return DEFAULT_SETTINGS;
      return JSON.parse(raw);
    } catch {
      return DEFAULT_SETTINGS;
    }
  },

  saveSettings(settings: UserSettings): void {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
      }
      dbSetSingleton('settings', settings).catch(() => {});
    } catch (err) {
      console.error('Failed to save settings', err);
    }
  },

  /**
   * Asynchronously hydrate all data from IndexedDB into memory/localStorage.
   */
  async hydrateFromIndexedDB(): Promise<{
    topics: Topic[];
    problems: Problem[];
    settings: UserSettings;
  }> {
    ensureStorageCleanMigration();
    try {
      const [idbTopics, idbProblems, idbSettings] = await Promise.all([
        dbGetAll<Topic>('topics'),
        dbGetAll<Problem>('problems'),
        dbGetSingleton<UserSettings>('settings'),
      ]);

      const topics = idbTopics.length > 0 ? idbTopics : this.getTopics();
      const problems = idbProblems.length > 0 ? idbProblems : this.getProblems();
      const settings = idbSettings || this.getSettings();

      // Mirror into localStorage
      this.saveTopics(topics);
      this.saveProblems(problems);
      this.saveSettings(settings);

      return { topics, problems, settings };
    } catch {
      return {
        topics: this.getTopics(),
        problems: this.getProblems(),
        settings: this.getSettings(),
      };
    }
  },

  clearAll(): void {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(TOPICS_KEY);
      localStorage.removeItem(PROBLEMS_KEY);
      localStorage.removeItem(SETTINGS_KEY);
    }
    dbSetAll('topics', []).catch(() => {});
    dbSetAll('problems', []).catch(() => {});
  },
};

import type {
  Topic,
  Problem,
  UserSettings,
  DailyTargetsConfig,
  StudySession,
  MockTest,
} from '../types';
import { dbGetAll, dbSetAll, dbGetSingleton, dbSetSingleton } from './db';
import { DEFAULT_DAILY_TARGETS } from './metricsService';

const TOPICS_KEY = 'studyos_topics_v3';
const PROBLEMS_KEY = 'studyos_problems_v3';
const SETTINGS_KEY = 'studyos_settings_v3';
const TARGETS_KEY = 'studyos_targets_v3';
const SESSIONS_KEY = 'studyos_sessions_v3';
const MOCK_TESTS_KEY = 'studyos_mock_tests_v4';
const DELETED_IDS_KEY = 'studyos_deleted_ids_v4';

export const DEFAULT_TOPICS: Topic[] = [];
export const DEFAULT_PROBLEMS: Problem[] = [];
export const DEFAULT_SESSIONS: StudySession[] = [];
export const DEFAULT_MOCK_TESTS: MockTest[] = [];

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
  getDeletedIds(): string[] {
    try {
      if (typeof localStorage === 'undefined') return [];
      const raw = localStorage.getItem(DELETED_IDS_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  },

  recordDeletedId(id: string): void {
    if (!id) return;
    try {
      const current = this.getDeletedIds();
      if (!current.includes(id)) {
        const next = [id, ...current].slice(0, 300); // keep recent 300 tombstones
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem(DELETED_IDS_KEY, JSON.stringify(next));
        }
      }
    } catch {}
  },

  setDeletedIds(ids: string[]): void {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(DELETED_IDS_KEY, JSON.stringify(ids.slice(0, 300)));
      }
    } catch {}
  },

  getTopics(): Topic[] {
    try {
      if (typeof localStorage === 'undefined') return DEFAULT_TOPICS;
      const raw = localStorage.getItem(TOPICS_KEY);
      if (!raw) return DEFAULT_TOPICS;
      const parsed: Topic[] = JSON.parse(raw);
      const deleted = new Set(this.getDeletedIds());
      return parsed
        .filter((t) => !deleted.has(t.id))
        .sort((a, b) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime());
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
      const deleted = new Set(this.getDeletedIds());
      return parsed
        .filter((p) => !deleted.has(p.id))
        .map((p) => ({
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

  getDailyTargets(): DailyTargetsConfig {
    try {
      if (typeof localStorage === 'undefined') return DEFAULT_DAILY_TARGETS;
      const raw = localStorage.getItem(TARGETS_KEY);
      if (!raw) return DEFAULT_DAILY_TARGETS;
      return { ...DEFAULT_DAILY_TARGETS, ...JSON.parse(raw) };
    } catch {
      return DEFAULT_DAILY_TARGETS;
    }
  },

  saveDailyTargets(targets: DailyTargetsConfig): void {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(TARGETS_KEY, JSON.stringify(targets));
      }
      dbSetSingleton('dailyTargets', targets, 'config').catch(() => {});
    } catch (err) {
      console.error('Failed to save daily targets', err);
    }
  },

  getStudySessions(): StudySession[] {
    try {
      if (typeof localStorage === 'undefined') return DEFAULT_SESSIONS;
      const raw = localStorage.getItem(SESSIONS_KEY);
      if (!raw) return DEFAULT_SESSIONS;
      const parsed: StudySession[] = JSON.parse(raw);
      const deleted = new Set(this.getDeletedIds());
      return parsed.filter((s) => !deleted.has(s.id));
    } catch {
      return DEFAULT_SESSIONS;
    }
  },

  saveStudySessions(sessions: StudySession[]): void {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
      }
      dbSetAll('studySessions', sessions).catch(() => {});
    } catch (err) {
      console.error('Failed to save study sessions', err);
    }
  },

  getMockTests(): MockTest[] {
    try {
      if (typeof localStorage === 'undefined') return DEFAULT_MOCK_TESTS;
      const raw = localStorage.getItem(MOCK_TESTS_KEY);
      if (!raw) return DEFAULT_MOCK_TESTS;
      const parsed: MockTest[] = JSON.parse(raw);
      const deleted = new Set(this.getDeletedIds());
      return parsed.filter((m) => !deleted.has(m.id));
    } catch {
      return DEFAULT_MOCK_TESTS;
    }
  },

  saveMockTests(tests: MockTest[]): void {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(MOCK_TESTS_KEY, JSON.stringify(tests));
      }
      dbSetAll('mockTests', tests).catch(() => {});
    } catch (err) {
      console.error('Failed to save mock tests', err);
    }
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
    studySessions: StudySession[];
    dailyTargets: DailyTargetsConfig;
    mockTests: MockTest[];
    settings: UserSettings;
  }> {
    ensureStorageCleanMigration();
    try {
      const [idbTopics, idbProblems, idbSessions, idbTargets, idbMockTests, idbSettings] = await Promise.all([
        dbGetAll<Topic>('topics'),
        dbGetAll<Problem>('problems'),
        dbGetAll<StudySession>('studySessions'),
        dbGetSingleton<DailyTargetsConfig>('dailyTargets', 'config'),
        dbGetAll<MockTest>('mockTests'),
        dbGetSingleton<UserSettings>('settings'),
      ]);

      const deleted = new Set(this.getDeletedIds());
      const rawTopics = (idbTopics.length > 0 ? idbTopics : this.getTopics()).filter((t) => !deleted.has(t.id));
      const topics = [...rawTopics].sort(
        (a, b) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime()
      );
      const problems = (idbProblems.length > 0 ? idbProblems : this.getProblems()).filter((p) => !deleted.has(p.id));
      const studySessions = (idbSessions.length > 0 ? idbSessions : this.getStudySessions()).filter((s) => !deleted.has(s.id));
      const dailyTargets = idbTargets || this.getDailyTargets();
      const mockTests = (idbMockTests.length > 0 ? idbMockTests : this.getMockTests()).filter((m) => !deleted.has(m.id));
      const settings = idbSettings || this.getSettings();

      // Mirror into localStorage
      this.saveTopics(topics);
      this.saveProblems(problems);
      this.saveStudySessions(studySessions);
      this.saveDailyTargets(dailyTargets);
      this.saveMockTests(mockTests);
      this.saveSettings(settings);

      return { topics, problems, studySessions, dailyTargets, mockTests, settings };
    } catch {
      return {
        topics: this.getTopics(),
        problems: this.getProblems(),
        studySessions: this.getStudySessions(),
        dailyTargets: this.getDailyTargets(),
        mockTests: this.getMockTests(),
        settings: this.getSettings(),
      };
    }
  },

  clearAll(): void {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(TOPICS_KEY);
      localStorage.removeItem(PROBLEMS_KEY);
      localStorage.removeItem(SETTINGS_KEY);
      localStorage.removeItem(TARGETS_KEY);
      localStorage.removeItem(SESSIONS_KEY);
      localStorage.removeItem(MOCK_TESTS_KEY);
      localStorage.removeItem(DELETED_IDS_KEY);
    }
    dbSetAll('topics', []).catch(() => {});
    dbSetAll('problems', []).catch(() => {});
    dbSetAll('studySessions', []).catch(() => {});
    dbSetAll('mockTests', []).catch(() => {});
  },
};


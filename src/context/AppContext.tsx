import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import type {
  RoutePath,
  NavGroupKey,
  ThemeMode,
  UserSettings,
  Topic,
  Question,
  CreateQuestionInput,
  ReviewRating,
  ReviewLog,
  MistakeCategory,
  MistakeEntry,
  KnowledgeInsight,
  MockTestRecord,
  SundaySpecialItem,
  WeeklyReportData,
  StudyGoal,
  DailyTargetsConfig,
  StudyActivityType,
  StudySessionRecord,
  StreakStats,
  TodayStudyMetrics,
  PlatformAccount,
  PlatformId,
  ExternalSubmission,
  ContestRecord,
  ContestJournalEntry,
  ContestPerformanceAnalysis,
  UpcomingContest,
  NotificationItem,
  NotificationPreferences,
  StudyOSBackupPayload,
  LocalBackupSnapshot,
  ImportValidationResult,
  ImportMode,
  DeviceSyncConfig,
  SyncStatus,
} from '../types';
import { StorageService } from '../services/storage';
import {
  scheduleInitialLearning,
  calculateNextReview,
  getDueToday,
  getOverdue,
  getUpcoming,
  getRecentlyReviewed,
  getSpacedRepetitionStats,
} from '../services/spacedRepetition';
import { generateSundaySpecialQueue } from '../services/sundaySpecial';
import { generateWeeklyReport } from '../services/weeklyReport';
import { getTodayMetrics } from '../services/goals';
import { calculateStreakStats } from '../services/streak';
import { syncPlatformAccount } from '../services/platformSync';
import {
  calculateContestAnalysis,
  fetchLiveUpcomingContests,
} from '../services/contestService';
import {
  generateMeaningfulNotifications,
} from '../services/notificationService';
import {
  getDeviceSyncConfig,
  saveDeviceSyncConfig,
  syncWithCloud,
} from '../services/syncService';
import {
  buildFullBackupPayload,
  exportFullDataToJson,
  exportQuestionsToCsv,
  exportMistakesToCsv,
  exportInsightsToCsv,
  exportStudySessionsToCsv,
  exportContestsToCsv,
  getLocalSnapshots,
  createLocalSnapshot,
  deleteLocalSnapshot,
  validateBackupJson,
  mergeImportData,
  computeBackupSummary,
} from '../services/backupService';

const SETTINGS_KEY = 'studyos_settings_v1';

const DEFAULT_SETTINGS: UserSettings = {
  userName: 'Ujwal',
  email: 'ujwal@example.com',
  theme: 'dark',
  sidebarCollapsed: false,
  compactMode: false,
};

function getInitialSettings(): UserSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) return JSON.parse(raw);
  } catch (err) {
    console.warn('Failed to load settings from storage', err);
  }
  return DEFAULT_SETTINGS;
}

interface AppContextValue {
  // Navigation & Routing
  currentPath: RoutePath;
  navigateTo: (path: RoutePath) => void;

  // Sidebar Controls
  isSidebarCollapsed: boolean;
  toggleSidebar: () => void;
  isMobileSidebarOpen: boolean;
  openMobileSidebar: () => void;
  closeMobileSidebar: () => void;
  expandedGroups: Record<NavGroupKey, boolean>;
  toggleGroup: (group: NavGroupKey) => void;

  // Settings & Theme
  settings: UserSettings;
  updateSettings: (updates: Partial<UserSettings>) => void;
  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => void;

  // PART 3: TOPICS STATE & CRUD
  topics: Topic[];
  addTopic: (topic: Omit<Topic, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateTopic: (id: string, updates: Partial<Topic>) => void;
  archiveTopic: (id: string, archive?: boolean) => void;
  deleteTopicSafely: (id: string) => { success: boolean; questionsPreserved: number };
  selectedTopicFilter: string;
  setSelectedTopicFilter: (topicId: string) => void;

  // PART 3: QUESTIONS STATE & CRUD
  questions: Question[];
  addQuestion: (question: CreateQuestionInput) => void;
  updateQuestion: (id: string, updates: Partial<Question>) => void;
  archiveQuestion: (id: string, archive?: boolean) => void;
  deleteQuestion: (id: string) => void;

  // PART 4: SPACED REPETITION ENGINE & QUERIES
  recordReview: (
    questionId: string,
    rating: ReviewRating,
    options?: { timeSpentSeconds?: number; notes?: string }
  ) => { updatedQuestion: Question; reviewLog: ReviewLog } | null;
  scheduleQuestionLearning: (questionId: string) => Question | null;
  dueTodayQuestions: Question[];
  overdueQuestions: Question[];
  upcomingQuestions: Question[];
  recentlyReviewedQuestions: Question[];
  srStats: {
    totalActive: number;
    dueTodayCount: number;
    overdueCount: number;
    upcomingCount: number;
    masteredCount: number;
    learningCount: number;
    reviewingCount: number;
    totalReviews: number;
    recallAccuracyPercent: number | null;
  };

  // PART 6: MISTAKE BANK STATE & CRUD
  mistakes: MistakeEntry[];
  addMistake: (mistake: Omit<MistakeEntry, 'id' | 'createdAt'>) => MistakeEntry;
  updateMistake: (id: string, updates: Partial<MistakeEntry>) => void;
  toggleMistakeResolved: (id: string) => void;
  deleteMistake: (id: string) => void;
  mistakeCategoryStats: Array<{ category: MistakeCategory; count: number; percentage: number }>;

  // PART 6: KNOWLEDGE VAULT STATE & CRUD
  insights: KnowledgeInsight[];
  addInsight: (insight: Omit<KnowledgeInsight, 'id' | 'createdAt' | 'updatedAt'>) => KnowledgeInsight;
  updateInsight: (id: string, updates: Partial<KnowledgeInsight>) => void;
  deleteInsight: (id: string) => void;

  // PART 7: WEEKLY CADENCE, MOCK TESTS & SPECIAL REVISION
  mockTests: MockTestRecord[];
  saveMockTestRecord: (record: MockTestRecord) => void;
  deleteMockTestRecord: (id: string) => void;
  sundaySpecialQueue: SundaySpecialItem[];
  sundaySpecialTotalMinutes: number;
  latestWeeklyReport: WeeklyReportData;

  // PART 8: GOALS, DAILY TARGETS, FOCUS TIMER & STREAKS
  goals: StudyGoal[];
  addGoal: (goal: Omit<StudyGoal, 'id' | 'createdAt' | 'updatedAt'>) => StudyGoal;
  updateGoal: (id: string, updates: Partial<StudyGoal>) => void;
  deleteGoal: (id: string) => void;
  dailyTargets: DailyTargetsConfig;
  updateDailyTargets: (targets: Partial<DailyTargetsConfig>) => void;
  todayMetrics: TodayStudyMetrics;
  studySessions: StudySessionRecord[];
  logStudySession: (session: Omit<StudySessionRecord, 'id'>) => StudySessionRecord;
  deleteStudySession: (id: string) => void;
  streakStats: StreakStats;

  // Active Focus Study Timer
  activeFocusTimer: {
    isRunning: boolean;
    isPaused: boolean;
    secondsElapsed: number;
    topicId?: string;
    topicName: string;
    activity: StudyActivityType;
    startedAt: string;
  } | null;
  startFocusTimer: (topicId?: string, topicName?: string, activity?: StudyActivityType) => void;
  pauseFocusTimer: () => void;
  resumeFocusTimer: () => void;
  stopAndSaveFocusTimer: (notes?: string) => StudySessionRecord | null;
  discardFocusTimer: () => void;

  // PART 9: EXTERNAL CODING PLATFORMS & CONTEST TRACKING (SYSTEM B)
  platformAccounts: PlatformAccount[];
  connectPlatform: (id: PlatformId, handle: string) => Promise<void>;
  disconnectPlatform: (id: PlatformId) => void;
  syncPlatform: (id: PlatformId) => Promise<void>;
  syncAllPlatforms: () => Promise<void>;
  enrollPlatformProblemToStudySystem: (
    submission: ExternalSubmission,
    topicId?: string,
    topicName?: string
  ) => void;

  // PART 10: CONTEST DASHBOARD, RATING HISTORIES & CONTEST JOURNAL
  contestRecords: ContestRecord[];
  contestJournal: ContestJournalEntry[];
  upcomingContests: UpcomingContest[];
  contestAnalysis: ContestPerformanceAnalysis;
  addContestRecord: (record: Omit<ContestRecord, 'id'>) => ContestRecord;
  updateContestRecord: (id: string, updates: Partial<ContestRecord>) => void;
  deleteContestRecord: (id: string) => void;
  saveContestJournalEntry: (
    entry: Omit<ContestJournalEntry, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }
  ) => ContestJournalEntry;
  deleteContestJournalEntry: (id: string) => void;
  refreshUpcomingContests: () => Promise<void>;

  // PART 12: Meaningful Notifications & Preferences
  notifications: NotificationItem[];
  unreadNotificationsCount: number;
  notificationPreferences: NotificationPreferences;
  updateNotificationPreferences: (prefs: Partial<NotificationPreferences>) => void;
  markNotificationRead: (id: string) => void;
  clearAllNotifications: () => void;

  // PART 13: Data Management, Exports, Imports, Backups & Safety Clears
  exportFullBackup: () => void;
  exportQuestionsCsv: () => void;
  exportMistakesCsv: () => void;
  exportInsightsCsv: () => void;
  exportStudySessionsCsv: () => void;
  exportContestsCsv: () => void;
  localSnapshots: LocalBackupSnapshot[];
  createLocalBackupSnapshot: (label?: string) => LocalBackupSnapshot;
  deleteLocalBackupSnapshot: (id: string) => void;
  validateBackupFile: (rawJson: string, fileName?: string) => ImportValidationResult;
  restoreFromBackup: (payload: StudyOSBackupPayload, mode: ImportMode) => void;
  clearAllUserData: () => void;
  resetToDemoDatabase: () => void;

  // Multi-Device Sync & Private Device Pairing
  syncConfig: DeviceSyncConfig;
  syncStatus: SyncStatus;
  updateSyncConfig: (updates: Partial<DeviceSyncConfig>) => void;
  triggerCloudSync: () => Promise<boolean>;
  pairDeviceWithVault: (vaultId: string) => Promise<boolean>;

  // Aggregated metadata helpers
  allSubjects: string[];
  allTags: string[];
}

const AppContext = createContext<AppContextValue | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentPath, setCurrentPath] = useState<RoutePath>('home');
  const [settings, setSettings] = useState<UserSettings>(getInitialSettings);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [selectedTopicFilter, setSelectedTopicFilter] = useState<string>('All');

  const [expandedGroups, setExpandedGroups] = useState<Record<NavGroupKey, boolean>>({
    learn: true,
    review: true,
    test: true,
    track: true,
  });

  // Topics and Questions persistent state
  const [topics, setTopics] = useState<Topic[]>(() => StorageService.getTopics());
  const [questions, setQuestions] = useState<Question[]>(() => StorageService.getQuestions());

  // Part 6: Mistakes and Insights persistent state
  const [mistakes, setMistakes] = useState<MistakeEntry[]>(() => StorageService.getMistakes());
  const [insights, setInsights] = useState<KnowledgeInsight[]>(() => StorageService.getInsights());

  // Part 7: Mock Tests persistent state
  const [mockTests, setMockTests] = useState<MockTestRecord[]>(() => StorageService.getMockTests());

  // Part 8: Goals, Daily Targets, and Study Sessions persistent state
  const [goals, setGoals] = useState<StudyGoal[]>(() => StorageService.getGoals());
  const [dailyTargets, setDailyTargets] = useState<DailyTargetsConfig>(() => StorageService.getDailyTargets());
  const [studySessions, setStudySessions] = useState<StudySessionRecord[]>(() => StorageService.getStudySessions());

  // Part 9: External Platform Accounts persistent state
  const [platformAccounts, setPlatformAccounts] = useState<PlatformAccount[]>(() =>
    StorageService.getPlatforms()
  );

  // Part 10: Contest Records & Journal persistent state
  const [contestRecords, setContestRecords] = useState<ContestRecord[]>(() =>
    StorageService.getContestRecords()
  );
  const [contestJournal, setContestJournal] = useState<ContestJournalEntry[]>(() =>
    StorageService.getContestJournal()
  );
  const [upcomingContests, setUpcomingContests] = useState<UpcomingContest[]>([]);

  // Part 12: Meaningful Notification Preferences state
  const [notificationPreferences, setNotificationPreferences] = useState<NotificationPreferences>(
    () => StorageService.getNotificationPreferences()
  );
  const [readNotificationIds, setReadNotificationIds] = useState<Set<string>>(new Set());

  // Part 13: Local Snapshots persistent state
  const [localSnapshots, setLocalSnapshots] = useState<LocalBackupSnapshot[]>(() =>
    getLocalSnapshots()
  );

  // Multi-Device Sync state (Private Device Pairing, No Accounts)
  const [syncConfig, setSyncConfig] = useState<DeviceSyncConfig>(() => getDeviceSyncConfig());
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('IDLE');

  const updateSyncConfig = useCallback((updates: Partial<DeviceSyncConfig>) => {
    setSyncConfig((prev) => {
      const updated = { ...prev, ...updates };
      saveDeviceSyncConfig(updated);
      return updated;
    });
  }, []);

  const triggerCloudSync = useCallback(async (): Promise<boolean> => {
    setSyncStatus('SYNCING');
    const res = await syncWithCloud();
    if (res.success) {
      if (res.mergedData) {
        setTopics(res.mergedData.topics);
        setQuestions(res.mergedData.questions);
        setMistakes(res.mergedData.mistakes);
        setInsights(res.mergedData.insights);
        setMockTests(res.mergedData.mockTests);
        setGoals(res.mergedData.goals);
        setDailyTargets(res.mergedData.dailyTargets);
        setStudySessions(res.mergedData.studySessions);
        setPlatformAccounts(res.mergedData.platformAccounts);
        setContestRecords(res.mergedData.contestRecords);
        setContestJournal(res.mergedData.contestJournal);
      }
      setSyncStatus('SUCCESS');
      setSyncConfig(getDeviceSyncConfig());
      setTimeout(() => setSyncStatus('IDLE'), 3000);
      return true;
    } else {
      setSyncStatus(typeof navigator !== 'undefined' && !navigator.onLine ? 'OFFLINE' : 'ERROR');
      setSyncConfig(getDeviceSyncConfig());
      setTimeout(() => setSyncStatus('IDLE'), 4000);
      return false;
    }
  }, []);

  const pairDeviceWithVault = useCallback(
    async (vaultId: string): Promise<boolean> => {
      const cleanId = vaultId.trim();
      if (!cleanId) return false;
      updateSyncConfig({ vaultId: cleanId, isSyncEnabled: true });
      return await triggerCloudSync();
    },
    [updateSyncConfig, triggerCloudSync]
  );

  // Background online / periodic auto-sync listener
  useEffect(() => {
    const handleOnline = () => {
      if (syncConfig.isSyncEnabled) {
        triggerCloudSync();
      }
    };
    window.addEventListener('online', handleOnline);

    let intervalId: any = null;
    if (syncConfig.isSyncEnabled) {
      intervalId = setInterval(() => {
        triggerCloudSync();
      }, (syncConfig.autoSyncIntervalSeconds || 30) * 1000);
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      if (intervalId) clearInterval(intervalId);
    };
  }, [syncConfig.isSyncEnabled, syncConfig.autoSyncIntervalSeconds, triggerCloudSync]);

  // Active Focus Study Timer state
  const [activeFocusTimer, setActiveFocusTimer] = useState<{
    isRunning: boolean;
    isPaused: boolean;
    secondsElapsed: number;
    topicId?: string;
    topicName: string;
    activity: StudyActivityType;
    startedAt: string;
  } | null>(null);

  // Save changes to localStorage
  useEffect(() => {
    StorageService.saveTopics(topics);
  }, [topics]);

  useEffect(() => {
    StorageService.saveQuestions(questions);
  }, [questions]);

  useEffect(() => {
    StorageService.saveMistakes(mistakes);
  }, [mistakes]);

  useEffect(() => {
    StorageService.saveInsights(insights);
  }, [insights]);

  useEffect(() => {
    StorageService.saveMockTests(mockTests);
  }, [mockTests]);

  useEffect(() => {
    StorageService.saveGoals(goals);
  }, [goals]);

  useEffect(() => {
    StorageService.saveDailyTargets(dailyTargets);
  }, [dailyTargets]);

  useEffect(() => {
    StorageService.saveStudySessions(studySessions);
  }, [studySessions]);

  useEffect(() => {
    StorageService.savePlatforms(platformAccounts);
  }, [platformAccounts]);

  useEffect(() => {
    StorageService.saveContestRecords(contestRecords);
  }, [contestRecords]);

  useEffect(() => {
    StorageService.saveContestJournal(contestJournal);
  }, [contestJournal]);

  useEffect(() => {
    StorageService.saveNotificationPreferences(notificationPreferences);
  }, [notificationPreferences]);

  // Focus Timer Live Seconds Ticker
  useEffect(() => {
    let interval: number | null = null;
    if (activeFocusTimer && activeFocusTimer.isRunning && !activeFocusTimer.isPaused) {
      interval = window.setInterval(() => {
        setActiveFocusTimer((prev) => (prev ? { ...prev, secondsElapsed: prev.secondsElapsed + 1 } : null));
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [activeFocusTimer?.isRunning, activeFocusTimer?.isPaused]);

  useEffect(() => {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch (err) {
      console.error('Failed to save settings', err);
    }
  }, [settings]);

  // Apply Theme to document root
  useEffect(() => {
    const applyTheme = () => {
      let resolvedTheme = settings.theme;
      if (settings.theme === 'system') {
        const isSystemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        resolvedTheme = isSystemDark ? 'dark' : 'light';
      }
      document.documentElement.setAttribute('data-theme', resolvedTheme);
    };

    applyTheme();

    if (settings.theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const listener = () => applyTheme();
      mediaQuery.addEventListener('change', listener);
      return () => mediaQuery.removeEventListener('change', listener);
    }
  }, [settings.theme]);

  // Navigation handlers
  const navigateTo = useCallback((path: RoutePath) => {
    setCurrentPath(path);
    setIsMobileSidebarOpen(false);
  }, []);

  const toggleSidebar = useCallback(() => {
    setSettings((prev) => ({
      ...prev,
      sidebarCollapsed: !prev.sidebarCollapsed,
    }));
  }, []);

  const openMobileSidebar = useCallback(() => setIsMobileSidebarOpen(true), []);
  const closeMobileSidebar = useCallback(() => setIsMobileSidebarOpen(false), []);

  const toggleGroup = useCallback((group: NavGroupKey) => {
    setExpandedGroups((prev) => ({
      ...prev,
      [group]: !prev[group],
    }));
  }, []);

  const updateSettings = useCallback((updates: Partial<UserSettings>) => {
    setSettings((prev) => ({ ...prev, ...updates }));
  }, []);

  const setTheme = useCallback((theme: ThemeMode) => {
    setSettings((prev) => ({ ...prev, theme }));
  }, []);

  const toggleTheme = useCallback(() => {
    setSettings((prev) => {
      const nextTheme: ThemeMode = prev.theme === 'dark' ? 'light' : 'dark';
      return { ...prev, theme: nextTheme };
    });
  }, []);

  // --- TOPIC ACTIONS ---
  const addTopic = useCallback((topicData: Omit<Topic, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newTopic: Topic = {
      ...topicData,
      id: 'top-' + Math.random().toString(36).substring(2, 9),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setTopics((prev) => [...prev, newTopic]);
  }, []);

  const updateTopic = useCallback((id: string, updates: Partial<Topic>) => {
    setTopics((prev) =>
      prev.map((t) => {
        if (t.id !== id) return t;
        const updated = { ...t, ...updates, updatedAt: new Date().toISOString() };
        // Sync topicName on questions if topic name was updated
        if (updates.name && updates.name !== t.name) {
          setQuestions((qPrev) =>
            qPrev.map((q) => (q.topicId === id ? { ...q, topicName: updates.name! } : q))
          );
        }
        return updated;
      })
    );
  }, []);

  const archiveTopic = useCallback((id: string, archive = true) => {
    setTopics((prev) =>
      prev.map((t) => (t.id === id ? { ...t, isArchived: archive, updatedAt: new Date().toISOString() } : t))
    );
  }, []);

  const deleteTopicSafely = useCallback((id: string) => {
    // Preserve any linked questions by re-assigning them to Uncategorized instead of destroying them silently
    let preservedCount = 0;
    setQuestions((qPrev) =>
      qPrev.map((q) => {
        if (q.topicId === id) {
          preservedCount += 1;
          return { ...q, topicId: '', topicName: 'Uncategorized' };
        }
        return q;
      })
    );
    setTopics((prev) => prev.filter((t) => t.id !== id));
    return { success: true, questionsPreserved: preservedCount };
  }, []);

  // --- QUESTION ACTIONS & SR SCHEDULING ---
  const addQuestion = useCallback((qData: CreateQuestionInput) => {
    const baseQuestion: Question = {
      ...qData,
      id: 'q-' + Math.random().toString(36).substring(2, 9),
      reviewCount: qData.reviewCount ?? 0,
      successfulReviews: qData.successfulReviews ?? 0,
      failedReviews: qData.failedReviews ?? 0,
      consecutiveSuccesses: qData.consecutiveSuccesses ?? 0,
      currentIntervalDays: qData.currentIntervalDays ?? (qData.difficulty === 'Easy' ? 2 : 1),
      easeFactor: qData.easeFactor ?? 2.50,
      reviewHistory: qData.reviewHistory ?? [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // If no initial schedule set, schedule it
    const newQuestion = !baseQuestion.nextReviewAt
      ? scheduleInitialLearning(baseQuestion, new Date())
      : baseQuestion;

    setQuestions((prev) => [newQuestion, ...prev]);
  }, []);

  const updateQuestion = useCallback((id: string, updates: Partial<Question>) => {
    setQuestions((prev) =>
      prev.map((q) =>
        q.id === id ? { ...q, ...updates, updatedAt: new Date().toISOString() } : q
      )
    );
  }, []);

  const archiveQuestion = useCallback((id: string, archive = true) => {
    setQuestions((prev) =>
      prev.map((q) =>
        q.id === id
          ? {
              ...q,
              isArchived: archive,
              status: archive ? 'ARCHIVED' : q.status === 'ARCHIVED' ? 'LEARNING' : q.status,
              updatedAt: new Date().toISOString(),
            }
          : q
      )
    );
  }, []);

  const deleteQuestion = useCallback((id: string) => {
    setQuestions((prev) => prev.filter((q) => q.id !== id));
  }, []);

  // --- PART 4: SPACED REPETITION ENGINE DISPATCHERS ---
  const recordReview = useCallback(
    (
      questionId: string,
      rating: ReviewRating,
      options?: { timeSpentSeconds?: number; notes?: string }
    ) => {
      const target = questions.find((q) => q.id === questionId);
      if (!target) return null;

      const { updatedQuestion, reviewLog } = calculateNextReview(
        target,
        rating,
        new Date(),
        options
      );

      setQuestions((prev) =>
        prev.map((q) => (q.id === questionId ? updatedQuestion : q))
      );

      return { updatedQuestion, reviewLog };
    },
    [questions]
  );

  const scheduleQuestionLearning = useCallback(
    (questionId: string) => {
      const target = questions.find((q) => q.id === questionId);
      if (!target) return null;

      const scheduled = scheduleInitialLearning(target, new Date());
      setQuestions((prev) =>
        prev.map((q) => (q.id === questionId ? scheduled : q))
      );
      return scheduled;
    },
    [questions]
  );

  // --- SPACED REPETITION SELECTORS & QUERIES ---
  const dueTodayQuestions = useMemo(() => getDueToday(questions), [questions]);
  const overdueQuestions = useMemo(() => getOverdue(questions), [questions]);
  const upcomingQuestions = useMemo(() => getUpcoming(questions, 7), [questions]);
  const recentlyReviewedQuestions = useMemo(() => getRecentlyReviewed(questions, 10), [questions]);
  const srStats = useMemo(() => getSpacedRepetitionStats(questions), [questions]);

  // --- PART 6: MISTAKE BANK ACTIONS ---
  const addMistake = useCallback((mData: Omit<MistakeEntry, 'id' | 'createdAt'>) => {
    const newMistake: MistakeEntry = {
      ...mData,
      id: 'mst-' + Math.random().toString(36).substring(2, 9),
      createdAt: new Date().toISOString(),
    };
    setMistakes((prev) => [newMistake, ...prev]);

    // Also link onto question mistakes array if question exists
    if (mData.questionId) {
      setQuestions((qPrev) =>
        qPrev.map((q) => {
          if (q.id === mData.questionId) {
            const existingMistakes = q.mistakes || [];
            return {
              ...q,
              mistakes: [newMistake, ...existingMistakes],
            };
          }
          return q;
        })
      );
    }

    return newMistake;
  }, []);

  const updateMistake = useCallback((id: string, updates: Partial<MistakeEntry>) => {
    setMistakes((prev) =>
      prev.map((m) => {
        if (m.id !== id) return m;
        const updated = { ...m, ...updates };
        if (updates.isResolved !== undefined) {
          updated.resolvedAt = updates.isResolved ? new Date().toISOString() : undefined;
        }
        return updated;
      })
    );
  }, []);

  const toggleMistakeResolved = useCallback((id: string) => {
    setMistakes((prev) =>
      prev.map((m) => {
        if (m.id !== id) return m;
        const nextState = !m.isResolved;
        return {
          ...m,
          isResolved: nextState,
          resolvedAt: nextState ? new Date().toISOString() : undefined,
        };
      })
    );
  }, []);

  const deleteMistake = useCallback((id: string) => {
    setMistakes((prev) => prev.filter((m) => m.id !== id));
  }, []);

  const mistakeCategoryStats = useMemo(() => {
    const total = mistakes.length;
    if (total === 0) return [];
    const map: Record<string, number> = {};
    mistakes.forEach((m) => {
      map[m.category] = (map[m.category] || 0) + 1;
    });
    return Object.entries(map)
      .map(([category, count]) => ({
        category: category as MistakeCategory,
        count,
        percentage: Math.round((count / total) * 100),
      }))
      .sort((a, b) => b.count - a.count);
  }, [mistakes]);

  // --- PART 6: KNOWLEDGE VAULT ACTIONS ---
  const addInsight = useCallback((iData: Omit<KnowledgeInsight, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newInsight: KnowledgeInsight = {
      ...iData,
      id: 'ins-' + Math.random().toString(36).substring(2, 9),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setInsights((prev) => [newInsight, ...prev]);
    return newInsight;
  }, []);

  const updateInsight = useCallback((id: string, updates: Partial<KnowledgeInsight>) => {
    setInsights((prev) =>
      prev.map((ins) =>
        ins.id === id ? { ...ins, ...updates, updatedAt: new Date().toISOString() } : ins
      )
    );
  }, []);

  const deleteInsight = useCallback((id: string) => {
    setInsights((prev) => prev.filter((ins) => ins.id !== id));
  }, []);

  // --- PART 7: MOCK TESTS, SUNDAY SPECIAL & WEEKLY REPORT ---
  const saveMockTestRecord = useCallback((record: MockTestRecord) => {
    setMockTests((prev) => [record, ...prev]);
  }, []);

  const deleteMockTestRecord = useCallback((id: string) => {
    setMockTests((prev) => prev.filter((m) => m.id !== id));
  }, []);

  const { items: sundaySpecialQueue, totalEstimatedMinutes: sundaySpecialTotalMinutes } = useMemo(
    () => generateSundaySpecialQueue(questions, mistakes, mockTests),
    [questions, mistakes, mockTests]
  );

  const latestWeeklyReport = useMemo(
    () => generateWeeklyReport(questions, mistakes, mockTests),
    [questions, mistakes, mockTests]
  );

  // --- PART 8: GOALS, DAILY TARGETS, FOCUS TIMER & STREAKS ---
  const addGoal = useCallback((gData: Omit<StudyGoal, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newGoal: StudyGoal = {
      ...gData,
      id: 'goal-' + Math.random().toString(36).substring(2, 9),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setGoals((prev) => [newGoal, ...prev]);
    return newGoal;
  }, []);

  const updateGoal = useCallback((id: string, updates: Partial<StudyGoal>) => {
    setGoals((prev) =>
      prev.map((g) =>
        g.id === id ? { ...g, ...updates, updatedAt: new Date().toISOString() } : g
      )
    );
  }, []);

  const deleteGoal = useCallback((id: string) => {
    setGoals((prev) => prev.filter((g) => g.id !== id));
  }, []);

  const updateDailyTargets = useCallback((updates: Partial<DailyTargetsConfig>) => {
    setDailyTargets((prev) => ({ ...prev, ...updates }));
  }, []);

  const logStudySession = useCallback((sData: Omit<StudySessionRecord, 'id'>) => {
    const newSession: StudySessionRecord = {
      ...sData,
      id: 'sess-' + Math.random().toString(36).substring(2, 9),
    };
    setStudySessions((prev) => [newSession, ...prev]);
    return newSession;
  }, []);

  const deleteStudySession = useCallback((id: string) => {
    setStudySessions((prev) => prev.filter((s) => s.id !== id));
  }, []);

  const startFocusTimer = useCallback(
    (topicId?: string, topicName: string = 'General Practice', activity: StudyActivityType = 'Problem Solving') => {
      setActiveFocusTimer({
        isRunning: true,
        isPaused: false,
        secondsElapsed: 0,
        topicId,
        topicName,
        activity,
        startedAt: new Date().toISOString(),
      });
    },
    []
  );

  const pauseFocusTimer = useCallback(() => {
    setActiveFocusTimer((prev) => (prev ? { ...prev, isPaused: true } : null));
  }, []);

  const resumeFocusTimer = useCallback(() => {
    setActiveFocusTimer((prev) => (prev ? { ...prev, isPaused: false } : null));
  }, []);

  const stopAndSaveFocusTimer = useCallback(
    (notes?: string) => {
      if (!activeFocusTimer) return null;
      const session = logStudySession({
        topicId: activeFocusTimer.topicId,
        topicName: activeFocusTimer.topicName,
        activity: activeFocusTimer.activity,
        durationSeconds: activeFocusTimer.secondsElapsed,
        startedAt: activeFocusTimer.startedAt,
        endedAt: new Date().toISOString(),
        notes,
      });
      setActiveFocusTimer(null);
      return session;
    },
    [activeFocusTimer, logStudySession]
  );

  const discardFocusTimer = useCallback(() => {
    setActiveFocusTimer(null);
  }, []);

  // Streak & Consistency metrics
  const streakStats = useMemo(
    () => calculateStreakStats(questions, studySessions, mockTests),
    [questions, studySessions, mockTests]
  );

  // Dynamic Today Metrics
  const todayMetrics = useMemo(
    () => getTodayMetrics(dailyTargets, questions, studySessions, streakStats.currentStreak),
    [dailyTargets, questions, studySessions, streakStats.currentStreak]
  );

  // PART 9: Platform Actions
  const connectPlatform = useCallback(async (id: PlatformId, handle: string) => {
    const trimmedHandle = handle.trim();
    if (!trimmedHandle) return;

    setPlatformAccounts((prev) =>
      prev.map((acc) =>
        acc.id === id
          ? { ...acc, handle: trimmedHandle, status: 'SYNCING', errorMessage: undefined }
          : acc
      )
    );

    const currentAcc = platformAccounts.find((a) => a.id === id);
    if (!currentAcc) return;

    const updated = await syncPlatformAccount({
      ...currentAcc,
      handle: trimmedHandle,
      isConnected: true,
    });

    setPlatformAccounts((prev) => prev.map((acc) => (acc.id === id ? updated : acc)));
  }, [platformAccounts]);

  const disconnectPlatform = useCallback((id: PlatformId) => {
    setPlatformAccounts((prev) =>
      prev.map((acc) =>
        acc.id === id
          ? {
              ...acc,
              isConnected: false,
              status: 'DISCONNECTED',
              errorMessage: undefined,
            }
          : acc
      )
    );
  }, []);

  const syncPlatform = useCallback(async (id: PlatformId) => {
    const currentAcc = platformAccounts.find((a) => a.id === id);
    if (!currentAcc || !currentAcc.handle) return;

    setPlatformAccounts((prev) =>
      prev.map((acc) =>
        acc.id === id ? { ...acc, status: 'SYNCING', errorMessage: undefined } : acc
      )
    );

    const updated = await syncPlatformAccount(currentAcc);
    setPlatformAccounts((prev) => prev.map((acc) => (acc.id === id ? updated : acc)));
  }, [platformAccounts]);

  const syncAllPlatforms = useCallback(async () => {
    const connected = platformAccounts.filter((a) => a.isConnected && a.handle);
    if (connected.length === 0) return;

    setPlatformAccounts((prev) =>
      prev.map((acc) =>
        acc.isConnected ? { ...acc, status: 'SYNCING', errorMessage: undefined } : acc
      )
    );

    const syncPromises = connected.map((acc) => syncPlatformAccount(acc));
    const results = await Promise.all(syncPromises);

    setPlatformAccounts((prev) =>
      prev.map((acc) => {
        const res = results.find((r) => r.id === acc.id);
        return res || acc;
      })
    );
  }, [platformAccounts]);

  const enrollPlatformProblemToStudySystem = useCallback(
    (submission: ExternalSubmission, topicId?: string, topicName?: string) => {
      // Map platform to source enum
      const sourceMap: Record<PlatformId, any> = {
        leetcode: 'LeetCode',
        codeforces: 'Codeforces',
        codechef: 'CodeChef',
        geeksforgeeks: 'GeeksforGeeks',
        atcoder: 'Other',
      };

      const resolvedTopicId = topicId || (topics.length > 0 ? topics[0].id : '');
      const resolvedTopicName =
        topicName ||
        (topics.find((t) => t.id === resolvedTopicId)?.name ?? 'General');

      addQuestion({
        title: submission.problemTitle,
        subject: 'Data Structures & Algorithms',
        topicId: resolvedTopicId,
        topicName: resolvedTopicName,
        difficulty: submission.difficulty,
        pattern: 'Other',
        source: sourceMap[submission.platform] || 'Other',
        url: submission.problemUrl,
        tags: [submission.platform.toUpperCase(), submission.difficulty, 'Imported Submission'],
        notes: `Imported from ${submission.platform} submission on ${new Date(
          submission.submittedAt
        ).toLocaleDateString()}.\nVerdict: ${submission.verdict}${
          submission.language ? ` (${submission.language})` : ''
        }`,
        status: 'NEW',
        mastery: 1,
        isArchived: false,
      });

      // Mark submission as enrolled
      setPlatformAccounts((prev) =>
        prev.map((acc) => ({
          ...acc,
          recentSubmissions: acc.recentSubmissions.map((sub) =>
            sub.id === submission.id ? { ...sub, isEnrolledInStudySystem: true } : sub
          ),
        }))
      );
    },
    [topics, addQuestion]
  );

  // PART 10: Contest Actions & Computed Analysis
  const refreshUpcomingContests = useCallback(async () => {
    try {
      const list = await fetchLiveUpcomingContests();
      setUpcomingContests(list);
    } catch {
      // Non-fatal
    }
  }, []);

  useEffect(() => {
    refreshUpcomingContests();
  }, [refreshUpcomingContests]);

  const contestAnalysis = useMemo(
    () => calculateContestAnalysis(contestRecords, contestJournal),
    [contestRecords, contestJournal]
  );

  const addContestRecord = useCallback((recordData: Omit<ContestRecord, 'id'>) => {
    const newRecord: ContestRecord = {
      ...recordData,
      id: 'contest-' + Math.random().toString(36).substring(2, 9),
    };
    setContestRecords((prev) => [newRecord, ...prev]);
    return newRecord;
  }, []);

  const updateContestRecord = useCallback((id: string, updates: Partial<ContestRecord>) => {
    setContestRecords((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...updates } : c))
    );
  }, []);

  const deleteContestRecord = useCallback((id: string) => {
    setContestRecords((prev) => prev.filter((c) => c.id !== id));
  }, []);

  const saveContestJournalEntry = useCallback(
    (
      entryData: Omit<ContestJournalEntry, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }
    ) => {
      const now = new Date().toISOString();
      let savedEntry: ContestJournalEntry;

      if (entryData.id) {
        savedEntry = {
          ...entryData,
          id: entryData.id,
          createdAt: now,
          updatedAt: now,
        };
        setContestJournal((prev) =>
          prev.map((j) => (j.id === entryData.id ? { ...j, ...savedEntry, updatedAt: now } : j))
        );
      } else {
        savedEntry = {
          ...entryData,
          id: 'journal-' + Math.random().toString(36).substring(2, 9),
          createdAt: now,
          updatedAt: now,
        };
        setContestJournal((prev) => [savedEntry, ...prev]);
      }

      // Link to contest record if not linked
      setContestRecords((prev) =>
        prev.map((c) =>
          c.id === entryData.contestId ? { ...c, journalEntryId: savedEntry.id } : c
        )
      );

      return savedEntry;
    },
    []
  );

  const deleteContestJournalEntry = useCallback((id: string) => {
    setContestJournal((prev) => prev.filter((j) => j.id !== id));
    setContestRecords((prev) =>
      prev.map((c) => (c.journalEntryId === id ? { ...c, journalEntryId: undefined } : c))
    );
  }, []);

  // PART 12: Meaningful Notifications computation & handlers
  const rawNotifications = useMemo(() => {
    return generateMeaningfulNotifications(
      questions,
      upcomingContests,
      goals,
      streakStats.currentStreak,
      notificationPreferences
    );
  }, [questions, upcomingContests, goals, streakStats.currentStreak, notificationPreferences]);

  const notifications = useMemo(() => {
    return rawNotifications.map((n) => ({
      ...n,
      isRead: readNotificationIds.has(n.id),
    }));
  }, [rawNotifications, readNotificationIds]);

  const unreadNotificationsCount = useMemo(() => {
    return notifications.filter((n) => !n.isRead).length;
  }, [notifications]);

  const markNotificationRead = useCallback((id: string) => {
    setReadNotificationIds((prev) => new Set([...prev, id]));
  }, []);

  const clearAllNotifications = useCallback(() => {
    const allIds = rawNotifications.map((n) => n.id);
    setReadNotificationIds(new Set(allIds));
  }, [rawNotifications]);

  const updateNotificationPreferences = useCallback(
    (updates: Partial<NotificationPreferences>) => {
      setNotificationPreferences((prev) => ({
        ...prev,
        ...updates,
        categories: {
          ...prev.categories,
          ...(updates.categories || {}),
        },
      }));
    },
    []
  );

  // PART 13: Data Exports, Imports, Backups, Restores & Safety Operations
  const exportFullBackup = useCallback(() => {
    const payload = buildFullBackupPayload(
      topics,
      questions,
      mistakes,
      insights,
      mockTests,
      goals,
      dailyTargets,
      studySessions,
      platformAccounts,
      contestRecords,
      contestJournal,
      notificationPreferences,
      settings
    );
    exportFullDataToJson(payload);
  }, [
    topics,
    questions,
    mistakes,
    insights,
    mockTests,
    goals,
    dailyTargets,
    studySessions,
    platformAccounts,
    contestRecords,
    contestJournal,
    notificationPreferences,
    settings,
  ]);

  const exportQuestionsCsv = useCallback(() => {
    exportQuestionsToCsv(questions, topics);
  }, [questions, topics]);

  const exportMistakesCsv = useCallback(() => {
    exportMistakesToCsv(mistakes, questions);
  }, [mistakes, questions]);

  const exportInsightsCsv = useCallback(() => {
    exportInsightsToCsv(insights, topics);
  }, [insights, topics]);

  const exportStudySessionsCsv = useCallback(() => {
    exportStudySessionsToCsv(studySessions);
  }, [studySessions]);

  const exportContestsCsv = useCallback(() => {
    exportContestsToCsv(contestRecords);
  }, [contestRecords]);

  const createLocalBackupSnapshot = useCallback(
    (label?: string) => {
      const payload = buildFullBackupPayload(
        topics,
        questions,
        mistakes,
        insights,
        mockTests,
        goals,
        dailyTargets,
        studySessions,
        platformAccounts,
        contestRecords,
        contestJournal,
        notificationPreferences,
        settings
      );
      const snap = createLocalSnapshot(
        label || `Manual Snapshot (${new Date().toLocaleDateString()})`,
        payload
      );
      setLocalSnapshots(getLocalSnapshots());
      return snap;
    },
    [
      topics,
      questions,
      mistakes,
      insights,
      mockTests,
      goals,
      dailyTargets,
      studySessions,
      platformAccounts,
      contestRecords,
      contestJournal,
      notificationPreferences,
      settings,
    ]
  );

  const deleteLocalBackupSnapshot = useCallback((id: string) => {
    const updated = deleteLocalSnapshot(id);
    setLocalSnapshots(updated);
  }, []);

  const validateBackupFile = useCallback((rawJson: string, fileName?: string) => {
    return validateBackupJson(rawJson, fileName);
  }, []);

  const restoreFromBackup = useCallback(
    (incomingPayload: StudyOSBackupPayload, mode: ImportMode) => {
      if (mode === 'OVERWRITE') {
        const currentPayload = buildFullBackupPayload(
          topics,
          questions,
          mistakes,
          insights,
          mockTests,
          goals,
          dailyTargets,
          studySessions,
          platformAccounts,
          contestRecords,
          contestJournal,
          notificationPreferences,
          settings
        );
        createLocalSnapshot(`Auto-Safety Pre-Restore (${new Date().toLocaleTimeString()})`, currentPayload);
        setLocalSnapshots(getLocalSnapshots());

        setTopics(incomingPayload.data.topics || []);
        setQuestions(incomingPayload.data.questions || []);
        setMistakes(incomingPayload.data.mistakes || []);
        setInsights(incomingPayload.data.insights || []);
        setMockTests(incomingPayload.data.mockTests || []);
        setGoals(incomingPayload.data.goals || []);
        setDailyTargets(incomingPayload.data.dailyTargets || { newQuestions: 2, reviews: 8, studyMinutes: 60 });
        setStudySessions(incomingPayload.data.studySessions || []);
        setPlatformAccounts(incomingPayload.data.platformAccounts || []);
        setContestRecords(incomingPayload.data.contestRecords || []);
        setContestJournal(incomingPayload.data.contestJournal || []);
        if (incomingPayload.data.notificationPreferences) {
          setNotificationPreferences(incomingPayload.data.notificationPreferences);
        }
        if (incomingPayload.data.settings) {
          setSettings(incomingPayload.data.settings);
        }
        StorageService.restoreFullStoragePayload(incomingPayload);
      } else {
        const currentData = {
          topics,
          questions,
          mistakes,
          insights,
          mockTests,
          goals,
          dailyTargets,
          studySessions,
          platformAccounts,
          contestRecords,
          contestJournal,
          notificationPreferences,
          settings,
        };
        const mergedData = mergeImportData(currentData, incomingPayload.data);
        const mergedPayload: StudyOSBackupPayload = {
          version: 1,
          exportedAt: new Date().toISOString(),
          appName: 'Personal Study & Coding OS',
          summary: computeBackupSummary(mergedData),
          data: mergedData,
        };

        setTopics(mergedData.topics);
        setQuestions(mergedData.questions);
        setMistakes(mergedData.mistakes);
        setInsights(mergedData.insights);
        setMockTests(mergedData.mockTests);
        setGoals(mergedData.goals);
        setStudySessions(mergedData.studySessions);
        setContestRecords(mergedData.contestRecords);
        setContestJournal(mergedData.contestJournal);
        StorageService.restoreFullStoragePayload(mergedPayload);
      }
    },
    [
      topics,
      questions,
      mistakes,
      insights,
      mockTests,
      goals,
      dailyTargets,
      studySessions,
      platformAccounts,
      contestRecords,
      contestJournal,
      notificationPreferences,
      settings,
    ]
  );

  const clearAllUserData = useCallback(() => {
    const currentPayload = buildFullBackupPayload(
      topics,
      questions,
      mistakes,
      insights,
      mockTests,
      goals,
      dailyTargets,
      studySessions,
      platformAccounts,
      contestRecords,
      contestJournal,
      notificationPreferences,
      settings
    );
    createLocalSnapshot(`Auto-Safety Pre-Wipe (${new Date().toLocaleTimeString()})`, currentPayload);
    setLocalSnapshots(getLocalSnapshots());

    setTopics([]);
    setQuestions([]);
    setMistakes([]);
    setInsights([]);
    setMockTests([]);
    setGoals([]);
    setStudySessions([]);
    setContestRecords([]);
    setContestJournal([]);
    StorageService.clearAllStorageData();
  }, [
    topics,
    questions,
    mistakes,
    insights,
    mockTests,
    goals,
    dailyTargets,
    studySessions,
    platformAccounts,
    contestRecords,
    contestJournal,
    notificationPreferences,
    settings,
  ]);

  const resetToDemoDatabase = useCallback(() => {
    const currentPayload = buildFullBackupPayload(
      topics,
      questions,
      mistakes,
      insights,
      mockTests,
      goals,
      dailyTargets,
      studySessions,
      platformAccounts,
      contestRecords,
      contestJournal,
      notificationPreferences,
      settings
    );
    createLocalSnapshot(`Auto-Safety Pre-Demo-Reset (${new Date().toLocaleTimeString()})`, currentPayload);
    setLocalSnapshots(getLocalSnapshots());

    StorageService.resetToDefaultDemoData();
    setTopics(StorageService.getTopics());
    setQuestions(StorageService.getQuestions());
    setMistakes(StorageService.getMistakes());
    setInsights(StorageService.getInsights());
    setMockTests(StorageService.getMockTests());
    setGoals(StorageService.getGoals());
    setDailyTargets(StorageService.getDailyTargets());
    setStudySessions(StorageService.getStudySessions());
    setPlatformAccounts(StorageService.getPlatforms());
    setContestRecords(StorageService.getContestRecords());
    setContestJournal(StorageService.getContestJournal());
    setNotificationPreferences(StorageService.getNotificationPreferences());
  }, [
    topics,
    questions,
    mistakes,
    insights,
    mockTests,
    goals,
    dailyTargets,
    studySessions,
    platformAccounts,
    contestRecords,
    contestJournal,
    notificationPreferences,
    settings,
  ]);

  // Computed Metadata Helpers
  const allSubjects = useMemo(() => {
    const set = new Set<string>();
    topics.forEach((t) => { if (t.subject) set.add(t.subject); });
    questions.forEach((q) => { if (q.subject) set.add(q.subject); });
    if (set.size === 0) set.add('Data Structures & Algorithms');
    return Array.from(set);
  }, [topics, questions]);

  const allTags = useMemo(() => {
    const set = new Set<string>();
    questions.forEach((q) => {
      q.tags.forEach((tag) => set.add(tag));
    });
    insights.forEach((ins) => {
      ins.tags.forEach((tag) => set.add(tag));
    });
    return Array.from(set);
  }, [questions, insights]);

  return (
    <AppContext.Provider
      value={{
        currentPath,
        navigateTo,
        isSidebarCollapsed: settings.sidebarCollapsed,
        toggleSidebar,
        isMobileSidebarOpen,
        openMobileSidebar,
        closeMobileSidebar,
        expandedGroups,
        toggleGroup,
        settings,
        updateSettings,
        setTheme,
        toggleTheme,

        topics,
        addTopic,
        updateTopic,
        archiveTopic,
        deleteTopicSafely,
        selectedTopicFilter,
        setSelectedTopicFilter,

        questions,
        addQuestion,
        updateQuestion,
        archiveQuestion,
        deleteQuestion,

        // PART 4: Spaced Repetition methods & queries
        recordReview,
        scheduleQuestionLearning,
        dueTodayQuestions,
        overdueQuestions,
        upcomingQuestions,
        recentlyReviewedQuestions,
        srStats,

        // PART 6: Mistake Bank & Knowledge Vault
        mistakes,
        addMistake,
        updateMistake,
        toggleMistakeResolved,
        deleteMistake,
        mistakeCategoryStats,

        insights,
        addInsight,
        updateInsight,
        deleteInsight,

        // PART 7: Mock Tests, Sunday Special & Weekly Report
        mockTests,
        saveMockTestRecord,
        deleteMockTestRecord,
        sundaySpecialQueue,
        sundaySpecialTotalMinutes,
        latestWeeklyReport,

        // PART 8: Goals, Daily Targets, Focus Timer & Streaks
        goals,
        addGoal,
        updateGoal,
        deleteGoal,
        dailyTargets,
        updateDailyTargets,
        todayMetrics,
        studySessions,
        logStudySession,
        deleteStudySession,
        streakStats,

        activeFocusTimer,
        startFocusTimer,
        pauseFocusTimer,
        resumeFocusTimer,
        stopAndSaveFocusTimer,
        discardFocusTimer,

        // PART 9: External Platforms & Contest Tracking
        platformAccounts,
        connectPlatform,
        disconnectPlatform,
        syncPlatform,
        syncAllPlatforms,
        enrollPlatformProblemToStudySystem,

        // PART 10: Contest Dashboard, Rating Histories & Contest Journal
        contestRecords,
        contestJournal,
        upcomingContests,
        contestAnalysis,
        addContestRecord,
        updateContestRecord,
        deleteContestRecord,
        saveContestJournalEntry,
        deleteContestJournalEntry,
        refreshUpcomingContests,

        // PART 12: Meaningful Notifications & Preferences
        notifications,
        unreadNotificationsCount,
        notificationPreferences,
        updateNotificationPreferences,
        markNotificationRead,
        clearAllNotifications,

        // PART 13: Data Exports, Imports, Backups & Safety Clears
        exportFullBackup,
        exportQuestionsCsv,
        exportMistakesCsv,
        exportInsightsCsv,
        exportStudySessionsCsv,
        exportContestsCsv,
        localSnapshots,
        createLocalBackupSnapshot,
        deleteLocalBackupSnapshot,
        validateBackupFile,
        restoreFromBackup,
        clearAllUserData,
        resetToDemoDatabase,

        // Multi-Device Sync & Private Device Pairing
        syncConfig,
        syncStatus,
        updateSyncConfig,
        triggerCloudSync,
        pairDeviceWithVault,

        allSubjects,
        allTags,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useAppStore = (): AppContextValue => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppStore must be used within an AppProvider');
  }
  return context;
};

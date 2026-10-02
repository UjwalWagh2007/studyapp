import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import type {
  RoutePath,
  ThemeMode,
  UserSettings,
  Topic,
  Problem,
  CreateProblemInput,
  ReviewRating,
  DailyTargetsConfig,
  StudySession,
  TodayProgressMetrics,
  HeatmapDayData,
  DeviceSyncConfig,
  SyncStatus,
  MockTest,
  MockQuestionSelfAssessment,
} from '../types';
import { StorageService } from '../services/storage';
import {
  scheduleInitialLearning,
  calculateNextReview,
  getDueToday,
  getOverdue,
  getUpcoming,
} from '../services/spacedRepetition';
import {
  computeTodayMetrics,
  computeConsistencyHeatmap,
} from '../services/metricsService';
import {
  createNewStudySession,
  pauseStudySession,
  resumeStudySession,
  completeStudySession,
} from '../services/sessionService';
import {
  startMockTest,
  pauseMockTest,
  resumeMockTest,
  setActiveQuestion,
  completeQuestion,
  finishMockTest,
} from '../services/mockTestService';
import {
  getDeviceSyncConfig,
  saveDeviceSyncConfig,
  syncWithCloud,
} from '../services/syncService';

interface AppContextValue {
  // Navigation & Layout
  currentPath: RoutePath;
  navigateTo: (path: RoutePath) => void;
  isSidebarCollapsed: boolean;
  toggleSidebar: () => void;
  isMobileSidebarOpen: boolean;
  openMobileSidebar: () => void;
  closeMobileSidebar: () => void;

  // Settings & Theme
  settings: UserSettings;
  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => void;

  // Topics
  topics: Topic[];
  addTopic: (name: string) => Topic;
  updateTopic: (id: string, name: string) => void;
  deleteTopic: (id: string) => void;
  selectedTopicId: string | null;
  setSelectedTopicId: (id: string | null) => void;

  // Problems
  problems: Problem[];
  addProblem: (input: CreateProblemInput) => Problem;
  updateProblem: (id: string, updates: Partial<Problem>) => void;
  deleteProblem: (id: string) => void;

  // Spaced Repetition / Revision
  dueTodayProblems: Problem[];
  overdueProblems: Problem[];
  upcomingProblems: Problem[];
  recordReview: (
    problemId: string,
    rating: ReviewRating,
    options?: { timeSpentSeconds?: number; notes?: string }
  ) => void;

  // Daily Targets & Progress Metrics
  dailyTargets: DailyTargetsConfig;
  updateDailyTargets: (targets: Partial<DailyTargetsConfig>) => void;
  todayMetrics: TodayProgressMetrics;
  heatmapData: HeatmapDayData[];

  // Dedicated Study Sessions System
  studySessions: StudySession[];
  activeSession: StudySession | null;
  createAndStartSession: (name: string) => StudySession;
  pauseSessionById: (id: string) => void;
  resumeSessionById: (id: string) => void;
  endSessionById: (id: string) => void;
  deleteSessionById: (id: string) => void;

  // Mock Tests System
  mockTests: MockTest[];
  activeMockTest: MockTest | null;
  saveOrUpdateMockTest: (test: MockTest) => void;
  startMockTestAction: (testId: string, startIndex?: number) => void;
  pauseMockTestAction: (testId: string) => void;
  resumeMockTestAction: (testId: string) => void;
  setActiveQuestionAction: (testId: string, questionIndex: number) => void;
  completeQuestionAction: (
    testId: string,
    questionIndex: number,
    assessment: MockQuestionSelfAssessment
  ) => void;
  finishMockTestAction: (testId: string) => void;
  deleteMockTestAction: (testId: string) => void;

  // Sync
  syncConfig: DeviceSyncConfig;
  syncStatus: SyncStatus;
  isOnline: boolean;
  triggerCloudSync: () => Promise<void>;
  updateSyncConfig: (updates: Partial<DeviceSyncConfig>) => void;
  connectWorkspace: (workspaceId: string) => Promise<boolean>;
}

const AppContext = createContext<AppContextValue | null>(null);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // 1. Navigation state (Default: 'dashboard')
  const [currentPath, setCurrentPath] = useState<RoutePath>(() => {
    if (typeof window !== 'undefined' && window.location.hash) {
      const hash = window.location.hash.replace('#', '') as RoutePath;
      if (['dashboard', 'topics', 'revision', 'calendar', 'sessions', 'mock-tests'].includes(hash)) {
        return hash;
      }
    }
    return 'dashboard';
  });

  const [selectedTopicId, setSelectedTopicId] = useState<string | null>(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  const navigateTo = useCallback((path: RoutePath) => {
    setCurrentPath(path);
    if (typeof window !== 'undefined') {
      window.location.hash = path;
    }
    setIsMobileSidebarOpen(false);
  }, []);

  const toggleSidebar = useCallback(() => {
    setIsSidebarCollapsed((prev) => !prev);
  }, []);

  const openMobileSidebar = useCallback(() => {
    setIsMobileSidebarOpen(true);
  }, []);

  const closeMobileSidebar = useCallback(() => {
    setIsMobileSidebarOpen(false);
  }, []);

  // 2. Settings & Theme
  const [settings, setSettings] = useState<UserSettings>(() => StorageService.getSettings());

  const applyThemeToDOM = useCallback((theme: ThemeMode) => {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    root.classList.remove('theme-light', 'theme-dark');

    if (theme === 'system') {
      const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      root.classList.add(systemDark ? 'theme-dark' : 'theme-light');
      root.setAttribute('data-theme', systemDark ? 'dark' : 'light');
    } else {
      root.classList.add(theme === 'dark' ? 'theme-dark' : 'theme-light');
      root.setAttribute('data-theme', theme);
    }
  }, []);

  const setTheme = useCallback((theme: ThemeMode) => {
    setSettings((prev) => {
      const updated = { ...prev, theme };
      StorageService.saveSettings(updated);
      return updated;
    });
    applyThemeToDOM(theme);
  }, [applyThemeToDOM]);

  const toggleTheme = useCallback(() => {
    setTheme(settings.theme === 'dark' ? 'light' : 'dark');
  }, [settings.theme, setTheme]);

  useEffect(() => {
    applyThemeToDOM(settings.theme);
  }, [settings.theme, applyThemeToDOM]);

  // 3. Topics, Problems, Targets, Sessions & Mock Tests State
  const [topics, setTopics] = useState<Topic[]>(() => StorageService.getTopics());
  const [problems, setProblems] = useState<Problem[]>(() => StorageService.getProblems());
  const [dailyTargets, setDailyTargets] = useState<DailyTargetsConfig>(() => StorageService.getDailyTargets());
  const [studySessions, setStudySessions] = useState<StudySession[]>(() => StorageService.getStudySessions());
  const [mockTests, setMockTests] = useState<MockTest[]>(() => StorageService.getMockTests());

  // 4. Multi-Device Sync Engine
  const [syncConfig, setSyncConfig] = useState<DeviceSyncConfig>(() => getDeviceSyncConfig());
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('IDLE');
  const [isOnline, setIsOnline] = useState<boolean>(() =>
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  const syncDebounceRef = React.useRef<any>(null);

  const triggerCloudSync = useCallback(async (overrideVaultId?: string) => {
    if (!syncConfig.isSyncEnabled && !overrideVaultId) return;
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setSyncStatus('OFFLINE');
      return;
    }

    setSyncStatus('SYNCING');
    try {
      const res = await syncWithCloud(overrideVaultId);
      if (res.success) {
        setSyncStatus('SUCCESS');
        if (res.mergedData) {
          if (res.mergedData.topics) setTopics(res.mergedData.topics);
          if (res.mergedData.problems) setProblems(res.mergedData.problems);
          if (res.mergedData.studySessions) setStudySessions(res.mergedData.studySessions);
          if (res.mergedData.dailyTargets) setDailyTargets(res.mergedData.dailyTargets);
          if (res.mergedData.mockTests) setMockTests(res.mergedData.mockTests);
        }
      } else {
        setSyncStatus(navigator.onLine ? 'ERROR' : 'OFFLINE');
      }
    } catch {
      setSyncStatus('ERROR');
    } finally {
      setTimeout(() => {
        setSyncStatus((current) => (current === 'SYNCING' || current === 'SUCCESS' ? 'IDLE' : current));
      }, 3000);
    }
  }, [syncConfig.isSyncEnabled]);

  const scheduleAutoSync = useCallback(() => {
    if (syncDebounceRef.current) {
      clearTimeout(syncDebounceRef.current);
    }
    syncDebounceRef.current = setTimeout(() => {
      triggerCloudSync();
    }, 1200);
  }, [triggerCloudSync]);

  const updateSyncConfig = useCallback((updates: Partial<DeviceSyncConfig>) => {
    setSyncConfig((prev) => {
      const next = { ...prev, ...updates };
      saveDeviceSyncConfig(next);
      return next;
    });
  }, []);

  const connectWorkspace = useCallback(async (newVaultId: string): Promise<boolean> => {
    const cleanId = newVaultId.trim().toUpperCase();
    if (!cleanId) return false;
    setSyncStatus('SYNCING');
    try {
      const res = await syncWithCloud(cleanId);
      const nextConfig = { ...syncConfig, vaultId: cleanId, isSyncEnabled: true };
      setSyncConfig(nextConfig);
      saveDeviceSyncConfig(nextConfig);

      if (res.success && res.mergedData) {
        if (res.mergedData.topics) setTopics(res.mergedData.topics);
        if (res.mergedData.problems) setProblems(res.mergedData.problems);
        if (res.mergedData.studySessions) setStudySessions(res.mergedData.studySessions);
        if (res.mergedData.dailyTargets) setDailyTargets(res.mergedData.dailyTargets);
        if (res.mergedData.mockTests) setMockTests(res.mergedData.mockTests);
      }
      setSyncStatus('SUCCESS');
      return true;
    } catch (err) {
      console.error('Failed to connect workspace', err);
      setSyncStatus('ERROR');
      return false;
    }
  }, [syncConfig]);

  // Hydrate from IndexedDB on startup & trigger initial sync
  useEffect(() => {
    StorageService.hydrateFromIndexedDB().then((hydrated) => {
      setTopics(hydrated.topics);
      setProblems(hydrated.problems);
      setDailyTargets(hydrated.dailyTargets);
      setStudySessions(hydrated.studySessions);
      setMockTests(hydrated.mockTests);
      setSettings(hydrated.settings);
      applyThemeToDOM(hydrated.settings.theme);

      // Perform initial cloud sync & workspace check
      triggerCloudSync();
    });
  }, [applyThemeToDOM, triggerCloudSync]);

  // Network online/offline event listeners
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setSyncStatus('SYNCING');
      triggerCloudSync();
    };
    const handleOffline = () => {
      setIsOnline(false);
      setSyncStatus('OFFLINE');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [triggerCloudSync]);

  // Window focus & visibility listeners (pull latest changes when switching tabs/apps)
  useEffect(() => {
    const handleVisibilityOrFocus = () => {
      if (document.visibilityState === 'visible' && navigator.onLine) {
        triggerCloudSync();
      }
    };

    window.addEventListener('focus', handleVisibilityOrFocus);
    document.addEventListener('visibilitychange', handleVisibilityOrFocus);

    return () => {
      window.removeEventListener('focus', handleVisibilityOrFocus);
      document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
    };
  }, [triggerCloudSync]);

  // Periodic background sync interval
  useEffect(() => {
    if (!syncConfig.isSyncEnabled) return;
    const intervalTime = Math.max(15, syncConfig.autoSyncIntervalSeconds || 20) * 1000;
    const interval = setInterval(() => {
      if (typeof navigator !== 'undefined' && navigator.onLine) {
        triggerCloudSync();
      }
    }, intervalTime);

    return () => clearInterval(interval);
  }, [syncConfig.isSyncEnabled, syncConfig.autoSyncIntervalSeconds, triggerCloudSync]);

  // Target update
  const updateDailyTargets = useCallback((updates: Partial<DailyTargetsConfig>) => {
    setDailyTargets((prev) => {
      const next = { ...prev, ...updates };
      StorageService.saveDailyTargets(next);
      return next;
    });
    scheduleAutoSync();
  }, [scheduleAutoSync]);

  // Dedicated Study Sessions System
  const activeSession = useMemo(() => {
    return studySessions.find((s) => s.status === 'RUNNING' || s.status === 'PAUSED') || null;
  }, [studySessions]);

  const createAndStartSession = useCallback((name: string): StudySession => {
    const newSession = createNewStudySession(name);
    setStudySessions((prev) => {
      const next = [newSession, ...prev.map((s) => (s.status === 'RUNNING' ? pauseStudySession(s) : s))];
      StorageService.saveStudySessions(next);
      return next;
    });
    scheduleAutoSync();
    return newSession;
  }, [scheduleAutoSync]);

  const pauseSessionById = useCallback((id: string) => {
    setStudySessions((prev) => {
      const next = prev.map((s) => (s.id === id ? pauseStudySession(s) : s));
      StorageService.saveStudySessions(next);
      return next;
    });
    scheduleAutoSync();
  }, [scheduleAutoSync]);

  const resumeSessionById = useCallback((id: string) => {
    setStudySessions((prev) => {
      const next = prev.map((s) => {
        if (s.id === id) return resumeStudySession(s);
        if (s.status === 'RUNNING') return pauseStudySession(s);
        return s;
      });
      StorageService.saveStudySessions(next);
      return next;
    });
    scheduleAutoSync();
  }, [scheduleAutoSync]);

  const endSessionById = useCallback((id: string) => {
    setStudySessions((prev) => {
      const next = prev.map((s) => (s.id === id ? completeStudySession(s) : s));
      StorageService.saveStudySessions(next);
      return next;
    });
    scheduleAutoSync();
  }, [scheduleAutoSync]);

  const deleteSessionById = useCallback((id: string) => {
    setStudySessions((prev) => {
      const next = prev.filter((s) => s.id !== id);
      StorageService.saveStudySessions(next);
      return next;
    });
    scheduleAutoSync();
  }, [scheduleAutoSync]);

  // Mock Tests System
  const activeMockTest = useMemo(() => {
    return mockTests.find((t) => t.status === 'IN_PROGRESS' || t.status === 'PAUSED') || null;
  }, [mockTests]);

  const saveOrUpdateMockTest = useCallback((test: MockTest) => {
    setMockTests((prev) => {
      const exists = prev.some((t) => t.id === test.id);
      const next = exists ? prev.map((t) => (t.id === test.id ? test : t)) : [test, ...prev];
      StorageService.saveMockTests(next);
      return next;
    });
    scheduleAutoSync();
  }, [scheduleAutoSync]);

  const startMockTestAction = useCallback((testId: string, startIndex: number = 0) => {
    setMockTests((prev) => {
      const target = prev.find((t) => t.id === testId);
      if (!target) return prev;
      const updated = startMockTest(target, startIndex);
      const next = prev.map((t) => (t.id === testId ? updated : t));
      StorageService.saveMockTests(next);
      return next;
    });
    scheduleAutoSync();
  }, [scheduleAutoSync]);

  const pauseMockTestAction = useCallback((testId: string) => {
    setMockTests((prev) => {
      const target = prev.find((t) => t.id === testId);
      if (!target) return prev;
      const updated = pauseMockTest(target);
      const next = prev.map((t) => (t.id === testId ? updated : t));
      StorageService.saveMockTests(next);
      return next;
    });
    scheduleAutoSync();
  }, [scheduleAutoSync]);

  const resumeMockTestAction = useCallback((testId: string) => {
    setMockTests((prev) => {
      const target = prev.find((t) => t.id === testId);
      if (!target) return prev;
      const updated = resumeMockTest(target);
      const next = prev.map((t) => (t.id === testId ? updated : t));
      StorageService.saveMockTests(next);
      return next;
    });
    scheduleAutoSync();
  }, [scheduleAutoSync]);

  const setActiveQuestionAction = useCallback((testId: string, questionIndex: number) => {
    setMockTests((prev) => {
      const target = prev.find((t) => t.id === testId);
      if (!target) return prev;
      const updated = setActiveQuestion(target, questionIndex);
      const next = prev.map((t) => (t.id === testId ? updated : t));
      StorageService.saveMockTests(next);
      return next;
    });
    scheduleAutoSync();
  }, [scheduleAutoSync]);

  const completeQuestionAction = useCallback(
    (testId: string, questionIndex: number, assessment: MockQuestionSelfAssessment) => {
      setMockTests((prev) => {
        const target = prev.find((t) => t.id === testId);
        if (!target) return prev;
        const updated = completeQuestion(target, questionIndex, assessment);
        const next = prev.map((t) => (t.id === testId ? updated : t));
        StorageService.saveMockTests(next);
        return next;
      });
      scheduleAutoSync();
    },
    [scheduleAutoSync]
  );

  const finishMockTestAction = useCallback((testId: string) => {
    setMockTests((prev) => {
      const target = prev.find((t) => t.id === testId);
      if (!target) return prev;
      const updated = finishMockTest(target);
      const next = prev.map((t) => (t.id === testId ? updated : t));
      StorageService.saveMockTests(next);
      return next;
    });
    scheduleAutoSync();
  }, [scheduleAutoSync]);

  const deleteMockTestAction = useCallback((testId: string) => {
    setMockTests((prev) => {
      const next = prev.filter((t) => t.id !== testId);
      StorageService.saveMockTests(next);
      return next;
    });
    scheduleAutoSync();
  }, [scheduleAutoSync]);

  // Topic CRUD
  const addTopic = useCallback((name: string): Topic => {
    const trimmed = name.trim();
    const newTopic: Topic = {
      id: 'top-' + Math.random().toString(36).substring(2, 9) + Date.now().toString(36).substring(4),
      name: trimmed,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setTopics((prev) => {
      const next = [...prev, newTopic];
      StorageService.saveTopics(next);
      return next;
    });
    scheduleAutoSync();
    return newTopic;
  }, [scheduleAutoSync]);

  const updateTopic = useCallback((id: string, name: string) => {
    const trimmed = name.trim();
    setTopics((prev) => {
      const next = prev.map((t) =>
        t.id === id ? { ...t, name: trimmed, updatedAt: new Date().toISOString() } : t
      );
      StorageService.saveTopics(next);
      return next;
    });

    setProblems((prev) => {
      const next = prev.map((p) =>
        p.topicId === id ? { ...p, topicName: trimmed, updatedAt: new Date().toISOString() } : p
      );
      StorageService.saveProblems(next);
      return next;
    });
    scheduleAutoSync();
  }, [scheduleAutoSync]);

  const deleteTopic = useCallback((id: string) => {
    setTopics((prev) => {
      const next = prev.filter((t) => t.id !== id);
      StorageService.saveTopics(next);
      return next;
    });

    setProblems((prev) => {
      const next = prev.filter((p) => p.topicId !== id);
      StorageService.saveProblems(next);
      return next;
    });

    if (selectedTopicId === id) {
      setSelectedTopicId(null);
    }
    scheduleAutoSync();
  }, [selectedTopicId, scheduleAutoSync]);

  // Problem CRUD
  const addProblem = useCallback((input: CreateProblemInput): Problem => {
    const topic = topics.find((t) => t.id === input.topicId);
    const nowIso = new Date().toISOString();

    const rawProblem: Problem = {
      id: 'prob-' + Math.random().toString(36).substring(2, 9) + Date.now().toString(36).substring(4),
      topicId: input.topicId,
      topicName: topic?.name || input.topicName || 'General',
      title: input.title.trim(),
      link: input.link?.trim() || undefined,
      difficulty: input.difficulty,
      pattern: input.pattern?.trim() || undefined,
      solvedAt: input.solvedAt || nowIso,
      createdAt: nowIso,
      updatedAt: nowIso,
      status: input.status || 'LEARNING',
      currentIntervalDays: input.currentIntervalDays ?? 1,
      easeFactor: input.easeFactor ?? 2.5,
      reviewCount: input.reviewCount ?? 0,
      reviewHistory: input.reviewHistory ?? [],
    };

    const scheduledProblem = scheduleInitialLearning(rawProblem, input.solvedAt || new Date());
    if (input.nextReviewAt) {
      scheduledProblem.nextReviewAt = input.nextReviewAt;
    }

    setProblems((prev) => {
      const next = [scheduledProblem, ...prev];
      StorageService.saveProblems(next);
      return next;
    });
    scheduleAutoSync();
    return scheduledProblem;
  }, [topics, scheduleAutoSync]);

  const updateProblem = useCallback((id: string, updates: Partial<Problem>) => {
    setProblems((prev) => {
      const next = prev.map((p) => {
        if (p.id !== id) return p;
        const topic = updates.topicId ? topics.find((t) => t.id === updates.topicId) : undefined;
        return {
          ...p,
          ...updates,
          topicName: topic ? topic.name : updates.topicName || p.topicName,
          updatedAt: new Date().toISOString(),
        };
      });
      StorageService.saveProblems(next);
      return next;
    });
    scheduleAutoSync();
  }, [topics, scheduleAutoSync]);

  const deleteProblem = useCallback((id: string) => {
    setProblems((prev) => {
      const next = prev.filter((p) => p.id !== id);
      StorageService.saveProblems(next);
      return next;
    });
    scheduleAutoSync();
  }, [scheduleAutoSync]);

  // Spaced Repetition Reviews
  const recordReview = useCallback(
    (problemId: string, rating: ReviewRating, options?: { timeSpentSeconds?: number; notes?: string }) => {
      setProblems((prev) => {
        const problem = prev.find((p) => p.id === problemId);
        if (!problem) return prev;

        const { updatedProblem } = calculateNextReview(problem, rating, new Date(), options);
        const next = prev.map((p) => (p.id === problemId ? updatedProblem : p));
        StorageService.saveProblems(next);
        return next;
      });
      scheduleAutoSync();
    },
    [scheduleAutoSync]
  );

  const dueTodayProblems = useMemo(() => getDueToday(problems), [problems]);
  const overdueProblems = useMemo(() => getOverdue(problems), [problems]);
  const upcomingProblems = useMemo(() => getUpcoming(problems, 7), [problems]);

  // Today Progress Metrics & Heatmap Data
  const todayMetrics = useMemo(() => {
    return computeTodayMetrics(problems, studySessions, dailyTargets);
  }, [problems, studySessions, dailyTargets]);

  const heatmapData = useMemo(() => {
    return computeConsistencyHeatmap(problems, studySessions, dailyTargets, 52);
  }, [problems, studySessions, dailyTargets]);

  const value = useMemo(
    () => ({
      currentPath,
      navigateTo,
      isSidebarCollapsed,
      toggleSidebar,
      isMobileSidebarOpen,
      openMobileSidebar,
      closeMobileSidebar,
      settings,
      setTheme,
      toggleTheme,
      topics,
      addTopic,
      updateTopic,
      deleteTopic,
      selectedTopicId,
      setSelectedTopicId,
      problems,
      addProblem,
      updateProblem,
      deleteProblem,
      dueTodayProblems,
      overdueProblems,
      upcomingProblems,
      recordReview,
      dailyTargets,
      updateDailyTargets,
      studySessions,
      activeSession,
      createAndStartSession,
      pauseSessionById,
      resumeSessionById,
      endSessionById,
      deleteSessionById,
      mockTests,
      activeMockTest,
      saveOrUpdateMockTest,
      startMockTestAction,
      pauseMockTestAction,
      resumeMockTestAction,
      setActiveQuestionAction,
      completeQuestionAction,
      finishMockTestAction,
      deleteMockTestAction,
      todayMetrics,
      heatmapData,
      syncConfig,
      syncStatus,
      isOnline,
      triggerCloudSync,
      updateSyncConfig,
      connectWorkspace,
    }),
    [
      currentPath,
      navigateTo,
      isSidebarCollapsed,
      toggleSidebar,
      isMobileSidebarOpen,
      openMobileSidebar,
      closeMobileSidebar,
      settings,
      setTheme,
      toggleTheme,
      topics,
      addTopic,
      updateTopic,
      deleteTopic,
      selectedTopicId,
      problems,
      addProblem,
      updateProblem,
      deleteProblem,
      dueTodayProblems,
      overdueProblems,
      upcomingProblems,
      recordReview,
      dailyTargets,
      updateDailyTargets,
      studySessions,
      activeSession,
      createAndStartSession,
      pauseSessionById,
      resumeSessionById,
      endSessionById,
      deleteSessionById,
      mockTests,
      activeMockTest,
      saveOrUpdateMockTest,
      startMockTestAction,
      pauseMockTestAction,
      resumeMockTestAction,
      setActiveQuestionAction,
      completeQuestionAction,
      finishMockTestAction,
      deleteMockTestAction,
      todayMetrics,
      heatmapData,
      syncConfig,
      syncStatus,
      isOnline,
      triggerCloudSync,
      updateSyncConfig,
      connectWorkspace,
    ]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useAppStore = (): AppContextValue => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppStore must be used within an AppProvider');
  }
  return context;
};


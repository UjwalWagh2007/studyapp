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

  // Sync
  syncConfig: DeviceSyncConfig;
  syncStatus: SyncStatus;
  triggerCloudSync: () => Promise<void>;
  updateSyncConfig: (updates: Partial<DeviceSyncConfig>) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // 1. Navigation state (Default: 'dashboard')
  const [currentPath, setCurrentPath] = useState<RoutePath>(() => {
    if (typeof window !== 'undefined' && window.location.hash) {
      const hash = window.location.hash.replace('#', '') as RoutePath;
      if (['dashboard', 'topics', 'revision', 'calendar', 'sessions'].includes(hash)) {
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

  // 3. Topics & Problems State
  const [topics, setTopics] = useState<Topic[]>(() => StorageService.getTopics());
  const [problems, setProblems] = useState<Problem[]>(() => StorageService.getProblems());
  const [dailyTargets, setDailyTargets] = useState<DailyTargetsConfig>(() => StorageService.getDailyTargets());
  const [studySessions, setStudySessions] = useState<StudySession[]>(() => StorageService.getStudySessions());

  // Hydrate from IndexedDB on startup
  useEffect(() => {
    StorageService.hydrateFromIndexedDB().then((hydrated) => {
      setTopics(hydrated.topics);
      setProblems(hydrated.problems);
      setDailyTargets(hydrated.dailyTargets);
      setStudySessions(hydrated.studySessions);
      setSettings(hydrated.settings);
      applyThemeToDOM(hydrated.settings.theme);
    });
  }, [applyThemeToDOM]);

  // Target update
  const updateDailyTargets = useCallback((updates: Partial<DailyTargetsConfig>) => {
    setDailyTargets((prev) => {
      const next = { ...prev, ...updates };
      StorageService.saveDailyTargets(next);
      return next;
    });
  }, []);

  // 4. Dedicated Study Sessions System
  const activeSession = useMemo(() => {
    return studySessions.find((s) => s.status === 'RUNNING' || s.status === 'PAUSED') || null;
  }, [studySessions]);

  const createAndStartSession = useCallback((name: string): StudySession => {
    const newSession = createNewStudySession(name);
    setStudySessions((prev) => {
      // If there was an existing active session, pause or complete it
      const next = [newSession, ...prev.map((s) => (s.status === 'RUNNING' ? pauseStudySession(s) : s))];
      StorageService.saveStudySessions(next);
      return next;
    });
    return newSession;
  }, []);

  const pauseSessionById = useCallback((id: string) => {
    setStudySessions((prev) => {
      const next = prev.map((s) => (s.id === id ? pauseStudySession(s) : s));
      StorageService.saveStudySessions(next);
      return next;
    });
  }, []);

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
  }, []);

  const endSessionById = useCallback((id: string) => {
    setStudySessions((prev) => {
      const next = prev.map((s) => (s.id === id ? completeStudySession(s) : s));
      StorageService.saveStudySessions(next);
      return next;
    });
  }, []);

  const deleteSessionById = useCallback((id: string) => {
    setStudySessions((prev) => {
      const next = prev.filter((s) => s.id !== id);
      StorageService.saveStudySessions(next);
      return next;
    });
  }, []);

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
      const next = [newTopic, ...prev];
      StorageService.saveTopics(next);
      return next;
    });

    return newTopic;
  }, []);

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
  }, []);

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
  }, [selectedTopicId]);

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

    return scheduledProblem;
  }, [topics]);

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
  }, [topics]);

  const deleteProblem = useCallback((id: string) => {
    setProblems((prev) => {
      const next = prev.filter((p) => p.id !== id);
      StorageService.saveProblems(next);
      return next;
    });
  }, []);

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
    },
    []
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

  // 5. Sync Config & State
  const [syncConfig, setSyncConfig] = useState<DeviceSyncConfig>(() => getDeviceSyncConfig());
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('IDLE');

  const updateSyncConfig = useCallback((updates: Partial<DeviceSyncConfig>) => {
    setSyncConfig((prev) => {
      const next = { ...prev, ...updates };
      saveDeviceSyncConfig(next);
      return next;
    });
  }, []);

  const triggerCloudSync = useCallback(async () => {
    if (!syncConfig.isSyncEnabled) return;
    setSyncStatus('SYNCING');
    try {
      const res = await syncWithCloud();
      if (res.success) {
        setSyncStatus('SUCCESS');
        if (res.mergedData) {
          setTopics(res.mergedData.topics);
          setProblems(res.mergedData.problems);
          if (res.mergedData.studySessions) {
            setStudySessions(res.mergedData.studySessions);
          }
          if (res.mergedData.dailyTargets) {
            setDailyTargets(res.mergedData.dailyTargets);
          }
        }
      } else {
        setSyncStatus('ERROR');
      }
    } catch {
      setSyncStatus('ERROR');
    } finally {
      setTimeout(() => {
        setSyncStatus('IDLE');
      }, 3000);
    }
  }, [syncConfig.isSyncEnabled]);

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
      todayMetrics,
      heatmapData,
      syncConfig,
      syncStatus,
      triggerCloudSync,
      updateSyncConfig,
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
      todayMetrics,
      heatmapData,
      syncConfig,
      syncStatus,
      triggerCloudSync,
      updateSyncConfig,
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

import { describe, it, expect, beforeEach } from 'vitest';
import {
  buildFullBackupPayload,
  generateQuestionsCsv,
  generateMistakesCsv,
  generateInsightsCsv,
  generateStudySessionsCsv,
  generateContestsCsv,
  validateBackupJson,
  mergeImportData,
  createLocalSnapshot,
  getLocalSnapshots,
  deleteLocalSnapshot,
  escapeCsvField,
} from './backupService';
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
  UserSettings,
} from '../types';

describe('Part 13: Data Management, Backup & Export Services', () => {
  const sampleTopics: Topic[] = [
    {
      id: 'top-1',
      name: 'Sliding Window',
      subject: 'DSA',
      isArchived: false,
      createdAt: '2026-09-01T00:00:00.000Z',
      updatedAt: '2026-09-01T00:00:00.000Z',
    },
  ];

  const sampleQuestions: Question[] = [
    {
      id: 'q-1',
      title: 'Longest Substring Without Repeating Characters',
      subject: 'DSA',
      topicId: 'top-1',
      topicName: 'Sliding Window',
      difficulty: 'Medium',
      pattern: 'Sliding Window',
      source: 'LeetCode',
      url: 'https://leetcode.com/problems/longest-substring-without-repeating-characters/',
      status: 'REVIEWING',
      mastery: 4,
      reviewCount: 3,
      successfulReviews: 3,
      failedReviews: 0,
      easeFactor: 2.5,
      currentIntervalDays: 6,
      tags: ['string', 'hash-set'],
      notes: 'Use a sliding window with left/right pointer and "set" check',
      isArchived: false,
      createdAt: '2026-09-01T00:00:00.000Z',
      updatedAt: '2026-09-01T00:00:00.000Z',
    } as unknown as Question,
  ];

  const sampleMistakes: MistakeEntry[] = [
    {
      id: 'm-1',
      questionId: 'q-1',
      questionTitle: 'Longest Substring Without Repeating Characters',
      topicName: 'Sliding Window',
      category: 'Edge case',
      notes: 'Forgot duplicate character at beginning of string',
      isResolved: true,
      createdAt: '2026-09-10T00:00:00.000Z',
      resolvedAt: '2026-09-12T00:00:00.000Z',
    },
  ];

  const sampleInsights: KnowledgeInsight[] = [
    {
      id: 'ins-1',
      title: 'When to expand vs shrink sliding window',
      content: 'Expand right while constraint is valid, shrink left as soon as invariant is violated.',
      tags: ['sliding-window', 'pattern'],
      topicId: 'top-1',
      topicName: 'Sliding Window',
      createdAt: '2026-09-15T00:00:00.000Z',
      updatedAt: '2026-09-15T00:00:00.000Z',
    },
  ];

  const sampleSessions: StudySessionRecord[] = [
    {
      id: 's-1',
      topicName: 'Sliding Window',
      activity: 'Problem Solving',
      durationSeconds: 3600,
      startedAt: '2026-09-20T10:00:00.000Z',
      endedAt: '2026-09-20T11:00:00.000Z',
      notes: 'Solved 3 medium window questions',
    },
  ];

  const sampleContests: ContestRecord[] = [
    {
      id: 'c-1',
      contestName: 'LeetCode Weekly 415',
      platform: 'leetcode',
      platformName: 'LeetCode',
      date: '2026-09-25T00:00:00.000Z',
      rank: 1250,
      ratingBefore: 1820,
      ratingAfter: 1845,
      ratingChange: 25,
      problemsSolved: 3,
      totalProblems: 4,
    },
  ];

  const sampleGoals: StudyGoal[] = [];
  const sampleDailyTargets: DailyTargetsConfig = {
    newQuestionsTarget: 2,
    revisionsTarget: 8,
    studyTimeTargetMinutes: 60,
  };
  const sampleMocks: MockTestRecord[] = [];
  const samplePlatforms: PlatformAccount[] = [];
  const sampleJournal: ContestJournalEntry[] = [];
  const sampleNotifPrefs: NotificationPreferences = {
    enabled: true,
    preferredTime: 'ALL_DAY',
    categories: {
      srsRevisions: true,
      weeklyMock: true,
      sundaySpecial: true,
      contests: true,
      goals: true,
      streaks: true,
    },
  };
  const sampleSettings: UserSettings = {
    userName: 'Tester',
    theme: 'dark',
    sidebarCollapsed: false,
    compactMode: false,
  };

  let store: Record<string, string> = {};

  const localStorageMock = {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };

  beforeEach(() => {
    store = {};
    Object.defineProperty(globalThis, 'localStorage', {
      value: localStorageMock,
      writable: true,
    });
  });

  it('builds a full backup payload with complete summary statistics', () => {
    const payload = buildFullBackupPayload(
      sampleTopics,
      sampleQuestions,
      sampleMistakes,
      sampleInsights,
      sampleMocks,
      sampleGoals,
      sampleDailyTargets,
      sampleSessions,
      samplePlatforms,
      sampleContests,
      sampleJournal,
      sampleNotifPrefs,
      sampleSettings
    );

    expect(payload.version).toBe(1);
    expect(payload.appName).toBe('Personal Study & Coding OS');
    expect(payload.summary.totalTopics).toBe(1);
    expect(payload.summary.totalQuestions).toBe(1);
    expect(payload.summary.totalMistakes).toBe(1);
    expect(payload.summary.totalInsights).toBe(1);
    expect(payload.summary.totalStudySessions).toBe(1);
    expect(payload.summary.totalContestRecords).toBe(1);
  });

  it('escapes CSV fields with quotes and commas accurately', () => {
    expect(escapeCsvField('Simple text')).toBe('"Simple text"');
    expect(escapeCsvField('Text with, comma')).toBe('"Text with, comma"');
    expect(escapeCsvField('Text with "quotes"')).toBe('"Text with ""quotes"""');
    expect(escapeCsvField(undefined)).toBe('""');
  });

  it('generates well-formed CSV strings for questions, mistakes, and insights', () => {
    const questionsCsv = generateQuestionsCsv(sampleQuestions, sampleTopics);
    expect(questionsCsv).toContain('Title,Subject,Topic');
    expect(questionsCsv).toContain('Longest Substring Without Repeating Characters');

    const mistakesCsv = generateMistakesCsv(sampleMistakes, sampleQuestions);
    expect(mistakesCsv).toContain('QuestionTitle,Topic,Category,Resolved');
    expect(mistakesCsv).toContain('Edge case');

    const insightsCsv = generateInsightsCsv(sampleInsights, sampleTopics);
    expect(insightsCsv).toContain('Title,Topic,Tags');
    expect(insightsCsv).toContain('When to expand vs shrink sliding window');

    const sessionsCsv = generateStudySessionsCsv(sampleSessions);
    expect(sessionsCsv).toContain('DurationMinutes');
    expect(sessionsCsv).toContain('60');

    const contestsCsv = generateContestsCsv(sampleContests);
    expect(contestsCsv).toContain('LeetCode Weekly 415');
  });

  it('validates and parses valid backup JSON correctly', () => {
    const payload = buildFullBackupPayload(
      sampleTopics,
      sampleQuestions,
      sampleMistakes,
      sampleInsights,
      sampleMocks,
      sampleGoals,
      sampleDailyTargets,
      sampleSessions,
      samplePlatforms,
      sampleContests,
      sampleJournal,
      sampleNotifPrefs,
      sampleSettings
    );

    const jsonStr = JSON.stringify(payload);
    const result = validateBackupJson(jsonStr, 'test-backup.json');

    expect(result.isValid).toBe(true);
    expect(result.summary?.totalQuestions).toBe(1);
    expect(result.summary?.totalTopics).toBe(1);
    expect(result.payload?.data.questions.length).toBe(1);
  });

  it('handles invalid JSON gracefully with informative error messages', () => {
    const badJson = '{ malformed json: true, ';
    const result = validateBackupJson(badJson, 'bad.json');

    expect(result.isValid).toBe(false);
    expect(result.error).toBeDefined();
    expect(result.error).toContain('JSON parse error');
  });

  it('merges incoming items safely without overwriting existing data with same ID/title', () => {
    const currentData = {
      topics: sampleTopics,
      questions: sampleQuestions,
      mistakes: sampleMistakes,
      insights: sampleInsights,
      mockTests: [],
      goals: [],
      dailyTargets: sampleDailyTargets,
      studySessions: sampleSessions,
      platformAccounts: [],
      contestRecords: sampleContests,
      contestJournal: [],
      notificationPreferences: sampleNotifPrefs,
      settings: sampleSettings,
    };

    const incomingData = {
      topics: [
        {
          id: 'top-2',
          name: 'Dynamic Programming',
          subject: 'DSA',
          isArchived: false,
          createdAt: '',
          updatedAt: '',
        },
      ],
      questions: [
        // Duplicate title
        {
          id: 'q-dup',
          title: 'Longest Substring Without Repeating Characters',
          difficulty: 'Medium',
          pattern: 'Sliding Window',
        } as Question,
        // New question
        {
          id: 'q-2',
          title: 'Coin Change',
          difficulty: 'Medium',
          pattern: '0/1 Knapsack',
        } as Question,
      ],
      mistakes: [],
      insights: [],
      mockTests: [],
      goals: [],
      dailyTargets: sampleDailyTargets,
      studySessions: [],
      platformAccounts: [],
      contestRecords: [],
      contestJournal: [],
      notificationPreferences: sampleNotifPrefs,
      settings: sampleSettings,
    };

    const merged = mergeImportData(currentData, incomingData);

    expect(merged.topics.length).toBe(2);
    expect(merged.questions.length).toBe(2); // Only Coin Change added, duplicate title skipped
    expect(merged.questions.find((q) => q.title === 'Coin Change')).toBeDefined();
  });

  it('manages local backup snapshots correctly', () => {
    const payload = buildFullBackupPayload(
      sampleTopics,
      sampleQuestions,
      sampleMistakes,
      sampleInsights,
      sampleMocks,
      sampleGoals,
      sampleDailyTargets,
      sampleSessions,
      samplePlatforms,
      sampleContests,
      sampleJournal,
      sampleNotifPrefs,
      sampleSettings
    );

    const snapshot = createLocalSnapshot('Pre-Test Snapshot', payload);
    expect(snapshot.id).toBeDefined();
    expect(snapshot.label).toBe('Pre-Test Snapshot');

    const snapshots = getLocalSnapshots();
    expect(snapshots.length).toBe(1);
    expect(snapshots[0].summary.totalQuestions).toBe(1);

    const afterDelete = deleteLocalSnapshot(snapshot.id);
    expect(afterDelete.length).toBe(0);
    expect(getLocalSnapshots().length).toBe(0);
  });
});

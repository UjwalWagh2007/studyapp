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
  StudyOSBackupPayload,
  BackupDataSummary,
  LocalBackupSnapshot,
  ImportValidationResult,
} from '../types';

const LOCAL_SNAPSHOTS_KEY = 'studyos_local_snapshots_v1';
const MAX_SNAPSHOTS_LIMIT = 10;

// ============================================================================
// 1. BACKUP PAYLOAD BUILDER & SUMMARY
// ============================================================================

export function computeBackupSummary(data: StudyOSBackupPayload['data']): BackupDataSummary {
  return {
    totalTopics: data.topics?.length || 0,
    totalQuestions: data.questions?.length || 0,
    totalMistakes: data.mistakes?.length || 0,
    totalInsights: data.insights?.length || 0,
    totalMockTests: data.mockTests?.length || 0,
    totalGoals: data.goals?.length || 0,
    totalStudySessions: data.studySessions?.length || 0,
    totalContestRecords: data.contestRecords?.length || 0,
    totalContestJournal: data.contestJournal?.length || 0,
    totalPlatformAccounts: data.platformAccounts?.length || 0,
  };
}

export function buildFullBackupPayload(
  topics: Topic[],
  questions: Question[],
  mistakes: MistakeEntry[],
  insights: KnowledgeInsight[],
  mockTests: MockTestRecord[],
  goals: StudyGoal[],
  dailyTargets: DailyTargetsConfig,
  studySessions: StudySessionRecord[],
  platformAccounts: PlatformAccount[],
  contestRecords: ContestRecord[],
  contestJournal: ContestJournalEntry[],
  notificationPreferences: NotificationPreferences,
  settings: UserSettings
): StudyOSBackupPayload {
  const data = {
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

  const summary = computeBackupSummary(data);

  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    appName: 'Personal Study & Coding OS',
    summary,
    data,
  };
}

// ============================================================================
// 2. FILE DOWNLOAD TRIGGER (BROWSER COMPATIBLE)
// ============================================================================

export function triggerFileDownload(content: string, fileName: string, mimeType: string): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return; // Node/test environment guard
  }

  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

// ============================================================================
// 3. FULL JSON EXPORT
// ============================================================================

export function exportFullDataToJson(payload: StudyOSBackupPayload): void {
  const jsonString = JSON.stringify(payload, null, 2);
  const dateStamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 16);
  const fileName = `study-os-backup-${dateStamp}.json`;
  triggerFileDownload(jsonString, fileName, 'application/json');
}

// ============================================================================
// 4. CSV EXPORTS
// ============================================================================

export function escapeCsvField(value: any): string {
  if (value === null || value === undefined) return '""';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return `"${str}"`;
}

export function generateQuestionsCsv(questions: Question[], topics: Topic[]): string {
  const topicMap = new Map<string, string>();
  topics.forEach((t) => topicMap.set(t.id, t.name));

  const headers = [
    'ID',
    'Title',
    'Subject',
    'Topic',
    'Difficulty',
    'Pattern',
    'Status',
    'MasteryScore',
    'ReviewCount',
    'SuccessfulReviews',
    'FailedReviews',
    'EaseFactor',
    'IntervalDays',
    'FirstLearnedDate',
    'LastReviewDate',
    'NextReviewDate',
    'Source',
    'SourceUrl',
    'Tags',
    'Notes',
  ];

  const rows = questions.map((q) => [
    escapeCsvField(q.id),
    escapeCsvField(q.title),
    escapeCsvField(q.subject || 'DSA'),
    escapeCsvField(q.topicName || topicMap.get(q.topicId) || ''),
    escapeCsvField(q.difficulty),
    escapeCsvField(q.pattern || 'Other'),
    escapeCsvField(q.status),
    escapeCsvField(q.mastery),
    escapeCsvField(q.reviewCount),
    escapeCsvField(q.successfulReviews),
    escapeCsvField(q.failedReviews),
    escapeCsvField(q.easeFactor),
    escapeCsvField(q.currentIntervalDays),
    escapeCsvField(q.firstLearnedAt || ''),
    escapeCsvField(q.lastReviewedAt || ''),
    escapeCsvField(q.nextReviewAt || ''),
    escapeCsvField(q.source),
    escapeCsvField(q.url || ''),
    escapeCsvField((q.tags || []).join('; ')),
    escapeCsvField(q.notes || ''),
  ]);

  return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
}

export function exportQuestionsToCsv(questions: Question[], topics: Topic[]): void {
  const csv = generateQuestionsCsv(questions, topics);
  const dateStamp = new Date().toISOString().slice(0, 10);
  triggerFileDownload(csv, `study-os-questions-${dateStamp}.csv`, 'text/csv;charset=utf-8;');
}

export function generateMistakesCsv(mistakes: MistakeEntry[], questions: Question[]): string {
  const qMap = new Map<string, string>();
  questions.forEach((q) => qMap.set(q.id, q.title));

  const headers = [
    'ID',
    'QuestionTitle',
    'Topic',
    'Category',
    'Resolved',
    'CreatedAt',
    'ResolvedAt',
    'Notes',
  ];

  const rows = mistakes.map((m) => [
    escapeCsvField(m.id),
    escapeCsvField(m.questionTitle || qMap.get(m.questionId) || 'Untitled Question'),
    escapeCsvField(m.topicName || ''),
    escapeCsvField(m.category),
    escapeCsvField(m.isResolved ? 'Yes' : 'No'),
    escapeCsvField(m.createdAt),
    escapeCsvField(m.resolvedAt || ''),
    escapeCsvField(m.notes || ''),
  ]);

  return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
}

export function exportMistakesToCsv(mistakes: MistakeEntry[], questions: Question[]): void {
  const csv = generateMistakesCsv(mistakes, questions);
  const dateStamp = new Date().toISOString().slice(0, 10);
  triggerFileDownload(csv, `study-os-mistakes-${dateStamp}.csv`, 'text/csv;charset=utf-8;');
}

export function generateInsightsCsv(insights: KnowledgeInsight[], topics: Topic[]): string {
  const topicMap = new Map<string, string>();
  topics.forEach((t) => topicMap.set(t.id, t.name));

  const headers = ['ID', 'Title', 'Topic', 'Tags', 'CreatedAt', 'UpdatedAt', 'Content'];

  const rows = insights.map((ins) => [
    escapeCsvField(ins.id),
    escapeCsvField(ins.title),
    escapeCsvField(ins.topicName || (ins.topicId ? topicMap.get(ins.topicId) : '') || 'General'),
    escapeCsvField((ins.tags || []).join('; ')),
    escapeCsvField(ins.createdAt),
    escapeCsvField(ins.updatedAt),
    escapeCsvField(ins.content),
  ]);

  return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
}

export function exportInsightsToCsv(insights: KnowledgeInsight[], topics: Topic[]): void {
  const csv = generateInsightsCsv(insights, topics);
  const dateStamp = new Date().toISOString().slice(0, 10);
  triggerFileDownload(csv, `study-os-knowledge-vault-${dateStamp}.csv`, 'text/csv;charset=utf-8;');
}

export function generateStudySessionsCsv(sessions: StudySessionRecord[]): string {
  const headers = [
    'ID',
    'Date',
    'Topic',
    'Activity',
    'DurationMinutes',
    'StartedAt',
    'EndedAt',
    'Notes',
  ];

  const rows = sessions.map((s) => [
    escapeCsvField(s.id),
    escapeCsvField(s.startedAt.slice(0, 10)),
    escapeCsvField(s.topicName || 'General Practice'),
    escapeCsvField(s.activity),
    escapeCsvField(Math.round(s.durationSeconds / 60)),
    escapeCsvField(s.startedAt),
    escapeCsvField(s.endedAt),
    escapeCsvField(s.notes || ''),
  ]);

  return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
}

export function exportStudySessionsToCsv(sessions: StudySessionRecord[]): void {
  const csv = generateStudySessionsCsv(sessions);
  const dateStamp = new Date().toISOString().slice(0, 10);
  triggerFileDownload(csv, `study-os-study-sessions-${dateStamp}.csv`, 'text/csv;charset=utf-8;');
}

export function generateContestsCsv(contests: ContestRecord[]): string {
  const headers = [
    'ID',
    'ContestName',
    'Platform',
    'ContestDate',
    'Rank',
    'RatingBefore',
    'RatingAfter',
    'RatingChange',
    'ProblemsSolved',
    'TotalProblems',
    'Url',
  ];

  const rows = contests.map((c) => [
    escapeCsvField(c.id),
    escapeCsvField(c.contestName),
    escapeCsvField(c.platformName || c.platform),
    escapeCsvField(c.date.slice(0, 10)),
    escapeCsvField(c.rank ?? ''),
    escapeCsvField(c.ratingBefore ?? ''),
    escapeCsvField(c.ratingAfter ?? ''),
    escapeCsvField(c.ratingChange ?? ''),
    escapeCsvField(c.problemsSolved ?? ''),
    escapeCsvField(c.totalProblems ?? ''),
    escapeCsvField(c.contestUrl || ''),
  ]);

  return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
}

export function exportContestsToCsv(contests: ContestRecord[]): void {
  const csv = generateContestsCsv(contests);
  const dateStamp = new Date().toISOString().slice(0, 10);
  triggerFileDownload(csv, `study-os-contests-${dateStamp}.csv`, 'text/csv;charset=utf-8;');
}

// ============================================================================
// 5. LOCAL SNAPSHOT BACKUPS MANAGEMENT
// ============================================================================

export function getLocalSnapshots(): LocalBackupSnapshot[] {
  try {
    if (typeof localStorage === 'undefined') return [];
    const raw = localStorage.getItem(LOCAL_SNAPSHOTS_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function saveLocalSnapshots(snapshots: LocalBackupSnapshot[]): void {
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(LOCAL_SNAPSHOTS_KEY, JSON.stringify(snapshots));
  } catch (err) {
    console.error('Failed to save local snapshots to localStorage', err);
  }
}

export function createLocalSnapshot(
  label: string,
  payload: StudyOSBackupPayload
): LocalBackupSnapshot {
  const existing = getLocalSnapshots();
  const serialized = JSON.stringify(payload);
  const sizeBytes = typeof Blob !== 'undefined' ? new Blob([serialized]).size : serialized.length;

  const newSnapshot: LocalBackupSnapshot = {
    id: 'snap-' + Math.random().toString(36).substring(2, 9),
    label: label.trim() || `Auto-Backup (${new Date().toLocaleDateString()})`,
    createdAt: new Date().toISOString(),
    summary: payload.summary || computeBackupSummary(payload.data),
    payload,
    sizeBytes,
  };

  // Prepend and enforce maximum count limit
  const updated = [newSnapshot, ...existing].slice(0, MAX_SNAPSHOTS_LIMIT);
  saveLocalSnapshots(updated);
  return newSnapshot;
}

export function deleteLocalSnapshot(snapshotId: string): LocalBackupSnapshot[] {
  const existing = getLocalSnapshots();
  const updated = existing.filter((s) => s.id !== snapshotId);
  saveLocalSnapshots(updated);
  return updated;
}

// ============================================================================
// 6. JSON IMPORT VALIDATION & PARSING
// ============================================================================

export function validateBackupJson(rawJson: string, fileName = 'backup.json'): ImportValidationResult {
  try {
    const parsed = JSON.parse(rawJson);

    if (!parsed || typeof parsed !== 'object') {
      return {
        isValid: false,
        error: 'The uploaded file is not a valid JSON object.',
        fileName,
      };
    }

    // Support both full wrapper format and direct data format
    let dataContainer: StudyOSBackupPayload['data'];

    if (parsed.data && typeof parsed.data === 'object') {
      dataContainer = parsed.data;
    } else if (Array.isArray(parsed.questions) || Array.isArray(parsed.topics)) {
      dataContainer = parsed;
    } else {
      return {
        isValid: false,
        error: 'Missing study data payload. Expected questions or topics array.',
        fileName,
      };
    }

    // Ensure array fields exist
    const sanitizedData: StudyOSBackupPayload['data'] = {
      topics: Array.isArray(dataContainer.topics) ? dataContainer.topics : [],
      questions: Array.isArray(dataContainer.questions) ? dataContainer.questions : [],
      mistakes: Array.isArray(dataContainer.mistakes) ? dataContainer.mistakes : [],
      insights: Array.isArray(dataContainer.insights) ? dataContainer.insights : [],
      mockTests: Array.isArray(dataContainer.mockTests) ? dataContainer.mockTests : [],
      goals: Array.isArray(dataContainer.goals) ? dataContainer.goals : [],
      dailyTargets: dataContainer.dailyTargets || { newQuestions: 2, reviews: 8, studyMinutes: 60 },
      studySessions: Array.isArray(dataContainer.studySessions) ? dataContainer.studySessions : [],
      platformAccounts: Array.isArray(dataContainer.platformAccounts) ? dataContainer.platformAccounts : [],
      contestRecords: Array.isArray(dataContainer.contestRecords) ? dataContainer.contestRecords : [],
      contestJournal: Array.isArray(dataContainer.contestJournal) ? dataContainer.contestJournal : [],
      notificationPreferences: dataContainer.notificationPreferences || {
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
      },
      settings: dataContainer.settings || {
        userName: 'Coder',
        theme: 'dark',
        sidebarCollapsed: false,
        compactMode: false,
      },
    };

    const summary = computeBackupSummary(sanitizedData);

    const payload: StudyOSBackupPayload = {
      version: 1,
      exportedAt: parsed.exportedAt || new Date().toISOString(),
      appName: parsed.appName || 'Personal Study & Coding OS',
      summary,
      data: sanitizedData,
    };

    return {
      isValid: true,
      summary,
      payload,
      fileName,
    };
  } catch (err: any) {
    return {
      isValid: false,
      error: `JSON parse error: ${err.message || 'Malformed file'}`,
      fileName,
    };
  }
}

// ============================================================================
// 7. MERGE IMPORT STRATEGY
// ============================================================================

export function mergeImportData(
  currentData: StudyOSBackupPayload['data'],
  incomingData: StudyOSBackupPayload['data']
): StudyOSBackupPayload['data'] {
  // Merge Topics (deduplicate by id or name)
  const existingTopicIds = new Set(currentData.topics.map((t) => t.id));
  const existingTopicNames = new Set(currentData.topics.map((t) => t.name.toLowerCase().trim()));
  const mergedTopics = [...currentData.topics];
  incomingData.topics.forEach((t) => {
    if (!existingTopicIds.has(t.id) && !existingTopicNames.has(t.name.toLowerCase().trim())) {
      mergedTopics.push(t);
      existingTopicIds.add(t.id);
    }
  });

  // Merge Questions (deduplicate by id or title)
  const existingQuestionIds = new Set(currentData.questions.map((q) => q.id));
  const existingQuestionTitles = new Set(
    currentData.questions.map((q) => q.title.toLowerCase().trim())
  );
  const mergedQuestions = [...currentData.questions];
  incomingData.questions.forEach((q) => {
    if (!existingQuestionIds.has(q.id) && !existingQuestionTitles.has(q.title.toLowerCase().trim())) {
      mergedQuestions.push(q);
      existingQuestionIds.add(q.id);
    }
  });

  // Merge Mistakes (deduplicate by id)
  const existingMistakeIds = new Set(currentData.mistakes.map((m) => m.id));
  const mergedMistakes = [...currentData.mistakes];
  incomingData.mistakes.forEach((m) => {
    if (!existingMistakeIds.has(m.id)) {
      mergedMistakes.push(m);
      existingMistakeIds.add(m.id);
    }
  });

  // Merge Knowledge Insights (deduplicate by id or title)
  const existingInsightIds = new Set(currentData.insights.map((ins) => ins.id));
  const existingInsightTitles = new Set(
    currentData.insights.map((ins) => ins.title.toLowerCase().trim())
  );
  const mergedInsights = [...currentData.insights];
  incomingData.insights.forEach((ins) => {
    if (
      !existingInsightIds.has(ins.id) &&
      !existingInsightTitles.has(ins.title.toLowerCase().trim())
    ) {
      mergedInsights.push(ins);
      existingInsightIds.add(ins.id);
    }
  });

  // Merge Mock Tests (deduplicate by id)
  const existingMockIds = new Set(currentData.mockTests.map((m) => m.id));
  const mergedMockTests = [...currentData.mockTests];
  incomingData.mockTests.forEach((m) => {
    if (!existingMockIds.has(m.id)) {
      mergedMockTests.push(m);
      existingMockIds.add(m.id);
    }
  });

  // Merge Goals (deduplicate by id or title)
  const existingGoalIds = new Set(currentData.goals.map((g) => g.id));
  const existingGoalTitles = new Set(currentData.goals.map((g) => g.title.toLowerCase().trim()));
  const mergedGoals = [...currentData.goals];
  incomingData.goals.forEach((g) => {
    if (!existingGoalIds.has(g.id) && !existingGoalTitles.has(g.title.toLowerCase().trim())) {
      mergedGoals.push(g);
      existingGoalIds.add(g.id);
    }
  });

  // Merge Study Sessions (deduplicate by id)
  const existingSessionIds = new Set(currentData.studySessions.map((s) => s.id));
  const mergedSessions = [...currentData.studySessions];
  incomingData.studySessions.forEach((s) => {
    if (!existingSessionIds.has(s.id)) {
      mergedSessions.push(s);
      existingSessionIds.add(s.id);
    }
  });

  // Merge Contests (deduplicate by id)
  const existingContestIds = new Set(currentData.contestRecords.map((c) => c.id));
  const mergedContests = [...currentData.contestRecords];
  incomingData.contestRecords.forEach((c) => {
    if (!existingContestIds.has(c.id)) {
      mergedContests.push(c);
      existingContestIds.add(c.id);
    }
  });

  // Merge Contest Journals (deduplicate by id)
  const existingJournalIds = new Set(currentData.contestJournal.map((j) => j.id));
  const mergedJournal = [...currentData.contestJournal];
  incomingData.contestJournal.forEach((j) => {
    if (!existingJournalIds.has(j.id)) {
      mergedJournal.push(j);
      existingJournalIds.add(j.id);
    }
  });

  return {
    topics: mergedTopics,
    questions: mergedQuestions,
    mistakes: mergedMistakes,
    insights: mergedInsights,
    mockTests: mergedMockTests,
    goals: mergedGoals,
    dailyTargets: currentData.dailyTargets,
    studySessions: mergedSessions,
    platformAccounts: currentData.platformAccounts,
    contestRecords: mergedContests,
    contestJournal: mergedJournal,
    notificationPreferences: currentData.notificationPreferences,
    settings: currentData.settings,
  };
}

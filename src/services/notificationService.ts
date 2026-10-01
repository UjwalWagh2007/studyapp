import type {
  NotificationItem,
  NotificationPreferences,
  Question,
  UpcomingContest,
  StudyGoal,
} from '../types';
import { normalizeDate } from './spacedRepetition';

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
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

/**
 * Generates high-signal, deterministic, non-spam notifications based on current study system state.
 */
export function generateMeaningfulNotifications(
  questions: Question[],
  upcomingContests: UpcomingContest[],
  goals: StudyGoal[],
  currentStreak: number = 0,
  preferences: NotificationPreferences = DEFAULT_NOTIFICATION_PREFERENCES,
  now: Date = new Date()
): NotificationItem[] {
  if (!preferences.enabled) return [];

  const items: NotificationItem[] = [];
  const todayStr = normalizeDate(now);
  const dayOfWeek = now.getDay(); // 0 = Sunday, 6 = Saturday

  // 1. SRS Daily Revisions & Overdue Backlog
  if (preferences.categories.srsRevisions) {
    const dueToday = questions.filter((q) => !q.isArchived && normalizeDate(q.nextReviewAt) === todayStr);
    const overdue = questions.filter((q) => !q.isArchived && q.nextReviewAt && normalizeDate(q.nextReviewAt) < todayStr);

    if (overdue.length > 0) {
      items.push({
        id: `notif-overdue-${todayStr}`,
        category: 'SRS_REVISIONS',
        title: 'Overdue Reviews Pending',
        message: `${overdue.length} spaced repetition card${overdue.length === 1 ? '' : 's'} are overdue. Complete them first to maintain retention.`,
        createdAt: now.toISOString(),
        isRead: false,
        actionRoute: 'review/due-today',
        actionText: 'Review Overdue Cards',
      });
    }

    if (dueToday.length > 0) {
      items.push({
        id: `notif-srs-due-${todayStr}`,
        category: 'SRS_REVISIONS',
        title: 'Revisions Due Today',
        message: `${dueToday.length} revision${dueToday.length === 1 ? '' : 's'} are due today for active recall reinforcement.`,
        createdAt: now.toISOString(),
        isRead: false,
        actionRoute: 'review/due-today',
        actionText: 'Start Review Session',
      });
    }
  }

  // 2. Saturday Weekly Mock Reminder
  if (preferences.categories.weeklyMock) {
    if (dayOfWeek === 6) {
      items.push({
        id: `notif-mock-saturday-${todayStr}`,
        category: 'WEEKLY_MOCK',
        title: 'Saturday Mock Test Ready',
        message: 'Your weekly timed interview simulation is scheduled for today.',
        createdAt: now.toISOString(),
        isRead: false,
        actionRoute: 'test/mock-tests',
        actionText: 'Start Saturday Mock',
      });
    }
  }

  // 3. Sunday Special Revision Reminder
  if (preferences.categories.sundaySpecial) {
    if (dayOfWeek === 0) {
      items.push({
        id: `notif-sunday-special-${todayStr}`,
        category: 'SUNDAY_SPECIAL',
        title: 'Sunday Special Revision Ready',
        message: 'Your special reinforcement queue from mock test mistakes and weak patterns is prepared.',
        createdAt: now.toISOString(),
        isRead: false,
        actionRoute: 'review/due-today',
        actionText: 'Open Special Queue',
      });
    }
  }

  // 4. Upcoming Contests Starting Soon (< 24 hours)
  if (preferences.categories.contests) {
    const next24h = now.getTime() + 24 * 3600 * 1000;
    upcomingContests.forEach((c) => {
      const startTime = new Date(c.startTime).getTime();
      if (startTime > now.getTime() && startTime <= next24h) {
        const diffHours = Math.round((startTime - now.getTime()) / (3600 * 1000));
        items.push({
          id: `notif-contest-${c.id}`,
          category: 'CONTESTS',
          title: `${c.platformName} Contest Starting Soon`,
          message: `${c.name} starts in ${diffHours === 0 ? 'less than an hour' : `${diffHours} hour${diffHours === 1 ? '' : 's'}`}.`,
          createdAt: now.toISOString(),
          isRead: false,
          externalUrl: c.url,
          actionText: 'Go to Contest',
        });
      }
    });
  }

  // 5. Streak Milestones (e.g. 7, 14, 30, 50, 100 days)
  if (preferences.categories.streaks && currentStreak > 0) {
    if ([7, 14, 21, 30, 50, 100].includes(currentStreak)) {
      items.push({
        id: `notif-streak-${currentStreak}-${todayStr}`,
        category: 'STREAK',
        title: `${currentStreak}-Day Study Streak! 🔥`,
        message: `Milestone reached! You've maintained consistent daily study activity for ${currentStreak} consecutive days.`,
        createdAt: now.toISOString(),
        isRead: false,
        actionRoute: 'goals',
        actionText: 'View Streak Stats',
      });
    }
  }

  // 6. Goal Deadlines Approaching (< 3 days)
  if (preferences.categories.goals) {
    const next3Days = now.getTime() + 3 * 24 * 3600 * 1000;
    goals.forEach((g) => {
      if (g.deadline && !g.isCompleted) {
        const deadlineTime = new Date(g.deadline).getTime();
        if (deadlineTime > now.getTime() && deadlineTime <= next3Days) {
          items.push({
            id: `notif-goal-${g.id}`,
            category: 'GOALS',
            title: 'Goal Deadline Approaching',
            message: `Target for "${g.title}" is due on ${new Date(g.deadline).toLocaleDateString()}.`,
            createdAt: now.toISOString(),
            isRead: false,
            actionRoute: 'goals',
            actionText: 'View Goal Progress',
          });
        }
      }
    });
  }

  return items;
}

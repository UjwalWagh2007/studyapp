import type {
  Question,
  StudySessionRecord,
  UpcomingContest,
  StudyGoal,
  CalendarEventItem,
} from '../types';
import { normalizeDate, addDays } from './spacedRepetition';

export const ACTIVITY_COLORS = {
  SRS_REVISION: '#38bdf8', // Sky Blue
  WEEKLY_MOCK: '#a855f7', // Purple
  SUNDAY_SPECIAL: '#f97316', // Orange
  STUDY_SESSION: '#10b981', // Emerald Green
  UPCOMING_CONTEST: '#eab308', // Gold / Yellow
  GOAL_DEADLINE: '#ef4444', // Red
};

/**
 * Builds a unified list of calendar events across all six activity categories.
 */
export function buildUnifiedCalendarEvents(
  questions: Question[],
  studySessions: StudySessionRecord[],
  upcomingContests: UpcomingContest[],
  goals: StudyGoal[],
  baseDate: Date = new Date(),
  rangeDays: number = 35 // 5 weeks view
): {
  events: CalendarEventItem[];
  eventsByDate: Map<string, CalendarEventItem[]>;
  dateRange: Array<{ dateStr: string; displayDay: string; weekday: string; isToday: boolean }>;
} {
  const events: CalendarEventItem[] = [];
  const eventsByDate = new Map<string, CalendarEventItem[]>();
  const todayStr = normalizeDate(baseDate);

  // 1. Generate date range
  const dateRange: Array<{ dateStr: string; displayDay: string; weekday: string; isToday: boolean }> = [];
  for (let i = 0; i < rangeDays; i++) {
    const dateStr = addDays(todayStr, i);
    const [y, m, d] = dateStr.split('-').map(Number);
    const dateObj = new Date(y, m - 1, d);

    dateRange.push({
      dateStr,
      displayDay: dateObj.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      weekday: dateObj.toLocaleDateString(undefined, { weekday: 'short' }),
      isToday: i === 0,
    });
  }

  // 2. SRS Revisions (grouped per day or individual)
  const scheduledQuestions = questions.filter((q) => !q.isArchived && q.nextReviewAt);
  const questionsByDate = new Map<string, Question[]>();

  scheduledQuestions.forEach((q) => {
    const qDate = normalizeDate(q.nextReviewAt);
    if (!questionsByDate.has(qDate)) questionsByDate.set(qDate, []);
    questionsByDate.get(qDate)!.push(q);
  });

  questionsByDate.forEach((dayQuestions, dateStr) => {
    // If today, also bundle past overdue cards
    const count = dayQuestions.length;
    events.push({
      id: `srs-${dateStr}`,
      type: 'SRS_REVISION',
      title: `${count} Spaced Repetition Revision${count === 1 ? '' : 's'}`,
      subtitle: `${dayQuestions.map((q) => q.title).slice(0, 2).join(', ')}${count > 2 ? ` +${count - 2} more` : ''}`,
      dateStr,
      badgeText: `${count} Due`,
      color: ACTIVITY_COLORS.SRS_REVISION,
      rawItem: dayQuestions,
      actionRoute: 'review/due-today',
      actionText: 'Review Queue',
    });
  });

  // 3. Weekly Saturday Mocks & Sunday Special Revisions for the upcoming weeks
  dateRange.forEach((day) => {
    const [y, m, d] = day.dateStr.split('-').map(Number);
    const dateObj = new Date(y, m - 1, d);
    const dayOfWeek = dateObj.getDay(); // 0 = Sunday, 6 = Saturday

    if (dayOfWeek === 6) {
      // Saturday
      events.push({
        id: `mock-${day.dateStr}`,
        type: 'WEEKLY_MOCK',
        title: 'Saturday Timed Mock Test',
        subtitle: 'Auto-generated 60m simulated interview test from personal curriculum',
        dateStr: day.dateStr,
        timeStr: '10:00 AM',
        badgeText: 'Weekly Mock',
        color: ACTIVITY_COLORS.WEEKLY_MOCK,
        actionRoute: 'test/mock-tests',
        actionText: 'Generate & Start Mock',
      });
    } else if (dayOfWeek === 0) {
      // Sunday
      events.push({
        id: `sunday-${day.dateStr}`,
        type: 'SUNDAY_SPECIAL',
        title: 'Sunday Special Revision Queue',
        subtitle: 'Reinforce mock test errors and weak pattern cards',
        dateStr: day.dateStr,
        timeStr: '11:00 AM',
        badgeText: 'Sunday Special',
        color: ACTIVITY_COLORS.SUNDAY_SPECIAL,
        actionRoute: 'review/due-today',
        actionText: 'Open Special Queue',
      });
    }
  });

  // 4. Study Sessions (Past & Today)
  studySessions.forEach((session) => {
    const sDate = session.startedAt ? normalizeDate(session.startedAt) : '';
    if (sDate) {
      const minutes = Math.round((session.durationSeconds || 0) / 60);
      events.push({
        id: `sess-${session.id}`,
        type: 'STUDY_SESSION',
        title: `${session.topicName} Focus Block`,
        subtitle: `${minutes}m focused • ${session.activity}`,
        dateStr: sDate,
        timeStr: session.startedAt ? new Date(session.startedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : undefined,
        badgeText: `${minutes}m Study`,
        color: ACTIVITY_COLORS.STUDY_SESSION,
        rawItem: session,
        actionRoute: 'goals',
        actionText: 'View History',
      });
    }
  });

  // 5. Upcoming Contests
  upcomingContests.forEach((contest) => {
    const cDate = normalizeDate(contest.startTime);
    events.push({
      id: `contest-${contest.id}`,
      type: 'UPCOMING_CONTEST',
      title: contest.name,
      subtitle: `${contest.platformName} • ${Math.round(contest.durationSeconds / 60)} min competition`,
      dateStr: cDate,
      timeStr: new Date(contest.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      badgeText: contest.platformName,
      color: ACTIVITY_COLORS.UPCOMING_CONTEST,
      rawItem: contest,
      externalUrl: contest.url,
      actionText: 'Go to Contest',
    });
  });

  // 6. Goals & Deadlines
  goals.forEach((goal) => {
    if (goal.deadline && !goal.isCompleted) {
      const gDate = normalizeDate(goal.deadline);
      events.push({
        id: `goal-${goal.id}`,
        type: 'GOAL_DEADLINE',
        title: `Goal Target: ${goal.title}`,
        subtitle: `Target: ${goal.targetValue} ${goal.unit}`,
        dateStr: gDate,
        badgeText: 'Deadline',
        color: ACTIVITY_COLORS.GOAL_DEADLINE,
        rawItem: goal,
        actionRoute: 'goals',
        actionText: 'View Goal',
      });
    }
  });

  // Index events by date
  events.forEach((ev) => {
    if (!eventsByDate.has(ev.dateStr)) eventsByDate.set(ev.dateStr, []);
    eventsByDate.get(ev.dateStr)!.push(ev);
  });

  return {
    events,
    eventsByDate,
    dateRange,
  };
}

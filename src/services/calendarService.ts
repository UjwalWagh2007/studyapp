import type { Problem, CalendarDayItem } from '../types';
import { normalizeDate, addDays } from './spacedRepetition';

/**
 * Builds calendar days with scheduled problem revisions.
 */
export function buildCalendarDays(
  problems: Problem[],
  baseDate: Date = new Date(),
  rangeDays: number = 35 // 5 weeks view
): CalendarDayItem[] {
  const todayStr = normalizeDate(baseDate);

  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Index problems by their scheduled nextReviewAt date
  const problemsByDate = new Map<string, Problem[]>();

  problems.forEach((p) => {
    if (p.nextReviewAt) {
      const pDate = normalizeDate(p.nextReviewAt);
      if (!problemsByDate.has(pDate)) {
        problemsByDate.set(pDate, []);
      }
      problemsByDate.get(pDate)!.push(p);
    }
  });

  const days: CalendarDayItem[] = [];

  for (let i = 0; i < rangeDays; i++) {
    const dateStr = addDays(todayStr, i);
    const [y, m, d] = dateStr.split('-').map(Number);
    const dateObj = new Date(y, m - 1, d);

    const scheduledProblems = problemsByDate.get(dateStr) || [];

    days.push({
      dateStr,
      displayDay: `${MONTHS[m - 1]} ${d}`,
      weekday: WEEKDAYS[dateObj.getDay()],
      monthLabel: MONTHS[m - 1],
      dayNumber: d,
      isToday: i === 0,
      scheduledProblems,
    });
  }

  return days;
}

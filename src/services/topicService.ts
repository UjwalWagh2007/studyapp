import type { Problem } from '../types';
import { normalizeDate } from './spacedRepetition';

export const MONTH_NAMES = [
  'JANUARY',
  'FEBRUARY',
  'MARCH',
  'APRIL',
  'MAY',
  'JUNE',
  'JULY',
  'AUGUST',
  'SEPTEMBER',
  'OCTOBER',
  'NOVEMBER',
  'DECEMBER',
];

/**
 * Formats a date string (YYYY-MM-DD or ISO) into a clean, uppercase heading like "06 OCTOBER 2026"
 */
export function formatTopicDateHeading(dateKey: string): string {
  if (!dateKey || dateKey === 'Invalid Date' || dateKey === 'Unknown Date') {
    return 'UNKNOWN DATE';
  }
  const parts = dateKey.split('-');
  if (parts.length === 3) {
    const year = parts[0];
    const monthIndex = parseInt(parts[1], 10) - 1;
    const day = parts[2].padStart(2, '0');
    if (monthIndex >= 0 && monthIndex < 12) {
      return `${day} ${MONTH_NAMES[monthIndex]} ${year}`;
    }
  }
  const d = new Date(dateKey);
  if (!isNaN(d.getTime())) {
    const day = String(d.getDate()).padStart(2, '0');
    return `${day} ${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`;
  }
  return dateKey.toUpperCase();
}

export interface ProblemDateGroup {
  dateKey: string;
  displayDate: string;
  dateTimestamp: number;
  problems: Problem[];
}

/**
 * Organizes a list of problems chronologically by solved date,
 * and within each date chronologically by solved time.
 */
export function groupTopicProblemsByDate(problems: Problem[]): ProblemDateGroup[] {
  if (!problems || problems.length === 0) return [];

  const groupsMap = new Map<string, Problem[]>();

  for (const problem of problems) {
    const dateKey = problem.solvedAt ? normalizeDate(problem.solvedAt) : 'Unknown Date';
    if (!groupsMap.has(dateKey)) {
      groupsMap.set(dateKey, []);
    }
    groupsMap.get(dateKey)!.push(problem);
  }

  const groups: ProblemDateGroup[] = [];

  groupsMap.forEach((pList, dateKey) => {
    // Sort problems by actual solved time descending (newest / most recent first -> oldest last)
    const sortedProblems = [...pList].sort((a, b) => {
      const timeA = new Date(a.solvedAt).getTime() || 0;
      const timeB = new Date(b.solvedAt).getTime() || 0;
      if (timeA !== timeB) return timeB - timeA;
      return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
    });

    const d = new Date(dateKey === 'Unknown Date' ? 0 : dateKey);
    const dateTimestamp = isNaN(d.getTime()) ? 0 : d.getTime();

    groups.push({
      dateKey,
      displayDate: formatTopicDateHeading(dateKey),
      dateTimestamp,
      problems: sortedProblems,
    });
  });

  // Sort dates descending (newest / most recent date first -> oldest date last)
  groups.sort((a, b) => {
    if (a.dateKey === 'Unknown Date') return 1;
    if (b.dateKey === 'Unknown Date') return -1;
    return b.dateKey.localeCompare(a.dateKey);
  });

  return groups;
}

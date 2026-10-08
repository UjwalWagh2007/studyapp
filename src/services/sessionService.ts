import type { StudySession } from '../types';
import { normalizeDate } from './spacedRepetition';

/**
 * Calculates current live focus and break seconds using real ISO timestamps.
 * This guarantees timing accuracy even when device sleeps, tab is minimized, or page is reloaded.
 */
export function getLiveSessionTimes(
  session: StudySession,
  now: Date = new Date()
): { focusSeconds: number; breakSeconds: number } {
  if (session.status === 'COMPLETED') {
    return {
      focusSeconds: session.focusSeconds || 0,
      breakSeconds: session.breakSeconds || 0,
    };
  }

  const lastChangeTime = new Date(session.lastStateChangeAt || session.startTime || now).getTime();
  const elapsedSinceLastStateMs = Math.max(0, now.getTime() - lastChangeTime);
  const elapsedSinceLastStateSecs = Math.floor(elapsedSinceLastStateMs / 1000);

  if (session.status === 'RUNNING') {
    return {
      focusSeconds: (session.focusSeconds || 0) + elapsedSinceLastStateSecs,
      breakSeconds: session.breakSeconds || 0,
    };
  }

  if (session.status === 'PAUSED') {
    return {
      focusSeconds: session.focusSeconds || 0,
      breakSeconds: (session.breakSeconds || 0) + elapsedSinceLastStateSecs,
    };
  }

  return {
    focusSeconds: session.focusSeconds || 0,
    breakSeconds: session.breakSeconds || 0,
  };
}

/**
 * Creates a brand new study session and starts it immediately.
 */
export function createNewStudySession(
  name: string,
  now: Date = new Date()
): StudySession {
  const nowIso = now.toISOString();
  const dateStr = normalizeDate(now);

  return {
    id: 'sess-' + Math.random().toString(36).substring(2, 9) + Date.now().toString(36).substring(4),
    name: name.trim() || 'Focus Session',
    status: 'RUNNING',
    dateStr,
    startTime: nowIso,
    focusSeconds: 0,
    breakSeconds: 0,
    lastStateChangeAt: nowIso,
    createdAt: nowIso,
    updatedAt: nowIso,
  };
}

/**
 * Transitions an active session into PAUSED (Break mode).
 * Flushes elapsed active time into focusSeconds.
 */
export function pauseStudySession(
  session: StudySession,
  now: Date = new Date()
): StudySession {
  if (session.status !== 'RUNNING') return session;

  const live = getLiveSessionTimes(session, now);
  const nowIso = now.toISOString();

  return {
    ...session,
    status: 'PAUSED',
    focusSeconds: live.focusSeconds,
    breakSeconds: live.breakSeconds,
    lastStateChangeAt: nowIso,
    updatedAt: nowIso,
  };
}

/**
 * Resumes a paused session back to RUNNING mode.
 * Flushes elapsed break time into breakSeconds.
 */
export function resumeStudySession(
  session: StudySession,
  now: Date = new Date()
): StudySession {
  if (session.status !== 'PAUSED') return session;

  const live = getLiveSessionTimes(session, now);
  const nowIso = now.toISOString();

  return {
    ...session,
    status: 'RUNNING',
    focusSeconds: live.focusSeconds,
    breakSeconds: live.breakSeconds,
    lastStateChangeAt: nowIso,
    updatedAt: nowIso,
  };
}

/**
 * Ends/completes a study session permanently.
 * Flushes all pending elapsed seconds into focus/break values.
 */
export function completeStudySession(
  session: StudySession,
  now: Date = new Date()
): StudySession {
  if (session.status === 'COMPLETED') return session;

  const live = getLiveSessionTimes(session, now);
  const nowIso = now.toISOString();

  return {
    ...session,
    status: 'COMPLETED',
    endTime: nowIso,
    focusSeconds: live.focusSeconds,
    breakSeconds: live.breakSeconds,
    lastStateChangeAt: nowIso,
    updatedAt: nowIso,
  };
}

const MONTH_NAMES = [
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
export function formatSessionDateHeading(dateKey: string): string {
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

export interface SessionDateGroup {
  dateKey: string;
  displayDate: string;
  dateTimestamp: number;
  sessions: StudySession[];
}

/**
 * Organizes study sessions chronologically by date,
 * and within each date chronologically by start time.
 */
export function groupSessionsByDate(sessions: StudySession[]): SessionDateGroup[] {
  if (!sessions || sessions.length === 0) return [];

  const groupsMap = new Map<string, StudySession[]>();

  for (const session of sessions) {
    const dateKey = session.dateStr || (session.startTime ? normalizeDate(session.startTime) : 'Unknown Date');
    if (!groupsMap.has(dateKey)) {
      groupsMap.set(dateKey, []);
    }
    groupsMap.get(dateKey)!.push(session);
  }

  const groups: SessionDateGroup[] = [];

  groupsMap.forEach((sList, dateKey) => {
    // Sort sessions chronologically by startTime (earliest start first -> latest start last)
    const sortedSessions = [...sList].sort((a, b) => {
      const timeA = new Date(a.startTime || a.createdAt || 0).getTime() || 0;
      const timeB = new Date(b.startTime || b.createdAt || 0).getTime() || 0;
      if (timeA !== timeB) return timeA - timeB;
      return new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime();
    });

    const d = new Date(dateKey === 'Unknown Date' ? 0 : dateKey);
    const dateTimestamp = isNaN(d.getTime()) ? 0 : d.getTime();

    groups.push({
      dateKey,
      displayDate: formatSessionDateHeading(dateKey),
      dateTimestamp,
      sessions: sortedSessions,
    });
  });

  // Sort dates chronologically (earliest date first -> latest date last)
  groups.sort((a, b) => {
    if (a.dateKey === 'Unknown Date') return 1;
    if (b.dateKey === 'Unknown Date') return -1;
    return a.dateKey.localeCompare(b.dateKey);
  });

  return groups;
}


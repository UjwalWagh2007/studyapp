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

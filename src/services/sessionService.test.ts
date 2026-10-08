import { describe, it, expect } from 'vitest';
import {
  createNewStudySession,
  pauseStudySession,
  resumeStudySession,
  completeStudySession,
  getLiveSessionTimes,
  formatSessionDateHeading,
  groupSessionsByDate,
} from './sessionService';

describe('sessionService', () => {
  it('creates a new running study session with custom name and 0 elapsed seconds', () => {
    const t0 = new Date('2026-10-02T10:00:00.000Z');
    const session = createNewStudySession('DSA Arrays Practice', t0);

    expect(session.name).toBe('DSA Arrays Practice');
    expect(session.status).toBe('RUNNING');
    expect(session.focusSeconds).toBe(0);
    expect(session.breakSeconds).toBe(0);
    expect(session.startTime).toBe(t0.toISOString());
    expect(session.lastStateChangeAt).toBe(t0.toISOString());
  });

  it('calculates live focus seconds while running using timestamp difference', () => {
    const t0 = new Date('2026-10-02T10:00:00.000Z');
    const session = createNewStudySession('DSA Arrays Practice', t0);

    // 25 minutes later
    const t1 = new Date('2026-10-02T10:25:00.000Z');
    const live = getLiveSessionTimes(session, t1);

    expect(live.focusSeconds).toBe(25 * 60);
    expect(live.breakSeconds).toBe(0);
  });

  it('pauses a session, accumulates focus time, and tracks break time while paused', () => {
    const t0 = new Date('2026-10-02T10:00:00.000Z');
    const session = createNewStudySession('DSA Arrays Practice', t0);

    // Pause after 30 minutes
    const t1 = new Date('2026-10-02T10:30:00.000Z');
    const pausedSession = pauseStudySession(session, t1);

    expect(pausedSession.status).toBe('PAUSED');
    expect(pausedSession.focusSeconds).toBe(30 * 60);
    expect(pausedSession.breakSeconds).toBe(0);

    // Check live break time 10 minutes into the pause
    const t2 = new Date('2026-10-02T10:40:00.000Z');
    const liveDuringBreak = getLiveSessionTimes(pausedSession, t2);

    expect(liveDuringBreak.focusSeconds).toBe(30 * 60);
    expect(liveDuringBreak.breakSeconds).toBe(10 * 60);
  });

  it('resumes a paused session, accumulating break time and continuing focus time', () => {
    const t0 = new Date('2026-10-02T10:00:00.000Z');
    const session = createNewStudySession('DSA Arrays Practice', t0);

    // Pause after 30 minutes
    const t1 = new Date('2026-10-02T10:30:00.000Z');
    const paused = pauseStudySession(session, t1);

    // Resume after 15 minute break
    const t2 = new Date('2026-10-02T10:45:00.000Z');
    const resumed = resumeStudySession(paused, t2);

    expect(resumed.status).toBe('RUNNING');
    expect(resumed.focusSeconds).toBe(30 * 60);
    expect(resumed.breakSeconds).toBe(15 * 60);

    // Check live focus 20 minutes after resuming
    const t3 = new Date('2026-10-02T11:05:00.000Z');
    const live = getLiveSessionTimes(resumed, t3);

    expect(live.focusSeconds).toBe((30 + 20) * 60);
    expect(live.breakSeconds).toBe(15 * 60);
  });

  it('completes a session permanently and records end time', () => {
    const t0 = new Date('2026-10-02T10:00:00.000Z');
    const session = createNewStudySession('DSA Arrays Practice', t0);

    // Complete after 45 minutes
    const t1 = new Date('2026-10-02T10:45:00.000Z');
    const completed = completeStudySession(session, t1);

    expect(completed.status).toBe('COMPLETED');
    expect(completed.endTime).toBe(t1.toISOString());
    expect(completed.focusSeconds).toBe(45 * 60);
    expect(completed.breakSeconds).toBe(0);

    // Subsequent live checks should return frozen values
    const t2 = new Date('2026-10-02T12:00:00.000Z');
    const live = getLiveSessionTimes(completed, t2);
    expect(live.focusSeconds).toBe(45 * 60);
    expect(live.breakSeconds).toBe(0);
  });

  it('formats session date headings correctly', () => {
    expect(formatSessionDateHeading('2026-10-06')).toBe('06 OCTOBER 2026');
    expect(formatSessionDateHeading('2026-10-07')).toBe('07 OCTOBER 2026');
    expect(formatSessionDateHeading('2026-10-08')).toBe('08 OCTOBER 2026');
    expect(formatSessionDateHeading('Unknown Date')).toBe('UNKNOWN DATE');
  });

  it('groups and sorts study sessions chronologically by date and within date by start time', () => {
    const mockSessions: any[] = [
      {
        id: 's3',
        name: 'Stack & Queue',
        status: 'COMPLETED',
        dateStr: '2026-10-08',
        startTime: '2026-10-08T18:15:00.000Z',
        focusSeconds: 92 * 60,
        breakSeconds: 0,
      },
      {
        id: 's1',
        name: 'DSA Arrays',
        status: 'COMPLETED',
        dateStr: '2026-10-06',
        startTime: '2026-10-06T08:15:00.000Z',
        focusSeconds: 84 * 60,
        breakSeconds: 0,
      },
      {
        id: 's2',
        name: 'Web Development',
        status: 'COMPLETED',
        dateStr: '2026-10-06',
        startTime: '2026-10-06T16:30:00.000Z',
        focusSeconds: 52 * 60,
        breakSeconds: 0,
      },
      {
        id: 's4',
        name: 'Binary Search',
        status: 'COMPLETED',
        dateStr: '2026-10-07',
        startTime: '2026-10-07T09:20:00.000Z',
        focusSeconds: 70 * 60,
        breakSeconds: 0,
      },
      {
        id: 's5',
        name: 'Revision',
        status: 'COMPLETED',
        dateStr: '2026-10-07',
        startTime: '2026-10-07T22:45:00.000Z',
        focusSeconds: 45 * 60,
        breakSeconds: 0,
      },
    ];

    const groups = groupSessionsByDate(mockSessions);

    expect(groups.length).toBe(3);

    // Group 1: 08 OCTOBER 2026 (Most recent date first)
    expect(groups[0].displayDate).toBe('08 OCTOBER 2026');
    expect(groups[0].sessions.length).toBe(1);
    expect(groups[0].sessions[0].name).toBe('Stack & Queue'); // 06:15 PM (18:15)

    // Group 2: 07 OCTOBER 2026
    expect(groups[1].displayDate).toBe('07 OCTOBER 2026');
    expect(groups[1].sessions.length).toBe(2);
    expect(groups[1].sessions[0].name).toBe('Revision'); // 10:45 PM (22:45, newest start time first)
    expect(groups[1].sessions[1].name).toBe('Binary Search'); // 09:20 AM

    // Group 3: 06 OCTOBER 2026 (Oldest date last)
    expect(groups[2].displayDate).toBe('06 OCTOBER 2026');
    expect(groups[2].sessions.length).toBe(2);
    expect(groups[2].sessions[0].name).toBe('Web Development'); // 04:30 PM (16:30, newest start time first)
    expect(groups[2].sessions[1].name).toBe('DSA Arrays'); // 08:15 AM
  });
});

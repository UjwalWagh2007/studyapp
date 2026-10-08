import React, { useState, useEffect, useMemo } from 'react';
import {
  Clock,
  Play,
  Pause,
  Square,
  Trash2,
  Plus,
  Calendar,
  AlertTriangle,
  Flame,
  CheckCircle2,
} from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { Button } from '../components/ui/Button';
import { IconButton } from '../components/ui/IconButton';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { useAppStore } from '../context/AppContext';
import { useToast } from '../context/ToastContext';
import { getLiveSessionTimes, groupSessionsByDate } from '../services/sessionService';
import type { StudySession } from '../types';

export const SessionsPage: React.FC = () => {
  const {
    studySessions,
    activeSession,
    createAndStartSession,
    pauseSessionById,
    resumeSessionById,
    endSessionById,
    deleteSessionById,
    navigateTo,
  } = useAppStore();

  const { showToast } = useToast();

  // Modal states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newSessionName, setNewSessionName] = useState('');
  const [sessionToDelete, setSessionToDelete] = useState<StudySession | null>(null);

  // Live timer tick state (updates every second for smooth UI)
  const [, setTick] = useState(0);

  useEffect(() => {
    if (!activeSession) return;
    const interval = setInterval(() => {
      setTick((t) => t + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [activeSession]);

  // Format seconds to hh:mm:ss
  const formatTimerDisplay = (totalSecs: number) => {
    const hours = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = Math.floor(totalSecs % 60);
    if (hours > 0) {
      return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  // Format total seconds into readable string (e.g. 1h 24m or 42m)
  const formatDurationReadable = (totalSecs: number) => {
    const hours = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = Math.floor(totalSecs % 60);
    if (hours === 0 && mins === 0) return `${secs}s`;
    if (hours === 0) return `${mins}m`;
    if (mins === 0) return `${hours}h`;
    return `${hours}h ${mins}m`;
  };

  // Format ISO timestamp to readable time string
  const formatSessionTime = (isoString?: string) => {
    if (!isoString) return '—';
    const date = new Date(isoString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const handleStartNewSession = (e: React.FormEvent) => {
    e.preventDefault();
    const name = newSessionName.trim() || 'Focus Session';
    createAndStartSession(name);
    setNewSessionName('');
    setIsCreateModalOpen(false);
    showToast('Study Session Started', `Now tracking: "${name}"`, 'success');
  };

  const handleEndActiveSession = () => {
    if (!activeSession) return;
    const live = getLiveSessionTimes(activeSession);
    endSessionById(activeSession.id);
    showToast(
      'Session Completed',
      `Logged ${formatDurationReadable(live.focusSeconds)} focus time to today's dashboard.`,
      'success'
    );
  };

  const handleConfirmDelete = () => {
    if (!sessionToDelete) return;
    deleteSessionById(sessionToDelete.id);
    showToast('Session Deleted', `Removed session "${sessionToDelete.name}".`, 'info');
    setSessionToDelete(null);
  };

  // Live timings for active session
  const activeLiveTimes = activeSession ? getLiveSessionTimes(activeSession) : null;
  const activeTotalElapsed = activeLiveTimes
    ? activeLiveTimes.focusSeconds + activeLiveTimes.breakSeconds
    : 0;

  // Separate today's sessions and past sessions for summary stats
  const todayStr = new Date().toISOString().split('T')[0];
  const todaySessions = studySessions.filter((s) => s.dateStr === todayStr);

  const todayTotalFocus = todaySessions.reduce((sum, s) => {
    const live = getLiveSessionTimes(s);
    return sum + live.focusSeconds;
  }, 0);

  const todayTotalBreak = todaySessions.reduce((sum, s) => {
    const live = getLiveSessionTimes(s);
    return sum + live.breakSeconds;
  }, 0);

  // Group and sort all sessions chronologically by date and within each date by start time
  const groupedSessions = useMemo(() => {
    return groupSessionsByDate(studySessions);
  }, [studySessions]);

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 960, margin: '0 auto', width: '100%' }}>
      {/* Header */}
      <PageHeader
        title="Study Sessions"
        description="Track your deep focus time and break intervals. Focus time automatically updates your Dashboard study target."
        actions={
          <Button
            variant="primary"
            size="md"
            iconLeft={<Plus size={16} />}
            onClick={() => setIsCreateModalOpen(true)}
          >
            Start New Session
          </Button>
        }
      />

      {/* ACTIVE RUNNING OR PAUSED SESSION HERO */}
      {activeSession && activeLiveTimes ? (
        <div
          className="animate-slide-up"
          style={{
            background: activeSession.status === 'RUNNING'
              ? 'linear-gradient(135deg, rgba(99, 102, 241, 0.08) 0%, rgba(139, 92, 246, 0.12) 100%)'
              : 'linear-gradient(135deg, rgba(245, 158, 11, 0.08) 0%, rgba(217, 119, 6, 0.12) 100%)',
            border: activeSession.status === 'RUNNING'
              ? '2px solid var(--color-primary)'
              : '2px solid #f59e0b',
            borderRadius: 'var(--radius-xl)',
            padding: 28,
            display: 'flex',
            flexDirection: 'column',
            gap: 22,
            boxShadow: activeSession.status === 'RUNNING'
              ? '0 0 30px rgba(99, 102, 241, 0.2)'
              : '0 0 30px rgba(245, 158, 11, 0.2)',
            position: 'relative',
          }}
        >
          {/* Top Row: Session Name & Live State Badge */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span
                  style={{
                    display: 'inline-block',
                    width: 10,
                    height: 10,
                    borderRadius: '50%',
                    backgroundColor: activeSession.status === 'RUNNING' ? 'var(--color-success)' : '#f59e0b',
                    boxShadow: activeSession.status === 'RUNNING' ? '0 0 10px #22c55e' : '0 0 10px #f59e0b',
                    animation: 'pulse 1.5s infinite',
                  }}
                />
                <span style={{ fontSize: '13px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: activeSession.status === 'RUNNING' ? 'var(--color-primary)' : '#f59e0b' }}>
                  {activeSession.status === 'RUNNING' ? 'Active Focus Session' : 'On Break (Paused)'}
                </span>
              </div>
              <h2 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-primary)', margin: '4px 0 0 0' }}>
                {activeSession.name}
              </h2>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {activeSession.status === 'RUNNING' ? (
                <Button
                  variant="secondary"
                  size="md"
                  iconLeft={<Pause size={16} />}
                  onClick={() => pauseSessionById(activeSession.id)}
                  style={{ minWidth: 110 }}
                >
                  PAUSE
                </Button>
              ) : (
                <Button
                  variant="primary"
                  size="md"
                  iconLeft={<Play size={16} />}
                  onClick={() => resumeSessionById(activeSession.id)}
                  style={{ minWidth: 110, backgroundColor: '#f59e0b', borderColor: '#f59e0b' }}
                >
                  RESUME
                </Button>
              )}

              <Button
                variant="danger"
                size="md"
                iconLeft={<Square size={16} />}
                onClick={handleEndActiveSession}
              >
                End Session
              </Button>
            </div>
          </div>

          {/* Center: Hero Timer Display */}
          <div
            style={{
              background: 'var(--bg-card)',
              borderRadius: 'var(--radius-lg)',
              padding: '24px 20px',
              textAlign: 'center',
              border: '1px solid var(--border-color)',
            }}
          >
            {activeSession.status === 'PAUSED' ? (
              <div>
                <div style={{ fontSize: '14px', fontWeight: 700, color: '#f59e0b', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>
                  ☕ Break Elapsed
                </div>
                <div
                  style={{
                    fontFamily: 'monospace',
                    fontSize: 'clamp(38px, 8vw, 56px)',
                    fontWeight: 800,
                    color: '#f59e0b',
                    letterSpacing: '-0.02em',
                    lineHeight: 1,
                  }}
                >
                  {formatTimerDisplay(activeLiveTimes.breakSeconds)}
                </div>
              </div>
            ) : (
              <div>
                <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--color-primary)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>
                  ⏱️ Focus Time
                </div>
                <div
                  style={{
                    fontFamily: 'monospace',
                    fontSize: 'clamp(38px, 8vw, 56px)',
                    fontWeight: 800,
                    color: 'var(--text-primary)',
                    letterSpacing: '-0.02em',
                    lineHeight: 1,
                  }}
                >
                  {formatTimerDisplay(activeLiveTimes.focusSeconds)}
                </div>
              </div>
            )}

            {/* Bottom 3 Sub-Stats */}
            <div
              className="session-substats-grid"
              style={{
                marginTop: 20,
                paddingTop: 16,
                borderTop: '1px solid var(--border-subtle)',
              }}
            >
              <div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>Focus Time</div>
                <div style={{ fontSize: '16px', fontWeight: 800, color: 'var(--color-primary)', marginTop: 2 }}>
                  {formatDurationReadable(activeLiveTimes.focusSeconds)}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>Break Time</div>
                <div style={{ fontSize: '16px', fontWeight: 800, color: '#f59e0b', marginTop: 2 }}>
                  {formatDurationReadable(activeLiveTimes.breakSeconds)}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>Total Elapsed</div>
                <div style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-primary)', marginTop: 2 }}>
                  {formatDurationReadable(activeTotalElapsed)}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* NO ACTIVE SESSION PROMPT CARD */
        <div
          style={{
            background: 'var(--bg-card)',
            border: '1px dashed var(--border-color)',
            borderRadius: 'var(--radius-xl)',
            padding: 32,
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 16,
          }}
        >
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: '50%',
              backgroundColor: 'rgba(99, 102, 241, 0.1)',
              color: 'var(--color-primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Clock size={28} />
          </div>

          <div>
            <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
              Ready for your next study session?
            </h3>
            <p style={{ fontSize: '13.5px', color: 'var(--text-secondary)', maxWidth: 460, margin: '6px auto 0 auto' }}>
              Create a session with any topic or goal name. Pause when taking a break, and resume whenever you're ready.
            </p>
          </div>

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
            {['DSA Arrays Practice', 'Binary Search', 'Striver Revision', 'Web Development'].map((quickName) => (
              <button
                key={quickName}
                onClick={() => {
                  createAndStartSession(quickName);
                  showToast('Study Session Started', `Now tracking: "${quickName}"`, 'success');
                }}
                style={{
                  background: 'var(--bg-subtle)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-full)',
                  padding: '6px 14px',
                  fontSize: '12.5px',
                  fontWeight: 600,
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--color-primary)')}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--border-color)')}
              >
                + {quickName}
              </button>
            ))}
          </div>

          <Button
            variant="primary"
            size="md"
            iconLeft={<Play size={16} />}
            onClick={() => setIsCreateModalOpen(true)}
          >
            Start Custom Session
          </Button>
        </div>
      )}

      {/* SESSION HISTORY (CHRONOLOGICAL DATE-WISE TIMELINE) */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
          <div>
            <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
              Session History
            </h3>
            <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
              Total Focus Today: <strong style={{ color: 'var(--text-primary)' }}>{formatDurationReadable(todayTotalFocus)}</strong>
              {todayTotalBreak > 0 && ` • Break: ${formatDurationReadable(todayTotalBreak)}`}
            </span>
          </div>

          <Button
            variant="secondary"
            size="sm"
            onClick={() => navigateTo('dashboard')}
          >
            View on Dashboard
          </Button>
        </div>

        {studySessions.length === 0 ? (
          <div
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-lg)',
              padding: 24,
              textAlign: 'center',
              color: 'var(--text-muted)',
              fontSize: '13.5px',
            }}
          >
            No study sessions logged yet. Start a session above to track your focus hours.
          </div>
        ) : (
          <div className="session-timeline-container">
            {groupedSessions.map((group) => (
              <div key={group.dateKey} className="session-date-group">
                {/* Date Group Heading */}
                <div className="session-date-header">
                  <div className="session-date-title-wrap">
                    <Calendar size={14} className="session-date-icon" />
                    <span className="session-date-title">{group.displayDate}</span>
                  </div>
                  <span className="session-date-count">
                    {group.sessions.length} {group.sessions.length === 1 ? 'session' : 'sessions'}
                  </span>
                </div>

                {/* Sessions Solved on this Date */}
                <div className="session-date-list">
                  {group.sessions.map((session) => {
                    const live = getLiveSessionTimes(session);
                    const isActive = activeSession?.id === session.id;
                    const startTimeObj = new Date(session.startTime);
                    const formattedStartTime = !isNaN(startTimeObj.getTime())
                      ? startTimeObj.toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : '';

                    return (
                      <div
                        key={session.id}
                        className={`session-history-card ${isActive ? 'session-history-card-active' : ''}`}
                      >
                        <div className="session-history-left">
                          {/* Start Time Badge */}
                          <div
                            className="session-history-time"
                            title={`Started at ${formattedStartTime || session.startTime}`}
                          >
                            <Clock size={12} />
                            <span>{formattedStartTime || '--:--'}</span>
                          </div>

                          {/* Status Icon Box */}
                          <div
                            className={`session-status-icon-box session-status-${session.status.toLowerCase()}`}
                          >
                            {session.status === 'COMPLETED' ? (
                              <CheckCircle2 size={18} />
                            ) : session.status === 'PAUSED' ? (
                              <Pause size={18} />
                            ) : (
                              <Flame size={18} />
                            )}
                          </div>

                          {/* Session Details */}
                          <div className="session-history-main">
                            <div className="session-history-title-row">
                              <span className="session-history-name">{session.name}</span>
                              <Badge
                                variant={
                                  session.status === 'COMPLETED'
                                    ? 'success'
                                    : session.status === 'PAUSED'
                                    ? 'warning'
                                    : 'primary'
                                }
                                size="sm"
                              >
                                {session.status === 'COMPLETED'
                                  ? 'Completed'
                                  : session.status === 'PAUSED'
                                  ? 'Paused'
                                  : 'Running'}
                              </Badge>
                            </div>

                            <div className="session-history-meta">
                              <span>Started: {formatSessionTime(session.startTime)}</span>
                              {session.endTime && <span> • Ended: {formatSessionTime(session.endTime)}</span>}
                            </div>
                          </div>
                        </div>

                        {/* Right: Durations & Actions */}
                        <div className="session-history-right">
                          <div className="session-history-durations">
                            <div className="session-history-focus">
                              {formatDurationReadable(live.focusSeconds)} focus
                            </div>
                            {live.breakSeconds > 0 && (
                              <div className="session-history-break">
                                Break: {formatDurationReadable(live.breakSeconds)}
                              </div>
                            )}
                          </div>

                          <div className="session-history-actions">
                            {session.status === 'PAUSED' && (
                              <Button
                                variant="secondary"
                                size="sm"
                                iconLeft={<Play size={13} />}
                                onClick={() => resumeSessionById(session.id)}
                              >
                                Resume
                              </Button>
                            )}

                            <IconButton
                              icon={<Trash2 size={15} />}
                              label="Delete session"
                              size="sm"
                              onClick={() => setSessionToDelete(session)}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* CREATE NEW SESSION MODAL */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Create Study Session"
        footer={
          <div style={{ display: 'flex', gap: 8 }}>
            <Button variant="secondary" size="sm" onClick={() => setIsCreateModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={handleStartNewSession}>
              Start Session
            </Button>
          </div>
        }
      >
        <form onSubmit={handleStartNewSession} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Input
            label="Session Name"
            placeholder="e.g. DSA Arrays Practice, Striver Sheet, Web Dev..."
            value={newSessionName}
            onChange={(e) => setNewSessionName(e.target.value)}
            autoFocus
            required
          />

          <div>
            <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6, display: 'block' }}>
              Quick Suggestions
            </label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {['DSA Practice', 'Striver Arrays', 'Binary Search', 'Dynamic Programming', 'Revision', 'Web Development', 'System Design'].map((sug) => (
                <button
                  key={sug}
                  type="button"
                  onClick={() => setNewSessionName(sug)}
                  style={{
                    background: 'var(--bg-subtle)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-md)',
                    padding: '4px 10px',
                    fontSize: '12px',
                    color: 'var(--text-primary)',
                    cursor: 'pointer',
                  }}
                >
                  {sug}
                </button>
              ))}
            </div>
          </div>
        </form>
      </Modal>

      {/* DELETE CONFIRMATION MODAL */}
      <Modal
        isOpen={Boolean(sessionToDelete)}
        onClose={() => setSessionToDelete(null)}
        title="Delete Study Session?"
        footer={
          <div style={{ display: 'flex', gap: 8 }}>
            <Button variant="secondary" size="sm" onClick={() => setSessionToDelete(null)}>
              Cancel
            </Button>
            <Button variant="danger" size="sm" onClick={handleConfirmDelete}>
              Delete Session
            </Button>
          </div>
        }
      >
        <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              backgroundColor: 'rgba(239, 68, 68, 0.12)',
              color: 'var(--color-danger)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <AlertTriangle size={20} />
          </div>

          <div>
            <p style={{ margin: '0 0 8px 0', fontSize: '14px', color: 'var(--text-primary)', fontWeight: 600 }}>
              Are you sure you want to permanently delete "{sessionToDelete?.name}"?
            </p>
            <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)' }}>
              Its focus duration ({sessionToDelete ? formatDurationReadable(sessionToDelete.focusSeconds) : ''}) will be deducted from your daily study total and consistency heatmap.
            </p>
          </div>
        </div>
      </Modal>
    </div>
  );
};

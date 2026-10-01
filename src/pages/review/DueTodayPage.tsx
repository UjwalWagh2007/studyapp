import React, { useState, useMemo } from 'react';
import {
  CheckCircle2,
  Play,
  Clock,
  AlertTriangle,
  Calendar,
  ExternalLink,
} from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { EmptyState } from '../../components/ui/EmptyState';
import { ReviewSessionModal } from '../../components/review/ReviewSessionModal';
import { useAppStore } from '../../context/AppContext';
import { daysBetween, normalizeDate } from '../../services/spacedRepetition';
import type { Question } from '../../types';

export const DueTodayPage: React.FC = () => {
  const {
    dueTodayQuestions,
    overdueQuestions,
    navigateTo,
  } = useAppStore();

  const [isSessionOpen, setIsSessionOpen] = useState(false);
  const [sessionQueue, setSessionQueue] = useState<Question[]>([]);

  const todayStr = useMemo(() => normalizeDate(new Date()), []);

  // Questions strictly due today (excluding overdue questions to separate the groups)
  const strictlyDueToday = useMemo(() => {
    return dueTodayQuestions.filter(
      (q) => normalizeDate(q.nextReviewAt) === todayStr
    );
  }, [dueTodayQuestions, todayStr]);

  // Combined active review queue (Overdue first, then Due Today)
  const allDueQueue = useMemo(() => {
    const overdueIds = new Set(overdueQuestions.map((q) => q.id));
    const dueRest = dueTodayQuestions.filter((q) => !overdueIds.has(q.id));
    return [...overdueQuestions, ...dueRest];
  }, [overdueQuestions, dueTodayQuestions]);

  const totalEstimatedMinutes = useMemo(() => {
    return allDueQueue.reduce((sum, q) => sum + (q.estimatedSolvingTimeMinutes || 20), 0);
  }, [allDueQueue]);

  // Start full session
  const handleStartAll = () => {
    if (allDueQueue.length === 0) return;
    setSessionQueue(allDueQueue);
    setIsSessionOpen(true);
  };

  // Start session for a specific question
  const handleReviewSingle = (question: Question) => {
    setSessionQueue([question]);
    setIsSessionOpen(true);
  };

  // Start session for overdue group only
  const handleStartOverdue = () => {
    if (overdueQuestions.length === 0) return;
    setSessionQueue(overdueQuestions);
    setIsSessionOpen(true);
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Page Header */}
      <PageHeader
        title="Due Today (Spaced Repetition)"
        description="Daily active recall queue calculated dynamically by the repetition memory engine."
        actions={
          allDueQueue.length > 0 ? (
            <Button
              variant="primary"
              size="md"
              iconLeft={<Play size={16} />}
              onClick={handleStartAll}
            >
              Start Review ({allDueQueue.length})
            </Button>
          ) : undefined
        }
      />

      {/* Metrics Summary Strip */}
      {allDueQueue.length > 0 && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
            gap: 12,
          }}
        >
          <div
            style={{
              padding: '14px 16px',
              backgroundColor: 'var(--bg-subtle)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>Total Due Today</span>
            <div style={{ fontSize: '22px', fontWeight: 700, color: 'var(--color-primary)', marginTop: 2 }}>
              {allDueQueue.length}
            </div>
          </div>

          <div
            style={{
              padding: '14px 16px',
              backgroundColor: 'var(--bg-subtle)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>Overdue Workload</span>
            <div
              style={{
                fontSize: '22px',
                fontWeight: 700,
                color: overdueQuestions.length > 0 ? 'var(--color-danger)' : 'var(--text-secondary)',
                marginTop: 2,
              }}
            >
              {overdueQuestions.length}
            </div>
          </div>

          <div
            style={{
              padding: '14px 16px',
              backgroundColor: 'var(--bg-subtle)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>Est. Review Time</span>
            <div style={{ fontSize: '22px', fontWeight: 700, color: 'var(--text-primary)', marginTop: 2 }}>
              ~{totalEstimatedMinutes} min
            </div>
          </div>

          <div
            style={{
              padding: '14px 16px',
              backgroundColor: 'var(--bg-subtle)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>Recall Method</span>
            <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-secondary)', marginTop: 8 }}>
              Active Recall (SM-2)
            </div>
          </div>
        </div>
      )}

      {/* Main Queue Content or Empty State */}
      {allDueQueue.length === 0 ? (
        <EmptyState
          icon={<CheckCircle2 size={32} color="var(--color-success)" />}
          title="All caught up for today! 🎉"
          description="You have no questions pending revision today. Superb consistency in maintaining your memory retention."
          actionText="View Upcoming in Calendar"
          actionIcon={<Calendar size={15} />}
          onAction={() => navigateTo('review/calendar')}
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* GROUP 1: OVERDUE QUESTIONS */}
          {overdueQuestions.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 14px',
                  backgroundColor: 'rgba(239, 68, 68, 0.08)',
                  border: '1px solid rgba(239, 68, 68, 0.25)',
                  borderRadius: 'var(--radius-md)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <AlertTriangle size={18} color="var(--color-danger)" />
                  <span style={{ fontWeight: 600, fontSize: '13.5px', color: 'var(--color-danger)' }}>
                    Overdue Questions ({overdueQuestions.length})
                  </span>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    • Prioritize these to avoid memory lapse
                  </span>
                </div>

                <Button
                  variant="danger"
                  size="sm"
                  iconLeft={<Play size={13} />}
                  onClick={handleStartOverdue}
                >
                  Review Overdue
                </Button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {overdueQuestions.map((q) => {
                  const daysLate = q.nextReviewAt ? Math.abs(daysBetween(todayStr, q.nextReviewAt)) : 1;
                  return (
                    <div
                      key={q.id}
                      className="hover-card"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '14px 18px',
                        backgroundColor: 'var(--bg-surface)',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: 'var(--radius-md)',
                        gap: 16,
                      }}
                    >
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                          <span style={{ fontWeight: 600, fontSize: '14.5px', color: 'var(--text-primary)' }}>
                            {q.title}
                          </span>
                          {q.url && (
                            <a
                              href={q.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{ color: 'var(--text-muted)', display: 'inline-flex' }}
                              title="Open problem link"
                            >
                              <ExternalLink size={13} />
                            </a>
                          )}
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                          <Badge variant="danger" size="sm">
                            {daysLate} {daysLate === 1 ? 'day' : 'days'} late
                          </Badge>
                          <Badge
                            variant={
                              q.difficulty === 'Easy'
                                ? 'success'
                                : q.difficulty === 'Medium'
                                ? 'warning'
                                : 'danger'
                            }
                            size="sm"
                          >
                            {q.difficulty}
                          </Badge>
                          <Badge variant="primary" size="sm">
                            {q.pattern}
                          </Badge>
                          <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                            {q.topicName}
                          </span>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--text-muted)', fontSize: '12px' }}>
                          <Clock size={13} />
                          <span>{q.estimatedSolvingTimeMinutes || 20}m</span>
                        </div>

                        <Button
                          variant="secondary"
                          size="sm"
                          iconLeft={<Play size={13} />}
                          onClick={() => handleReviewSingle(q)}
                        >
                          Review Now
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* GROUP 2: DUE TODAY QUESTIONS */}
          {strictlyDueToday.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Clock size={16} color="var(--color-primary)" />
                <h3 style={{ fontSize: '15px', fontWeight: 600, margin: 0, color: 'var(--text-primary)' }}>
                  Scheduled For Today ({strictlyDueToday.length})
                </h3>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {strictlyDueToday.map((q) => (
                  <div
                    key={q.id}
                    className="hover-card"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '14px 18px',
                      backgroundColor: 'var(--bg-surface)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-md)',
                      gap: 16,
                    }}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 600, fontSize: '14.5px', color: 'var(--text-primary)' }}>
                          {q.title}
                        </span>
                        {q.url && (
                          <a
                            href={q.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ color: 'var(--text-muted)', display: 'inline-flex' }}
                            title="Open problem link"
                          >
                            <ExternalLink size={13} />
                          </a>
                        )}
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <Badge
                          variant={
                            q.difficulty === 'Easy'
                              ? 'success'
                              : q.difficulty === 'Medium'
                              ? 'warning'
                              : 'danger'
                          }
                          size="sm"
                        >
                          {q.difficulty}
                        </Badge>
                        <Badge variant="primary" size="sm">
                          {q.pattern}
                        </Badge>
                        <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                          {q.topicName}
                        </span>
                        <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                          Interval: {q.currentIntervalDays}d
                        </span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--text-muted)', fontSize: '12px' }}>
                        <Clock size={13} />
                        <span>{q.estimatedSolvingTimeMinutes || 20}m</span>
                      </div>

                      <Button
                        variant="secondary"
                        size="sm"
                        iconLeft={<Play size={13} />}
                        onClick={() => handleReviewSingle(q)}
                      >
                        Review Now
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ACTIVE RECALL MODAL / SESSION ENGINE */}
      <ReviewSessionModal
        isOpen={isSessionOpen}
        onClose={() => setIsSessionOpen(false)}
        initialQuestions={sessionQueue}
      />
    </div>
  );
};

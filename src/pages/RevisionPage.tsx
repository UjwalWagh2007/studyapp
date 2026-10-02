import React, { useState } from 'react';
import {
  CheckCircle2,
  Clock,
  ExternalLink,
  Layers,
  History,
  Calendar,
} from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { EmptyState } from '../components/ui/EmptyState';
import { useAppStore } from '../context/AppContext';
import { useToast } from '../context/ToastContext';
import { getNextLadderInterval } from '../services/spacedRepetition';
import type { Problem, Difficulty, ReviewRating } from '../types';

export const RevisionPage: React.FC = () => {
  const {
    dueTodayProblems,
    overdueProblems,
    recordReview,
    navigateTo,
  } = useAppStore();

  const { showToast } = useToast();

  const [activeProblemHistoryId, setActiveProblemHistoryId] = useState<string | null>(null);

  const totalDueCount = dueTodayProblems.length;

  const handleRate = (problem: Problem, rating: ReviewRating) => {
    recordReview(problem.id, rating);
    showToast('Revision Recorded', `Rated "${rating}" for "${problem.title}".`, 'success');
  };

  const getDifficultyVariant = (diff: Difficulty) => {
    switch (diff) {
      case 'Easy':
        return 'success';
      case 'Medium':
        return 'warning';
      case 'Hard':
        return 'danger';
      default:
        return 'default';
    }
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <PageHeader
        title="Spaced Repetition Revision"
        description="Review scheduled problems to maintain long-term recall and mastery."
      />

      {totalDueCount === 0 ? (
        <EmptyState
          icon={<CheckCircle2 size={32} color="var(--color-success)" />}
          title="All caught up!"
          description="No revisions due today. Check the calendar to see upcoming scheduled revisions."
          actionText="View Calendar"
          actionIcon={<Calendar size={15} />}
          onAction={() => navigateTo('calendar')}
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Overdue alert banner if any */}
          {overdueProblems.length > 0 && (
            <div
              style={{
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: 'var(--radius-md)',
                padding: '12px 16px',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                color: 'var(--color-danger)',
                fontSize: '13px',
              }}
            >
              <Clock size={16} />
              <span>
                You have <strong>{overdueProblems.length}</strong> overdue revision
                {overdueProblems.length === 1 ? '' : 's'}. Clear them first to stay on schedule.
              </span>
            </div>
          )}

          {/* Due Problems Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 16 }}>
            {dueTodayProblems.map((problem) => {
              const isHistoryOpen = activeProblemHistoryId === problem.id;
              const solvedDateObj = new Date(problem.solvedAt);
              const formattedSolvedDate = !isNaN(solvedDateObj.getTime())
                ? solvedDateObj.toLocaleDateString()
                : problem.solvedAt;

              return (
                <div
                  key={problem.id}
                  style={{
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-lg)',
                    padding: 20,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 16,
                    boxShadow: 'var(--shadow-sm)',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: 12,
                    }}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>
                          {problem.title}
                        </span>
                        {problem.link && (
                          <a
                            href={problem.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ color: 'var(--color-primary)', display: 'inline-flex' }}
                            title="Open problem link"
                          >
                            <ExternalLink size={14} />
                          </a>
                        )}
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <Badge variant="default">{problem.topicName || 'Topic'}</Badge>
                        <Badge variant={getDifficultyVariant(problem.difficulty)}>
                          {problem.difficulty}
                        </Badge>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                            fontSize: '12px',
                            color: 'var(--text-secondary)',
                          }}
                        >
                          <Layers size={13} color="var(--color-primary)" />
                          {problem.pattern}
                        </span>
                        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                          • Solved {formattedSolvedDate}
                        </span>
                        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                          • Reviews: {problem.reviewCount}
                        </span>
                        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                          • Interval: {problem.currentIntervalDays}d
                        </span>
                      </div>
                    </div>

                    <Button
                      variant="ghost"
                      size="sm"
                      iconLeft={<History size={14} />}
                      onClick={() =>
                        setActiveProblemHistoryId(isHistoryOpen ? null : problem.id)
                      }
                    >
                      {isHistoryOpen ? 'Hide History' : 'Review History'}
                    </Button>
                  </div>

                  {/* Rating Response Buttons */}
                  <div
                    style={{
                      background: 'var(--bg-subtle)',
                      padding: 14,
                      borderRadius: 'var(--radius-md)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 8,
                    }}
                  >
                    <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)' }}>
                      HOW WELL DID YOU RECALL THIS PROBLEM?
                    </span>

                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                        gap: 10,
                      }}
                    >
                      <button
                        className="btn"
                        style={{
                          backgroundColor: 'rgba(239, 68, 68, 0.12)',
                          color: '#ef4444',
                          border: '1px solid rgba(239, 68, 68, 0.3)',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          padding: '10px 8px',
                          borderRadius: 'var(--radius-md)',
                          cursor: 'pointer',
                        }}
                        onClick={() => handleRate(problem, 'AGAIN')}
                      >
                        <span style={{ fontWeight: 700, fontSize: '13px' }}>Again</span>
                        <span style={{ fontSize: '11px', opacity: 0.85 }}>Reset (+1d)</span>
                      </button>

                      <button
                        className="btn"
                        style={{
                          backgroundColor: 'rgba(245, 158, 11, 0.12)',
                          color: '#f59e0b',
                          border: '1px solid rgba(245, 158, 11, 0.3)',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          padding: '10px 8px',
                          borderRadius: 'var(--radius-md)',
                          cursor: 'pointer',
                        }}
                        onClick={() => handleRate(problem, 'HARD')}
                      >
                        <span style={{ fontWeight: 700, fontSize: '13px' }}>Hard</span>
                        <span style={{ fontSize: '11px', opacity: 0.85 }}>
                          Repeat (+{problem.currentIntervalDays}d)
                        </span>
                      </button>

                      <button
                        className="btn"
                        style={{
                          backgroundColor: 'rgba(59, 130, 246, 0.12)',
                          color: '#3b82f6',
                          border: '1px solid rgba(59, 130, 246, 0.3)',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          padding: '10px 8px',
                          borderRadius: 'var(--radius-md)',
                          cursor: 'pointer',
                        }}
                        onClick={() => handleRate(problem, 'GOOD')}
                      >
                        <span style={{ fontWeight: 700, fontSize: '13px' }}>Good</span>
                        <span style={{ fontSize: '11px', opacity: 0.85 }}>
                          Next (+{getNextLadderInterval(problem.currentIntervalDays, 1)}d)
                        </span>
                      </button>

                      <button
                        className="btn"
                        style={{
                          backgroundColor: 'rgba(16, 185, 129, 0.12)',
                          color: '#10b981',
                          border: '1px solid rgba(16, 185, 129, 0.3)',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          padding: '10px 8px',
                          borderRadius: 'var(--radius-md)',
                          cursor: 'pointer',
                        }}
                        onClick={() => handleRate(problem, 'EASY')}
                      >
                        <span style={{ fontWeight: 700, fontSize: '13px' }}>Easy</span>
                        <span style={{ fontSize: '11px', opacity: 0.85 }}>
                          Jump (+{getNextLadderInterval(problem.currentIntervalDays, 2)}d)
                        </span>
                      </button>
                    </div>
                  </div>

                  {/* Review History Drawer */}
                  {isHistoryOpen && (
                    <div
                      style={{
                        borderTop: '1px solid var(--border-color)',
                        paddingTop: 12,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 8,
                      }}
                    >
                      <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)' }}>
                        Past Revision Logs:
                      </span>
                      {problem.reviewHistory && problem.reviewHistory.length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                          {problem.reviewHistory.map((log) => (
                            <div
                              key={log.id}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                fontSize: '12px',
                                padding: '6px 10px',
                                background: 'var(--bg-subtle)',
                                borderRadius: 'var(--radius-sm)',
                              }}
                            >
                              <span>{new Date(log.reviewedAt).toLocaleDateString()}</span>
                              <Badge variant={log.rating === 'AGAIN' ? 'danger' : log.rating === 'EASY' ? 'success' : 'primary'} size="sm">
                                {log.rating}
                              </Badge>
                              <span>Interval: {log.previousInterval}d → {log.newInterval}d</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                          No past reviews logged yet.
                        </span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  X,
  ExternalLink,
  Eye,
  Clock,
  Trophy,
  Lightbulb,
  Brain,
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { ProgressBar } from '../ui/ProgressBar';
import { useAppStore } from '../../context/AppContext';
import { useToast } from '../../context/ToastContext';
import type { Question, ReviewRating } from '../../types';

interface ReviewSessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialQuestions: Question[];
  onFinish?: () => void;
}

interface CompletedReviewRecord {
  question: Question;
  rating: ReviewRating;
  previousInterval: number;
  newInterval: number;
  newEaseFactor: number;
  nextReviewAt: string;
  timeSpentSeconds: number;
}

export const ReviewSessionModal: React.FC<ReviewSessionModalProps> = ({
  isOpen,
  onClose,
  initialQuestions,
  onFinish,
}) => {
  const { recordReview } = useAppStore();
  const { showToast } = useToast();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isRevealed, setIsRevealed] = useState(false);
  const [sessionCompleted, setSessionCompleted] = useState(false);
  const [completedRecords, setCompletedRecords] = useState<CompletedReviewRecord[]>([]);
  const [sessionNotes, setSessionNotes] = useState('');

  // Stopwatches
  const [totalSeconds, setTotalSeconds] = useState(0);
  const [questionSeconds, setQuestionSeconds] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const activeQuestionList = useMemo(() => initialQuestions, [initialQuestions]);
  const currentQuestion = activeQuestionList[currentIndex];

  // Reset state when opening modal
  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(0);
      setIsRevealed(false);
      setSessionCompleted(false);
      setCompletedRecords([]);
      setSessionNotes('');
      setTotalSeconds(0);
      setQuestionSeconds(0);
    }
  }, [isOpen, initialQuestions]);

  // Session timer ticker
  useEffect(() => {
    if (isOpen && !sessionCompleted) {
      timerRef.current = setInterval(() => {
        setTotalSeconds((prev) => prev + 1);
        setQuestionSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isOpen, sessionCompleted]);

  // Format seconds to mm:ss
  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainder = secs % 60;
    return `${String(mins).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`;
  };

  const handleReveal = () => {
    setIsRevealed(true);
  };

  const handleRate = (rating: ReviewRating) => {
    if (!currentQuestion) return;

    const prevInterval = currentQuestion.currentIntervalDays ?? 0;
    const result = recordReview(currentQuestion.id, rating, {
      timeSpentSeconds: questionSeconds,
      notes: sessionNotes.trim() || undefined,
    });

    if (result) {
      const record: CompletedReviewRecord = {
        question: result.updatedQuestion,
        rating,
        previousInterval: prevInterval,
        newInterval: result.updatedQuestion.currentIntervalDays,
        newEaseFactor: result.updatedQuestion.easeFactor,
        nextReviewAt: result.updatedQuestion.nextReviewAt || 'Soon',
        timeSpentSeconds: questionSeconds,
      };

      setCompletedRecords((prev) => [...prev, record]);
    }

    // Reset for next question or finish
    setSessionNotes('');
    setQuestionSeconds(0);
    setIsRevealed(false);

    if (currentIndex + 1 < activeQuestionList.length) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      setSessionCompleted(true);
      showToast('Session Complete! 🎉', `Reviewed ${activeQuestionList.length} question(s).`, 'success');
      if (onFinish) onFinish();
    }
  };

  if (!isOpen) return null;

  // Render Session Summary Screen
  if (sessionCompleted) {
    const totalCount = completedRecords.length;
    const strongCount = completedRecords.filter((r) => r.rating === 'EASY' || r.rating === 'GOOD').length;
    const hardCount = completedRecords.filter((r) => r.rating === 'HARD').length;
    const againCount = completedRecords.filter((r) => r.rating === 'AGAIN').length;
    const accuracy = totalCount > 0 ? Math.round((strongCount / totalCount) * 100) : 0;

    return (
      <div className="modal-overlay">
        <div
          className="modal-content animate-slide-up"
          style={{ maxWidth: '680px', width: '92%', maxHeight: '90vh', overflowY: 'auto' }}
        >
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: '50%',
                  backgroundColor: 'rgba(16, 185, 129, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--color-success)',
                }}
              >
                <Trophy size={24} />
              </div>
              <div>
                <h2 style={{ fontSize: '18px', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                  Revision Session Summary
                </h2>
                <p style={{ fontSize: '12.5px', color: 'var(--text-muted)', margin: 0 }}>
                  Excellent work reinforcing memory neural pathways.
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="btn btn-ghost"
              style={{ padding: '6px', borderRadius: '50%' }}
              aria-label="Close"
            >
              <X size={18} />
            </button>
          </div>

          {/* Session Metrics Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
              gap: 12,
              marginBottom: 20,
            }}
          >
            <div
              style={{
                padding: '12px 14px',
                backgroundColor: 'var(--bg-subtle)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>Questions Reviewed</span>
              <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', marginTop: 2 }}>
                {totalCount}
              </div>
            </div>

            <div
              style={{
                padding: '12px 14px',
                backgroundColor: 'var(--bg-subtle)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>Recall Accuracy</span>
              <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--color-success)', marginTop: 2 }}>
                {accuracy}%
              </div>
            </div>

            <div
              style={{
                padding: '12px 14px',
                backgroundColor: 'var(--bg-subtle)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>Total Time</span>
              <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', marginTop: 2 }}>
                {formatTime(totalSeconds)}
              </div>
            </div>

            <div
              style={{
                padding: '12px 14px',
                backgroundColor: 'var(--bg-subtle)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>Ratings Breakdown</span>
              <div style={{ display: 'flex', gap: 6, marginTop: 4, fontSize: '11.5px', fontWeight: 600 }}>
                <span style={{ color: 'var(--color-success)' }}>{strongCount} Pass</span>
                {hardCount > 0 && <span style={{ color: 'var(--color-warning)' }}>• {hardCount} Hard</span>}
                {againCount > 0 && <span style={{ color: 'var(--color-danger)' }}>• {againCount} Again</span>}
              </div>
            </div>
          </div>

          {/* Next Scheduled Dates List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}>
              Next Scheduled Reviews:
            </span>

            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
                maxHeight: '260px',
                overflowY: 'auto',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                padding: '8px',
                backgroundColor: 'var(--bg-subtle)',
              }}
            >
              {completedRecords.map((rec, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 12px',
                    backgroundColor: 'var(--bg-canvas)',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-subtle)',
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                      {rec.question.title}
                    </span>
                    <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                      {rec.question.topicName} • {rec.question.pattern}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, textAlign: 'right' }}>
                    <Badge
                      variant={
                        rec.rating === 'EASY'
                          ? 'success'
                          : rec.rating === 'GOOD'
                          ? 'primary'
                          : rec.rating === 'HARD'
                          ? 'warning'
                          : 'danger'
                      }
                      size="sm"
                    >
                      {rec.rating}
                    </Badge>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-primary)' }}>
                        {rec.nextReviewAt}
                      </span>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        +{rec.newInterval} {rec.newInterval === 1 ? 'day' : 'days'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Action */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <Button variant="primary" size="md" onClick={onClose}>
              Done / Return to Queue
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!currentQuestion) return null;

  const progressPercent = Math.round(((currentIndex) / activeQuestionList.length) * 100);

  return (
    <div className="modal-overlay">
      <div
        className="modal-content animate-slide-up"
        style={{
          maxWidth: '740px',
          width: '94%',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          padding: '24px',
          gap: 16,
        }}
      >
        {/* Top Session Progress Bar & Controls */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span
              style={{
                fontSize: '12px',
                fontWeight: 600,
                color: 'var(--text-muted)',
                backgroundColor: 'var(--bg-subtle)',
                padding: '4px 10px',
                borderRadius: 'var(--radius-full)',
              }}
            >
              Question {currentIndex + 1} of {activeQuestionList.length}
            </span>

            <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--text-secondary)', fontSize: '12.5px' }}>
              <Clock size={14} />
              <span>{formatTime(questionSeconds)}</span>
              <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>
                (Total: {formatTime(totalSeconds)})
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="btn btn-ghost"
            style={{ padding: '6px', borderRadius: '50%' }}
            aria-label="Exit Session"
            title="Exit Review Session"
          >
            <X size={18} />
          </button>
        </div>

        <ProgressBar value={progressPercent} max={100} size="sm" variant="primary" />

        {/* Question Header */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 500 }}>
              {currentQuestion.subject} → {currentQuestion.topicName}
            </span>
            <Badge
              variant={
                currentQuestion.difficulty === 'Easy'
                  ? 'success'
                  : currentQuestion.difficulty === 'Medium'
                  ? 'warning'
                  : 'danger'
              }
              size="sm"
            >
              {currentQuestion.difficulty}
            </Badge>
            <Badge variant="primary" size="sm">
              {currentQuestion.pattern}
            </Badge>
            <Badge variant="default" size="sm">
              {currentQuestion.source}
            </Badge>
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
            <h1 style={{ fontSize: '20px', fontWeight: 700, margin: 0, color: 'var(--text-primary)', lineHeight: 1.3 }}>
              {currentQuestion.title}
            </h1>

            {currentQuestion.url && (
              <a
                href={currentQuestion.url}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-secondary btn-sm"
                style={{ flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: 6 }}
              >
                <span>Open Problem</span>
                <ExternalLink size={13} />
              </a>
            )}
          </div>
        </div>

        {/* Active Recall Stage Content */}
        {!isRevealed ? (
          /* STEP 1: ACTIVE RECALL PROMPT */
          <div
            style={{
              flex: 1,
              minHeight: '220px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center',
              padding: '36px 20px',
              backgroundColor: 'var(--bg-subtle)',
              borderRadius: 'var(--radius-lg)',
              border: '1px dashed var(--border-medium)',
              gap: 16,
            }}
          >
            <div
              style={{
                width: 52,
                height: 52,
                borderRadius: '50%',
                backgroundColor: 'rgba(56, 189, 248, 0.12)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--color-primary)',
              }}
            >
              <Brain size={28} />
            </div>

            <div style={{ maxWidth: '440px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 6px 0' }}>
                Active Recall Exercise
              </h3>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
                Do you remember the core approach, data structures, and edge case invariants for this problem?
              </p>
            </div>

            <Button
              variant="primary"
              size="lg"
              iconLeft={<Eye size={18} />}
              onClick={handleReveal}
              style={{ marginTop: 8, padding: '12px 28px', fontSize: '14.5px' }}
            >
              Reveal Solution & Notes
            </Button>
          </div>
        ) : (
          /* STEP 2: REVEALED SOLUTION & NOTES */
          <div
            className="animate-fade-in"
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 14,
              maxHeight: '44vh',
              overflowY: 'auto',
              paddingRight: '4px',
            }}
          >
            {/* Key Invariant / Insight */}
            {currentQuestion.importantInsight && (
              <div
                style={{
                  padding: '12px 16px',
                  backgroundColor: 'var(--bg-subtle)',
                  borderRadius: 'var(--radius-md)',
                  borderLeft: '4px solid var(--color-primary)',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 10,
                }}
              >
                <Lightbulb size={18} color="var(--color-primary)" style={{ marginTop: 2, flexShrink: 0 }} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <span style={{ fontSize: '11.5px', fontWeight: 600, color: 'var(--color-primary)', textTransform: 'uppercase' }}>
                    Key Invariant / Important Insight:
                  </span>
                  <span style={{ fontSize: '13.5px', color: 'var(--text-primary)', lineHeight: 1.5 }}>
                    {currentQuestion.importantInsight}
                  </span>
                </div>
              </div>
            )}

            {/* Personal Notes */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                Personal Notes & Solution Approach:
              </span>
              <div
                style={{
                  padding: '14px 16px',
                  backgroundColor: 'var(--bg-canvas)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '13.5px',
                  lineHeight: 1.6,
                  color: 'var(--text-primary)',
                  whiteSpace: 'pre-wrap',
                }}
              >
                {currentQuestion.notes || 'No detailed notes recorded for this question.'}
              </div>
            </div>

            {/* Tags */}
            {currentQuestion.tags && currentQuestion.tags.length > 0 && (
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {currentQuestion.tags.map((t, idx) => (
                  <span key={idx} className="badge badge-default" style={{ fontSize: '11px' }}>
                    #{t}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        {/* STEP 3: SELF-ASSESSMENT RATINGS (Visible once revealed) */}
        {isRevealed && (
          <div
            className="animate-slide-up"
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
              paddingTop: 12,
              borderTop: '1px solid var(--border-subtle)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                How well did you remember this?
              </span>
              <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                Select rating to schedule next repetition
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
              {/* AGAIN */}
              <button
                onClick={() => handleRate('AGAIN')}
                style={{
                  padding: '10px 8px',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'rgba(239, 68, 68, 0.08)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  color: 'var(--color-danger)',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 3,
                  transition: 'var(--transition-fast)',
                }}
                className="hover-card"
              >
                <span style={{ fontWeight: 700, fontSize: '13px' }}>1. AGAIN</span>
                <span style={{ fontSize: '11px', opacity: 0.85 }}>Lapse (1d)</span>
              </button>

              {/* HARD */}
              <button
                onClick={() => handleRate('HARD')}
                style={{
                  padding: '10px 8px',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'rgba(245, 158, 11, 0.08)',
                  border: '1px solid rgba(245, 158, 11, 0.3)',
                  color: 'var(--color-warning)',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 3,
                  transition: 'var(--transition-fast)',
                }}
                className="hover-card"
              >
                <span style={{ fontWeight: 700, fontSize: '13px' }}>2. HARD</span>
                <span style={{ fontSize: '11px', opacity: 0.85 }}>Struggled</span>
              </button>

              {/* GOOD */}
              <button
                onClick={() => handleRate('GOOD')}
                style={{
                  padding: '10px 8px',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'rgba(56, 189, 248, 0.08)',
                  border: '1px solid rgba(56, 189, 248, 0.3)',
                  color: 'var(--color-primary)',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 3,
                  transition: 'var(--transition-fast)',
                }}
                className="hover-card"
              >
                <span style={{ fontWeight: 700, fontSize: '13px' }}>3. GOOD</span>
                <span style={{ fontSize: '11px', opacity: 0.85 }}>Recalled</span>
              </button>

              {/* EASY */}
              <button
                onClick={() => handleRate('EASY')}
                style={{
                  padding: '10px 8px',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'rgba(16, 185, 129, 0.08)',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  color: 'var(--color-success)',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 3,
                  transition: 'var(--transition-fast)',
                }}
                className="hover-card"
              >
                <span style={{ fontWeight: 700, fontSize: '13px' }}>4. EASY</span>
                <span style={{ fontSize: '11px', opacity: 0.85 }}>Instant</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

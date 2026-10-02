import React, { useState, useEffect, useMemo } from 'react';
import {
  GraduationCap,
  Play,
  Pause,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  ExternalLink,
  Check,
  X,
  HelpCircle,
  Award,
  BookOpen,
  Trash2,
} from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { Button } from '../components/ui/Button';
import { IconButton } from '../components/ui/IconButton';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { EmptyState } from '../components/ui/EmptyState';
import { useAppStore } from '../context/AppContext';
import { useToast } from '../context/ToastContext';
import {
  generateWeeklyMockTests,
  getLiveQuestionTime,
  computeMockTestAnalytics,
  formatTestDuration,
} from '../services/mockTestService';
import type {
  MockTest,
  MockQuestionSelfAssessment,
  Difficulty,
} from '../types';

export const MockTestsPage: React.FC = () => {
  const {
    problems,
    mockTests,
    activeMockTest,
    saveOrUpdateMockTest,
    startMockTestAction,
    pauseMockTestAction,
    resumeMockTestAction,
    setActiveQuestionAction,
    completeQuestionAction,
    finishMockTestAction,
    deleteMockTestAction,
    navigateTo,
  } = useAppStore();

  const { showToast } = useToast();

  // Current view state: 'DASHBOARD' | 'TEST_RUNNER' | 'RESULTS'
  const [selectedTestId, setSelectedTestId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'DASHBOARD' | 'TEST_RUNNER' | 'RESULTS'>('DASHBOARD');

  // Confirmation dialogs
  const [isFinishConfirmOpen, setIsFinishConfirmOpen] = useState(false);
  const [testToDelete, setTestToDelete] = useState<MockTest | null>(null);

  // Live timer tick for active test runner
  const [, setTick] = useState(0);

  useEffect(() => {
    if (!activeMockTest || activeMockTest.status !== 'IN_PROGRESS') return;
    const interval = setInterval(() => {
      setTick((t) => t + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [activeMockTest]);

  // Current selected test object
  const currentTest = useMemo(() => {
    if (!selectedTestId) return activeMockTest;
    return mockTests.find((t) => t.id === selectedTestId) || activeMockTest;
  }, [selectedTestId, mockTests, activeMockTest]);

  // Generate or retrieve current weekly mock tests
  const weeklyTestsData = useMemo(() => {
    return generateWeeklyMockTests(problems, mockTests, new Date());
  }, [problems, mockTests]);

  // Helper to ensure generated tests are saved to store
  const handleSelectOrGenerateTest = (test: MockTest) => {
    saveOrUpdateMockTest(test);
    setSelectedTestId(test.id);
    if (test.status === 'COMPLETED') {
      setViewMode('RESULTS');
    } else {
      setViewMode('TEST_RUNNER');
      if (test.status === 'NOT_STARTED') {
        startMockTestAction(test.id, 0);
      }
    }
  };

  const handleStartQuestion = (qIndex: number) => {
    if (!currentTest) return;
    setActiveQuestionAction(currentTest.id, qIndex);
  };

  const handleCompleteQuestion = (
    qIndex: number,
    assessment: MockQuestionSelfAssessment
  ) => {
    if (!currentTest) return;
    completeQuestionAction(currentTest.id, qIndex, assessment);
    showToast('Question Recorded', 'Progress updated.', 'success');
  };

  const handleFinishTest = () => {
    if (!currentTest) return;

    const unansweredCount = currentTest.questions.filter((q) => !q.isCompleted).length;
    if (unansweredCount > 0) {
      setIsFinishConfirmOpen(true);
      return;
    }

    finishMockTestAction(currentTest.id);
    setViewMode('RESULTS');
    showToast('Test Completed!', `You scored ${currentTest.percentage}% on this test.`, 'success');
  };

  const handleForceFinishTest = () => {
    if (!currentTest) return;
    setIsFinishConfirmOpen(false);
    finishMockTestAction(currentTest.id);
    setViewMode('RESULTS');
    showToast('Test Completed', `Test submitted.`, 'info');
  };

  const getDifficultyBadgeVariant = (diff: Difficulty) => {
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

  // ------------------------------------------------------------------------
  // 1. TEST RUNNER INTERFACE
  // ------------------------------------------------------------------------
  if (viewMode === 'TEST_RUNNER' && currentTest) {
    const isPaused = currentTest.status === 'PAUSED';
    const activeQIndex = currentTest.currentQuestionIndex;
    const activeQuestion = currentTest.questions[activeQIndex];
    const completedCount = currentTest.questions.filter((q) => q.isCompleted).length;
    const totalQuestions = currentTest.questions.length;
    const liveTime = activeQuestion
      ? getLiveQuestionTime(
          activeQuestion,
          currentTest.status === 'IN_PROGRESS',
          currentTest.activeQuestionStartedAt
        )
      : 0;

    return (
      <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 960, margin: '0 auto', width: '100%' }}>
        {/* Test Header & Controls */}
        <div
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-lg)',
            padding: '16px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 12,
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Button
              variant="secondary"
              size="sm"
              iconLeft={<ArrowLeft size={15} />}
              onClick={() => setViewMode('DASHBOARD')}
            >
              Exit to Menu
            </Button>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-primary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {currentTest.testDay} WEEKLY TEST
                </span>
                <Badge variant={isPaused ? 'warning' : 'primary'} size="sm">
                  {isPaused ? 'Paused' : 'In Progress'}
                </Badge>
              </div>
              <h2 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)', margin: '2px 0 0 0' }}>
                {currentTest.weekLabel}
              </h2>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {isPaused ? (
              <Button
                variant="primary"
                size="sm"
                iconLeft={<Play size={14} />}
                onClick={() => resumeMockTestAction(currentTest.id)}
                style={{ backgroundColor: '#f59e0b', borderColor: '#f59e0b' }}
              >
                Resume Test
              </Button>
            ) : (
              <Button
                variant="secondary"
                size="sm"
                iconLeft={<Pause size={14} />}
                onClick={() => pauseMockTestAction(currentTest.id)}
              >
                Pause Test
              </Button>
            )}

            <Button
              variant="primary"
              size="sm"
              iconLeft={<CheckCircle2 size={15} />}
              onClick={handleFinishTest}
            >
              Finish Test
            </Button>
          </div>
        </div>

        {/* Question Navigator */}
        <div
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-lg)',
            padding: '14px 18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 10,
          }}
        >
          <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-secondary)' }}>
            Questions Progress ({completedCount}/{totalQuestions}):
          </div>

          <div className="mock-question-nav-container">
            {currentTest.questions.map((q, idx) => {
              const isActive = idx === activeQIndex;
              const isDone = q.isCompleted;

              return (
                <button
                  key={q.problemId}
                  onClick={() => handleStartQuestion(idx)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 4,
                    minWidth: 42,
                    height: 32,
                    padding: '0 8px',
                    borderRadius: 'var(--radius-md)',
                    border: isActive
                      ? '2px solid var(--color-primary)'
                      : isDone
                      ? '1px solid var(--color-success)'
                      : '1px solid var(--border-color)',
                    backgroundColor: isActive
                      ? 'rgba(99, 102, 241, 0.15)'
                      : isDone
                      ? 'rgba(34, 197, 94, 0.1)'
                      : 'var(--bg-subtle)',
                    color: isActive
                      ? 'var(--color-primary)'
                      : isDone
                      ? 'var(--color-success)'
                      : 'var(--text-secondary)',
                    fontWeight: 700,
                    fontSize: '12.5px',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                  title={q.title}
                >
                  <span>{idx + 1}</span>
                  {isDone ? <Check size={12} strokeWidth={3} /> : <span>—</span>}
                </button>
              );
            })}
          </div>
        </div>

        {/* Active Question View */}
        {activeQuestion ? (
          <div
            className="animate-scale-in"
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-xl)',
              padding: 28,
              display: 'flex',
              flexDirection: 'column',
              gap: 22,
              boxShadow: 'var(--shadow-md)',
              position: 'relative',
            }}
          >
            {/* Question Header & Live Question Timer */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <span style={{ fontSize: '13px', fontWeight: 800, color: 'var(--color-primary)' }}>
                    QUESTION {activeQIndex + 1} OF {totalQuestions}
                  </span>
                  <Badge variant={getDifficultyBadgeVariant(activeQuestion.difficulty)} size="sm">
                    {activeQuestion.difficulty}
                  </Badge>
                  {activeQuestion.topicName && (
                    <Badge variant="default" size="sm">
                      {activeQuestion.topicName}
                    </Badge>
                  )}
                  {activeQuestion.pattern && (
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                      • {activeQuestion.pattern}
                    </span>
                  )}
                </div>

                <h1 style={{ fontSize: '26px', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                  {activeQuestion.title}
                </h1>
              </div>

              {/* Real Live Timer Box */}
              <div
                style={{
                  background: 'var(--bg-subtle)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-lg)',
                  padding: '10px 18px',
                  textAlign: 'right',
                }}
              >
                <div style={{ fontSize: '11.5px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Question Time
                </div>
                <div
                  style={{
                    fontFamily: 'monospace',
                    fontSize: '24px',
                    fontWeight: 800,
                    color: isPaused ? '#f59e0b' : 'var(--color-primary)',
                    marginTop: 2,
                  }}
                >
                  {formatTestDuration(liveTime)}
                </div>
              </div>
            </div>

            {/* External Problem Link Action */}
            {activeQuestion.link && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <a
                  href={activeQuestion.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    fontSize: '13.5px',
                    fontWeight: 600,
                    color: 'var(--color-primary)',
                    textDecoration: 'none',
                    backgroundColor: 'rgba(99, 102, 241, 0.08)',
                    padding: '8px 14px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid rgba(99, 102, 241, 0.2)',
                  }}
                >
                  <span>Open Problem Statement</span>
                  <ExternalLink size={14} />
                </a>
              </div>
            )}

            <hr style={{ border: 'none', borderTop: '1px solid var(--border-subtle)', margin: '4px 0' }} />

            {/* Completion & Self Assessment Box */}
            <div
              style={{
                background: activeQuestion.isCompleted ? 'rgba(34, 197, 94, 0.05)' : 'var(--bg-subtle)',
                border: activeQuestion.isCompleted ? '1.5px solid var(--color-success)' : '1px dashed var(--border-color)',
                borderRadius: 'var(--radius-lg)',
                padding: 20,
                display: 'flex',
                flexDirection: 'column',
                gap: 14,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '14.5px', fontWeight: 700, color: 'var(--text-primary)' }}>
                  Self Assessment & Completion
                </span>
                {activeQuestion.isCompleted && (
                  <Badge variant="success" size="sm">
                    <Check size={12} style={{ marginRight: 3 }} /> Marked Completed
                  </Badge>
                )}
              </div>

              <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                How did you perform on this problem under test conditions?
              </div>

              <div className="mock-assessment-grid">
                {/* 1. Solved Independently */}
                <button
                  onClick={() => handleCompleteQuestion(activeQIndex, 'SOLVED_INDEPENDENTLY')}
                  style={{
                    background: activeQuestion.assessment === 'SOLVED_INDEPENDENTLY' ? 'rgba(34, 197, 94, 0.15)' : 'var(--bg-card)',
                    border: activeQuestion.assessment === 'SOLVED_INDEPENDENTLY' ? '2px solid var(--color-success)' : '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-md)',
                    padding: '12px 14px',
                    textAlign: 'left',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: '50%',
                      backgroundColor: activeQuestion.assessment === 'SOLVED_INDEPENDENTLY' ? 'var(--color-success)' : 'var(--bg-subtle)',
                      color: '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Check size={14} strokeWidth={3} />
                  </div>
                  <div>
                    <div style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--text-primary)' }}>
                      Solved independently
                    </div>
                    <div style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                      Full score credit (1.0 pt)
                    </div>
                  </div>
                </button>

                {/* 2. Needed Help */}
                <button
                  onClick={() => handleCompleteQuestion(activeQIndex, 'NEEDED_HELP')}
                  style={{
                    background: activeQuestion.assessment === 'NEEDED_HELP' ? 'rgba(245, 158, 11, 0.15)' : 'var(--bg-card)',
                    border: activeQuestion.assessment === 'NEEDED_HELP' ? '2px solid #f59e0b' : '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-md)',
                    padding: '12px 14px',
                    textAlign: 'left',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: '50%',
                      backgroundColor: activeQuestion.assessment === 'NEEDED_HELP' ? '#f59e0b' : 'var(--bg-subtle)',
                      color: '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <HelpCircle size={14} />
                  </div>
                  <div>
                    <div style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--text-primary)' }}>
                      Needed help / hints
                    </div>
                    <div style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                      Partial credit (0.5 pt)
                    </div>
                  </div>
                </button>

                {/* 3. Could not solve */}
                <button
                  onClick={() => handleCompleteQuestion(activeQIndex, 'COULD_NOT_SOLVE')}
                  style={{
                    background: activeQuestion.assessment === 'COULD_NOT_SOLVE' ? 'rgba(239, 68, 68, 0.15)' : 'var(--bg-card)',
                    border: activeQuestion.assessment === 'COULD_NOT_SOLVE' ? '2px solid var(--color-danger)' : '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-md)',
                    padding: '12px 14px',
                    textAlign: 'left',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: '50%',
                      backgroundColor: activeQuestion.assessment === 'COULD_NOT_SOLVE' ? 'var(--color-danger)' : 'var(--bg-subtle)',
                      color: '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <X size={14} strokeWidth={3} />
                  </div>
                  <div>
                    <div style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--text-primary)' }}>
                      Could not solve
                    </div>
                    <div style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                      Zero score credit (0.0 pt)
                    </div>
                  </div>
                </button>
              </div>
            </div>

            {/* Bottom Nav Buttons */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, paddingTop: 10 }}>
              <Button
                variant="secondary"
                size="md"
                disabled={activeQIndex === 0}
                iconLeft={<ArrowLeft size={16} />}
                onClick={() => handleStartQuestion(activeQIndex - 1)}
              >
                Previous Question
              </Button>

              {activeQIndex < totalQuestions - 1 ? (
                <Button
                  variant="primary"
                  size="md"
                  iconRight={<ArrowRight size={16} />}
                  onClick={() => handleStartQuestion(activeQIndex + 1)}
                >
                  Next Question
                </Button>
              ) : (
                <Button
                  variant="primary"
                  size="md"
                  iconLeft={<CheckCircle2 size={16} />}
                  onClick={handleFinishTest}
                >
                  Complete & Finish Test
                </Button>
              )}
            </div>
          </div>
        ) : null}

        {/* UNANSWERED QUESTIONS CONFIRMATION MODAL */}
        <Modal
          isOpen={isFinishConfirmOpen}
          onClose={() => setIsFinishConfirmOpen(false)}
          title="Incomplete Questions"
          footer={
            <div style={{ display: 'flex', gap: 8 }}>
              <Button variant="secondary" size="sm" onClick={() => setIsFinishConfirmOpen(false)}>
                Return to Test
              </Button>
              <Button variant="danger" size="sm" onClick={handleForceFinishTest}>
                Submit Anyway
              </Button>
            </div>
          }
        >
          <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: '50%',
                backgroundColor: 'rgba(245, 158, 11, 0.15)',
                color: '#f59e0b',
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
                You still have {currentTest.questions.filter((q) => !q.isCompleted).length} unanswered questions.
              </p>
              <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)' }}>
                Are you sure you want to finish the test now? Unanswered questions will receive 0 score credit.
              </p>
            </div>
          </div>
        </Modal>
      </div>
    );
  }

  // ------------------------------------------------------------------------
  // 2. TEST RESULTS & ANALYTICS VIEW
  // ------------------------------------------------------------------------
  if (viewMode === 'RESULTS' && currentTest) {
    const analytics = computeMockTestAnalytics(currentTest);

    return (
      <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 960, margin: '0 auto', width: '100%' }}>
        <PageHeader
          title="Test Results & Analysis"
          description={`${currentTest.testDay} Weekly Test (${currentTest.weekLabel})`}
          actions={
            <Button
              variant="secondary"
              size="md"
              iconLeft={<ArrowLeft size={16} />}
              onClick={() => setViewMode('DASHBOARD')}
            >
              Back to Mock Tests
            </Button>
          }
        />

        {/* Hero Score Celebration Card */}
        <div
          className="animate-slide-up"
          style={{
            background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(34, 197, 94, 0.15) 100%)',
            border: '2px solid rgba(99, 102, 241, 0.3)',
            borderRadius: 'var(--radius-xl)',
            padding: 32,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 24,
            boxShadow: '0 0 30px rgba(99, 102, 241, 0.15)',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <Award size={20} color="var(--color-primary)" />
              <span style={{ fontSize: '13px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-primary)' }}>
                TEST COMPLETE
              </span>
            </div>
            <h1 style={{ fontSize: '36px', fontWeight: 800, color: 'var(--text-primary)', margin: 0, lineHeight: 1 }}>
              Score: {currentTest.score} / {currentTest.maxScore}
            </h1>
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginTop: 8 }}>
              Accuracy Percentage: <strong style={{ color: 'var(--text-primary)' }}>{currentTest.percentage}%</strong>
            </p>
          </div>

          {/* Difficulty Breakdown Badges */}
          <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
            {currentTest.easyTotal > 0 && (
              <div style={{ background: 'var(--bg-card)', padding: '12px 18px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)', textAlign: 'center' }}>
                <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-success)' }}>Easy</div>
                <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)', marginTop: 2 }}>
                  {currentTest.easyScore} / {currentTest.easyTotal}
                </div>
              </div>
            )}
            {currentTest.mediumTotal > 0 && (
              <div style={{ background: 'var(--bg-card)', padding: '12px 18px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)', textAlign: 'center' }}>
                <div style={{ fontSize: '12px', fontWeight: 700, color: '#f59e0b' }}>Medium</div>
                <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)', marginTop: 2 }}>
                  {currentTest.mediumScore} / {currentTest.mediumTotal}
                </div>
              </div>
            )}
            {currentTest.hardTotal > 0 && (
              <div style={{ background: 'var(--bg-card)', padding: '12px 18px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)', textAlign: 'center' }}>
                <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-danger)' }}>Hard</div>
                <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)', marginTop: 2 }}>
                  {currentTest.hardScore} / {currentTest.hardTotal}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Time Analytics Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: 18 }}>
            <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)' }}>Total Test Duration</div>
            <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)', marginTop: 4 }}>
              {formatTestDuration(analytics.totalTimeSeconds)}
            </div>
          </div>

          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: 18 }}>
            <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)' }}>Average / Question</div>
            <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)', marginTop: 4 }}>
              {formatTestDuration(analytics.averageTimeSeconds)}
            </div>
          </div>

          {analytics.fastestQuestion && (
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: 18 }}>
              <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-success)' }}>Fastest Question</div>
              <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)', marginTop: 4 }}>
                {formatTestDuration(analytics.fastestQuestion.seconds)}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {analytics.fastestQuestion.title}
              </div>
            </div>
          )}

          {analytics.slowestQuestion && (
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: 18 }}>
              <div style={{ fontSize: '12px', fontWeight: 600, color: '#f59e0b' }}>Slowest Question</div>
              <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)', marginTop: 4 }}>
                {formatTestDuration(analytics.slowestQuestion.seconds)}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {analytics.slowestQuestion.title}
              </div>
            </div>
          )}
        </div>

        {/* Detailed Question Results List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
            Question Breakdown
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {currentTest.questions.map((q, idx) => {
              const isSolved = q.assessment === 'SOLVED_INDEPENDENTLY';
              const isPartial = q.assessment === 'NEEDED_HELP';

              return (
                <div
                  key={q.problemId}
                  style={{
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-lg)',
                    padding: '16px 20px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: 12,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: '50%',
                        backgroundColor: isSolved
                          ? 'rgba(34, 197, 94, 0.12)'
                          : isPartial
                          ? 'rgba(245, 158, 11, 0.12)'
                          : 'rgba(239, 68, 68, 0.12)',
                        color: isSolved
                          ? 'var(--color-success)'
                          : isPartial
                          ? '#f59e0b'
                          : 'var(--color-danger)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {isSolved ? (
                        <Check size={18} strokeWidth={3} />
                      ) : isPartial ? (
                        <HelpCircle size={18} />
                      ) : (
                        <X size={18} strokeWidth={3} />
                      )}
                    </div>

                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>
                          {idx + 1}. {q.title}
                        </span>
                        <Badge variant={getDifficultyBadgeVariant(q.difficulty)} size="sm">
                          {q.difficulty}
                        </Badge>
                      </div>

                      <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: 4 }}>
                        {isSolved
                          ? '✓ Solved independently'
                          : isPartial
                          ? '△ Needed help / hints'
                          : '✕ Could not solve'}
                        {q.topicName && ` • Topic: ${q.topicName}`}
                      </div>
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-primary)' }}>
                      {formatTestDuration(q.timeSpentSeconds || 0)}
                    </div>
                    {q.link && (
                      <a
                        href={q.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ fontSize: '12px', color: 'var(--color-primary)', textDecoration: 'none' }}
                      >
                        Open Problem ↗
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // ------------------------------------------------------------------------
  // 3. MAIN DASHBOARD / SELECTOR VIEW
  // ------------------------------------------------------------------------
  const { saturdayTest, sundayTest, eligibleProblemsCount, weekLabel } = weeklyTestsData;
  const hasEligibleQuestions = eligibleProblemsCount > 0;

  // Historical completed tests (excluding currently active generation)
  const completedHistory = mockTests.filter((t) => t.status === 'COMPLETED');

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 960, margin: '0 auto', width: '100%' }}>
      {/* Header */}
      <PageHeader
        title="Weekly Mock Tests"
        description="Assesses your ability to independently solve problems logged Monday through Friday under test conditions."
      />

      {/* ACTIVE TEST RESUME BANNER */}
      {activeMockTest && (
        <div
          className="animate-slide-up"
          style={{
            background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.12) 0%, rgba(139, 92, 246, 0.18) 100%)',
            border: '2px solid var(--color-primary)',
            borderRadius: 'var(--radius-xl)',
            padding: '20px 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 16,
            boxShadow: '0 0 25px rgba(99, 102, 241, 0.2)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: '50%',
                backgroundColor: 'var(--color-primary)',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <GraduationCap size={22} />
            </div>

            <div>
              <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-primary)', textTransform: 'uppercase' }}>
                Test Currently {activeMockTest.status === 'PAUSED' ? 'Paused' : 'In Progress'}
              </div>
              <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)', margin: '2px 0 0 0' }}>
                {activeMockTest.testDay} Test — {activeMockTest.questions.filter((q) => q.isCompleted).length}/{activeMockTest.questions.length} Questions Handled
              </h3>
            </div>
          </div>

          <Button
            variant="primary"
            size="md"
            iconLeft={<Play size={16} />}
            onClick={() => handleSelectOrGenerateTest(activeMockTest)}
          >
            {activeMockTest.status === 'PAUSED' ? 'Resume Test' : 'Continue Test'}
          </Button>
        </div>
      )}

      {/* WEEKLY TEST CARDS (Saturday & Sunday) */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
          <div>
            <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
              {weekLabel}
            </h3>
            <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
              Eligible Mon–Fri Solved Questions: <strong style={{ color: 'var(--text-primary)' }}>{eligibleProblemsCount}</strong>
            </span>
          </div>
        </div>

        {!hasEligibleQuestions ? (
          <EmptyState
            icon={<GraduationCap size={32} color="var(--color-primary)" />}
            title="No Weekly Mock Test Available"
            description="Solve and log problems between Monday and Friday to automatically generate your balanced Saturday & Sunday mock tests."
            actionText="Go to Topics"
            actionIcon={<BookOpen size={16} />}
            onAction={() => navigateTo('topics')}
          />
        ) : (
          <div className="mock-tests-grid">
            {/* SATURDAY TEST CARD */}
            {saturdayTest && (
              <div
                style={{
                  background: 'var(--bg-card)',
                  border: saturdayTest.status === 'COMPLETED'
                    ? '1.5px solid var(--color-success)'
                    : '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-xl)',
                  padding: 24,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: 18,
                  boxShadow: 'var(--shadow-sm)',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                    <Badge variant="primary" size="sm">
                      Saturday Test (~50% Pool)
                    </Badge>
                    <Badge
                      variant={saturdayTest.status === 'COMPLETED' ? 'success' : saturdayTest.status === 'IN_PROGRESS' ? 'primary' : 'default'}
                      size="sm"
                    >
                      {saturdayTest.status === 'COMPLETED' ? 'Completed' : saturdayTest.status === 'IN_PROGRESS' ? 'In Progress' : 'Ready'}
                    </Badge>
                  </div>

                  <h3 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                    Saturday Assessment
                  </h3>
                  <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: 4 }}>
                    Scheduled for {saturdayTest.scheduledDate}
                  </div>

                  {/* Difficulty Badges */}
                  <div style={{ display: 'flex', gap: 6, marginTop: 14, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', backgroundColor: 'var(--bg-subtle)', padding: '4px 8px', borderRadius: 'var(--radius-sm)' }}>
                      {saturdayTest.questions.length} Questions
                    </span>
                    {saturdayTest.easyTotal > 0 && (
                      <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-success)', backgroundColor: 'rgba(34, 197, 94, 0.1)', padding: '4px 8px', borderRadius: 'var(--radius-sm)' }}>
                        {saturdayTest.easyTotal} Easy
                      </span>
                    )}
                    {saturdayTest.mediumTotal > 0 && (
                      <span style={{ fontSize: '12px', fontWeight: 600, color: '#f59e0b', backgroundColor: 'rgba(245, 158, 11, 0.1)', padding: '4px 8px', borderRadius: 'var(--radius-sm)' }}>
                        {saturdayTest.mediumTotal} Medium
                      </span>
                    )}
                    {saturdayTest.hardTotal > 0 && (
                      <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-danger)', backgroundColor: 'rgba(239, 68, 68, 0.1)', padding: '4px 8px', borderRadius: 'var(--radius-sm)' }}>
                        {saturdayTest.hardTotal} Hard
                      </span>
                    )}
                  </div>
                </div>

                {saturdayTest.status === 'COMPLETED' ? (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid var(--border-subtle)', paddingTop: 14 }}>
                    <div>
                      <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Score Achieved</span>
                      <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--color-success)' }}>
                        {saturdayTest.score} / {saturdayTest.maxScore} ({saturdayTest.percentage}%)
                      </div>
                    </div>

                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        setSelectedTestId(saturdayTest.id);
                        setViewMode('RESULTS');
                      }}
                    >
                      View Results
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant="primary"
                    size="md"
                    iconLeft={<Play size={16} />}
                    onClick={() => handleSelectOrGenerateTest(saturdayTest)}
                  >
                    {saturdayTest.status === 'IN_PROGRESS' ? 'Resume Saturday Test' : 'Start Saturday Test'}
                  </Button>
                )}
              </div>
            )}

            {/* SUNDAY TEST CARD */}
            {sundayTest && (
              <div
                style={{
                  background: 'var(--bg-card)',
                  border: sundayTest.status === 'COMPLETED'
                    ? '1.5px solid var(--color-success)'
                    : '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-xl)',
                  padding: 24,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: 18,
                  boxShadow: 'var(--shadow-sm)',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                    <Badge variant="default" size="sm">
                      Sunday Test (~50% Pool)
                    </Badge>
                    <Badge
                      variant={sundayTest.status === 'COMPLETED' ? 'success' : sundayTest.status === 'IN_PROGRESS' ? 'primary' : 'default'}
                      size="sm"
                    >
                      {sundayTest.status === 'COMPLETED' ? 'Completed' : sundayTest.status === 'IN_PROGRESS' ? 'In Progress' : 'Ready'}
                    </Badge>
                  </div>

                  <h3 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                    Sunday Assessment
                  </h3>
                  <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: 4 }}>
                    Scheduled for {sundayTest.scheduledDate}
                  </div>

                  {/* Difficulty Badges */}
                  <div style={{ display: 'flex', gap: 6, marginTop: 14, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', backgroundColor: 'var(--bg-subtle)', padding: '4px 8px', borderRadius: 'var(--radius-sm)' }}>
                      {sundayTest.questions.length} Questions
                    </span>
                    {sundayTest.easyTotal > 0 && (
                      <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-success)', backgroundColor: 'rgba(34, 197, 94, 0.1)', padding: '4px 8px', borderRadius: 'var(--radius-sm)' }}>
                        {sundayTest.easyTotal} Easy
                      </span>
                    )}
                    {sundayTest.mediumTotal > 0 && (
                      <span style={{ fontSize: '12px', fontWeight: 600, color: '#f59e0b', backgroundColor: 'rgba(245, 158, 11, 0.1)', padding: '4px 8px', borderRadius: 'var(--radius-sm)' }}>
                        {sundayTest.mediumTotal} Medium
                      </span>
                    )}
                    {sundayTest.hardTotal > 0 && (
                      <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-danger)', backgroundColor: 'rgba(239, 68, 68, 0.1)', padding: '4px 8px', borderRadius: 'var(--radius-sm)' }}>
                        {sundayTest.hardTotal} Hard
                      </span>
                    )}
                  </div>
                </div>

                {sundayTest.status === 'COMPLETED' ? (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid var(--border-subtle)', paddingTop: 14 }}>
                    <div>
                      <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Score Achieved</span>
                      <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--color-success)' }}>
                        {sundayTest.score} / {sundayTest.maxScore} ({sundayTest.percentage}%)
                      </div>
                    </div>

                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        setSelectedTestId(sundayTest.id);
                        setViewMode('RESULTS');
                      }}
                    >
                      View Results
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant="primary"
                    size="md"
                    iconLeft={<Play size={16} />}
                    onClick={() => handleSelectOrGenerateTest(sundayTest)}
                  >
                    {sundayTest.status === 'IN_PROGRESS' ? 'Resume Sunday Test' : 'Start Sunday Test'}
                  </Button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* MOCK TEST HISTORY */}
      {completedHistory.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 12 }}>
          <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
            Mock Test History
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {completedHistory.map((test) => (
              <div
                key={test.id}
                style={{
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-lg)',
                  padding: '16px 20px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: 14,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 'var(--radius-md)',
                      backgroundColor: 'rgba(34, 197, 94, 0.1)',
                      color: 'var(--color-success)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <CheckCircle2 size={20} />
                  </div>

                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>
                        {test.testDay} Test ({test.scheduledDate})
                      </span>
                      <Badge variant="success" size="sm">
                        {test.percentage}%
                      </Badge>
                    </div>

                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: 4 }}>
                      {test.weekLabel} • {test.questions.length} questions • Total time: {formatTestDuration(test.totalTimeSeconds)}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-primary)' }}>
                      {test.score} / {test.maxScore}
                    </div>
                  </div>

                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      setSelectedTestId(test.id);
                      setViewMode('RESULTS');
                    }}
                  >
                    Review
                  </Button>

                  <IconButton
                    icon={<Trash2 size={15} />}
                    label="Delete test record"
                    size="sm"
                    onClick={() => setTestToDelete(test)}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* DELETE TEST CONFIRMATION MODAL */}
      <Modal
        isOpen={Boolean(testToDelete)}
        onClose={() => setTestToDelete(null)}
        title="Delete Test Record?"
        footer={
          <div style={{ display: 'flex', gap: 8 }}>
            <Button variant="secondary" size="sm" onClick={() => setTestToDelete(null)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={() => {
                if (testToDelete) {
                  deleteMockTestAction(testToDelete.id);
                  showToast('Test Deleted', 'Mock test record deleted.', 'info');
                  setTestToDelete(null);
                }
              }}
            >
              Delete Record
            </Button>
          </div>
        }
      >
        <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
          <div
            style={{
              width: 38,
              height: 38,
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
              Are you sure you want to delete this {testToDelete?.testDay} test record?
            </p>
            <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)' }}>
              This action cannot be undone.
            </p>
          </div>
        </div>
      </Modal>
    </div>
  );
};

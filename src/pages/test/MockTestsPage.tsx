import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  CheckSquare,
  Plus,
  Play,
  Clock,
  Award,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  Calendar,
  CheckCircle2,
  XCircle,
  HelpCircle,
  TrendingUp,
  Target,
  FileText,
  ChevronRight,
  ChevronLeft,
  Bookmark,
  ExternalLink,
  Flame,
  Brain,
  Zap,
} from 'lucide-react';
import { useAppStore } from '../../context/AppContext';
import { useToast } from '../../context/ToastContext';
import { PageHeader } from '../../components/ui/PageHeader';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Card } from '../../components/ui/Card';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Tabs } from '../../components/ui/Tabs';
import { EmptyState } from '../../components/ui/EmptyState';
import { ProgressBar } from '../../components/ui/ProgressBar';
import { ConfirmationDialog } from '../../components/ui/ConfirmationDialog';
import { ReviewSessionModal } from '../../components/review/ReviewSessionModal';
import {
  generateMockTest,
  calculateMockResults,
} from '../../services/mockTest';
import type {
  Question,
  MockTestConfig,
  MockDifficultyDistribution,
  MockQuestionOutcome,
  MockQuestionResult,
  MockTestRecord,
  MistakeCategory,
  SundaySpecialReason,
} from '../../types';

export const MockTestsPage: React.FC = () => {
  const {
    questions,
    topics,
    mistakes,
    mockTests,
    saveMockTestRecord,
    addMistake,
    sundaySpecialQueue,
    sundaySpecialTotalMinutes,
    latestWeeklyReport,
    navigateTo,
  } = useAppStore();

  const { showToast } = useToast();

  // Active Top-Level Tab
  const [activeTab, setActiveTab] = useState<'saturday-mock' | 'sunday-special' | 'weekly-report' | 'history'>('saturday-mock');

  // Generator Config Modal State
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [mockTitle, setMockTitle] = useState('Saturday Timed Assessment Mock');
  const [questionCount, setQuestionCount] = useState<number>(4);
  const [timeLimitMinutes, setTimeLimitMinutes] = useState<number>(60);
  const [difficultyDistribution, setDifficultyDistribution] = useState<MockDifficultyDistribution>('Balanced');
  const [selectedTopicId, setSelectedTopicId] = useState<string>('All');
  const [selectedPattern, setSelectedPattern] = useState<string>('All');

  // Active Mock Test Execution State
  const [activeTest, setActiveTest] = useState<{
    config: MockTestConfig;
    questions: Question[];
    currentIndex: number;
    results: Record<string, MockQuestionResult>;
    scratchpads: Record<string, string>;
    flagged: Record<string, boolean>;
    timeRemainingSeconds: number;
    totalSecondsAllocated: number;
  } | null>(null);

  // Completed Test Results Modal/View
  const [completedReport, setCompletedReport] = useState<MockTestRecord | null>(null);
  const [viewHistoryRecord, setViewHistoryRecord] = useState<MockTestRecord | null>(null);

  // Submit Confirmation Dialog
  const [isSubmitConfirmOpen, setIsSubmitConfirmOpen] = useState(false);

  // In-Test Mistake Logging Modal State
  const [mistakeModalState, setMistakeModalState] = useState<{
    isOpen: boolean;
    questionId: string;
    questionTitle: string;
    category: MistakeCategory;
    notes: string;
  }>({
    isOpen: false,
    questionId: '',
    questionTitle: '',
    category: 'Didn\'t recognize pattern',
    notes: '',
  });

  // Sunday Special Revision Filter & Launcher
  const [sundayFilterReason, setSundayFilterReason] = useState<string>('All');
  const [isSundayReviewActive, setIsSundayReviewActive] = useState(false);

  // Timer Ref for Countdown
  const timerRef = useRef<number | null>(null);

  // --------------------------------------------------------------------------
  // LIVE TIMER TICKER
  // --------------------------------------------------------------------------
  useEffect(() => {
    if (activeTest && activeTest.timeRemainingSeconds > 0) {
      timerRef.current = window.setInterval(() => {
        setActiveTest((prev) => {
          if (!prev) return null;
          if (prev.timeRemainingSeconds <= 1) {
            // Auto-submit when time expires
            handleAutoSubmitOnTimeout(prev);
            return null;
          }
          return {
            ...prev,
            timeRemainingSeconds: prev.timeRemainingSeconds - 1,
          };
        });
      }, 1000);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [activeTest?.timeRemainingSeconds]);

  // Format timer string MM:SS
  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // --------------------------------------------------------------------------
  // GENERATE & LAUNCH MOCK TEST
  // --------------------------------------------------------------------------
  const handleLaunchMock = (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    const config: MockTestConfig = {
      title: mockTitle.trim() || 'Saturday Timed Assessment Mock',
      questionCount,
      timeLimitMinutes,
      difficultyDistribution,
      selectedTopicIds: selectedTopicId === 'All' ? [] : [selectedTopicId],
      selectedPatterns: selectedPattern === 'All' ? [] : [selectedPattern],
    };

    const { selectedQuestions, warningMessage } = generateMockTest(
      questions,
      config,
      mistakes
    );

    if (selectedQuestions.length === 0) {
      showToast(
        'Insufficient Personal Questions',
        'Add questions to your personal database or broaden filters to generate a mock test.',
        'error'
      );
      return;
    }

    if (warningMessage) {
      showToast('Mock Test Config Note', warningMessage, 'info');
    }

    // Initialize initial result templates
    const initialResults: Record<string, MockQuestionResult> = {};
    const initialScratchpads: Record<string, string> = {};

    selectedQuestions.forEach((q) => {
      initialResults[q.id] = {
        questionId: q.id,
        questionTitle: q.title,
        difficulty: q.difficulty,
        pattern: q.pattern,
        topicName: q.topicName,
        outcome: 'UNATTEMPTED',
        timeSpentSeconds: 0,
      };
      initialScratchpads[q.id] = '';
    });

    const totalSeconds = config.timeLimitMinutes * 60;

    setActiveTest({
      config,
      questions: selectedQuestions,
      currentIndex: 0,
      results: initialResults,
      scratchpads: initialScratchpads,
      flagged: {},
      timeRemainingSeconds: totalSeconds,
      totalSecondsAllocated: totalSeconds,
    });

    setIsConfigModalOpen(false);
    showToast('Mock Assessment Started', `${selectedQuestions.length} questions • ${config.timeLimitMinutes} min limit`, 'success');
  };

  // --------------------------------------------------------------------------
  // IN-TEST ACTIONS (Outcome Selection, Navigation, Mistake Logging)
  // --------------------------------------------------------------------------
  const handleSelectOutcome = (outcome: MockQuestionOutcome) => {
    if (!activeTest) return;
    const currentQ = activeTest.questions[activeTest.currentIndex];
    setActiveTest((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        results: {
          ...prev.results,
          [currentQ.id]: {
            ...prev.results[currentQ.id],
            outcome,
          },
        },
      };
    });
  };

  const handleUpdateScratchpad = (text: string) => {
    if (!activeTest) return;
    const currentQ = activeTest.questions[activeTest.currentIndex];
    setActiveTest((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        scratchpads: {
          ...prev.scratchpads,
          [currentQ.id]: text,
        },
      };
    });
  };

  const handleToggleFlag = () => {
    if (!activeTest) return;
    const currentQ = activeTest.questions[activeTest.currentIndex];
    setActiveTest((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        flagged: {
          ...prev.flagged,
          [currentQ.id]: !prev.flagged[currentQ.id],
        },
      };
    });
  };

  const handleOpenMistakeModal = (q: Question) => {
    setMistakeModalState({
      isOpen: true,
      questionId: q.id,
      questionTitle: q.title,
      category: 'Didn\'t recognize pattern',
      notes: '',
    });
  };

  const handleSaveMistake = () => {
    if (!mistakeModalState.notes.trim()) {
      showToast('Notes Required', 'Please describe what caused the mistake.', 'warning');
      return;
    }

    addMistake({
      questionId: mistakeModalState.questionId,
      questionTitle: mistakeModalState.questionTitle,
      category: mistakeModalState.category,
      notes: mistakeModalState.notes.trim(),
      isResolved: false,
    });

    if (activeTest) {
      setActiveTest((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          results: {
            ...prev.results,
            [mistakeModalState.questionId]: {
              ...prev.results[mistakeModalState.questionId],
              mistakeLogged: {
                category: mistakeModalState.category,
                notes: mistakeModalState.notes.trim(),
              },
            },
          },
        };
      });
    }

    showToast('Mistake Recorded', 'Saved into Mistake Bank for Sunday Special revision.', 'success');
    setMistakeModalState((prev) => ({ ...prev, isOpen: false, notes: '' }));
  };

  // --------------------------------------------------------------------------
  // SUBMISSION & RESULTS COMPUTATION
  // --------------------------------------------------------------------------
  const handleAutoSubmitOnTimeout = (testState: NonNullable<typeof activeTest>) => {
    const timeSpent = testState.totalSecondsAllocated;
    const resultsList = Object.values(testState.results);
    const record = calculateMockResults(testState.config, resultsList, timeSpent);

    saveMockTestRecord(record);
    setCompletedReport(record);
    setActiveTest(null);
    showToast('Time Expired!', 'Mock assessment submitted automatically.', 'info');
  };

  const handleManualSubmit = () => {
    if (!activeTest) return;
    const timeSpent = activeTest.totalSecondsAllocated - activeTest.timeRemainingSeconds;
    const resultsList = Object.values(activeTest.results);
    const record = calculateMockResults(activeTest.config, resultsList, timeSpent);

    saveMockTestRecord(record);
    setCompletedReport(record);
    setActiveTest(null);
    setIsSubmitConfirmOpen(false);
    showToast('Assessment Submitted!', `Score: ${record.score}/100 • Accuracy: ${record.accuracyPercent}%`, 'success');
  };

  // --------------------------------------------------------------------------
  // SUNDAY SPECIAL QUEUE FILTERING
  // --------------------------------------------------------------------------
  const filteredSundayItems = useMemo(() => {
    if (sundayFilterReason === 'All') return sundaySpecialQueue;
    return sundaySpecialQueue.filter((item) =>
      item.reasons.includes(sundayFilterReason as SundaySpecialReason)
    );
  }, [sundaySpecialQueue, sundayFilterReason]);

  // --------------------------------------------------------------------------
  // UNIQUE PATTERNS & TOPICS FOR FILTERS
  // --------------------------------------------------------------------------
  const availablePatterns = useMemo(() => {
    const set = new Set<string>();
    questions.forEach((q) => { if (q.pattern) set.add(q.pattern); });
    return Array.from(set);
  }, [questions]);

  // Tab Definitions
  const tabItems = [
    {
      id: 'saturday-mock',
      label: 'Saturday Mock Test',
      icon: <Target size={15} />,
      count: activeTest ? 'LIVE' : undefined,
    },
    {
      id: 'sunday-special',
      label: 'Sunday Special Revision',
      icon: <RotateCcw size={15} />,
      count: sundaySpecialQueue.length > 0 ? sundaySpecialQueue.length : undefined,
    },
    {
      id: 'weekly-report',
      label: 'Weekly Report',
      icon: <FileText size={15} />,
    },
    {
      id: 'history',
      label: 'Mock History',
      icon: <Award size={15} />,
      count: mockTests.length,
    },
  ];

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
      {/* Top Header */}
      <PageHeader
        title="Weekly Cadence & Mock Assessments"
        description="Saturday Timed Mocks, Sunday Special Revision Queues, and Data-Driven Weekly Reports."
        actions={
          <div style={{ display: 'flex', gap: 10 }}>
            {!activeTest && (
              <Button
                variant="primary"
                size="md"
                iconLeft={<Plus size={16} />}
                onClick={() => setIsConfigModalOpen(true)}
              >
                Configure Saturday Mock
              </Button>
            )}
          </div>
        }
      />

      {/* Tabs Navigation */}
      <Tabs
        items={tabItems}
        activeId={activeTab}
        onChange={(id) => setActiveTab(id as any)}
        variant="segmented"
      />

      {/* ====================================================================
          TAB 1: SATURDAY MOCK TEST (GENERATOR / ACTIVE RUNNER / RESULTS)
          ==================================================================== */}
      {activeTab === 'saturday-mock' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* A. ACTIVE TEST RUNNER */}
          {activeTest ? (
            <div className="mock-runner-card">
              {/* Runner Top Bar */}
              <div className="mock-runner-header">
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)' }}>
                      {activeTest.config.title}
                    </h2>
                    <Badge variant="warning">TIMED RUN</Badge>
                  </div>
                  <p style={{ fontSize: '12.5px', color: 'var(--text-muted)' }}>
                    Question {activeTest.currentIndex + 1} of {activeTest.questions.length} • Strict Personal Assessment
                  </p>
                </div>

                {/* Live Countdown Timer */}
                <div
                  className={`mock-timer-display ${
                    activeTest.timeRemainingSeconds < 180
                      ? 'mock-timer-danger'
                      : activeTest.timeRemainingSeconds < 600
                      ? 'mock-timer-warning'
                      : 'mock-timer-normal'
                  }`}
                >
                  <Clock size={16} />
                  <span>{formatTimer(activeTest.timeRemainingSeconds)}</span>
                </div>

                {/* Question Selector Palette */}
                <div className="mock-palette">
                  {activeTest.questions.map((q, idx) => {
                    const res = activeTest.results[q.id];
                    const isCurrent = idx === activeTest.currentIndex;
                    let outcomeClass = '';
                    if (res.outcome === 'SOLVED_CLEANLY') outcomeClass = 'solved';
                    else if (res.outcome === 'SOLVED_WITH_HINTS' || res.outcome === 'STRUGGLED_BUGGY')
                      outcomeClass = 'partial';
                    else if (res.outcome === 'COULD_NOT_SOLVE') outcomeClass = 'unsolved';

                    return (
                      <button
                        key={q.id}
                        className={`mock-palette-item ${isCurrent ? 'active' : ''} ${outcomeClass}`}
                        onClick={() =>
                          setActiveTest((prev) => (prev ? { ...prev, currentIndex: idx } : null))
                        }
                        title={`Q${idx + 1}: ${q.title} (${res.outcome})`}
                      >
                        Q{idx + 1}
                      </button>
                    );
                  })}
                </div>

                {/* Submit Test Button */}
                <Button
                  variant="primary"
                  size="md"
                  iconLeft={<CheckCircle2 size={16} />}
                  onClick={() => setIsSubmitConfirmOpen(true)}
                >
                  Submit Mock
                </Button>
              </div>

              {/* Runner Question Body */}
              {(() => {
                const currentQuestion = activeTest.questions[activeTest.currentIndex];
                const currentResult = activeTest.results[currentQuestion.id];
                const currentScratchpad = activeTest.scratchpads[currentQuestion.id] || '';

                return (
                  <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: 20 }}>
                    {/* Question Header & Badges */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 14 }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                          <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-primary)' }}>
                            PROBLEM {activeTest.currentIndex + 1}
                          </span>
                          <Badge
                            variant={
                              currentQuestion.difficulty === 'Hard'
                                ? 'danger'
                                : currentQuestion.difficulty === 'Medium'
                                ? 'warning'
                                : 'success'
                            }
                          >
                            {currentQuestion.difficulty}
                          </Badge>
                          <Badge variant="purple">{currentQuestion.pattern}</Badge>
                          <Badge variant="default">{currentQuestion.topicName}</Badge>
                        </div>
                        <h3 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)' }}>
                          {currentQuestion.title}
                        </h3>
                      </div>

                      <div style={{ display: 'flex', gap: 8 }}>
                        {currentQuestion.url && (
                          <a
                            href={currentQuestion.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ textDecoration: 'none' }}
                          >
                            <Button variant="secondary" size="sm" iconLeft={<ExternalLink size={14} />}>
                              Open Problem
                            </Button>
                          </a>
                        )}
                        <Button
                          variant={activeTest.flagged[currentQuestion.id] ? 'primary' : 'secondary'}
                          size="sm"
                          iconLeft={<Bookmark size={14} />}
                          onClick={handleToggleFlag}
                        >
                          {activeTest.flagged[currentQuestion.id] ? 'Flagged' : 'Flag'}
                        </Button>
                      </div>
                    </div>

                    {/* Notes & Solution Approach Workspace */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 18 }}>
                      {/* Left: Problem Details & Notes */}
                      <div
                        style={{
                          padding: '16px',
                          background: 'var(--bg-subtle)',
                          borderRadius: 'var(--radius-lg)',
                          border: '1px solid var(--border-subtle)',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 12,
                        }}
                      >
                        <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                          Personal Context & Notes
                        </span>
                        <p style={{ fontSize: '13.5px', lineHeight: 1.6, color: 'var(--text-primary)', whiteSpace: 'pre-line' }}>
                          {currentQuestion.notes || 'No problem notes recorded yet. Solve independently from algorithmic principles.'}
                        </p>

                        {currentQuestion.importantInsight && (
                          <div
                            style={{
                              padding: '10px 14px',
                              borderRadius: 'var(--radius-md)',
                              background: 'rgba(99, 102, 241, 0.08)',
                              borderLeft: '3px solid var(--color-primary)',
                              fontSize: '12.5px',
                              color: 'var(--text-secondary)',
                            }}
                          >
                            <strong>Core Invariant / Insight:</strong> {currentQuestion.importantInsight}
                          </div>
                        )}
                      </div>

                      {/* Right: Mock Scratchpad */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                            Active Recall Scratchpad (Pseudocode / Invariants / Complexity)
                          </span>
                          <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                            Auto-saved for session review
                          </span>
                        </div>
                        <textarea
                          className="mock-scratchpad"
                          placeholder="// Work through time/space complexity, pointer state, and edge cases here..."
                          value={currentScratchpad}
                          onChange={(e) => handleUpdateScratchpad(e.target.value)}
                        />
                      </div>
                    </div>

                    {/* Assessment Outcome Selector */}
                    <div
                      style={{
                        padding: '16px 20px',
                        background: 'var(--bg-elevated)',
                        borderRadius: 'var(--radius-lg)',
                        border: '1px solid var(--border-subtle)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 14,
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
                        <span style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--text-primary)' }}>
                          Record Solution Performance for Q{activeTest.currentIndex + 1}:
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          iconLeft={<AlertTriangle size={14} color="var(--color-warning)" />}
                          onClick={() => handleOpenMistakeModal(currentQuestion)}
                        >
                          Log Mistake to Bank
                        </Button>
                      </div>

                      <div className="outcome-selector-grid">
                        <button
                          type="button"
                          className={`outcome-card-btn ${
                            currentResult.outcome === 'SOLVED_CLEANLY' ? 'selected-clean' : ''
                          }`}
                          onClick={() => handleSelectOutcome('SOLVED_CLEANLY')}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <CheckCircle2 size={16} color="var(--color-success)" />
                            <strong style={{ fontSize: '13px', color: 'var(--color-success)' }}>
                              Solved Cleanly (100 pts)
                            </strong>
                          </div>
                          <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                            Optimal invariant and code without hints.
                          </span>
                        </button>

                        <button
                          type="button"
                          className={`outcome-card-btn ${
                            currentResult.outcome === 'SOLVED_WITH_HINTS' ? 'selected-hints' : ''
                          }`}
                          onClick={() => handleSelectOutcome('SOLVED_WITH_HINTS')}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <HelpCircle size={16} color="var(--color-info)" />
                            <strong style={{ fontSize: '13px', color: 'var(--color-info)' }}>
                              Solved with Hints (65 pts)
                            </strong>
                          </div>
                          <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                            Required peek or slight syntax guidance.
                          </span>
                        </button>

                        <button
                          type="button"
                          className={`outcome-card-btn ${
                            currentResult.outcome === 'STRUGGLED_BUGGY' ? 'selected-struggled' : ''
                          }`}
                          onClick={() => handleSelectOutcome('STRUGGLED_BUGGY')}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <AlertTriangle size={16} color="var(--color-warning)" />
                            <strong style={{ fontSize: '13px', color: 'var(--color-warning)' }}>
                              Struggled / Buggy (35 pts)
                            </strong>
                          </div>
                          <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                            Incomplete or failed edge cases.
                          </span>
                        </button>

                        <button
                          type="button"
                          className={`outcome-card-btn ${
                            currentResult.outcome === 'COULD_NOT_SOLVE' ? 'selected-couldnot' : ''
                          }`}
                          onClick={() => handleSelectOutcome('COULD_NOT_SOLVE')}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <XCircle size={16} color="var(--color-danger)" />
                            <strong style={{ fontSize: '13px', color: 'var(--color-danger)' }}>
                              Could Not Solve (0 pts)
                            </strong>
                          </div>
                          <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                            Completely stuck / time elapsed.
                          </span>
                        </button>
                      </div>
                    </div>

                    {/* Navigation Buttons */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Button
                        variant="secondary"
                        size="md"
                        iconLeft={<ChevronLeft size={16} />}
                        disabled={activeTest.currentIndex === 0}
                        onClick={() =>
                          setActiveTest((prev) =>
                            prev ? { ...prev, currentIndex: prev.currentIndex - 1 } : null
                          )
                        }
                      >
                        Previous Question
                      </Button>

                      <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                        {
                          Object.values(activeTest.results).filter((r) => r.outcome !== 'UNATTEMPTED')
                            .length
                        }{' '}
                        of {activeTest.questions.length} answered
                      </div>

                      {activeTest.currentIndex < activeTest.questions.length - 1 ? (
                        <Button
                          variant="secondary"
                          size="md"
                          iconRight={<ChevronRight size={16} />}
                          onClick={() =>
                            setActiveTest((prev) =>
                              prev ? { ...prev, currentIndex: prev.currentIndex + 1 } : null
                            )
                          }
                        >
                          Next Question
                        </Button>
                      ) : (
                        <Button
                          variant="primary"
                          size="md"
                          iconLeft={<CheckCircle2 size={16} />}
                          onClick={() => setIsSubmitConfirmOpen(true)}
                        >
                          Submit Assessment
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })()}
            </div>
          ) : completedReport ? (
            /* B. COMPLETED ASSESSMENT RESULTS SCREEN */
            <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <Card
                title="Mock Assessment Results"
                subtitle={`Completed on ${new Date(completedReport.completedAt).toLocaleDateString()} • Time spent: ${Math.round(
                  completedReport.timeSpentSeconds / 60
                )} mins`}
                headerAction={
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => {
                      setCompletedReport(null);
                      setActiveTab('sunday-special');
                    }}
                  >
                    View Sunday Special Queue
                  </Button>
                }
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
                  {/* Score & Accuracy Banner */}
                  <div
                    style={{
                      padding: '24px',
                      background:
                        completedReport.score >= 75
                          ? 'rgba(16, 185, 129, 0.12)'
                          : completedReport.score >= 50
                          ? 'rgba(245, 158, 11, 0.12)'
                          : 'rgba(244, 63, 94, 0.12)',
                      border: `1px solid ${
                        completedReport.score >= 75
                          ? 'rgba(16, 185, 129, 0.3)'
                          : completedReport.score >= 50
                          ? 'rgba(245, 158, 11, 0.3)'
                          : 'rgba(244, 63, 94, 0.3)'
                      }`,
                      borderRadius: 'var(--radius-xl)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: 20,
                    }}
                  >
                    <div>
                      <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-muted)' }}>
                        Overall Mock Score
                      </span>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                        <span
                          style={{
                            fontSize: '44px',
                            fontWeight: 800,
                            color:
                              completedReport.score >= 75
                                ? 'var(--color-success)'
                                : completedReport.score >= 50
                                ? 'var(--color-warning)'
                                : 'var(--color-danger)',
                          }}
                        >
                          {completedReport.score}
                        </span>
                        <span style={{ fontSize: '20px', color: 'var(--text-muted)', fontWeight: 600 }}>/ 100</span>
                      </div>
                      <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: 4 }}>
                        {completedReport.score >= 75
                          ? 'Excellent performance! Optimal patterns maintained under time limits.'
                          : completedReport.score >= 50
                          ? 'Decent recall, but edge cases and speed need reinforcement.'
                          : 'Difficult session. Flagged problems have been queued for Sunday Special.'}
                      </p>
                    </div>

                    <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                      <div className="insight-tile" style={{ minWidth: 120 }}>
                        <span className="insight-tile-label">Accuracy</span>
                        <span className="insight-tile-value">{completedReport.accuracyPercent}%</span>
                      </div>
                      <div className="insight-tile" style={{ minWidth: 120 }}>
                        <span className="insight-tile-label">Solved Cleanly</span>
                        <span className="insight-tile-value">
                          {completedReport.solvedCount} / {completedReport.totalQuestions}
                        </span>
                      </div>
                      <div className="insight-tile" style={{ minWidth: 120 }}>
                        <span className="insight-tile-label">Time Taken</span>
                        <span className="insight-tile-value">
                          {Math.round(completedReport.timeSpentSeconds / 60)}m
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Difficulty & Pattern Performance Breakdown */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16 }}>
                    {/* Difficulty Breakdown */}
                    <div
                      style={{
                        padding: '16px',
                        background: 'var(--bg-subtle)',
                        borderRadius: 'var(--radius-lg)',
                        border: '1px solid var(--border-subtle)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 12,
                      }}
                    >
                      <span style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--text-primary)' }}>
                        Difficulty Performance
                      </span>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {Object.entries(completedReport.difficultyBreakdown).map(([diff, stats]) => {
                          const percent = stats.total > 0 ? Math.round((stats.solved / stats.total) * 100) : 0;
                          return (
                            <div key={diff} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px' }}>
                                <span style={{ textTransform: 'capitalize', fontWeight: 600, color: 'var(--text-secondary)' }}>
                                  {diff} ({stats.solved}/{stats.total} Solved)
                                </span>
                                <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{percent}%</span>
                              </div>
                              <ProgressBar
                                value={percent}
                                max={100}
                                size="sm"
                                variant={diff === 'hard' ? 'danger' : diff === 'medium' ? 'warning' : 'success'}
                              />
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Pattern Breakdown */}
                    <div
                      style={{
                        padding: '16px',
                        background: 'var(--bg-subtle)',
                        borderRadius: 'var(--radius-lg)',
                        border: '1px solid var(--border-subtle)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 12,
                      }}
                    >
                      <span style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--text-primary)' }}>
                        Pattern Breakdown
                      </span>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {completedReport.patternBreakdown.map((item) => (
                          <div
                            key={item.pattern}
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              padding: '6px 0',
                              borderBottom: '1px solid var(--border-subtle)',
                            }}
                          >
                            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                              {item.pattern}
                            </span>
                            <Badge variant={item.solved === item.total ? 'success' : 'warning'}>
                              {item.solved} / {item.total} Solved
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Question Review List */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>
                      Question Breakdown
                    </span>

                    {completedReport.questionResults.map((qRes, idx) => (
                      <div
                        key={qRes.questionId}
                        style={{
                          padding: '14px 18px',
                          background: 'var(--bg-subtle)',
                          borderRadius: 'var(--radius-lg)',
                          border: '1px solid var(--border-subtle)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          flexWrap: 'wrap',
                          gap: 12,
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-muted)' }}>
                            Q{idx + 1}
                          </span>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>
                                {qRes.questionTitle}
                              </span>
                              <Badge
                                variant={
                                  qRes.difficulty === 'Hard'
                                    ? 'danger'
                                    : qRes.difficulty === 'Medium'
                                    ? 'warning'
                                    : 'success'
                                }
                              >
                                {qRes.difficulty}
                              </Badge>
                              <Badge variant="purple">{qRes.pattern}</Badge>
                            </div>
                            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                              Topic: {qRes.topicName}
                            </span>
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <Badge
                            variant={
                              qRes.outcome === 'SOLVED_CLEANLY'
                                ? 'success'
                                : qRes.outcome === 'SOLVED_WITH_HINTS'
                                ? 'info'
                                : qRes.outcome === 'STRUGGLED_BUGGY'
                                ? 'warning'
                                : 'danger'
                            }
                          >
                            {qRes.outcome.replace(/_/g, ' ')}
                          </Badge>

                          {qRes.mistakeLogged && (
                            <Badge variant="danger">
                              Mistake: {qRes.mistakeLogged.category}
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Actions footer */}
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 10 }}>
                    <Button variant="secondary" size="md" onClick={() => setCompletedReport(null)}>
                      Close Assessment Report
                    </Button>
                    <Button
                      variant="primary"
                      size="md"
                      iconLeft={<RotateCcw size={16} />}
                      onClick={() => {
                        setCompletedReport(null);
                        setActiveTab('sunday-special');
                      }}
                    >
                      Start Sunday Revision Queue
                    </Button>
                  </div>
                </div>
              </Card>
            </div>
          ) : (
            /* C. SATURDAY MOCK LANDING / LAUNCH BANNER */
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {/* Feature Banner */}
              <div
                style={{
                  padding: '24px 28px',
                  background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.14) 0%, rgba(168, 85, 247, 0.10) 100%)',
                  border: '1px solid var(--border-medium)',
                  borderRadius: 'var(--radius-xl)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: 20,
                }}
              >
                <div style={{ maxWidth: 640 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <Flame size={18} color="var(--color-warning)" />
                    <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-primary)', letterSpacing: '0.5px' }}>
                      SATURDAY CADENCE ENGINE
                    </span>
                  </div>
                  <h2 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: 8 }}>
                    Saturday Timed Assessment Generator
                  </h2>
                  <p style={{ fontSize: '14px', lineHeight: 1.6, color: 'var(--text-secondary)' }}>
                    Synthesizes questions strictly from your <strong>Personal Question Database</strong>, balancing recently learned concepts, previously failed reviews, and weak patterns under timed constraints.
                  </p>
                </div>

                <Button
                  variant="primary"
                  size="lg"
                  iconLeft={<Play size={18} />}
                  onClick={() => setIsConfigModalOpen(true)}
                >
                  Generate Saturday Mock
                </Button>
              </div>

              {/* Saturday Mock Invariants Card */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
                <div className="insight-tile">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Brain size={18} color="var(--color-primary)" />
                    <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>
                      Personal Database Only
                    </span>
                  </div>
                  <p style={{ fontSize: '12.5px', color: 'var(--text-muted)', lineHeight: 1.5, marginTop: 4 }}>
                    External platform questions are never injected automatically. Tests measure recall on your own curated curriculum.
                  </p>
                </div>

                <div className="insight-tile">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Target size={18} color="var(--color-warning)" />
                    <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>
                      Adaptive Weighting
                    </span>
                  </div>
                  <p style={{ fontSize: '12.5px', color: 'var(--text-muted)', lineHeight: 1.5, marginTop: 4 }}>
                    Heuristic engine prioritizes cards with low ease factors, failed SRS logs, and unresolved mistake bank entries.
                  </p>
                </div>

                <div className="insight-tile">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Zap size={18} color="var(--color-success)" />
                    <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>
                      Seamless Sunday Bridge
                    </span>
                  </div>
                  <p style={{ fontSize: '12.5px', color: 'var(--text-muted)', lineHeight: 1.5, marginTop: 4 }}>
                    Any struggled questions or logged mistakes automatically flow into the Sunday Special Revision queue.
                  </p>
                </div>
              </div>

              {/* Recent Mocks History Snippet */}
              {mockTests.length > 0 && (
                <Card
                  title="Recent Saturday Assessments"
                  subtitle="Latest completed timed simulations"
                  headerAction={
                    <Button variant="ghost" size="sm" onClick={() => setActiveTab('history')}>
                      View All History
                    </Button>
                  }
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {mockTests.slice(0, 3).map((mock) => (
                      <div
                        key={mock.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '12px 16px',
                          background: 'var(--bg-subtle)',
                          borderRadius: 'var(--radius-md)',
                          border: '1px solid var(--border-subtle)',
                        }}
                      >
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <strong style={{ fontSize: '14px', color: 'var(--text-primary)' }}>
                              {mock.title}
                            </strong>
                            <Badge variant={mock.score >= 75 ? 'success' : mock.score >= 50 ? 'warning' : 'danger'}>
                              Score: {mock.score}/100
                            </Badge>
                          </div>
                          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                            {new Date(mock.completedAt).toLocaleDateString()} • {mock.solvedCount}/{mock.totalQuestions} Solved • {Math.round(mock.timeSpentSeconds / 60)} min
                          </span>
                        </div>

                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => setViewHistoryRecord(mock)}
                        >
                          View Report
                        </Button>
                      </div>
                    ))}
                  </div>
                </Card>
              )}
            </div>
          )}
        </div>
      )}

      {/* ====================================================================
          TAB 2: SUNDAY SPECIAL REVISION QUEUE
          ==================================================================== */}
      {activeTab === 'sunday-special' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Sunday Header Banner */}
          <div
            style={{
              padding: '24px 28px',
              background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.12) 0%, rgba(99, 102, 241, 0.12) 100%)',
              border: '1px solid var(--border-medium)',
              borderRadius: 'var(--radius-xl)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 20,
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <Sparkles size={18} color="var(--color-primary)" />
                <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-primary)' }}>
                  SUNDAY SPECIAL REVISION ENGINE
                </span>
              </div>
              <h2 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: 6 }}>
                Curated High-Impact Revision Queue
              </h2>
              <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
                Synthesized from Saturday mock mistakes, failed recall cards, weak topics, and cold questions.
              </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div
                style={{
                  padding: '8px 16px',
                  borderRadius: 'var(--radius-lg)',
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-subtle)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-end',
                }}
              >
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>
                  ESTIMATED STUDY TIME
                </span>
                <span style={{ fontSize: '18px', fontWeight: 800, color: 'var(--color-primary)' }}>
                  ~{sundaySpecialTotalMinutes} mins
                </span>
              </div>

              {sundaySpecialQueue.length > 0 && (
                <Button
                  variant="primary"
                  size="lg"
                  iconLeft={<Play size={18} />}
                  onClick={() => setIsSundayReviewActive(true)}
                >
                  Start Sunday Revision
                </Button>
              )}
            </div>
          </div>

          {/* Reason Filter Chips */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}>
              Filter Queue by Trigger:
            </span>
            {[
              'All',
              'Mock Test Mistake',
              'Frequently Failed',
              'Weak Pattern / Topic',
              'Forgotten / Cold Question',
              'High Importance / Core Invariant',
              'Recent Learning',
            ].map((reason) => (
              <button
                key={reason}
                onClick={() => setSundayFilterReason(reason)}
                style={{
                  padding: '5px 12px',
                  borderRadius: 'var(--radius-full)',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  border: '1px solid',
                  borderColor:
                    sundayFilterReason === reason ? 'var(--color-primary)' : 'var(--border-subtle)',
                  background:
                    sundayFilterReason === reason
                      ? 'var(--color-primary-subtle)'
                      : 'var(--bg-subtle)',
                  color:
                    sundayFilterReason === reason
                      ? 'var(--color-primary)'
                      : 'var(--text-secondary)',
                  transition: 'all 0.15s ease',
                }}
              >
                {reason}
              </button>
            ))}
          </div>

          {/* Queue List */}
          {filteredSundayItems.length === 0 ? (
            <EmptyState
              icon={<CheckSquare size={24} />}
              title="No questions currently in Sunday Special Queue"
              description="Your recall rates are solid! When you struggle with questions during weekly mocks or SRS reviews, they appear here automatically."
              actionText="Browse Question Database"
              onAction={() => navigateTo('learn/questions')}
            />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {filteredSundayItems.map((item) => (
                <div key={item.question.id} className="sunday-special-card">
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>
                        {item.question.title}
                      </span>
                      <Badge
                        variant={
                          item.question.difficulty === 'Hard'
                            ? 'danger'
                            : item.question.difficulty === 'Medium'
                            ? 'warning'
                            : 'success'
                        }
                      >
                        {item.question.difficulty}
                      </Badge>
                      <Badge variant="purple">{item.question.pattern}</Badge>
                      <Badge variant="default">{item.question.topicName}</Badge>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      {item.reasons.map((r) => (
                        <Badge
                          key={r}
                          variant={
                            r === 'Mock Test Mistake'
                              ? 'danger'
                              : r === 'Frequently Failed'
                              ? 'warning'
                              : r === 'Forgotten / Cold Question'
                              ? 'info'
                              : 'purple'
                          }
                        >
                          {r}
                        </Badge>
                      ))}
                      <span style={{ fontSize: '12px', color: 'var(--text-muted)', marginLeft: 6 }}>
                        • Est: ~{item.estimatedMinutes} min
                      </span>
                    </div>

                    {item.question.importantInsight && (
                      <p style={{ fontSize: '12.5px', color: 'var(--text-muted)', margin: 0, fontStyle: 'italic' }}>
                        Insight: "{item.question.importantInsight}"
                      </p>
                    )}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => navigateTo('review/due-today')}
                    >
                      Review in SRS
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ====================================================================
          TAB 3: SUNDAY WEEKLY REPORT (DATA-DRIVEN & VERIFIED)
          ==================================================================== */}
      {activeTab === 'weekly-report' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Report Header Card */}
          <div
            style={{
              padding: '24px 28px',
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-medium)',
              borderRadius: 'var(--radius-xl)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 16,
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <Calendar size={16} color="var(--color-primary)" />
                <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-primary)' }}>
                  {latestWeeklyReport.weekLabel}
                </span>
                <Badge variant="default">Verified Data</Badge>
              </div>
              <h2 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                Weekly Learning & Assessment Report
              </h2>
            </div>

            <Button
              variant="secondary"
              size="sm"
              iconLeft={<RotateCcw size={14} />}
              onClick={() => showToast('Report Updated', 'Refreshed with latest weekly metrics.', 'info')}
            >
              Refresh Metrics
            </Button>
          </div>

          {/* Key Metric Tiles Grid */}
          <div className="weekly-metric-grid">
            <div className="weekly-metric-card">
              <span className="weekly-metric-sub">Questions Added</span>
              <span className="weekly-metric-val">{latestWeeklyReport.questionsAddedCount}</span>
              <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>Curriculum expansion</span>
            </div>

            <div className="weekly-metric-card">
              <span className="weekly-metric-sub">Questions Reviewed</span>
              <span className="weekly-metric-val">{latestWeeklyReport.questionsReviewedCount}</span>
              <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>Active recall cards</span>
            </div>

            <div className="weekly-metric-card">
              <span className="weekly-metric-sub">Questions Mastered</span>
              <span className="weekly-metric-val" style={{ color: 'var(--color-success)' }}>
                {latestWeeklyReport.questionsMasteredCount}
              </span>
              <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>Reached Level 5</span>
            </div>

            <div className="weekly-metric-card">
              <span className="weekly-metric-sub">Mock Test Benchmark</span>
              <span
                className="weekly-metric-val"
                style={{
                  color:
                    latestWeeklyReport.mockTestScore !== null && latestWeeklyReport.mockTestScore >= 75
                      ? 'var(--color-success)'
                      : 'var(--color-warning)',
                }}
              >
                {latestWeeklyReport.mockTestScore !== null ? `${latestWeeklyReport.mockTestScore}%` : 'N/A'}
              </span>
              <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                {latestWeeklyReport.mockTestsCompletedCount} mock{latestWeeklyReport.mockTestsCompletedCount === 1 ? '' : 's'} this week
              </span>
            </div>

            <div className="weekly-metric-card">
              <span className="weekly-metric-sub">Study Time</span>
              <span className="weekly-metric-val">{latestWeeklyReport.totalStudyMinutes}m</span>
              <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>SRS + Mock sessions</span>
            </div>

            <div className="weekly-metric-card">
              <span className="weekly-metric-sub">Revision Accuracy</span>
              <span
                className="weekly-metric-val"
                style={{
                  color:
                    latestWeeklyReport.revisionAccuracyPercent !== null &&
                    latestWeeklyReport.revisionAccuracyPercent >= 80
                      ? 'var(--color-success)'
                      : 'var(--color-primary)',
                }}
              >
                {latestWeeklyReport.revisionAccuracyPercent !== null
                  ? `${latestWeeklyReport.revisionAccuracyPercent}%`
                  : 'N/A'}
              </span>
              <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>Good / Easy recall rate</span>
            </div>
          </div>

          {/* Two-Column: Weak Areas & Improvement Trends */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 18 }}>
            {/* Weak Areas Breakdown */}
            <Card
              title="Measured Weak Areas"
              subtitle="Patterns and error categories with failed reviews or logged mistakes"
            >
              {latestWeeklyReport.weakAreas.length === 0 ? (
                <div style={{ padding: '16px 0', fontSize: '13px', color: 'var(--text-muted)' }}>
                  No significant weak areas detected this week!
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {latestWeeklyReport.weakAreas.map((area) => (
                    <div
                      key={area.name}
                      style={{
                        padding: '12px 14px',
                        background: 'var(--bg-subtle)',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--border-subtle)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <strong style={{ fontSize: '13.5px', color: 'var(--text-primary)' }}>
                            {area.name}
                          </strong>
                          <Badge variant={area.type === 'Pattern' ? 'purple' : 'danger'}>
                            {area.type}
                          </Badge>
                        </div>
                        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                          {area.reason}
                        </span>
                      </div>

                      <Badge variant="warning">{area.errorCount} fails</Badge>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {/* Improvement Trends */}
            <Card
              title="Improvement Trends"
              subtitle="Progress trends measured against historical baseline"
            >
              {latestWeeklyReport.improvementTrends.length === 0 ? (
                <div style={{ padding: '16px 0', fontSize: '13px', color: 'var(--text-muted)' }}>
                  Complete more reviews and mocks to build weekly trends.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {latestWeeklyReport.improvementTrends.map((trend, idx) => (
                    <div
                      key={idx}
                      style={{
                        padding: '12px 14px',
                        background: 'var(--bg-subtle)',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--border-subtle)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <strong style={{ fontSize: '13.5px', color: 'var(--text-primary)' }}>
                            {trend.label}
                          </strong>
                          <Badge
                            variant={
                              trend.status === 'improving'
                                ? 'success'
                                : trend.status === 'steady'
                                ? 'info'
                                : 'warning'
                            }
                          >
                            {trend.status === 'improving' ? 'Improving' : trend.status === 'steady' ? 'Steady' : 'Needs Attention'}
                          </Badge>
                        </div>
                        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                          {trend.description}
                        </span>
                      </div>

                      <TrendingUp
                        size={16}
                        color={
                          trend.status === 'improving'
                            ? 'var(--color-success)'
                            : trend.status === 'steady'
                            ? 'var(--color-info)'
                            : 'var(--color-warning)'
                        }
                      />
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>

          {/* NEXT WEEK FOCUS SECTION (Strictly Data-Backed) */}
          <Card
            title="Next Week Focus"
            subtitle="Actionable, prioritized agenda derived strictly from measured performance"
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {latestWeeklyReport.nextWeekFocusRecommendations.map((rec, idx) => (
                <div
                  key={idx}
                  style={{
                    padding: '14px 16px',
                    background: 'rgba(99, 102, 241, 0.08)',
                    borderLeft: '4px solid var(--color-primary)',
                    borderRadius: 'var(--radius-md)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                  }}
                >
                  <Target size={18} color="var(--color-primary)" style={{ flexShrink: 0 }} />
                  <span style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--text-primary)' }}>
                    {rec}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* ====================================================================
          TAB 4: MOCK HISTORY LOG
          ==================================================================== */}
      {activeTab === 'history' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {mockTests.length === 0 ? (
            <EmptyState
              icon={<CheckSquare size={24} />}
              title="No mock assessment history"
              description="Complete Saturday mock tests to build an archive of timed performance benchmarks."
              actionText="Configure Saturday Mock"
              onAction={() => setIsConfigModalOpen(true)}
            />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {mockTests.map((mock) => (
                <div
                  key={mock.id}
                  style={{
                    padding: '18px 20px',
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-lg)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: 16,
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <strong style={{ fontSize: '15px', color: 'var(--text-primary)' }}>
                        {mock.title}
                      </strong>
                      <Badge variant={mock.score >= 75 ? 'success' : mock.score >= 50 ? 'warning' : 'danger'}>
                        Score: {mock.score}/100
                      </Badge>
                      <Badge variant="info">Accuracy: {mock.accuracyPercent}%</Badge>
                    </div>
                    <span style={{ fontSize: '12.5px', color: 'var(--text-muted)' }}>
                      Completed on {new Date(mock.completedAt).toLocaleDateString()} • {mock.solvedCount}/{mock.totalQuestions} Solved Cleanly • {Math.round(mock.timeSpentSeconds / 60)}m time spent
                    </span>
                  </div>

                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setViewHistoryRecord(mock)}
                  >
                    View Breakdown
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ====================================================================
          CONFIG MODAL: CONFIGURE SATURDAY MOCK TEST
          ==================================================================== */}
      <Modal
        isOpen={isConfigModalOpen}
        onClose={() => setIsConfigModalOpen(false)}
        title="Configure Saturday Mock Assessment"
        subtitle="Generate a timed practice set from your personal question database."
        maxWidth="560px"
        footer={
          <div style={{ display: 'flex', gap: 10 }}>
            <Button variant="secondary" size="sm" onClick={() => setIsConfigModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" iconLeft={<Play size={15} />} onClick={handleLaunchMock}>
              Start Assessment
            </Button>
          </div>
        }
      >
        <form onSubmit={handleLaunchMock} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Input
            label="Assessment Title"
            value={mockTitle}
            onChange={(e) => setMockTitle(e.target.value)}
            placeholder="e.g. Saturday Timed Assessment Mock #2"
            required
          />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <Select
              label="Question Count"
              value={questionCount.toString()}
              onChange={(e) => setQuestionCount(Number(e.target.value))}
              options={[
                { value: '2', label: '2 Questions (Quick Sprint)' },
                { value: '3', label: '3 Questions (Standard Mock)' },
                { value: '4', label: '4 Questions (Full Simulation)' },
                { value: '5', label: '5 Questions (Intensive)' },
              ]}
            />

            <Select
              label="Time Limit"
              value={timeLimitMinutes.toString()}
              onChange={(e) => setTimeLimitMinutes(Number(e.target.value))}
              options={[
                { value: '30', label: '30 Minutes' },
                { value: '45', label: '45 Minutes' },
                { value: '60', label: '60 Minutes (Standard)' },
                { value: '90', label: '90 Minutes' },
                { value: '120', label: '120 Minutes' },
              ]}
            />
          </div>

          <Select
            label="Difficulty Distribution"
            value={difficultyDistribution}
            onChange={(e) => setDifficultyDistribution(e.target.value as MockDifficultyDistribution)}
            options={[
              { value: 'Balanced', label: 'Balanced (1 Easy, 2 Medium, 1 Hard)' },
              { value: 'Mostly Medium', label: 'Mostly Medium (Focus on core interview bars)' },
              { value: 'Hard Heavy', label: 'Hard Heavy (Competitive / High bar)' },
              { value: 'All Difficulties', label: 'All Difficulties (Rank by weakest recall)' },
            ]}
          />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <Select
              label="Topic Filter"
              value={selectedTopicId}
              onChange={(e) => setSelectedTopicId(e.target.value)}
              options={[
                { value: 'All', label: 'All Topics (Mixed Assessment)' },
                ...topics.map((t) => ({ value: t.id, label: t.name })),
              ]}
            />

            <Select
              label="Pattern Filter"
              value={selectedPattern}
              onChange={(e) => setSelectedPattern(e.target.value)}
              options={[
                { value: 'All', label: 'All Patterns' },
                ...availablePatterns.map((p) => ({ value: p, label: p })),
              ]}
            />
          </div>
        </form>
      </Modal>

      {/* ====================================================================
          SUBMIT CONFIRMATION DIALOG
          ==================================================================== */}
      <ConfirmationDialog
        isOpen={isSubmitConfirmOpen}
        title="Submit Mock Assessment?"
        description={`You have answered ${
          activeTest
            ? Object.values(activeTest.results).filter((r) => r.outcome !== 'UNATTEMPTED').length
            : 0
        } of ${activeTest?.questions.length || 0} questions. Are you ready to finalize your score?`}
        confirmText="Yes, Submit Test"
        cancelText="Continue Test"
        isDangerous={false}
        onConfirm={handleManualSubmit}
        onCancel={() => setIsSubmitConfirmOpen(false)}
      />

      {/* ====================================================================
          IN-TEST MISTAKE BANK MODAL
          ==================================================================== */}
      <Modal
        isOpen={mistakeModalState.isOpen}
        onClose={() => setMistakeModalState((prev) => ({ ...prev, isOpen: false }))}
        title="Log Mistake into Mistake Bank"
        subtitle={`Problem: ${mistakeModalState.questionTitle}`}
        footer={
          <div style={{ display: 'flex', gap: 8 }}>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setMistakeModalState((prev) => ({ ...prev, isOpen: false }))}
            >
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={handleSaveMistake}>
              Save Mistake
            </Button>
          </div>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Select
            label="Root Cause Category"
            value={mistakeModalState.category}
            onChange={(e) =>
              setMistakeModalState((prev) => ({ ...prev, category: e.target.value as MistakeCategory }))
            }
            options={[
              { value: "Didn't understand problem", label: "Didn't understand problem" },
              { value: "Didn't recognize pattern", label: "Didn't recognize pattern" },
              { value: "Concept gap", label: "Concept gap" },
              { value: "Logic error", label: "Logic error" },
              { value: "Coding error", label: "Coding error" },
              { value: "Edge case", label: "Edge case" },
              { value: "Complexity mistake", label: "Complexity mistake" },
              { value: "Time pressure", label: "Time pressure" },
              { value: "Forgot technique", label: "Forgot technique" },
              { value: "Other", label: "Other" },
            ]}
          />

          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: 6 }}>
              What went wrong? (Notes / Correct Invariant)
            </label>
            <textarea
              className="mock-scratchpad"
              style={{ minHeight: 90 }}
              placeholder="e.g. Failed to handle duplicate characters in the sliding window hash count..."
              value={mistakeModalState.notes}
              onChange={(e) => setMistakeModalState((prev) => ({ ...prev, notes: e.target.value }))}
            />
          </div>
        </div>
      </Modal>

      {/* ====================================================================
          HISTORICAL REPORT DETAILS MODAL
          ==================================================================== */}
      {viewHistoryRecord && (
        <Modal
          isOpen={true}
          onClose={() => setViewHistoryRecord(null)}
          title={viewHistoryRecord.title}
          subtitle={`Completed on ${new Date(viewHistoryRecord.completedAt).toLocaleDateString()} • Score: ${viewHistoryRecord.score}/100`}
          maxWidth="640px"
          footer={
            <Button variant="secondary" size="sm" onClick={() => setViewHistoryRecord(null)}>
              Close
            </Button>
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <div className="insight-tile" style={{ flex: 1 }}>
                <span className="insight-tile-label">Score</span>
                <span className="insight-tile-value">{viewHistoryRecord.score}/100</span>
              </div>
              <div className="insight-tile" style={{ flex: 1 }}>
                <span className="insight-tile-label">Accuracy</span>
                <span className="insight-tile-value">{viewHistoryRecord.accuracyPercent}%</span>
              </div>
              <div className="insight-tile" style={{ flex: 1 }}>
                <span className="insight-tile-label">Time Spent</span>
                <span className="insight-tile-value">
                  {Math.round(viewHistoryRecord.timeSpentSeconds / 60)}m
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <span style={{ fontSize: '13px', fontWeight: 700 }}>Question Results</span>
              {viewHistoryRecord.questionResults.map((qr, i) => (
                <div
                  key={i}
                  style={{
                    padding: '10px 14px',
                    background: 'var(--bg-subtle)',
                    borderRadius: 'var(--radius-md)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div>
                    <span style={{ fontSize: '13px', fontWeight: 600 }}>{qr.questionTitle}</span>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block' }}>
                      {qr.difficulty} • {qr.pattern}
                    </span>
                  </div>
                  <Badge
                    variant={
                      qr.outcome === 'SOLVED_CLEANLY'
                        ? 'success'
                        : qr.outcome === 'SOLVED_WITH_HINTS'
                        ? 'info'
                        : qr.outcome === 'STRUGGLED_BUGGY'
                        ? 'warning'
                        : 'danger'
                    }
                  >
                    {qr.outcome.replace(/_/g, ' ')}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        </Modal>
      )}

      {/* ====================================================================
          SUNDAY SPECIAL ACTIVE REVIEW SESSION MODAL
          ==================================================================== */}
      {isSundayReviewActive && (
        <ReviewSessionModal
          isOpen={true}
          onClose={() => setIsSundayReviewActive(false)}
          initialQuestions={filteredSundayItems.map((item) => item.question)}
        />
      )}
    </div>
  );
};

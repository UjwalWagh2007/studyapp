import React, { useState, useMemo } from 'react';
import {
  Target,
  Plus,
  Play,
  Pause,
  Square,
  Flame,
  Trophy,
  Clock,
  CheckCircle2,
  Edit2,
  Trash2,
  BookOpen,
  Repeat,
  Zap,
} from 'lucide-react';
import { useAppStore } from '../context/AppContext';
import { useToast } from '../context/ToastContext';
import { PageHeader } from '../components/ui/PageHeader';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Card } from '../components/ui/Card';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { ProgressBar } from '../components/ui/ProgressBar';
import { EmptyState } from '../components/ui/EmptyState';
import { ConfirmationDialog } from '../components/ui/ConfirmationDialog';
import { calculateGoalProgress } from '../services/goals';
import type {
  StudyGoal,
  GoalHorizon,
  GoalType,
  StudyActivityType,
} from '../types';

export const GoalsPage: React.FC = () => {
  const {
    goals,
    addGoal,
    updateGoal,
    deleteGoal,
    dailyTargets,
    updateDailyTargets,
    todayMetrics,
    studySessions,
    deleteStudySession,
    streakStats,
    questions,
    topics,
    mockTests,
    activeFocusTimer,
    startFocusTimer,
    pauseFocusTimer,
    resumeFocusTimer,
    stopAndSaveFocusTimer,
    discardFocusTimer,
  } = useAppStore();

  const { showToast } = useToast();

  // Active Horizon Filter for Goals
  const [selectedHorizon, setSelectedHorizon] = useState<string>('ALL');

  // Add / Edit Goal Modal State
  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
  const [editingGoalId, setEditingGoalId] = useState<string | null>(null);
  const [goalTitle, setGoalTitle] = useState('');
  const [goalDescription, setGoalDescription] = useState('');
  const [goalHorizon, setGoalHorizon] = useState<GoalHorizon>('MONTHLY');
  const [goalType, setGoalType] = useState<GoalType>('DSA_QUESTIONS');
  const [goalTargetValue, setGoalTargetValue] = useState<number>(30);
  const [goalUnit, setGoalUnit] = useState('questions');
  const [goalDeadline, setGoalDeadline] = useState('');
  const [goalAutoTrack, setGoalAutoTrack] = useState(true);
  const [goalManualValue, setGoalManualValue] = useState<number>(0);

  // Edit Daily Targets Modal State
  const [isTargetsModalOpen, setIsTargetsModalOpen] = useState(false);
  const [tempNewQuestions, setTempNewQuestions] = useState(dailyTargets.newQuestionsTarget);
  const [tempRevisions, setTempRevisions] = useState(dailyTargets.revisionsTarget);
  const [tempStudyMinutes, setTempStudyMinutes] = useState(dailyTargets.studyTimeTargetMinutes);

  // Focus Timer Setup State
  const [timerTopicId, setTimerTopicId] = useState<string>('');
  const [timerActivity, setTimerActivity] = useState<StudyActivityType>('Problem Solving');
  const [stopNotesModalOpen, setStopNotesModalOpen] = useState(false);
  const [sessionNotes, setSessionNotes] = useState('');

  // Delete Confirmation Dialog State
  const [deleteDialogState, setDeleteDialogState] = useState<{
    isOpen: boolean;
    type: 'goal' | 'session';
    id: string;
    title: string;
  }>({
    isOpen: false,
    type: 'goal',
    id: '',
    title: '',
  });

  // --------------------------------------------------------------------------
  // FORMAT SECONDS TO HH:MM:SS
  // --------------------------------------------------------------------------
  const formatTimerClock = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs
      .toString()
      .padStart(2, '0')}`;
  };

  // --------------------------------------------------------------------------
  // GOALS FILTERING & PROGRESS COMPUTATION
  // --------------------------------------------------------------------------
  const computedGoals = useMemo(() => {
    return goals.map((goal) => {
      const progress = calculateGoalProgress(goal, questions, studySessions, mockTests);
      return {
        ...goal,
        computedCurrentValue: progress.currentValue,
        progressPercent: progress.progressPercent,
        isCompleted: progress.isCompleted,
      };
    });
  }, [goals, questions, studySessions, mockTests]);

  const filteredGoals = useMemo(() => {
    if (selectedHorizon === 'ALL') return computedGoals;
    return computedGoals.filter((g) => g.horizon === selectedHorizon);
  }, [computedGoals, selectedHorizon]);

  // Horizon Color helper
  const getHorizonBadgeVariant = (horizon: GoalHorizon) => {
    switch (horizon) {
      case 'DAILY':
        return 'success';
      case 'WEEKLY':
        return 'info';
      case 'MONTHLY':
        return 'purple';
      case 'YEARLY':
        return 'warning';
      case 'LONG_TERM':
        return 'default';
      default:
        return 'default';
    }
  };

  // --------------------------------------------------------------------------
  // CREATE / EDIT GOAL HANDLER
  // --------------------------------------------------------------------------
  const handleOpenAddGoal = () => {
    setEditingGoalId(null);
    setGoalTitle('');
    setGoalDescription('');
    setGoalHorizon('MONTHLY');
    setGoalType('DSA_QUESTIONS');
    setGoalTargetValue(30);
    setGoalUnit('questions');
    setGoalDeadline('');
    setGoalAutoTrack(true);
    setGoalManualValue(0);
    setIsGoalModalOpen(true);
  };

  const handleOpenEditGoal = (goal: StudyGoal) => {
    setEditingGoalId(goal.id);
    setGoalTitle(goal.title);
    setGoalDescription(goal.description || '');
    setGoalHorizon(goal.horizon);
    setGoalType(goal.type);
    setGoalTargetValue(goal.targetValue);
    setGoalUnit(goal.unit);
    setGoalDeadline(goal.deadline || '');
    setGoalAutoTrack(goal.autoTrack);
    setGoalManualValue(goal.currentValue || 0);
    setIsGoalModalOpen(true);
  };

  const handleSaveGoal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!goalTitle.trim()) return;

    if (editingGoalId) {
      updateGoal(editingGoalId, {
        title: goalTitle.trim(),
        description: goalDescription.trim(),
        horizon: goalHorizon,
        type: goalType,
        targetValue: Number(goalTargetValue),
        unit: goalUnit.trim() || 'units',
        deadline: goalDeadline || undefined,
        autoTrack: goalAutoTrack,
        currentValue: goalAutoTrack ? undefined : Number(goalManualValue),
      });
      showToast('Goal Updated', `"${goalTitle}" changes saved.`, 'success');
    } else {
      addGoal({
        title: goalTitle.trim(),
        description: goalDescription.trim(),
        horizon: goalHorizon,
        type: goalType,
        targetValue: Number(goalTargetValue),
        unit: goalUnit.trim() || 'units',
        deadline: goalDeadline || undefined,
        autoTrack: goalAutoTrack,
        currentValue: goalAutoTrack ? undefined : Number(goalManualValue),
        isCompleted: false,
      });
      showToast('Goal Created', `"${goalTitle}" milestone created.`, 'success');
    }

    setIsGoalModalOpen(false);
  };

  // --------------------------------------------------------------------------
  // DAILY TARGETS HANDLER
  // --------------------------------------------------------------------------
  const handleSaveDailyTargets = (e: React.FormEvent) => {
    e.preventDefault();
    updateDailyTargets({
      newQuestionsTarget: Number(tempNewQuestions),
      revisionsTarget: Number(tempRevisions),
      studyTimeTargetMinutes: Number(tempStudyMinutes),
    });
    setIsTargetsModalOpen(false);
    showToast('Daily Targets Updated', 'Updated your daily study quotas.', 'success');
  };

  // --------------------------------------------------------------------------
  // FOCUS TIMER HANDLERS
  // --------------------------------------------------------------------------
  const handleStartTimer = () => {
    const selectedTopic = topics.find((t) => t.id === timerTopicId);
    startFocusTimer(
      timerTopicId || undefined,
      selectedTopic ? selectedTopic.name : 'General Practice',
      timerActivity
    );
    showToast('Focus Session Started', 'Study timer is actively recording your session.', 'info');
  };

  const handleConfirmStopTimer = () => {
    stopAndSaveFocusTimer(sessionNotes.trim() || undefined);
    setStopNotesModalOpen(false);
    setSessionNotes('');
    showToast('Session Logged', 'Focus study session saved to history and streak metrics.', 'success');
  };

  // Calculate overall Today's Target progress %
  const totalTargetPoints =
    dailyTargets.newQuestionsTarget + dailyTargets.revisionsTarget + dailyTargets.studyTimeTargetMinutes;
  const completedTargetPoints =
    todayMetrics.newQuestionsCompleted +
    todayMetrics.revisionsCompleted +
    todayMetrics.studyTimeCompletedMinutes;
  const todayTargetPercent =
    totalTargetPoints > 0 ? Math.min(100, Math.round((completedTargetPoints / totalTargetPoints) * 100)) : 0;

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Page Header */}
      <PageHeader
        title="Goals, Consistency & Focus Engine"
        description="Multi-horizon targets, automated progress tracking, focus study timer, and meaningful streak metrics."
        actions={
          <div style={{ display: 'flex', gap: 10 }}>
            <Button
              variant="secondary"
              size="md"
              iconLeft={<Edit2 size={15} />}
              onClick={() => {
                setTempNewQuestions(dailyTargets.newQuestionsTarget);
                setTempRevisions(dailyTargets.revisionsTarget);
                setTempStudyMinutes(dailyTargets.studyTimeTargetMinutes);
                setIsTargetsModalOpen(true);
              }}
            >
              Daily Targets
            </Button>
            <Button
              variant="primary"
              size="md"
              iconLeft={<Plus size={16} />}
              onClick={handleOpenAddGoal}
            >
              Add Goal
            </Button>
          </div>
        }
      />

      {/* ====================================================================
          SECTION 1 — TODAY'S DAILY TARGETS BANNER
          ==================================================================== */}
      <section className="daily-targets-banner">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <Zap size={18} color="var(--color-primary)" />
              <h2 style={{ fontSize: '17px', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                Today's Daily Target Execution
              </h2>
            </div>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: 0 }}>
              Auto-tracked from today's new question additions, SRS card reviews, and focus study timer sessions.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}>
              Today's Completion: <strong style={{ color: 'var(--color-primary)' }}>{todayTargetPercent}%</strong>
            </span>
            <div style={{ width: 100 }}>
              <ProgressBar value={todayTargetPercent} max={100} size="sm" variant="primary" />
            </div>
          </div>
        </div>

        {/* 3 Interactive Daily Target Metric Tiles */}
        <div className="daily-target-grid">
          {/* Tile 1: New Questions */}
          <div className="daily-target-tile">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <BookOpen size={16} color="var(--color-primary)" />
                <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
                  New Questions
                </span>
              </div>
              <Badge variant={todayMetrics.newQuestionsCompleted >= todayMetrics.newQuestionsTarget ? 'success' : 'default'}>
                {todayMetrics.newQuestionsCompleted} / {todayMetrics.newQuestionsTarget}
              </Badge>
            </div>
            <ProgressBar
              value={todayMetrics.newQuestionsCompleted}
              max={todayMetrics.newQuestionsTarget}
              size="sm"
              variant="primary"
            />
          </div>

          {/* Tile 2: Revisions */}
          <div className="daily-target-tile">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Repeat size={16} color="var(--color-warning)" />
                <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
                  Revisions Completed
                </span>
              </div>
              <Badge variant={todayMetrics.revisionsCompleted >= todayMetrics.revisionsTarget ? 'success' : 'default'}>
                {todayMetrics.revisionsCompleted} / {todayMetrics.revisionsTarget}
              </Badge>
            </div>
            <ProgressBar
              value={todayMetrics.revisionsCompleted}
              max={todayMetrics.revisionsTarget}
              size="sm"
              variant="warning"
            />
          </div>

          {/* Tile 3: Study Time */}
          <div className="daily-target-tile">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Clock size={16} color="var(--color-success)" />
                <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
                  Study Time
                </span>
              </div>
              <Badge variant={todayMetrics.studyTimeCompletedMinutes >= todayMetrics.studyTimeTargetMinutes ? 'success' : 'default'}>
                {todayMetrics.studyTimeCompletedMinutes} / {todayMetrics.studyTimeTargetMinutes} min
              </Badge>
            </div>
            <ProgressBar
              value={todayMetrics.studyTimeCompletedMinutes}
              max={todayMetrics.studyTimeTargetMinutes}
              size="sm"
              variant="success"
            />
          </div>
        </div>
      </section>

      {/* ====================================================================
          SECTION 2 — TWO-COLUMN: FOCUS STUDY TIMER & STREAK CONSISTENCY
          ==================================================================== */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 20 }}>
        {/* LEFT: FOCUS STUDY TIMER WIDGET */}
        <div className="focus-timer-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Clock size={18} color="var(--color-primary)" />
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                Deep Work Focus Timer
              </h3>
            </div>
            {activeFocusTimer && (
              <Badge variant={activeFocusTimer.isPaused ? 'warning' : 'success'}>
                {activeFocusTimer.isPaused ? 'PAUSED' : 'RECORDING'}
              </Badge>
            )}
          </div>

          {/* Digital Clock Readout */}
          <div
            className={`focus-clock-display ${
              activeFocusTimer?.isRunning && !activeFocusTimer.isPaused
                ? 'focus-clock-active'
                : activeFocusTimer?.isPaused
                ? 'focus-clock-paused'
                : ''
            }`}
          >
            {formatTimerClock(activeFocusTimer ? activeFocusTimer.secondsElapsed : 0)}
          </div>

          {/* Topic & Activity Selectors (if timer not running) */}
          {!activeFocusTimer ? (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Select
                label="Study Topic"
                value={timerTopicId}
                onChange={(e) => setTimerTopicId(e.target.value)}
                options={[
                  { value: '', label: 'General Practice' },
                  ...topics.map((t) => ({ value: t.id, label: t.name })),
                ]}
              />

              <Select
                label="Activity"
                value={timerActivity}
                onChange={(e) => setTimerActivity(e.target.value as StudyActivityType)}
                options={[
                  { value: 'Problem Solving', label: 'Problem Solving' },
                  { value: 'Spaced Repetition', label: 'Spaced Repetition' },
                  { value: 'Mock Assessment', label: 'Mock Assessment' },
                  { value: 'Contest Upsolving', label: 'Contest Upsolving' },
                  { value: 'Theory & Invariants', label: 'Theory & Invariants' },
                  { value: 'Video / Editorial Reading', label: 'Video / Reading' },
                ]}
              />
            </div>
          ) : (
            <div
              style={{
                padding: '10px 14px',
                background: 'var(--bg-subtle)',
                borderRadius: 'var(--radius-md)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontSize: '13px',
              }}
            >
              <span>
                Topic: <strong>{activeFocusTimer.topicName}</strong>
              </span>
              <Badge variant="purple">{activeFocusTimer.activity}</Badge>
            </div>
          )}

          {/* Timer Controls */}
          <div style={{ display: 'flex', gap: 10 }}>
            {!activeFocusTimer ? (
              <Button
                variant="primary"
                size="md"
                style={{ width: '100%' }}
                iconLeft={<Play size={16} />}
                onClick={handleStartTimer}
              >
                Start Focus Session
              </Button>
            ) : (
              <>
                {activeFocusTimer.isPaused ? (
                  <Button
                    variant="primary"
                    size="md"
                    style={{ flex: 1 }}
                    iconLeft={<Play size={16} />}
                    onClick={resumeFocusTimer}
                  >
                    Resume
                  </Button>
                ) : (
                  <Button
                    variant="secondary"
                    size="md"
                    style={{ flex: 1 }}
                    iconLeft={<Pause size={16} />}
                    onClick={pauseFocusTimer}
                  >
                    Pause
                  </Button>
                )}

                <Button
                  variant="primary"
                  size="md"
                  style={{ flex: 1, backgroundColor: 'var(--color-success)', borderColor: 'var(--color-success)' }}
                  iconLeft={<Square size={15} />}
                  onClick={() => setStopNotesModalOpen(true)}
                >
                  Stop & Log
                </Button>

                <Button
                  variant="ghost"
                  size="md"
                  onClick={() => {
                    discardFocusTimer();
                    showToast('Timer Discarded', 'Session was discarded.', 'info');
                  }}
                >
                  Discard
                </Button>
              </>
            )}
          </div>
        </div>

        {/* RIGHT: STREAK & MEANINGFUL CONSISTENCY */}
        <Card
          title="Meaningful Study Consistency"
          subtitle="Streak derived strictly from completed reviews, new questions, and logged study sessions"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            {/* Streak Badges Strip */}
            <div style={{ display: 'flex', gap: 12 }}>
              <div
                style={{
                  flex: 1,
                  padding: '14px 16px',
                  background: 'rgba(245, 158, 11, 0.12)',
                  border: '1px solid rgba(245, 158, 11, 0.3)',
                  borderRadius: 'var(--radius-lg)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                }}
              >
                <Flame size={28} color="var(--color-warning)" />
                <div>
                  <span style={{ fontSize: '11.5px', color: 'var(--text-muted)', fontWeight: 600, display: 'block' }}>
                    CURRENT STREAK
                  </span>
                  <strong style={{ fontSize: '20px', color: 'var(--color-warning)' }}>
                    {streakStats.currentStreak} Days
                  </strong>
                </div>
              </div>

              <div
                style={{
                  flex: 1,
                  padding: '14px 16px',
                  background: 'rgba(99, 102, 241, 0.12)',
                  border: '1px solid rgba(99, 102, 241, 0.3)',
                  borderRadius: 'var(--radius-lg)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                }}
              >
                <Trophy size={28} color="var(--color-primary)" />
                <div>
                  <span style={{ fontSize: '11.5px', color: 'var(--text-muted)', fontWeight: 600, display: 'block' }}>
                    BEST STREAK
                  </span>
                  <strong style={{ fontSize: '20px', color: 'var(--color-primary)' }}>
                    {streakStats.bestStreak} Days
                  </strong>
                </div>
              </div>
            </div>

            {/* 7-Day Consistency Dot Strip */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px' }}>
                <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>
                  Weekly Consistency (Last 7 Days)
                </span>
                <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                  {streakStats.weeklyActiveDaysCount} / {streakStats.weeklyTotalDays} Days
                </span>
              </div>

              <div className="weekly-dots-row">
                {streakStats.last7Days.map((d) => {
                  let bubbleClass = '';
                  if (d.isCompleted && d.isToday) bubbleClass = 'today-active';
                  else if (d.isCompleted) bubbleClass = 'active';
                  else if (d.isToday) bubbleClass = 'today-pending';

                  return (
                    <div key={d.date} className="weekly-dot-col" title={`${d.date}: ${d.meaningfulEventsCount} events, ${d.studyMinutes}m study`}>
                      <div className={`weekly-dot-bubble ${bubbleClass}`}>
                        {d.isCompleted ? <CheckCircle2 size={16} /> : d.dayOfMonth}
                      </div>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>
                        {d.dayOfWeek}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 30-Day Mini Heatmap */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-muted)' }}>
                <span>30-Day Activity Matrix</span>
                <span>{streakStats.monthlyActiveDaysCount}/30 Active ({streakStats.monthlyConsistencyPercent}%)</span>
              </div>
              <div className="month-heatmap-grid">
                {streakStats.last30Days.map((d) => (
                  <div
                    key={d.date}
                    className={`month-heatmap-cell ${d.isCompleted ? 'completed' : ''} ${d.isToday ? 'today' : ''}`}
                    title={`${d.date}: ${d.meaningfulEventsCount} events (${d.studyMinutes} min)`}
                  >
                    {d.dayOfMonth}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* ====================================================================
          SECTION 3 — GOALS BY HORIZON (Clean, High-Density Visualizations)
          ==================================================================== */}
      <section style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Horizon Filter Tabs */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}>
              Horizon Filter:
            </span>
            {[
              { id: 'ALL', label: 'All Goals' },
              { id: 'DAILY', label: 'Daily' },
              { id: 'WEEKLY', label: 'Weekly' },
              { id: 'MONTHLY', label: 'Monthly' },
              { id: 'YEARLY', label: 'Yearly' },
              { id: 'LONG_TERM', label: 'Long-Term' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setSelectedHorizon(tab.id)}
                style={{
                  padding: '5px 12px',
                  borderRadius: 'var(--radius-full)',
                  fontSize: '12.5px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  border: '1px solid',
                  borderColor: selectedHorizon === tab.id ? 'var(--color-primary)' : 'var(--border-subtle)',
                  background: selectedHorizon === tab.id ? 'var(--color-primary-subtle)' : 'var(--bg-subtle)',
                  color: selectedHorizon === tab.id ? 'var(--color-primary)' : 'var(--text-secondary)',
                  transition: 'all 0.15s ease',
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <span style={{ fontSize: '12.5px', color: 'var(--text-muted)' }}>
            Showing {filteredGoals.length} milestone{filteredGoals.length === 1 ? '' : 's'}
          </span>
        </div>

        {/* Goals Progress Rows List */}
        {filteredGoals.length === 0 ? (
          <EmptyState
            icon={<Target size={24} />}
            title="No goals found in this horizon"
            description="Set milestones like solving 500 questions, mastering 20 patterns, or logging 200 study hours."
            actionText="Create Goal"
            onAction={handleOpenAddGoal}
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {filteredGoals.map((goal) => (
              <div key={goal.id} className="goal-item-row">
                <div className="goal-item-header">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 260 }}>
                    <Badge variant={getHorizonBadgeVariant(goal.horizon)}>
                      {goal.horizon.replace('_', ' ')}
                    </Badge>
                    <div>
                      <h4 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                        {goal.title}
                      </h4>
                      {goal.description && (
                        <p style={{ fontSize: '12.5px', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
                          {goal.description}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="goal-item-stats">
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontSize: '15px', fontWeight: 800, color: goal.isCompleted ? 'var(--color-success)' : 'var(--text-primary)' }}>
                        {goal.computedCurrentValue} / {goal.targetValue} {goal.unit}
                      </span>
                      <span style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block' }}>
                        {goal.progressPercent}% achieved {goal.deadline ? `• Due ${goal.deadline}` : ''}
                      </span>
                    </div>

                    {goal.isCompleted && (
                      <Badge variant="success">Completed</Badge>
                    )}

                    <div style={{ display: 'flex', gap: 4 }}>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenEditGoal(goal)}
                      >
                        <Edit2 size={14} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          setDeleteDialogState({
                            isOpen: true,
                            type: 'goal',
                            id: goal.id,
                            title: goal.title,
                          })
                        }
                      >
                        <Trash2 size={14} color="var(--color-danger)" />
                      </Button>
                    </div>
                  </div>
                </div>

                <ProgressBar
                  value={goal.progressPercent}
                  max={100}
                  size="sm"
                  variant={goal.isCompleted ? 'success' : goal.progressPercent >= 50 ? 'primary' : 'warning'}
                />
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ====================================================================
          SECTION 4 — FOCUS STUDY SESSIONS HISTORY
          ==================================================================== */}
      {studySessions.length > 0 && (
        <Card
          title="Recent Focus Study Sessions"
          subtitle="Recorded focus sessions contributing to daily targets and consistency"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {studySessions.slice(0, 5).map((session) => (
              <div
                key={session.id}
                style={{
                  padding: '12px 16px',
                  background: 'var(--bg-subtle)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-subtle)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: 12,
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <strong style={{ fontSize: '13.5px', color: 'var(--text-primary)' }}>
                      {session.topicName}
                    </strong>
                    <Badge variant="purple">{session.activity}</Badge>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                      {Math.round(session.durationSeconds / 60)} min
                    </span>
                  </div>
                  {session.notes && (
                    <span style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginTop: 2 }}>
                      {session.notes}
                    </span>
                  )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                    {new Date(session.startedAt).toLocaleDateString()}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      setDeleteDialogState({
                        isOpen: true,
                        type: 'session',
                        id: session.id,
                        title: `${session.topicName} (${Math.round(session.durationSeconds / 60)}m)`,
                      })
                    }
                  >
                    <Trash2 size={13} color="var(--color-danger)" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* ====================================================================
          MODAL: ADD / EDIT GOAL
          ==================================================================== */}
      <Modal
        isOpen={isGoalModalOpen}
        onClose={() => setIsGoalModalOpen(false)}
        title={editingGoalId ? 'Edit Study Goal' : 'Establish New Study Goal'}
        subtitle="Set clear quantifiable milestones with automatic progress tracking."
        maxWidth="540px"
        footer={
          <div style={{ display: 'flex', gap: 8 }}>
            <Button variant="secondary" size="sm" onClick={() => setIsGoalModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={handleSaveGoal}>
              {editingGoalId ? 'Save Changes' : 'Create Goal'}
            </Button>
          </div>
        }
      >
        <form onSubmit={handleSaveGoal} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Input
            label="Goal Title *"
            value={goalTitle}
            onChange={(e) => setGoalTitle(e.target.value)}
            placeholder="e.g. Master 20 Algorithmic Patterns, Solve 500 Questions"
            required
            autoFocus
          />

          <Input
            label="Description (Optional)"
            value={goalDescription}
            onChange={(e) => setGoalDescription(e.target.value)}
            placeholder="e.g. Solidify interview bar across all core DSA topics"
          />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Select
              label="Horizon"
              value={goalHorizon}
              onChange={(e) => setGoalHorizon(e.target.value as GoalHorizon)}
              options={[
                { value: 'DAILY', label: 'Daily Target' },
                { value: 'WEEKLY', label: 'Weekly Milestone' },
                { value: 'MONTHLY', label: 'Monthly Target' },
                { value: 'YEARLY', label: 'Yearly Goal' },
                { value: 'LONG_TERM', label: 'Long-Term Invariant' },
              ]}
            />

            <Select
              label="Goal Type"
              value={goalType}
              onChange={(e) => {
                const type = e.target.value as GoalType;
                setGoalType(type);
                if (type === 'DSA_QUESTIONS') setGoalUnit('questions');
                else if (type === 'CONTESTS') setGoalUnit('contests');
                else if (type === 'STUDY_HOURS') setGoalUnit('hours');
                else if (type === 'MASTERED_PATTERNS') setGoalUnit('patterns');
                else if (type === 'REVISIONS_COMPLETED') setGoalUnit('revisions');
                else setGoalUnit('units');
              }}
              options={[
                { value: 'DSA_QUESTIONS', label: 'DSA Questions Solved' },
                { value: 'STUDY_HOURS', label: 'Study Hours Logged' },
                { value: 'MASTERED_PATTERNS', label: 'Mastered Patterns' },
                { value: 'CONTESTS', label: 'Contests & Mocks' },
                { value: 'REVISIONS_COMPLETED', label: 'Revisions Executed' },
                { value: 'CUSTOM', label: 'Custom Metric' },
              ]}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Input
              label="Target Quantity *"
              type="number"
              value={goalTargetValue.toString()}
              onChange={(e) => setGoalTargetValue(Number(e.target.value))}
              required
            />

            <Input
              label="Unit Label"
              value={goalUnit}
              onChange={(e) => setGoalUnit(e.target.value)}
              placeholder="e.g. questions, hours, contests"
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Input
              label="Target Deadline (Optional)"
              type="date"
              value={goalDeadline}
              onChange={(e) => setGoalDeadline(e.target.value)}
            />

            {!goalAutoTrack && (
              <Input
                label="Manual Current Value"
                type="number"
                value={goalManualValue.toString()}
                onChange={(e) => setGoalManualValue(Number(e.target.value))}
              />
            )}
          </div>
        </form>
      </Modal>

      {/* ====================================================================
          MODAL: EDIT DAILY TARGETS
          ==================================================================== */}
      <Modal
        isOpen={isTargetsModalOpen}
        onClose={() => setIsTargetsModalOpen(false)}
        title="Configure Daily Targets"
        subtitle="Set everyday study quotas for new questions, revisions, and study time."
        footer={
          <div style={{ display: 'flex', gap: 8 }}>
            <Button variant="secondary" size="sm" onClick={() => setIsTargetsModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={handleSaveDailyTargets}>
              Save Targets
            </Button>
          </div>
        }
      >
        <form onSubmit={handleSaveDailyTargets} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Input
            label="Daily New Questions Target"
            type="number"
            value={tempNewQuestions.toString()}
            onChange={(e) => setTempNewQuestions(Number(e.target.value))}
            required
          />

          <Input
            label="Daily Revisions Target"
            type="number"
            value={tempRevisions.toString()}
            onChange={(e) => setTempRevisions(Number(e.target.value))}
            required
          />

          <Input
            label="Daily Study Time (Minutes)"
            type="number"
            value={tempStudyMinutes.toString()}
            onChange={(e) => setTempStudyMinutes(Number(e.target.value))}
            required
          />
        </form>
      </Modal>

      {/* ====================================================================
          MODAL: STOP FOCUS TIMER & SAVE SESSION
          ==================================================================== */}
      <Modal
        isOpen={stopNotesModalOpen}
        onClose={() => setStopNotesModalOpen(false)}
        title="Complete Focus Study Session"
        subtitle={`Logged ${Math.round((activeFocusTimer?.secondsElapsed || 0) / 60)} minutes of ${activeFocusTimer?.activity || 'Study'}.`}
        footer={
          <div style={{ display: 'flex', gap: 8 }}>
            <Button variant="secondary" size="sm" onClick={() => setStopNotesModalOpen(false)}>
              Continue Studying
            </Button>
            <Button variant="primary" size="sm" onClick={handleConfirmStopTimer}>
              Save & Finish Session
            </Button>
          </div>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Input
            label="Session Notes / Problems Solved (Optional)"
            placeholder="e.g. Solved 2 Sliding window hard problems, analyzed edge cases"
            value={sessionNotes}
            onChange={(e) => setSessionNotes(e.target.value)}
            autoFocus
          />
        </div>
      </Modal>

      {/* ====================================================================
          CONFIRMATION DIALOG: DELETE GOAL OR SESSION
          ==================================================================== */}
      <ConfirmationDialog
        isOpen={deleteDialogState.isOpen}
        title={`Delete ${deleteDialogState.type === 'goal' ? 'Goal' : 'Session'}?`}
        description={`Are you sure you want to remove "${deleteDialogState.title}"?`}
        confirmText="Yes, Delete"
        cancelText="Cancel"
        isDangerous={true}
        onConfirm={() => {
          if (deleteDialogState.type === 'goal') {
            deleteGoal(deleteDialogState.id);
            showToast('Goal Deleted', 'Milestone removed.', 'info');
          } else {
            deleteStudySession(deleteDialogState.id);
            showToast('Session Removed', 'Study session removed from history.', 'info');
          }
          setDeleteDialogState({ isOpen: false, type: 'goal', id: '', title: '' });
        }}
        onCancel={() => setDeleteDialogState({ isOpen: false, type: 'goal', id: '', title: '' })}
      />
    </div>
  );
};

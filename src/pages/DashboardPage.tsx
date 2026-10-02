import React, { useState, useMemo } from 'react';
import {
  Sparkles,
  Flame,
  CheckCircle2,
  Play,
  Pause,
  RotateCcw,
  Save,
  Settings2,
  BookOpen,
  Repeat,
  Clock,
  ArrowRight,
  Plus,
} from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { Button } from '../components/ui/Button';
import { IconButton } from '../components/ui/IconButton';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { EmptyState } from '../components/ui/EmptyState';
import { useAppStore } from '../context/AppContext';
import { useToast } from '../context/ToastContext';
import type { HeatmapDayData } from '../types';

export const DashboardPage: React.FC = () => {
  const {
    topics,
    problems,
    dueTodayProblems,
    dailyTargets,
    updateDailyTargets,
    todayMetrics,
    heatmapData,
    isTimerRunning,
    timerSeconds,
    startTimer,
    pauseTimer,
    resetTimer,
    commitTimerSession,
    navigateTo,
  } = useAppStore();

  const { showToast } = useToast();

  // Settings Modal State
  const [isTargetsModalOpen, setIsTargetsModalOpen] = useState(false);
  const [formProblemsTarget, setFormProblemsTarget] = useState(dailyTargets.problemsTarget);
  const [formRevisionsTarget, setFormRevisionsTarget] = useState(dailyTargets.revisionsTarget);
  const [formStudyHoursTarget, setFormStudyHoursTarget] = useState(
    Math.round(dailyTargets.studyMinutesTarget / 60)
  );

  // Hovered heatmap cell tooltip state
  const [hoveredDay, setHoveredDay] = useState<HeatmapDayData | null>(null);

  // Format seconds to hh:mm:ss
  const formatTimerDisplay = (totalSecs: number) => {
    const hours = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;
    if (hours > 0) {
      return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  // Format total study seconds into readable string (e.g. 2h 15m)
  const formatStudyDuration = (totalSecs: number) => {
    const hours = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    if (hours === 0 && mins === 0) return `${totalSecs}s`;
    if (hours === 0) return `${mins}m`;
    if (mins === 0) return `${hours}h`;
    return `${hours}h ${mins}m`;
  };

  const handleOpenTargets = () => {
    setFormProblemsTarget(dailyTargets.problemsTarget);
    setFormRevisionsTarget(dailyTargets.revisionsTarget);
    setFormStudyHoursTarget(Math.max(1, Math.round(dailyTargets.studyMinutesTarget / 60)));
    setIsTargetsModalOpen(true);
  };

  const handleSaveTargets = (e: React.FormEvent) => {
    e.preventDefault();
    updateDailyTargets({
      problemsTarget: Math.max(1, Number(formProblemsTarget)),
      revisionsTarget: Math.max(1, Number(formRevisionsTarget)),
      studyMinutesTarget: Math.max(15, Number(formStudyHoursTarget) * 60),
    });
    showToast('Daily Targets Updated', 'Your daily targets were saved successfully.', 'success');
    setIsTargetsModalOpen(false);
  };

  const handleSaveTimerSession = () => {
    if (timerSeconds <= 0) return;
    const recordedSecs = timerSeconds;
    commitTimerSession();
    showToast(
      'Study Time Logged',
      `Added ${formatStudyDuration(recordedSecs)} to today's study progress.`,
      'success'
    );
  };

  // Group heatmap into 52 columns of 7 days (Sun=0..Sat=6)
  const heatmapColumns = useMemo(() => {
    const cols: HeatmapDayData[][] = [];
    for (let i = 0; i < heatmapData.length; i += 7) {
      cols.push(heatmapData.slice(i, i + 7));
    }
    return cols;
  }, [heatmapData]);

  // Extract month header markers for heatmap
  const monthLabels = useMemo(() => {
    const labels: Array<{ colIndex: number; name: string }> = [];
    let lastMonth = '';

    heatmapColumns.forEach((col, colIdx) => {
      const firstDay = col[0];
      if (firstDay) {
        const month = firstDay.displayDate.split(' ')[0];
        if (month !== lastMonth) {
          labels.push({ colIndex: colIdx, name: month });
          lastMonth = month;
        }
      }
    });

    return labels;
  }, [heatmapColumns]);

  // Intensity color mapper
  const getCellColor = (intensity: number, isDark: boolean) => {
    switch (intensity) {
      case 5:
        return '#22c55e'; // Darkest vivid green (100% full target complete)
      case 4:
        return '#16a34a'; // 76-99%
      case 3:
        return '#15803d'; // 51-75%
      case 2:
        return '#166534'; // 26-50%
      case 1:
        return isDark ? '#14532d' : '#86efac'; // 1-25%
      default:
        return isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.06)';
    }
  };

  // SVG Circular Ring Component
  const renderProgressRing = (
    percentage: number,
    color: string,
    radius: number = 38,
    strokeWidth: number = 7
  ) => {
    const normalizedRadius = radius - strokeWidth / 2;
    const circumference = normalizedRadius * 2 * Math.PI;
    const strokeDashoffset = circumference - (Math.min(100, Math.max(0, percentage)) / 100) * circumference;

    return (
      <svg height={radius * 2} width={radius * 2} style={{ transform: 'rotate(-90deg)' }}>
        <circle
          stroke="var(--bg-subtle)"
          fill="transparent"
          strokeWidth={strokeWidth}
          r={normalizedRadius}
          cx={radius}
          cy={radius}
        />
        <circle
          stroke={color}
          fill="transparent"
          strokeWidth={strokeWidth}
          strokeDasharray={`${circumference} ${circumference}`}
          style={{
            strokeDashoffset,
            transition: 'stroke-dashoffset 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
            strokeLinecap: 'round',
          }}
          r={normalizedRadius}
          cx={radius}
          cy={radius}
        />
      </svg>
    );
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Header with Targets Settings Button */}
      <PageHeader
        title="Today's Progress"
        description="Stay consistent and complete today's problem, revision, and study time targets."
        actions={
          <Button
            variant="secondary"
            size="sm"
            iconLeft={<Settings2 size={15} />}
            onClick={handleOpenTargets}
          >
            Edit Targets
          </Button>
        }
      />

      {/* SPECIAL REWARD CELEBRATION BANNER (When all 3 targets are completed) */}
      {todayMetrics.allCompleted && (
        <div
          className="animate-slide-up"
          style={{
            background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.15) 0%, rgba(16, 185, 129, 0.25) 100%)',
            border: '2px solid rgba(34, 197, 94, 0.5)',
            borderRadius: 'var(--radius-lg)',
            padding: '20px 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: '0 0 25px rgba(34, 197, 94, 0.2)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div
              style={{
                width: 46,
                height: 46,
                borderRadius: '50%',
                backgroundColor: 'var(--color-success)',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 0 15px rgba(34, 197, 94, 0.6)',
              }}
            >
              <Flame size={24} />
            </div>
            <div>
              <div style={{ fontSize: '17px', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
                🔥 DAY COMPLETE!
              </div>
              <div style={{ fontSize: '13.5px', color: 'var(--text-secondary)', marginTop: 2 }}>
                You showed up and completed everything planned for today.
              </div>
            </div>
          </div>

          <Badge variant="success" size="md">
            100% Consistency Achieved
          </Badge>
        </div>
      )}

      {/* ZERO DATA ONBOARDING STATE */}
      {topics.length === 0 && problems.length === 0 ? (
        <EmptyState
          icon={<Sparkles size={32} color="var(--color-primary)" />}
          title="Welcome to StudyOS"
          description="Start by adding your first topic and problem. Your progress, targets, and consistency will appear here as you study."
          actionText="Create First Topic"
          actionIcon={<Plus size={16} />}
          onAction={() => navigateTo('topics')}
        />
      ) : (
        <>
          {/* 3 DAILY TARGETS CARDS */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: 20,
            }}
          >
            {/* 1. DAILY PROBLEM TARGET */}
            <div
              style={{
                background: 'var(--bg-card)',
                border: todayMetrics.problemsCompleted
                  ? '1.5px solid var(--color-success)'
                  : '1px solid var(--border-color)',
                borderRadius: 'var(--radius-lg)',
                padding: 22,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: 16,
                boxShadow: 'var(--shadow-sm)',
                transition: 'all 0.2s ease',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 'var(--radius-md)',
                      backgroundColor: 'rgba(99, 102, 241, 0.12)',
                      color: 'var(--color-primary)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <BookOpen size={16} />
                  </div>
                  <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>
                    Problem Target
                  </span>
                </div>

                {todayMetrics.problemsCompleted ? (
                  <Badge variant="success" size="sm">
                    <CheckCircle2 size={12} style={{ marginRight: 3 }} /> Complete
                  </Badge>
                ) : (
                  <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)' }}>
                    Target: {todayMetrics.problemsTarget}
                  </span>
                )}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: '32px', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>
                    {todayMetrics.problemsSolved}
                    <span style={{ fontSize: '16px', fontWeight: 500, color: 'var(--text-muted)' }}>
                      {' '}/ {todayMetrics.problemsTarget}
                    </span>
                  </div>
                  <div style={{ fontSize: '12.5px', color: 'var(--text-secondary)', marginTop: 6 }}>
                    {todayMetrics.problemsCompleted
                      ? '✓ Daily target completed'
                      : `${todayMetrics.problemsTarget - todayMetrics.problemsSolved} more to reach goal`}
                  </div>
                </div>

                <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {renderProgressRing(
                    todayMetrics.problemsPercentage,
                    todayMetrics.problemsCompleted ? 'var(--color-success)' : 'var(--color-primary)'
                  )}
                  <span
                    style={{
                      position: 'absolute',
                      fontSize: '13px',
                      fontWeight: 700,
                      color: 'var(--text-primary)',
                    }}
                  >
                    {todayMetrics.problemsPercentage}%
                  </span>
                </div>
              </div>

              <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: 10 }}>
                <button
                  onClick={() => navigateTo('topics')}
                  style={{
                    background: 'none',
                    border: 'none',
                    padding: 0,
                    color: 'var(--color-primary)',
                    fontSize: '12.5px',
                    fontWeight: 600,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                    cursor: 'pointer',
                  }}
                >
                  <span>Log new problem</span>
                  <ArrowRight size={13} />
                </button>
              </div>
            </div>

            {/* 2. DAILY REVISION TARGET */}
            <div
              style={{
                background: 'var(--bg-card)',
                border: todayMetrics.revisionsCompleted
                  ? '1.5px solid var(--color-success)'
                  : '1px solid var(--border-color)',
                borderRadius: 'var(--radius-lg)',
                padding: 22,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: 16,
                boxShadow: 'var(--shadow-sm)',
                transition: 'all 0.2s ease',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 'var(--radius-md)',
                      backgroundColor: 'rgba(56, 189, 248, 0.12)',
                      color: '#38bdf8',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Repeat size={16} />
                  </div>
                  <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>
                    Revision Target
                  </span>
                </div>

                {todayMetrics.revisionsCompleted ? (
                  <Badge variant="success" size="sm">
                    <CheckCircle2 size={12} style={{ marginRight: 3 }} /> Complete
                  </Badge>
                ) : (
                  <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)' }}>
                    Target: {todayMetrics.revisionsTarget}
                  </span>
                )}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: '32px', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>
                    {todayMetrics.revisionsDone}
                    <span style={{ fontSize: '16px', fontWeight: 500, color: 'var(--text-muted)' }}>
                      {' '}/ {todayMetrics.revisionsTarget}
                    </span>
                  </div>
                  <div style={{ fontSize: '12.5px', color: 'var(--text-secondary)', marginTop: 6 }}>
                    {todayMetrics.revisionsCompleted
                      ? '✓ All required revisions complete'
                      : dueTodayProblems.length > 0
                      ? `${dueTodayProblems.length} revisions currently due`
                      : 'No more revisions due today'}
                  </div>
                </div>

                <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {renderProgressRing(
                    todayMetrics.revisionsPercentage,
                    todayMetrics.revisionsCompleted ? 'var(--color-success)' : '#38bdf8'
                  )}
                  <span
                    style={{
                      position: 'absolute',
                      fontSize: '13px',
                      fontWeight: 700,
                      color: 'var(--text-primary)',
                    }}
                  >
                    {todayMetrics.revisionsPercentage}%
                  </span>
                </div>
              </div>

              <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: 10 }}>
                <button
                  onClick={() => navigateTo('revision')}
                  style={{
                    background: 'none',
                    border: 'none',
                    padding: 0,
                    color: '#38bdf8',
                    fontSize: '12.5px',
                    fontWeight: 600,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                    cursor: 'pointer',
                  }}
                >
                  <span>Open revision queue ({dueTodayProblems.length})</span>
                  <ArrowRight size={13} />
                </button>
              </div>
            </div>

            {/* 3. DAILY STUDY HOURS TARGET & ACTIVE TIMER */}
            <div
              style={{
                background: 'var(--bg-card)',
                border: todayMetrics.studyCompleted
                  ? '1.5px solid var(--color-success)'
                  : '1px solid var(--border-color)',
                borderRadius: 'var(--radius-lg)',
                padding: 22,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: 16,
                boxShadow: 'var(--shadow-sm)',
                transition: 'all 0.2s ease',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 'var(--radius-md)',
                      backgroundColor: 'rgba(245, 158, 11, 0.12)',
                      color: '#f59e0b',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Clock size={16} />
                  </div>
                  <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>
                    Study Time Target
                  </span>
                </div>

                {todayMetrics.studyCompleted ? (
                  <Badge variant="success" size="sm">
                    <CheckCircle2 size={12} style={{ marginRight: 3 }} /> Complete
                  </Badge>
                ) : (
                  <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)' }}>
                    Target: {Math.round(todayMetrics.studyMinutesTarget / 60)}h
                  </span>
                )}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: '30px', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>
                    {formatStudyDuration(todayMetrics.studySeconds)}
                    <span style={{ fontSize: '15px', fontWeight: 500, color: 'var(--text-muted)' }}>
                      {' '}/ {Math.round(todayMetrics.studyMinutesTarget / 60)}h
                    </span>
                  </div>
                  <div style={{ fontSize: '12.5px', color: 'var(--text-secondary)', marginTop: 6 }}>
                    {todayMetrics.studyCompleted
                      ? '✓ Daily study time achieved'
                      : 'Tracked via study sessions'}
                  </div>
                </div>

                <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {renderProgressRing(
                    todayMetrics.studyPercentage,
                    todayMetrics.studyCompleted ? 'var(--color-success)' : '#f59e0b'
                  )}
                  <span
                    style={{
                      position: 'absolute',
                      fontSize: '13px',
                      fontWeight: 700,
                      color: 'var(--text-primary)',
                    }}
                  >
                    {todayMetrics.studyPercentage}%
                  </span>
                </div>
              </div>

              {/* INTEGRATED STUDY TIMER */}
              <div
                style={{
                  background: 'var(--bg-subtle)',
                  borderRadius: 'var(--radius-md)',
                  padding: '8px 12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 8,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div
                    style={{
                      width: 7,
                      height: 7,
                      borderRadius: '50%',
                      backgroundColor: isTimerRunning ? 'var(--color-success)' : 'var(--text-muted)',
                    }}
                  />
                  <span
                    style={{
                      fontSize: '13px',
                      fontFamily: 'monospace',
                      fontWeight: 700,
                      color: 'var(--text-primary)',
                    }}
                  >
                    {formatTimerDisplay(timerSeconds)}
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  {isTimerRunning ? (
                    <Button variant="secondary" size="sm" iconLeft={<Pause size={12} />} onClick={pauseTimer}>
                      Pause
                    </Button>
                  ) : (
                    <Button variant="primary" size="sm" iconLeft={<Play size={12} />} onClick={startTimer}>
                      Start
                    </Button>
                  )}

                  {timerSeconds > 0 && (
                    <>
                      <Button variant="primary" size="sm" iconLeft={<Save size={12} />} onClick={handleSaveTimerSession}>
                        Save
                      </Button>
                      <IconButton icon={<RotateCcw size={13} />} label="Reset timer" size="sm" onClick={resetTimer} />
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* GITHUB-STYLE DAILY CONSISTENCY HEATMAP */}
          <div
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-lg)',
              padding: 24,
              display: 'flex',
              flexDirection: 'column',
              gap: 16,
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                  Annual Consistency Heatmap
                </h3>
                <span style={{ fontSize: '12.5px', color: 'var(--text-muted)' }}>
                  Each square represents one day. Complete all targets to turn the square vivid green.
                </span>
              </div>

              {/* Intensity Legend */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '11.5px', color: 'var(--text-muted)' }}>
                <span>Less</span>
                {[0, 1, 2, 3, 4, 5].map((lvl) => (
                  <div
                    key={lvl}
                    style={{
                      width: 12,
                      height: 12,
                      borderRadius: 2,
                      backgroundColor: getCellColor(lvl, true),
                      border: lvl === 0 ? '1px solid var(--border-subtle)' : 'none',
                    }}
                    title={lvl === 5 ? '100% Target Complete' : `Level ${lvl}`}
                  />
                ))}
                <span>100% Complete</span>
              </div>
            </div>

            {/* Heatmap Grid View */}
            <div style={{ overflowX: 'auto', paddingBottom: 6 }}>
              {/* Month Header row */}
              <div
                style={{
                  display: 'flex',
                  gap: 3,
                  marginBottom: 6,
                  height: 16,
                  fontSize: '11px',
                  color: 'var(--text-muted)',
                  paddingLeft: 28,
                }}
              >
                {monthLabels.map((lbl, idx) => (
                  <div
                    key={idx}
                    style={{
                      position: 'relative',
                      left: lbl.colIndex * 15,
                      width: 0,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {lbl.name}
                  </div>
                ))}
              </div>

              {/* Grid with Weekday Labels on Left */}
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                {/* Weekday Labels (Mon, Wed, Fri) */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateRows: 'repeat(7, 12px)',
                    gap: 3,
                    fontSize: '9px',
                    fontWeight: 600,
                    color: 'var(--text-muted)',
                    lineHeight: '12px',
                    textAlign: 'right',
                    width: 22,
                  }}
                >
                  <span></span>
                  <span>Mon</span>
                  <span></span>
                  <span>Wed</span>
                  <span></span>
                  <span>Fri</span>
                  <span></span>
                </div>

                {/* 52 Columns Grid */}
                <div style={{ display: 'flex', gap: 3 }}>
                  {heatmapColumns.map((col, colIdx) => (
                    <div
                      key={colIdx}
                      style={{
                        display: 'grid',
                        gridTemplateRows: 'repeat(7, 12px)',
                        gap: 3,
                      }}
                    >
                      {col.map((day) => {
                        const isHovered = hoveredDay?.dateStr === day.dateStr;
                        return (
                          <div
                            key={day.dateStr}
                            onMouseEnter={() => setHoveredDay(day)}
                            onMouseLeave={() => setHoveredDay(null)}
                            style={{
                              width: 12,
                              height: 12,
                              borderRadius: 2,
                              backgroundColor: getCellColor(day.intensity, true),
                              border: day.isToday
                                ? '1.5px solid var(--color-primary)'
                                : isHovered
                                ? '1.5px solid #ffffff'
                                : day.intensity === 0
                                ? '1px solid var(--border-subtle)'
                                : 'none',
                              cursor: 'pointer',
                              transition: 'transform 0.1s ease',
                              transform: isHovered ? 'scale(1.25)' : 'none',
                            }}
                          />
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Tooltip detail bar */}
            <div
              style={{
                minHeight: 28,
                display: 'flex',
                alignItems: 'center',
                fontSize: '12.5px',
                color: 'var(--text-secondary)',
                borderTop: '1px solid var(--border-subtle)',
                paddingTop: 10,
              }}
            >
              {hoveredDay ? (
                <div>
                  <strong>{hoveredDay.displayDate}</strong>: {hoveredDay.problemsSolved} problems solved,{' '}
                  {hoveredDay.revisionsDone} revisions, {formatStudyDuration(hoveredDay.studySeconds)} study time.{' '}
                  {hoveredDay.isFullyCompleted ? (
                    <span style={{ color: 'var(--color-success)', fontWeight: 700 }}>✓ Completed Daily Targets</span>
                  ) : (
                    <span>({hoveredDay.progressPercentage}% progress)</span>
                  )}
                </div>
              ) : (
                <span style={{ color: 'var(--text-muted)' }}>
                  Hover over any square to inspect your daily effort and milestones.
                </span>
              )}
            </div>
          </div>
        </>
      )}

      {/* EDIT TARGETS MODAL */}
      <Modal
        isOpen={isTargetsModalOpen}
        onClose={() => setIsTargetsModalOpen(false)}
        title="Configure Daily Targets"
        footer={
          <div style={{ display: 'flex', gap: 8 }}>
            <Button variant="secondary" size="sm" onClick={() => setIsTargetsModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={handleSaveTargets}>
              Save Targets
            </Button>
          </div>
        }
      >
        <form onSubmit={handleSaveTargets} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Input
            type="number"
            min="1"
            max="100"
            label="Daily Problems Target"
            value={formProblemsTarget}
            onChange={(e) => setFormProblemsTarget(Number(e.target.value))}
            required
          />

          <Input
            type="number"
            min="1"
            max="100"
            label="Daily Revisions Target"
            value={formRevisionsTarget}
            onChange={(e) => setFormRevisionsTarget(Number(e.target.value))}
            required
          />

          <Input
            type="number"
            min="1"
            max="24"
            label="Daily Study Hours Target"
            value={formStudyHoursTarget}
            onChange={(e) => setFormStudyHoursTarget(Number(e.target.value))}
            required
          />
        </form>
      </Modal>
    </div>
  );
};

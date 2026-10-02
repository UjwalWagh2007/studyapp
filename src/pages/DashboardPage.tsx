import React, { useState, useMemo } from 'react';
import {
  Flame,
  CheckCircle2,
  Settings2,
  BookOpen,
  Repeat,
  Clock,
  ArrowRight,
  Plus,
  Play,
} from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { useAppStore } from '../context/AppContext';
import { useToast } from '../context/ToastContext';
import { getLiveSessionTimes } from '../services/sessionService';
import type { HeatmapDayData } from '../types';

export const DashboardPage: React.FC = () => {
  const {
    dueTodayProblems,
    dailyTargets,
    updateDailyTargets,
    todayMetrics,
    heatmapData,
    studySessions,
    activeSession,
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

  // Dynamic greeting based on time of day
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  }, []);

  // Format total study seconds into readable string (e.g. 2h 15m or 45m)
  const formatStudyDuration = (totalSecs: number) => {
    const hours = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;
    if (hours === 0 && mins === 0) return `${secs}s`;
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

  // Revision queue calculation
  const totalRevisionsQueue = todayMetrics.revisionsDone + dueTodayProblems.length;
  const hasRevisionItems = totalRevisionsQueue > 0;
  const revisionsPercentage = hasRevisionItems
    ? Math.round((todayMetrics.revisionsDone / totalRevisionsQueue) * 100)
    : 0;
  const isRevisionFullyCompleted = hasRevisionItems && todayMetrics.revisionsDone >= totalRevisionsQueue;

  // Today's study sessions
  const todayStr = new Date().toISOString().split('T')[0];
  const todaySessions = useMemo(() => {
    return studySessions.filter((s) => s.dateStr === todayStr);
  }, [studySessions, todayStr]);

  const todayTotalFocusSeconds = useMemo(() => {
    return todaySessions.reduce((sum, s) => {
      const live = getLiveSessionTimes(s);
      return sum + live.focusSeconds;
    }, 0);
  }, [todaySessions]);

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Header with Greeting and Target Settings Button */}
      <PageHeader
        title={`${greeting}!`}
        description="Focus on today's effort, consistent problem solving, and intentional study sessions."
        actions={
          <Button
            variant="secondary"
            size="sm"
            iconLeft={<Settings2 size={15} />}
            onClick={handleOpenTargets}
          >
            Edit Daily Targets
          </Button>
        }
      />

      {/* SPECIAL REWARD CELEBRATION BANNER (When all targets are completed) */}
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
            flexWrap: 'wrap',
            gap: 14,
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
                You showed up and completed all configured daily study goals for today.
              </div>
            </div>
          </div>

          <Badge variant="success" size="md">
            100% Consistency Achieved
          </Badge>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────── */}
      {/* TODAY'S PROGRESS CARDS (Always rendered) */}
      {/* ─────────────────────────────────────────────────────────── */}
      <div className="dashboard-targets-grid">
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
                  ? '✓ Target complete'
                  : `${Math.max(0, todayMetrics.problemsTarget - todayMetrics.problemsSolved)} more to reach goal`}
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

        {/* 2. REVISION TARGET — CONDITIONAL (Only rendered if there are revisions due or completed today) */}
        {hasRevisionItems && (
          <div
            className="animate-fade-in"
            style={{
              background: 'var(--bg-card)',
              border: isRevisionFullyCompleted
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
                  Today's Revisions
                </span>
              </div>

              {isRevisionFullyCompleted ? (
                <Badge variant="success" size="sm">
                  <CheckCircle2 size={12} style={{ marginRight: 3 }} /> Complete
                </Badge>
              ) : (
                <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)' }}>
                  Queue: {totalRevisionsQueue}
                </span>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: '32px', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>
                  {todayMetrics.revisionsDone}
                  <span style={{ fontSize: '16px', fontWeight: 500, color: 'var(--text-muted)' }}>
                    {' '}/ {totalRevisionsQueue}
                  </span>
                </div>
                <div style={{ fontSize: '12.5px', color: 'var(--text-secondary)', marginTop: 6 }}>
                  {isRevisionFullyCompleted
                    ? '✓ All due revisions completed'
                    : `${dueTodayProblems.length} revisions remaining in queue`}
                </div>
              </div>

              <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {renderProgressRing(
                  revisionsPercentage,
                  isRevisionFullyCompleted ? 'var(--color-success)' : '#38bdf8'
                )}
                <span
                  style={{
                    position: 'absolute',
                    fontSize: '13px',
                    fontWeight: 700,
                    color: 'var(--text-primary)',
                  }}
                >
                  {revisionsPercentage}%
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
        )}

        {/* 3. DAILY STUDY TIME TARGET (Clean display — generated from study sessions) */}
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
                  ? '✓ Daily study hours achieved'
                  : 'Accumulated from focus sessions'}
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

          <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: 10 }}>
            <button
              onClick={() => navigateTo('sessions')}
              style={{
                background: 'none',
                border: 'none',
                padding: 0,
                color: '#f59e0b',
                fontSize: '12.5px',
                fontWeight: 600,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                cursor: 'pointer',
              }}
            >
              <span>Manage study sessions</span>
              <ArrowRight size={13} />
            </button>
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────── */}
      {/* 1. CONSISTENCY HEATMAP — ALWAYS VISIBLE ON DASHBOARD */}
      {/* ─────────────────────────────────────────────────────────── */}
      <div className="heatmap-card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
              Consistency Heatmap
            </h3>
            <span style={{ fontSize: '12.5px', color: 'var(--text-muted)' }}>
              Each square records real study activity. Complete all daily targets to turn the day vivid green.
            </span>
          </div>

          {/* Intensity Legend */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '11.5px', color: 'var(--text-muted)', flexWrap: 'wrap' }}>
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
        <div className="heatmap-scroll-area">
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
              {hoveredDay.revisionsDone} revisions, {formatStudyDuration(hoveredDay.studySeconds)} focus study time.{' '}
              {hoveredDay.isFullyCompleted ? (
                <span style={{ color: 'var(--color-success)', fontWeight: 700 }}>✓ Completed Daily Targets</span>
              ) : (
                <span>({hoveredDay.progressPercentage}% progress)</span>
              )}
            </div>
          ) : (
            <span style={{ color: 'var(--text-muted)' }}>
              Hover over any day to inspect your daily effort and milestones.
            </span>
          )}
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────── */}
      {/* TODAY'S SESSIONS (Clean preview on Dashboard) */}
      {/* ─────────────────────────────────────────────────────────── */}
      <div
        style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-lg)',
          padding: 22,
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
              Today's Study Sessions
            </h3>
            <span style={{ fontSize: '12.5px', color: 'var(--text-muted)' }}>
              Total Focus Today: <strong style={{ color: 'var(--text-primary)' }}>{formatStudyDuration(todayTotalFocusSeconds)}</strong>
            </span>
          </div>

          <Button
            variant="secondary"
            size="sm"
            iconLeft={<Plus size={14} />}
            onClick={() => navigateTo('sessions')}
          >
            Manage Sessions
          </Button>
        </div>

        {todaySessions.length === 0 ? (
          <div
            style={{
              padding: '20px 0',
              textAlign: 'center',
              color: 'var(--text-muted)',
              fontSize: '13.5px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 10,
            }}
          >
            <span>No study sessions logged today yet.</span>
            <Button
              variant="primary"
              size="sm"
              iconLeft={<Play size={13} />}
              onClick={() => navigateTo('sessions')}
            >
              Start Focus Session
            </Button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {todaySessions.map((s) => {
              const live = getLiveSessionTimes(s);
              const isActive = activeSession?.id === s.id;

              return (
                <div
                  key={s.id}
                  style={{
                    background: 'var(--bg-subtle)',
                    borderRadius: 'var(--radius-md)',
                    padding: '10px 14px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    border: isActive ? '1px solid var(--color-primary)' : '1px solid transparent',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        backgroundColor: s.status === 'COMPLETED'
                          ? 'var(--color-success)'
                          : s.status === 'PAUSED'
                          ? '#f59e0b'
                          : 'var(--color-primary)',
                      }}
                    />
                    <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>
                      {s.name}
                    </span>
                    <Badge
                      variant={s.status === 'COMPLETED' ? 'success' : s.status === 'PAUSED' ? 'warning' : 'primary'}
                      size="sm"
                    >
                      {s.status === 'COMPLETED' ? 'Completed' : s.status === 'PAUSED' ? 'Paused' : 'Running'}
                    </Badge>
                  </div>

                  <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>
                    {formatStudyDuration(live.focusSeconds)}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

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

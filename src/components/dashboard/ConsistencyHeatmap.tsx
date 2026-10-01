import React, { useState, useMemo, useRef } from 'react';
import {
  Flame,
  Calendar,
  Sparkles,
  BookOpen,
  Repeat,
  Clock,
  Trophy,
  Info,
} from 'lucide-react';
import { useAppStore } from '../../context/AppContext';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { generateYearConsistencyHeatmapData } from '../../services/streak';
import type { HeatmapDayData, ActivityIntensityLevel } from '../../types';

export const ConsistencyHeatmap: React.FC = () => {
  const { questions, studySessions, mockTests, dailyTargets, navigateTo } = useAppStore();

  const [hoveredDay, setHoveredDay] = useState<HeatmapDayData | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);
  const [selectedDay, setSelectedDay] = useState<HeatmapDayData | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  // Memoized 52-week heatmap computation
  const heatmapData = useMemo(() => {
    return generateYearConsistencyHeatmapData(
      questions,
      studySessions,
      mockTests,
      dailyTargets,
      new Date()
    );
  }, [questions, studySessions, mockTests, dailyTargets]);

  const { weeks, monthHeaders, summary } = heatmapData;

  // Colors per intensity level (adapted for rich contrast in both dark & light themes)
  const getCellColor = (intensity: ActivityIntensityLevel, isFuture: boolean, isToday: boolean) => {
    if (isFuture) {
      return {
        background: 'transparent',
        border: '1px dashed var(--border-subtle)',
        opacity: 0.25,
      };
    }

    switch (intensity) {
      case 4:
        return {
          background: 'var(--color-success)',
          border: '1px solid var(--color-success-hover)',
          boxShadow: '0 0 6px rgba(16, 185, 129, 0.45)',
        };
      case 3:
        return {
          background: 'rgba(16, 185, 129, 0.8)',
          border: '1px solid rgba(16, 185, 129, 0.95)',
        };
      case 2:
        return {
          background: 'rgba(16, 185, 129, 0.48)',
          border: '1px solid rgba(16, 185, 129, 0.65)',
        };
      case 1:
        return {
          background: 'rgba(16, 185, 129, 0.22)',
          border: '1px solid rgba(16, 185, 129, 0.38)',
        };
      case 0:
      default:
        return {
          background: 'var(--bg-subtle)',
          border: isToday ? '1.5px solid var(--color-primary)' : '1px solid var(--border-subtle)',
        };
    }
  };

  const handleCellMouseEnter = (
    e: React.MouseEvent<HTMLButtonElement>,
    day: HeatmapDayData | null
  ) => {
    if (!day) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const parentRect = containerRef.current?.getBoundingClientRect() || { left: 0, top: 0 };

    setHoveredDay(day);
    setTooltipPos({
      x: rect.left - parentRect.left + rect.width / 2,
      y: rect.top - parentRect.top - 8,
    });
  };

  const handleCellMouseLeave = () => {
    setHoveredDay(null);
  };

  const handleCellClick = (day: HeatmapDayData | null) => {
    if (!day || day.isFuture) return;
    if (selectedDay?.date === day.date) {
      setSelectedDay(null);
    } else {
      setSelectedDay(day);
    }
  };

  return (
    <Card
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Flame size={20} color="var(--color-primary)" />
          <span style={{ fontSize: '17px', fontWeight: 700, color: 'var(--text-primary)' }}>
            Personal Study Consistency
          </span>
        </div>
      }
      subtitle="Daily active recall, questions solved, deep focus sessions & mock assessments over the past 12 months"
      headerAction={
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Badge variant="purple">Personal OS (System A)</Badge>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              padding: '4px 10px',
              borderRadius: 'var(--radius-full)',
              backgroundColor: 'rgba(245, 158, 11, 0.12)',
              color: 'var(--color-warning)',
              fontSize: '12px',
              fontWeight: 600,
              border: '1px solid rgba(245, 158, 11, 0.25)',
            }}
          >
            <Flame size={14} />
            <span>{summary.currentStreak} Day Streak</span>
          </div>
        </div>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* ====================================================================
            MOTIVATIONAL METRICS STRIP (Top Row)
            ==================================================================== */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
            gap: 12,
            padding: '12px 14px',
            backgroundColor: 'var(--bg-subtle)',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border-subtle)',
          }}
        >
          {/* 1. Current Streak */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <span style={{ fontSize: '11.5px', fontWeight: 600, color: 'var(--text-muted)' }}>
              Current Streak
            </span>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
              <span
                style={{
                  fontSize: '20px',
                  fontWeight: 800,
                  color: 'var(--color-warning)',
                  fontFamily: 'var(--font-mono)',
                }}
              >
                🔥 {summary.currentStreak}
              </span>
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>days</span>
            </div>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              Consecutive active study
            </span>
          </div>

          {/* 2. Best Streak */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <span style={{ fontSize: '11.5px', fontWeight: 600, color: 'var(--text-muted)' }}>
              Best Streak
            </span>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
              <span
                style={{
                  fontSize: '20px',
                  fontWeight: 800,
                  color: 'var(--color-primary)',
                  fontFamily: 'var(--font-mono)',
                }}
              >
                🏆 {summary.longestStreak}
              </span>
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>days</span>
            </div>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              Personal all-time high
            </span>
          </div>

          {/* 3. Active Days This Year */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <span style={{ fontSize: '11.5px', fontWeight: 600, color: 'var(--text-muted)' }}>
              Active Days (Year)
            </span>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
              <span
                style={{
                  fontSize: '20px',
                  fontWeight: 800,
                  color: 'var(--color-success)',
                  fontFamily: 'var(--font-mono)',
                }}
              >
                📅 {summary.activeDaysYear}
              </span>
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                / {summary.totalDaysYear}
              </span>
            </div>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              {summary.yearConsistencyPercent}% rolling year consistency
            </span>
          </div>

          {/* 4. Active Days This Month */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <span style={{ fontSize: '11.5px', fontWeight: 600, color: 'var(--text-muted)' }}>
              This Month
            </span>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
              <span
                style={{
                  fontSize: '20px',
                  fontWeight: 800,
                  color: 'var(--text-primary)',
                  fontFamily: 'var(--font-mono)',
                }}
              >
                🌟 {summary.activeDaysMonth}
              </span>
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                / {summary.totalDaysMonth}
              </span>
            </div>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              {summary.monthConsistencyPercent}% monthly consistency
            </span>
          </div>

          {/* 5. Current Week */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <span style={{ fontSize: '11.5px', fontWeight: 600, color: 'var(--text-muted)' }}>
              This Week
            </span>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
              <span
                style={{
                  fontSize: '20px',
                  fontWeight: 800,
                  color: 'var(--color-info)',
                  fontFamily: 'var(--font-mono)',
                }}
              >
                🎯 {summary.currentWeekActiveDays}
              </span>
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>/ 7 days</span>
            </div>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              {summary.currentWeekActiveDays >= 5 ? 'Strong progress' : 'Pace on track'}
            </span>
          </div>
        </div>

        {/* ====================================================================
            HEATMAP GRID CONTAINER
            ==================================================================== */}
        <div
          ref={containerRef}
          style={{
            position: 'relative',
            overflowX: 'auto',
            paddingBottom: '6px',
          }}
        >
          {/* Tooltip Popover on Hover */}
          {hoveredDay && tooltipPos && (
            <div
              style={{
                position: 'absolute',
                left: `${tooltipPos.x}px`,
                top: `${tooltipPos.y}px`,
                transform: 'translate(-50%, -100%)',
                zIndex: 50,
                pointerEvents: 'none',
                minWidth: '220px',
                backgroundColor: 'var(--bg-elevated)',
                border: '1px solid var(--border-medium)',
                borderRadius: 'var(--radius-md)',
                boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.4), 0 8px 10px -6px rgba(0, 0, 0, 0.3)',
                padding: '10px 12px',
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
                animation: 'scaleIn 0.15s ease-out',
              }}
            >
              {/* Header */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  borderBottom: '1px solid var(--border-subtle)',
                  paddingBottom: 6,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <Calendar size={13} color="var(--text-muted)" />
                  <span style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--text-primary)' }}>
                    {hoveredDay.formattedDate}
                  </span>
                </div>
                {hoveredDay.isToday && (
                  <Badge variant="primary">Today</Badge>
                )}
              </div>

              {/* Intensity & Target status */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                <span
                  style={{
                    fontSize: '11.5px',
                    fontWeight: 600,
                    color:
                      hoveredDay.intensity === 4
                        ? 'var(--color-success)'
                        : hoveredDay.intensity >= 2
                        ? 'var(--color-info)'
                        : hoveredDay.intensity === 1
                        ? 'var(--color-warning)'
                        : 'var(--text-muted)',
                  }}
                >
                  {hoveredDay.intensityLabel}
                </span>

                {hoveredDay.targetMet && (
                  <Badge variant="success">Target Met</Badge>
                )}
              </div>

              {/* Metrics Breakdown */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '6px 10px',
                  fontSize: '11.5px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <Repeat size={12} color="var(--color-info)" />
                  <span style={{ color: 'var(--text-muted)' }}>Revisions:</span>
                  <strong style={{ color: 'var(--text-primary)', marginLeft: 'auto' }}>
                    {hoveredDay.revisionsCount}
                  </strong>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <BookOpen size={12} color="var(--color-primary)" />
                  <span style={{ color: 'var(--text-muted)' }}>Questions:</span>
                  <strong style={{ color: 'var(--text-primary)', marginLeft: 'auto' }}>
                    {hoveredDay.questionsCount}
                  </strong>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <Clock size={12} color="var(--color-warning)" />
                  <span style={{ color: 'var(--text-muted)' }}>Study Time:</span>
                  <strong style={{ color: 'var(--text-primary)', marginLeft: 'auto' }}>
                    {hoveredDay.studyMinutes >= 60
                      ? `${Math.floor(hoveredDay.studyMinutes / 60)}h ${hoveredDay.studyMinutes % 60}m`
                      : `${hoveredDay.studyMinutes}m`}
                  </strong>
                </div>

                {hoveredDay.mockTestsCount > 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <Trophy size={12} color="var(--color-success)" />
                    <span style={{ color: 'var(--text-muted)' }}>Mocks:</span>
                    <strong style={{ color: 'var(--text-primary)', marginLeft: 'auto' }}>
                      {hoveredDay.mockTestsCount}
                    </strong>
                  </div>
                )}
              </div>

              {/* Mock Test detail note if present */}
              {hoveredDay.mockTestsDetails && hoveredDay.mockTestsDetails.length > 0 && (
                <div
                  style={{
                    backgroundColor: 'rgba(16, 185, 129, 0.08)',
                    borderRadius: 'var(--radius-xs)',
                    padding: '4px 6px',
                    fontSize: '10.5px',
                    color: 'var(--color-success)',
                    border: '1px solid rgba(16, 185, 129, 0.2)',
                  }}
                >
                  🏆 {hoveredDay.mockTestsDetails[0].title} (Score:{' '}
                  {hoveredDay.mockTestsDetails[0].scorePercent ?? 85}%)
                </div>
              )}
            </div>
          )}

          {/* Graph Grid View */}
          <div style={{ display: 'inline-block', minWidth: '780px', userSelect: 'none' }}>
            {/* Month Labels Row */}
            <div
              style={{
                display: 'flex',
                height: '18px',
                position: 'relative',
                marginLeft: '32px',
                marginBottom: '4px',
              }}
            >
              {monthHeaders.map((m, idx) => {
                // Approximate left offset: colIndex * (cellSize + gap)
                // cellSize = 12px, gap = 3px => 15px per column
                const leftPos = m.colIndex * 15;
                return (
                  <span
                    key={`${m.label}-${idx}`}
                    style={{
                      position: 'absolute',
                      left: `${leftPos}px`,
                      fontSize: '11px',
                      fontWeight: 600,
                      color: 'var(--text-muted)',
                    }}
                  >
                    {m.label}
                  </span>
                );
              })}
            </div>

            {/* Main Cells Grid with Weekday Labels */}
            <div style={{ display: 'flex', gap: '3px' }}>
              {/* Weekday Column (Mon, Wed, Fri) */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateRows: 'repeat(7, 12px)',
                  gap: '3px',
                  width: '28px',
                  textAlign: 'right',
                  paddingRight: '6px',
                }}
              >
                <span /> {/* Sun (hidden) */}
                <span style={{ fontSize: '9.5px', color: 'var(--text-muted)', lineHeight: '12px' }}>
                  Mon
                </span>
                <span /> {/* Tue (hidden) */}
                <span style={{ fontSize: '9.5px', color: 'var(--text-muted)', lineHeight: '12px' }}>
                  Wed
                </span>
                <span /> {/* Thu (hidden) */}
                <span style={{ fontSize: '9.5px', color: 'var(--text-muted)', lineHeight: '12px' }}>
                  Fri
                </span>
                <span /> {/* Sat (hidden) */}
              </div>

              {/* 52 Columns */}
              {weeks.map((week) => (
                <div
                  key={`week-${week.weekIndex}`}
                  style={{
                    display: 'grid',
                    gridTemplateRows: 'repeat(7, 12px)',
                    gap: '3px',
                  }}
                >
                  {week.days.map((day, dIdx) => {
                    if (!day) {
                      return <div key={`empty-${week.weekIndex}-${dIdx}`} style={{ width: 12, height: 12 }} />;
                    }

                    const isSelected = selectedDay?.date === day.date;
                    const styleProps = getCellColor(day.intensity, day.isFuture, day.isToday);

                    return (
                      <button
                        key={day.date}
                        type="button"
                        aria-label={`${day.formattedDate}: ${day.intensityLabel}`}
                        onMouseEnter={(e) => handleCellMouseEnter(e, day)}
                        onMouseLeave={handleCellMouseLeave}
                        onClick={() => handleCellClick(day)}
                        style={{
                          width: 12,
                          height: 12,
                          borderRadius: '2.5px',
                          cursor: day.isFuture ? 'default' : 'pointer',
                          padding: 0,
                          transition: 'transform 0.12s ease, filter 0.12s ease',
                          outline: isSelected ? '2px solid var(--color-primary)' : 'none',
                          outlineOffset: '1px',
                          transform: isSelected ? 'scale(1.3)' : undefined,
                          zIndex: isSelected ? 10 : undefined,
                          ...styleProps,
                        }}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ====================================================================
            EXPANDED SELECTED DAY PINNED DRAWER (When user clicks a day)
            ==================================================================== */}
        {selectedDay && (
          <div
            style={{
              backgroundColor: 'var(--bg-elevated)',
              border: '1px solid var(--border-medium)',
              borderRadius: 'var(--radius-md)',
              padding: '14px 16px',
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
              animation: 'fadeIn 0.2s ease-in-out',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 'var(--radius-md)',
                  backgroundColor:
                    selectedDay.intensity >= 3
                      ? 'rgba(16, 185, 129, 0.18)'
                      : selectedDay.intensity >= 1
                      ? 'rgba(99, 102, 241, 0.15)'
                      : 'var(--bg-subtle)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color:
                    selectedDay.intensity >= 3
                      ? 'var(--color-success)'
                      : selectedDay.intensity >= 1
                      ? 'var(--color-primary)'
                      : 'var(--text-muted)',
                }}
              >
                {selectedDay.intensity >= 3 ? <Sparkles size={20} /> : <Calendar size={20} />}
              </div>

              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <h4 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                    {selectedDay.formattedDate}
                  </h4>
                  <Badge
                    variant={
                      selectedDay.intensity === 4
                        ? 'success'
                        : selectedDay.intensity >= 2
                        ? 'info'
                        : selectedDay.intensity === 1
                        ? 'warning'
                        : 'default'
                    }
                  >
                    {selectedDay.intensityLabel}
                  </Badge>
                  {selectedDay.isToday && <Badge variant="primary">Today</Badge>}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: 2 }}>
                  {selectedDay.revisionsCount} Revisions • {selectedDay.questionsCount} Questions •{' '}
                  {selectedDay.studyMinutes}m Study Time
                  {selectedDay.mockTestsCount > 0 ? ` • ${selectedDay.mockTestsCount} Mock Assessment` : ''}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {selectedDay.isToday && (
                <Button
                  variant="primary"
                  size="sm"
                  iconLeft={<Repeat size={14} />}
                  onClick={() => navigateTo('review/due-today')}
                >
                  Resume Today's Review
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedDay(null)}
              >
                Dismiss
              </Button>
            </div>
          </div>
        )}

        {/* ====================================================================
            FOOTER: SEPARATION NOTE & HEATMAP INTENSITY LEGEND
            ==================================================================== */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            paddingTop: '8px',
            borderTop: '1px solid var(--border-subtle)',
          }}
        >
          {/* Clear Platform Separation Reminder */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '12px', color: 'var(--text-muted)' }}>
            <Info size={14} color="var(--color-primary)" />
            <span>
              Represents <strong>Personal Study Consistency</strong> (Spaced Repetition, Questions, Sessions, Mocks). External competitive platforms are analyzed separately.
            </span>
          </div>

          {/* Intensity Legend */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '11.5px', color: 'var(--text-muted)' }}>
            <span>Less</span>
            {([0, 1, 2, 3, 4] as ActivityIntensityLevel[]).map((level) => {
              const styleProps = getCellColor(level, false, false);
              return (
                <div
                  key={`legend-${level}`}
                  title={
                    level === 0
                      ? 'Level 0: No study activity'
                      : level === 1
                      ? 'Level 1: Light (1-2 revs / 1 q / 15-29m)'
                      : level === 2
                      ? 'Level 2: Moderate (3-5 revs / 2 q / 30-59m)'
                      : level === 3
                      ? 'Level 3: Strong (6-9 revs / 3-4 q / 60-89m / mock)'
                      : 'Level 4: Excellent (10+ revs / 5+ q / 90m+ / target met)'
                  }
                  style={{
                    width: 12,
                    height: 12,
                    borderRadius: '2.5px',
                    ...styleProps,
                  }}
                />
              );
            })}
            <span>More</span>
          </div>
        </div>
      </div>
    </Card>
  );
};

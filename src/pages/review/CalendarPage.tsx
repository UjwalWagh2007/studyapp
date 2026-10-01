import React, { useState, useMemo } from 'react';
import {
  Calendar as CalendarIcon,
  Clock,
  Play,
  Award,
  BookOpen,
  Trophy,
  Target,
  ExternalLink,
  ChevronRight,
  Filter,
  CheckCircle2,
  Zap,
} from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';
import { ReviewSessionModal } from '../../components/review/ReviewSessionModal';
import { useAppStore } from '../../context/AppContext';
import {
  buildUnifiedCalendarEvents,
  ACTIVITY_COLORS,
} from '../../services/calendarService';
import { normalizeDate } from '../../services/spacedRepetition';
import type {
  CalendarActivityType,
  Question,
} from '../../types';

export const CalendarPage: React.FC = () => {
  const {
    questions,
    studySessions,
    upcomingContests,
    goals,
    navigateTo,
  } = useAppStore();

  const [selectedDateStr, setSelectedDateStr] = useState<string>(() =>
    normalizeDate(new Date())
  );
  const [selectedActivityFilter, setSelectedActivityFilter] = useState<CalendarActivityType | 'ALL'>('ALL');
  const [isSessionOpen, setIsSessionOpen] = useState(false);
  const [sessionQueue, setSessionQueue] = useState<Question[]>([]);

  // Build unified calendar events
  const { events, eventsByDate, dateRange } = useMemo(() => {
    return buildUnifiedCalendarEvents(
      questions,
      studySessions,
      upcomingContests,
      goals,
      new Date(),
      35 // 5 weeks view
    );
  }, [questions, studySessions, upcomingContests, goals]);

  // Filter events by activity type if selected
  const filteredEvents = useMemo(() => {
    if (selectedActivityFilter === 'ALL') return events;
    return events.filter((e) => e.type === selectedActivityFilter);
  }, [events, selectedActivityFilter]);

  // Selected date's events
  const selectedDateEvents = useMemo(() => {
    const dayEvents = eventsByDate.get(selectedDateStr) || [];
    if (selectedActivityFilter === 'ALL') return dayEvents;
    return dayEvents.filter((e) => e.type === selectedActivityFilter);
  }, [eventsByDate, selectedDateStr, selectedActivityFilter]);

  const selectedDateObj = useMemo(() => {
    const [y, m, d] = selectedDateStr.split('-').map(Number);
    return new Date(y, m - 1, d);
  }, [selectedDateStr]);

  const getActivityIcon = (type: CalendarActivityType) => {
    switch (type) {
      case 'SRS_REVISION':
        return <BookOpen size={14} color={ACTIVITY_COLORS.SRS_REVISION} />;
      case 'WEEKLY_MOCK':
        return <Award size={14} color={ACTIVITY_COLORS.WEEKLY_MOCK} />;
      case 'SUNDAY_SPECIAL':
        return <Zap size={14} color={ACTIVITY_COLORS.SUNDAY_SPECIAL} />;
      case 'STUDY_SESSION':
        return <Clock size={14} color={ACTIVITY_COLORS.STUDY_SESSION} />;
      case 'UPCOMING_CONTEST':
        return <Trophy size={14} color={ACTIVITY_COLORS.UPCOMING_CONTEST} />;
      case 'GOAL_DEADLINE':
        return <Target size={14} color={ACTIVITY_COLORS.GOAL_DEADLINE} />;
      default:
        return <CalendarIcon size={14} />;
    }
  };

  const handleStartReviewSession = (rawQuestions: Question[]) => {
    if (!rawQuestions || rawQuestions.length === 0) return;
    setSessionQueue(rawQuestions);
    setIsSessionOpen(true);
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 24, paddingBottom: 40 }}>
      <PageHeader
        title="Unified Study & Activity Calendar"
        description="Consolidated calendar across spaced repetition revisions, Saturday timed mocks, Sunday special queues, study sessions, upcoming contests, and goal deadlines."
        actions={
          <div style={{ display: 'flex', gap: 10 }}>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setSelectedDateStr(normalizeDate(new Date()))}
            >
              Jump to Today
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => navigateTo('review/due-today')}
            >
              <Clock size={14} style={{ marginRight: 6 }} />
              Start Due Reviews
            </Button>
          </div>
        }
      />

      {/* ACTIVITY LEGEND & FILTER BAR */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 12,
          padding: '12px 18px',
          background: 'var(--bg-card)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-color)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '13px', fontWeight: 600, color: 'var(--text-main)' }}>
          <Filter size={15} style={{ color: 'var(--primary)' }} />
          <span>Filter Activities:</span>
        </div>

        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {[
            { id: 'ALL', label: 'All Activities', color: 'var(--text-main)' },
            { id: 'SRS_REVISION', label: '🔵 SRS Revisions', color: ACTIVITY_COLORS.SRS_REVISION },
            { id: 'WEEKLY_MOCK', label: '🟣 Saturday Mock', color: ACTIVITY_COLORS.WEEKLY_MOCK },
            { id: 'SUNDAY_SPECIAL', label: '🟠 Sunday Special', color: ACTIVITY_COLORS.SUNDAY_SPECIAL },
            { id: 'STUDY_SESSION', label: '🟢 Study Sessions', color: ACTIVITY_COLORS.STUDY_SESSION },
            { id: 'UPCOMING_CONTEST', label: '🟡 Contests', color: ACTIVITY_COLORS.UPCOMING_CONTEST },
            { id: 'GOAL_DEADLINE', label: '🔴 Goal Deadlines', color: ACTIVITY_COLORS.GOAL_DEADLINE },
          ].map((item) => {
            const isSelected = selectedActivityFilter === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setSelectedActivityFilter(item.id as any)}
                style={{
                  padding: '5px 12px',
                  borderRadius: 'var(--radius-full)',
                  border: isSelected ? '1px solid var(--primary)' : '1px solid var(--border-color)',
                  background: isSelected ? 'rgba(59, 130, 246, 0.15)' : 'var(--bg-hover)',
                  color: isSelected ? 'var(--primary)' : 'var(--text-muted)',
                  fontSize: '12px',
                  fontWeight: isSelected ? 600 : 500,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* 5-WEEK UNIFIED CALENDAR GRID */}
      <Card
        title="Calendar Schedule (5-Week Forecast)"
        subtitle={`Visual indicators reflect all active study disciplines (${filteredEvents.length} scheduled items)`}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(7, 1fr)',
            gap: 8,
            overflowX: 'auto',
          }}
        >
          {dateRange.map((day) => {
            const isSelected = day.dateStr === selectedDateStr;
            const dayEvents = eventsByDate.get(day.dateStr) || [];
            const displayEvents =
              selectedActivityFilter === 'ALL'
                ? dayEvents
                : dayEvents.filter((e) => e.type === selectedActivityFilter);

            return (
              <div
                key={day.dateStr}
                onClick={() => setSelectedDateStr(day.dateStr)}
                style={{
                  minHeight: 110,
                  padding: '8px 10px',
                  borderRadius: 'var(--radius-md)',
                  background: isSelected
                    ? 'rgba(59, 130, 246, 0.12)'
                    : day.isToday
                    ? 'var(--bg-hover)'
                    : 'var(--bg-card)',
                  border: isSelected
                    ? '2px solid var(--primary)'
                    : day.isToday
                    ? '1.5px solid var(--primary)'
                    : '1px solid var(--border-color)',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: 6,
                  transition: 'all 0.15s ease',
                }}
                className="hover-card"
              >
                {/* Header: Weekday + Date */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 600,
                      color: day.isToday ? 'var(--primary)' : 'var(--text-muted)',
                      textTransform: 'uppercase',
                    }}
                  >
                    {day.isToday ? 'Today' : day.weekday}
                  </span>
                  <span
                    style={{
                      fontSize: '13px',
                      fontWeight: 700,
                      color: day.isToday ? 'var(--primary)' : 'var(--text-main)',
                    }}
                  >
                    {day.displayDay.split(' ')[1]}
                  </span>
                </div>

                {/* Event Indicator Pills / Badges */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {displayEvents.slice(0, 3).map((ev) => (
                    <div
                      key={ev.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                        padding: '2px 6px',
                        borderRadius: 'var(--radius-sm)',
                        background: `${ev.color}18`,
                        border: `1px solid ${ev.color}35`,
                        fontSize: '10.5px',
                        fontWeight: 600,
                        color: ev.color,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                      title={ev.title}
                    >
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: ev.color, flexShrink: 0 }} />
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{ev.badgeText}</span>
                    </div>
                  ))}

                  {displayEvents.length > 3 && (
                    <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 500, paddingLeft: 4 }}>
                      +{displayEvents.length - 3} more
                    </span>
                  )}
                </div>

                {/* Empty placeholder */}
                {displayEvents.length === 0 && (
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', opacity: 0.6 }}>
                    No events
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </Card>

      {/* SELECTED DATE DETAIL BREAKDOWN */}
      <Card
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 'var(--radius-md)',
                background: 'rgba(59, 130, 246, 0.12)',
                color: 'var(--primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <CalendarIcon size={18} />
            </div>
            <div>
              <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-main)' }}>
                {selectedDateStr === normalizeDate(new Date())
                  ? `Today's Schedule (${selectedDateObj.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })})`
                  : `Schedule for ${selectedDateObj.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })}`}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: 2 }}>
                {selectedDateEvents.length} scheduled item{selectedDateEvents.length === 1 ? '' : 's'} across active disciplines
              </div>
            </div>
          </div>
        }
      >
        {selectedDateEvents.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {selectedDateEvents.map((item) => (
              <div
                key={item.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '14px 18px',
                  borderRadius: 'var(--radius-lg)',
                  background: 'var(--bg-hover)',
                  border: `1px solid ${item.color}40`,
                  flexWrap: 'wrap',
                  gap: 12,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 260, flex: 1 }}>
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 'var(--radius-md)',
                      background: `${item.color}18`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    {getActivityIcon(item.type)}
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontWeight: 600, fontSize: '14.5px', color: 'var(--text-main)' }}>
                        {item.title}
                      </span>
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 600,
                          padding: '2px 8px',
                          borderRadius: 'var(--radius-full)',
                          background: `${item.color}20`,
                          color: item.color,
                        }}
                      >
                        {item.badgeText}
                      </span>
                    </div>
                    {item.subtitle && (
                      <div style={{ fontSize: '12.5px', color: 'var(--text-muted)', marginTop: 2 }}>
                        {item.subtitle}
                      </div>
                    )}
                  </div>
                </div>

                {/* Direct action triggers */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  {item.timeStr && (
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Clock size={13} />
                      {item.timeStr}
                    </span>
                  )}

                  {item.type === 'SRS_REVISION' && item.rawItem && (
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => handleStartReviewSession(item.rawItem)}
                    >
                      <Play size={13} style={{ marginRight: 6 }} />
                      Start Review Batch ({item.rawItem.length})
                    </Button>
                  )}

                  {item.actionRoute && item.type !== 'SRS_REVISION' && (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => navigateTo(item.actionRoute!)}
                    >
                      {item.actionText || 'Open'}
                      <ChevronRight size={13} style={{ marginLeft: 4 }} />
                    </Button>
                  )}

                  {item.externalUrl && (
                    <a
                      href={item.externalUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ textDecoration: 'none' }}
                    >
                      <Button variant="secondary" size="sm">
                        <ExternalLink size={13} style={{ marginRight: 6 }} />
                        {item.actionText || 'Go to Contest'}
                      </Button>
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={<CheckCircle2 size={24} />}
            title="No activities scheduled for this date"
            description="Clear day in your study plan. You can start focused learning, drill algorithmic patterns, or prepare for upcoming contests."
          />
        )}
      </Card>

      {/* Review Session Modal */}
      <ReviewSessionModal
        isOpen={isSessionOpen}
        onClose={() => setIsSessionOpen(false)}
        initialQuestions={sessionQueue}
      />
    </div>
  );
};

import React, { useState, useMemo } from 'react';
import {
  Calendar as CalendarIcon,
  Clock,
  ExternalLink,
  BookOpen,
} from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { Badge } from '../components/ui/Badge';
import { EmptyState } from '../components/ui/EmptyState';
import { useAppStore } from '../context/AppContext';
import { buildCalendarDays } from '../services/calendarService';
import type { Difficulty } from '../types';

export const CalendarPage: React.FC = () => {
  const { problems, navigateTo } = useAppStore();

  const [selectedDateStr, setSelectedDateStr] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });

  const calendarDays = useMemo(() => {
    return buildCalendarDays(problems, new Date(), 35);
  }, [problems]);

  const selectedDayItem = calendarDays.find((d) => d.dateStr === selectedDateStr) || calendarDays[0];

  const totalScheduledProblems = useMemo(() => {
    return problems.filter((p) => Boolean(p.nextReviewAt)).length;
  }, [problems]);

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
        title="Revision Calendar"
        description="View your scheduled spaced-repetition revisions across the upcoming weeks."
      />

      {problems.length === 0 ? (
        <EmptyState
          icon={<CalendarIcon size={30} />}
          title="No scheduled revisions yet"
          description="Log problems in your curriculum topics to automatically populate your revision calendar."
          actionText="Go to Topics"
          actionIcon={<BookOpen size={15} />}
          onAction={() => navigateTo('topics')}
        />
      ) : (
        <div className="calendar-layout-grid">
          {/* Main 5-Week Calendar Grid */}
          <div
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-lg)',
              padding: 20,
              display: 'flex',
              flexDirection: 'column',
              gap: 16,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>
                Upcoming 5 Weeks ({totalScheduledProblems} Scheduled)
              </span>
            </div>

            {/* Weekday Labels Header */}
            <div
              className="calendar-weekday-header"
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(7, 1fr)',
                gap: 4,
                textAlign: 'center',
                fontWeight: 600,
                fontSize: '12px',
                color: 'var(--text-muted)',
                paddingBottom: 4,
                borderBottom: '1px solid var(--border-subtle)',
              }}
            >
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                <div key={day}>
                  <span className="badge-text-full">{day}</span>
                  <span className="badge-text-short">{day[0]}</span>
                </div>
              ))}
            </div>

            {/* Calendar Days Matrix */}
            <div className="calendar-matrix-grid">
              {calendarDays.map((day) => {
                const isSelected = selectedDateStr === day.dateStr;
                const count = day.scheduledProblems.length;

                return (
                  <div
                    key={day.dateStr}
                    onClick={() => setSelectedDateStr(day.dateStr)}
                    className="calendar-cell"
                    style={{
                      border: isSelected
                        ? '2px solid var(--color-primary)'
                        : day.isToday
                        ? '1px solid var(--color-primary)'
                        : '1px solid var(--border-subtle)',
                      backgroundColor: isSelected
                        ? 'var(--bg-subtle)'
                        : day.isToday
                        ? 'rgba(99, 102, 241, 0.05)'
                        : 'var(--bg-card)',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span
                        style={{
                          fontSize: '12px',
                          fontWeight: day.isToday ? 700 : 500,
                          color: day.isToday ? 'var(--color-primary)' : 'var(--text-secondary)',
                        }}
                      >
                        {day.displayDay}
                      </span>
                      {day.isToday && (
                        <span
                          style={{
                            fontSize: '9px',
                            fontWeight: 700,
                            color: 'var(--color-primary)',
                            textTransform: 'uppercase',
                          }}
                        >
                          <span className="badge-text-full">Today</span>
                          <span className="badge-text-short">•</span>
                        </span>
                      )}
                    </div>

                    <div>
                      {count > 0 ? (
                        <div
                          style={{
                            backgroundColor: 'var(--color-primary)',
                            color: '#ffffff',
                            fontSize: '11px',
                            fontWeight: 700,
                            borderRadius: 'var(--radius-sm)',
                            padding: '2px 5px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 3,
                            maxWidth: '100%',
                            overflow: 'hidden',
                          }}
                        >
                          <Clock size={10} style={{ flexShrink: 0 }} />
                          <span className="badge-text-full">{count} Due</span>
                          <span className="badge-text-short">{count}</span>
                        </div>
                      ) : (
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>-</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Side: Selected Day Breakdown */}
          <div
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-lg)',
              padding: 20,
              display: 'flex',
              flexDirection: 'column',
              gap: 16,
            }}
          >
            <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--color-primary)', fontSize: '12px', fontWeight: 600 }}>
                <CalendarIcon size={14} />
                <span>{selectedDayItem?.isToday ? 'Today' : selectedDayItem?.weekday}</span>
              </div>
              <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', margin: '4px 0 0' }}>
                {selectedDayItem?.displayDay}
              </h3>
            </div>

            {selectedDayItem?.scheduledProblems.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '30px 10px', color: 'var(--text-muted)', fontSize: '13px' }}>
                No revisions scheduled for this date.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)' }}>
                  SCHEDULED PROBLEMS ({selectedDayItem?.scheduledProblems.length}):
                </span>
                {selectedDayItem?.scheduledProblems.map((p) => (
                  <div
                    key={p.id}
                    style={{
                      background: 'var(--bg-subtle)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-md)',
                      padding: 12,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 6,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--text-primary)' }}>
                        {p.title}
                      </span>
                      {p.link && (
                        <a
                          href={p.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ color: 'var(--color-primary)' }}
                        >
                          <ExternalLink size={13} />
                        </a>
                      )}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      <Badge variant="default" size="sm">{p.topicName || 'Topic'}</Badge>
                      <Badge variant={getDifficultyVariant(p.difficulty)} size="sm">
                        {p.difficulty}
                      </Badge>
                      {p.pattern && (
                        <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                          {p.pattern}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

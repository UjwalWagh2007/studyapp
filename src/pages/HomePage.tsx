import React, { useMemo } from 'react';
import {
  Calendar as CalendarIcon,
  Flame,
  Repeat,
  BookOpen,
  Clock,
  Award,
  Target,
} from 'lucide-react';
import { useAppStore } from '../context/AppContext';
import { useToast } from '../context/ToastContext';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Card } from '../components/ui/Card';
import { ProgressBar } from '../components/ui/ProgressBar';
import { EmptyState } from '../components/ui/EmptyState';
import { ConsistencyHeatmap } from '../components/dashboard/ConsistencyHeatmap';
import { normalizeDate, addDays } from '../services/spacedRepetition';
import type {
  UpcomingScheduleItem,
  QuickInsights,
} from '../types';

export const HomePage: React.FC = () => {
  const {
    settings,
    navigateTo,
    dueTodayQuestions,
    questions,
    srStats,
    mockTests,
    sundaySpecialQueue,
    latestWeeklyReport,
    todayMetrics,
    platformAccounts,
  } = useAppStore();
  const { showToast } = useToast();

  // Dynamic Time Greeting
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  }, []);

  // Formatted Date
  const formattedDate = useMemo(() => {
    return new Intl.DateTimeFormat('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    }).format(new Date());
  }, []);

  // Section 1: Today's Target State
  const dueTodayCount = dueTodayQuestions.length;
  const masteredCount = useMemo(() => questions.filter((q) => q.status === 'MASTERED').length, [questions]);

  const tomorrowStr = useMemo(() => addDays(new Date(), 1), []);
  const dueTomorrowCount = useMemo(() => {
    return questions.filter((q) => !q.isArchived && normalizeDate(q.nextReviewAt) === tomorrowStr).length;
  }, [questions, tomorrowStr]);

  const totalTasks =
    todayMetrics.newQuestionsTarget + todayMetrics.revisionsTarget + todayMetrics.studyTimeTargetMinutes;
  const completedTasks =
    todayMetrics.newQuestionsCompleted +
    todayMetrics.revisionsCompleted +
    todayMetrics.studyTimeCompletedMinutes;
  const todayProgressPercent = totalTasks > 0 ? Math.min(100, Math.round((completedTasks / totalTasks) * 100)) : 0;

  // Section 3: Upcoming Schedule Data Structure
  const upcomingItems: UpcomingScheduleItem[] = [
    {
      id: 'sched-1',
      title: 'Interval Spaced Repetitions',
      category: 'Upcoming Revisions',
      dateDisplay:
        dueTodayCount > 0
          ? `${dueTodayCount} question${dueTodayCount === 1 ? '' : 's'} due today`
          : dueTomorrowCount > 0
          ? `${dueTomorrowCount} question${dueTomorrowCount === 1 ? '' : 's'} due tomorrow`
          : 'All caught up',
      badgeText:
        dueTodayCount > 0
          ? `${dueTodayCount} Cards Due`
          : dueTomorrowCount > 0
          ? `${dueTomorrowCount} Due Tomorrow`
          : '0 Cards',
      description: 'Scheduled active recall cards due for SM-2 interval expansion.',
    },
    {
      id: 'sched-2',
      title: `Saturday Timed Assessment Mock #${mockTests.length + 1}`,
      category: 'Saturday Mock Test',
      dateDisplay: 'Saturday, 10:00 AM',
      badgeText: '60 Min Simulation',
      description: 'Mixed speed run synthesized from your personal question database.',
    },
    {
      id: 'sched-3',
      title: 'Sunday Special: Weak Pattern Deep Dive',
      category: 'Sunday Special Revision',
      dateDisplay: 'Sunday, 11:00 AM',
      badgeText: `${sundaySpecialQueue.length} Priority Items`,
      description: 'Curated re-solve queue from mock mistakes and failed recall cards.',
    },
  ];

  // Section 5: Quick Insights (Purely computed from real user data)
  const insightsData: QuickInsights = {
    questionsMastered: masteredCount,
    revisionAccuracyPercent: srStats.recallAccuracyPercent ?? latestWeeklyReport.revisionAccuracyPercent ?? null,
    weakestPattern: latestWeeklyReport.weakAreas.find((w) => w.type === 'Pattern')?.name ?? '',
    totalStudyHours: Math.round((latestWeeklyReport.totalStudyMinutes / 60) * 10) / 10 || 0,
  };

  const handleStartRevision = () => {
    showToast(
      'Starting Today\'s Revision',
      'Navigating to your spaced repetition queue.',
      'info'
    );
    navigateTo('review/due-today');
  };

  const handleStartStudy = () => {
    showToast(
      'Starting Study Session',
      'Opening structured curriculum topics.',
      'info'
    );
    navigateTo('learn/topics');
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* ====================================================================
          SECTION 1 — GREETING / TODAY
          ==================================================================== */}
      <section className="dashboard-today-banner">
        <div className="today-banner-header">
          <div>
            <h1 className="greeting-text">
              {greeting}, {settings.userName}
            </h1>
            <div className="date-indicator">
              <CalendarIcon size={14} />
              <span>{formattedDate}</span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 14px',
                borderRadius: 'var(--radius-full)',
                backgroundColor: 'rgba(245, 158, 11, 0.12)',
                color: 'var(--color-warning)',
                fontWeight: 600,
                fontSize: '13px',
                border: '1px solid rgba(245, 158, 11, 0.3)',
              }}
            >
              <Flame size={16} />
              <span>{todayMetrics.streakDays} Day Streak</span>
            </div>
          </div>
        </div>

        {/* Today's Target Stats Strip */}
        <div className="today-metrics-strip">
          <div className="metric-strip-item">
            <span className="metric-strip-label">New Questions Target</span>
            <span className="metric-strip-value">
              {todayMetrics.newQuestionsCompleted} / {todayMetrics.newQuestionsTarget}
            </span>
          </div>

          <div className="metric-strip-item">
            <span className="metric-strip-label">Revisions Target</span>
            <span className="metric-strip-value">
              {todayMetrics.revisionsCompleted} / {todayMetrics.revisionsTarget}
            </span>
          </div>

          <div className="metric-strip-item">
            <span className="metric-strip-label">Study Time Target</span>
            <span className="metric-strip-value">
              {todayMetrics.studyTimeCompletedMinutes} / {todayMetrics.studyTimeTargetMinutes} min
            </span>
          </div>

          <div className="metric-strip-item">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="metric-strip-label">Today's Progress</span>
              <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                {todayProgressPercent}%
              </span>
            </div>
            <div style={{ marginTop: 4 }}>
              <ProgressBar value={todayProgressPercent} max={100} size="sm" variant="primary" />
            </div>
          </div>
        </div>
      </section>

      {/* ====================================================================
          SECTION 2 — TODAY'S PLAN (Visually Prominent & Actionable)
          ==================================================================== */}
      <section className="action-plan-card">
        <div className="action-plan-header">
          <div className="action-plan-title-block">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Target size={20} color="var(--color-primary)" />
              <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)' }}>
                Today's Action Plan
              </h2>
            </div>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
              Prioritized study agenda generated from your personal question bank and spaced repetition queue.
            </p>
          </div>

          <div className="action-plan-actions-group">
            <Button
              variant="primary"
              size="lg"
              iconLeft={<Repeat size={17} />}
              onClick={handleStartRevision}
            >
              START REVISION
            </Button>
            <Button
              variant="secondary"
              size="lg"
              iconLeft={<BookOpen size={17} />}
              onClick={handleStartStudy}
            >
              START STUDY
            </Button>
          </div>
        </div>

        {/* Action Plan Breakdown Details / Realistic Empty State */}
        <div
          style={{
            padding: '20px',
            backgroundColor: 'var(--bg-subtle)',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border-subtle)',
            display: 'flex',
            flexDirection: 'column',
            gap: 14,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}>
              Active Study Queue Status
            </span>
            <Badge variant="default">Awaiting Session</Badge>
          </div>

          <EmptyState
            icon={<Clock size={22} />}
            title="No pending revisions in today's active queue"
            description="When you enroll algorithmic questions into topics, their review schedules will appear here automatically."
            actionText="Browse Questions Bank"
            onAction={() => navigateTo('learn/questions')}
            secondaryActionText="Create New Topic"
            onSecondaryAction={() => navigateTo('learn/topics')}
          />
        </div>
      </section>

      {/* ====================================================================
          CONSISTENCY HEATMAP (Personal Study OS Consistency — 12 Months)
          ==================================================================== */}
      <section>
        <ConsistencyHeatmap />
      </section>

      {/* ====================================================================
          TWO-COLUMN SUPPORTING METRICS & SCHEDULE
          ==================================================================== */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: 20,
        }}
      >
        {/* ====================================================================
            SECTION 3 — UPCOMING
            ==================================================================== */}
        <Card
          title="Upcoming Schedule"
          subtitle="Forecasted revisions, Saturday Mock, and Sunday Special"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {upcomingItems.map((item) => (
              <div
                key={item.id}
                className="schedule-item"
                style={{ cursor: 'pointer' }}
                onClick={() => {
                  if (item.category === 'Upcoming Revisions') {
                    navigateTo('review/due-today');
                  } else {
                    navigateTo('test/mock-tests');
                  }
                }}
              >
                <span className="schedule-dot" />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 3, flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                    <span style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--text-primary)' }}>
                      {item.title}
                    </span>
                    <Badge variant={item.category === 'Saturday Mock Test' ? 'warning' : item.category === 'Sunday Special Revision' ? 'purple' : 'info'}>
                      {item.badgeText}
                    </Badge>
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    {item.dateDisplay} • {item.description}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* ====================================================================
            SECTION 4 — CODING ACTIVITY (System B External Platforms)
            ==================================================================== */}
        <Card
          title="Coding Activity (System B)"
          subtitle="External competitive programming platforms"
          headerAction={
            <Button variant="ghost" size="sm" onClick={() => navigateTo('settings')}>
              Manage Handles
            </Button>
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {platformAccounts.map((account) => {
              const isConnected = account.status === 'CONNECTED';
              return (
                <div key={account.id} className="platform-status-item">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Award size={18} color={isConnected ? 'var(--color-primary)' : 'var(--text-muted)'} />
                    <span style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--text-primary)' }}>
                      {account.name}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Badge variant={isConnected ? 'success' : 'default'}>
                      {isConnected ? (account.handle ? `@${account.handle}` : 'Connected') : 'Not connected'}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => navigateTo('settings')}
                      style={{ fontSize: '11.5px', padding: '2px 8px', height: '26px' }}
                    >
                      {isConnected ? 'Manage' : 'Connect'}
                    </Button>
                  </div>
                </div>
              );
            })}

            <div
              style={{
                marginTop: 6,
                padding: '8px 12px',
                backgroundColor: 'var(--bg-subtle)',
                borderRadius: 'var(--radius-md)',
                fontSize: '11.5px',
                color: 'var(--text-muted)',
                lineHeight: 1.4,
              }}
            >
              ℹ️ External platform statistics track total solved and contest ratings independently without polluting your personal study queue.
            </div>
          </div>
        </Card>
      </div>

      {/* ====================================================================
          SECTION 5 — QUICK INSIGHTS
          ==================================================================== */}
      <Card
        title="Quick Insights"
        subtitle="High-level mastery, accuracy, and study metrics"
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: 12,
          }}
        >
          {/* Tile 1: Questions Mastered */}
          <div className="insight-tile">
            <span className="insight-tile-label">Questions Mastered</span>
            <span className="insight-tile-value">{insightsData.questionsMastered}</span>
            <span className="insight-tile-detail">Level 5 mastery achieved</span>
          </div>

          {/* Tile 2: Revision Accuracy */}
          <div className="insight-tile">
            <span className="insight-tile-label">Current Revision Accuracy</span>
            <span className="insight-tile-value">
              {insightsData.revisionAccuracyPercent !== null ? `${insightsData.revisionAccuracyPercent}%` : '--'}
            </span>
            <span className="insight-tile-detail">Recall performance</span>
          </div>

          {/* Tile 3: Weakest Pattern */}
          <div className="insight-tile">
            <span className="insight-tile-label">Weakest Pattern</span>
            <span className="insight-tile-value" style={{ fontSize: '14px' }}>
              {insightsData.weakestPattern || 'None identified'}
            </span>
            <span className="insight-tile-detail">Based on mistake frequency</span>
          </div>

          {/* Tile 4: Total Study Hours */}
          <div className="insight-tile">
            <span className="insight-tile-label">Total Study Time</span>
            <span className="insight-tile-value">{insightsData.totalStudyHours.toFixed(1)} hrs</span>
            <span className="insight-tile-detail">Logged session time</span>
          </div>
        </div>
      </Card>
    </div>
  );
};

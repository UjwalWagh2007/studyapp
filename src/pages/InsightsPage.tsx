import React, { useState, useMemo } from 'react';
import {
  Clock,
  BookOpen,
  Trophy,
  Flame,
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  Code2,
  Sparkles,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { EmptyState } from '../components/ui/EmptyState';
import { useAppStore } from '../context/AppContext';
import {
  calculateOverviewMetrics,
  calculateSkillsAnalysis,
  calculateStudyTrends,
  calculateCodingInsights,
} from '../services/insightsService';
import type { Difficulty } from '../types';

export const InsightsPage: React.FC = () => {
  const {
    questions,
    topics,
    studySessions,
    platformAccounts,
    contestRecords,
    mistakes,
    streakStats,
  } = useAppStore();

  const [activeTab, setActiveTab] = useState<'overview' | 'skills' | 'study' | 'coding'>('overview');

  // Compute metrics using insightsService
  const overview = useMemo(
    () =>
      calculateOverviewMetrics(
        questions,
        studySessions,
        platformAccounts,
        streakStats.currentStreak,
        streakStats.bestStreak
      ),
    [questions, studySessions, platformAccounts, streakStats.currentStreak, streakStats.bestStreak]
  );

  const skills = useMemo(
    () => calculateSkillsAnalysis(topics, questions, mistakes),
    [topics, questions, mistakes]
  );

  const studyTrends = useMemo(
    () => calculateStudyTrends(questions, studySessions),
    [questions, studySessions]
  );

  const codingInsights = useMemo(
    () => calculateCodingInsights(platformAccounts, contestRecords),
    [platformAccounts, contestRecords]
  );

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

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 24, paddingBottom: 40 }}>
      <PageHeader
        title="Unified Insights & Analytics"
        description="Transparent progress metrics across deep study hours, spaced repetition retention, pattern mastery, and competitive coding."
      />

      {/* DATA HONESTY BANNER */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '12px 18px',
          borderRadius: 'var(--radius-lg)',
          background: 'rgba(59, 130, 246, 0.08)',
          border: '1px solid rgba(59, 130, 246, 0.25)',
          fontSize: '13px',
          color: 'var(--text-main)',
        }}
      >
        <ShieldCheck size={20} style={{ color: 'var(--primary)', flexShrink: 0 }} />
        <div style={{ flex: 1 }}>
          <strong style={{ color: 'var(--text-main)' }}>Data Honesty Principle: </strong>
          <span style={{ color: 'var(--text-muted)' }}>
            All statistics are strictly computed from your actual logged reviews, study sessions, and platform profiles.
            Metrics with limited data points are explicitly flagged with sample size warnings rather than making bold predictions.
          </span>
        </div>
      </div>

      {/* INTERNAL TABS */}
      <div
        style={{
          display: 'flex',
          gap: 8,
          borderBottom: '1px solid var(--border-color)',
          paddingBottom: 12,
          overflowX: 'auto',
        }}
      >
        {[
          { id: 'overview', label: '🌟 Overview' },
          { id: 'skills', label: '🧠 Skills & Patterns' },
          { id: 'study', label: '📖 Study & Retention' },
          { id: 'coding', label: '💻 Coding & Contests' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            style={{
              padding: '8px 18px',
              borderRadius: 'var(--radius-full)',
              border: 'none',
              fontSize: '13px',
              fontWeight: activeTab === tab.id ? 600 : 500,
              background: activeTab === tab.id ? 'var(--primary)' : 'var(--bg-card)',
              color: activeTab === tab.id ? '#ffffff' : 'var(--text-muted)',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              whiteSpace: 'nowrap',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: OVERVIEW */}
      {/* ========================================================================= */}
      {activeTab === 'overview' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* PRIMARY METRICS GRID */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
            <Card>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
                    <span>Study Hours</span>
                    <span style={{ fontSize: '10px', background: 'var(--bg-hover)', padding: '1px 5px', borderRadius: '4px' }}>RAW DATA</span>
                  </div>
                  <div style={{ fontSize: '28px', fontWeight: 700, color: 'var(--primary)', marginTop: 4 }}>
                    {overview.totalStudyHours} <span style={{ fontSize: '16px', fontWeight: 500 }}>hrs</span>
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: 2 }}>
                    {overview.totalStudyMinutes} minutes focused deep work
                  </div>
                </div>
                <div style={{ width: 44, height: 44, borderRadius: 'var(--radius-md)', background: 'rgba(59, 130, 246, 0.12)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Clock size={22} />
                </div>
              </div>
            </Card>

            <Card>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
                    <span>Questions Tracked</span>
                    <span style={{ fontSize: '10px', background: 'var(--bg-hover)', padding: '1px 5px', borderRadius: '4px' }}>RAW DATA</span>
                  </div>
                  <div style={{ fontSize: '28px', fontWeight: 700, color: 'var(--text-main)', marginTop: 4 }}>
                    {overview.totalQuestions}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: 2 }}>
                    {overview.masteredQuestionsCount} Mastered (Level 4+)
                  </div>
                </div>
                <div style={{ width: 44, height: 44, borderRadius: 'var(--radius-md)', background: 'rgba(16, 185, 129, 0.12)', color: 'var(--success)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <BookOpen size={22} />
                </div>
              </div>
            </Card>

            <Card>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
                    <span>Overall Mastery</span>
                    <span style={{ fontSize: '10px', background: 'var(--bg-hover)', padding: '1px 5px', borderRadius: '4px' }}>CALCULATED</span>
                  </div>
                  <div style={{ fontSize: '28px', fontWeight: 700, color: 'var(--success)', marginTop: 4 }}>
                    {overview.overallMasteryPercent}%
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: 2 }}>
                    {overview.masteredQuestionsCount} of {overview.totalQuestions} fully retained
                  </div>
                </div>
                <div style={{ width: 44, height: 44, borderRadius: 'var(--radius-md)', background: 'rgba(16, 185, 129, 0.12)', color: 'var(--success)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Sparkles size={22} />
                </div>
              </div>
            </Card>

            <Card>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
                    <span>Revision Accuracy</span>
                    <span style={{ fontSize: '10px', background: 'var(--bg-hover)', padding: '1px 5px', borderRadius: '4px' }}>CALCULATED</span>
                  </div>
                  <div style={{ fontSize: '28px', fontWeight: 700, color: 'var(--warning)', marginTop: 4 }}>
                    {overview.revisionAccuracyPercent !== null ? `${overview.revisionAccuracyPercent}%` : '—'}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: 2 }}>
                    Across {overview.totalReviewsCompleted} reviews logged
                  </div>
                </div>
                <div style={{ width: 44, height: 44, borderRadius: 'var(--radius-md)', background: 'rgba(245, 158, 11, 0.12)', color: 'var(--warning)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <CheckCircle2 size={22} />
                </div>
              </div>
            </Card>

            <Card>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
                    <span>Current Streak</span>
                    <span style={{ fontSize: '10px', background: 'var(--bg-hover)', padding: '1px 5px', borderRadius: '4px' }}>TREND</span>
                  </div>
                  <div style={{ fontSize: '28px', fontWeight: 700, color: 'var(--danger)', marginTop: 4 }}>
                    {overview.currentStreak} <span style={{ fontSize: '16px', fontWeight: 500 }}>days</span>
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: 2 }}>
                    Best record: {overview.bestStreak} days
                  </div>
                </div>
                <div style={{ width: 44, height: 44, borderRadius: 'var(--radius-md)', background: 'rgba(239, 68, 68, 0.12)', color: 'var(--danger)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Flame size={22} />
                </div>
              </div>
            </Card>

            <Card>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
                    <span>Platform Solves</span>
                    <span style={{ fontSize: '10px', background: 'var(--bg-hover)', padding: '1px 5px', borderRadius: '4px' }}>SYSTEM B</span>
                  </div>
                  <div style={{ fontSize: '28px', fontWeight: 700, color: 'var(--text-main)', marginTop: 4 }}>
                    {overview.totalPlatformSolved.toLocaleString()}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: 2 }}>
                    Across {overview.connectedPlatformsCount} connected platforms
                  </div>
                </div>
                <div style={{ width: 44, height: 44, borderRadius: 'var(--radius-md)', background: 'rgba(139, 92, 246, 0.12)', color: '#8b5cf6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Code2 size={22} />
                </div>
              </div>
            </Card>
          </div>

          {/* QUICK SUMMARY CARDS */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20 }}>
            {/* Weak Areas Alert if any */}
            <Card title="Immediate Priority Focus" subtitle="Areas with lower retention or frequent failure rates">
              {skills.weakAreasSummary.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {skills.weakAreasSummary.slice(0, 4).map((area, idx) => (
                    <div
                      key={idx}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '10px 14px',
                        background: 'rgba(239, 68, 68, 0.08)',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid rgba(239, 68, 68, 0.2)',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <AlertTriangle size={15} style={{ color: 'var(--danger)' }} />
                        <span style={{ fontWeight: 600, fontSize: '13px', color: 'var(--text-main)' }}>
                          {area}
                        </span>
                      </div>
                      <Badge variant="danger" size="sm">
                        Needs Practice
                      </Badge>
                    </div>
                  ))}
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 4 }}>
                    <Button variant="ghost" size="sm" onClick={() => setActiveTab('skills')}>
                      View Detailed Skills Breakdown <ChevronRight size={14} style={{ marginLeft: 4 }} />
                    </Button>
                  </div>
                </div>
              ) : (
                <div style={{ padding: '16px 0', color: 'var(--text-muted)', fontSize: '13px' }}>
                  ✓ No severe weak areas identified. Mastery is healthy across all active topics.
                </div>
              )}
            </Card>

            {/* Study Time Trend */}
            <Card title="Study Velocity" subtitle="7-day study investment direction">
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                {studyTrends.studyTimeTrendDirection === 'increasing' ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--success)', fontWeight: 600, fontSize: '14px' }}>
                    <TrendingUp size={18} /> Increasing Study Pace
                  </div>
                ) : studyTrends.studyTimeTrendDirection === 'decreasing' ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--danger)', fontWeight: 600, fontSize: '14px' }}>
                    <TrendingDown size={18} /> Decreasing Pace
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-muted)', fontWeight: 600, fontSize: '14px' }}>
                    <Minus size={18} /> Stable Study Routine
                  </div>
                )}
              </div>
              <div style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.45 }}>
                Logged <strong>{overview.totalStudyHours} focused hours</strong> and{' '}
                <strong>{overview.totalReviewsCompleted} active recall reviews</strong> in total.
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 14 }}>
                <Button variant="ghost" size="sm" onClick={() => setActiveTab('study')}>
                  Explore Study Trends <ChevronRight size={14} style={{ marginLeft: 4 }} />
                </Button>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: SKILLS & PATTERNS */}
      {/* ========================================================================= */}
      {activeTab === 'skills' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* TOPIC MASTERY BREAKDOWN */}
          <Card
            title="Topic Mastery Breakdown"
            subtitle="Question counts, mean mastery level (1-5), and mastery ratio by curriculum topic"
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {skills.topicSkills.map((topic) => (
                <div
                  key={topic.topicId}
                  style={{
                    padding: '14px 16px',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--bg-hover)',
                    border: topic.isWeakArea ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid var(--border-color)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 8,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text-main)' }}>
                        {topic.topicName}
                      </span>
                      {topic.isWeakArea && (
                        <Badge variant="danger" size="sm">
                          Weak Area
                        </Badge>
                      )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14, fontSize: '12px', color: 'var(--text-muted)' }}>
                      <span>Questions: <strong style={{ color: 'var(--text-main)' }}>{topic.questionCount}</strong></span>
                      <span>Avg Mastery: <strong style={{ color: 'var(--primary)' }}>{topic.averageMastery} / 5</strong></span>
                      <span>Mastered: <strong style={{ color: 'var(--success)' }}>{topic.masteryPercent}%</strong></span>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div
                    style={{
                      height: 6,
                      width: '100%',
                      background: 'var(--bg-card)',
                      borderRadius: 'var(--radius-full)',
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        height: '100%',
                        width: `${topic.masteryPercent}%`,
                        background: topic.isWeakArea ? 'var(--danger)' : 'var(--success)',
                        transition: 'width 0.3s ease',
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* PATTERN MASTERY & WEAKNESSES */}
          <Card
            title="Algorithmic Pattern Mastery & Accuracy"
            subtitle="Answers: 'Which patterns am I weakest at?' Based on active recall review history"
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {skills.patternSkills.map((p) => (
                <div
                  key={p.pattern}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 16px',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--bg-hover)',
                    border: '1px solid var(--border-color)',
                    flexWrap: 'wrap',
                    gap: 10,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text-main)' }}>
                      {p.pattern}
                    </span>
                    {p.isWeakArea && (
                      <Badge variant="danger" size="sm">
                        Needs Reinforcement
                      </Badge>
                    )}
                    {p.sampleSizeWarning && (
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)', background: 'var(--bg-card)', padding: '2px 6px', borderRadius: '4px' }}>
                        Low review count ({p.totalReviews})
                      </span>
                    )}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 16, fontSize: '12px', color: 'var(--text-muted)' }}>
                    <span>Questions: <strong style={{ color: 'var(--text-main)' }}>{p.questionCount}</strong></span>
                    <span>
                      Recall Accuracy:{' '}
                      <strong style={{ color: p.accuracyPercent !== null && p.accuracyPercent >= 70 ? 'var(--success)' : 'var(--danger)' }}>
                        {p.accuracyPercent !== null ? `${p.accuracyPercent}%` : 'Not reviewed yet'}
                      </strong>
                    </span>
                    <span>Avg Mastery: <strong style={{ color: 'var(--primary)' }}>{p.averageMastery} / 5</strong></span>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* DIFFICULTY PERFORMANCE */}
          <Card
            title="Performance by Difficulty Level"
            subtitle="Calculated recall accuracy and average ease factor across Easy, Medium, and Hard tiers"
          >
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
              {skills.difficultySkills.map((diff) => (
                <div
                  key={diff.difficulty}
                  style={{
                    padding: 16,
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--bg-hover)',
                    border: '1px solid var(--border-color)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 8,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Badge variant={getDifficultyBadgeVariant(diff.difficulty)} size="sm">
                      {diff.difficulty}
                    </Badge>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                      {diff.totalQuestions} Questions
                    </span>
                  </div>

                  <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text-main)', marginTop: 4 }}>
                    {diff.accuracyPercent !== null ? `${diff.accuracyPercent}%` : '—'}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    Recall Accuracy • Avg Ease: {diff.averageEaseFactor}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: STUDY & RETENTION */}
      {/* ========================================================================= */}
      {activeTab === 'study' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* 7-DAY STUDY TIME BAR VISUALIZATION */}
          <Card
            title="Study Time Trend (Last 7 Days)"
            subtitle="Answers: 'Is my study time increasing?' Daily focused deep work minutes"
            headerAction={
              <Badge variant={studyTrends.studyTimeTrendDirection === 'increasing' ? 'success' : 'default'} size="sm">
                Trend: {studyTrends.studyTimeTrendDirection.toUpperCase()}
              </Badge>
            }
          >
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 10, height: 160, padding: '20px 10px 0' }}>
              {studyTrends.dailyStudyMinutesLast7Days.map((day) => {
                const maxMins = Math.max(...studyTrends.dailyStudyMinutesLast7Days.map((d) => d.minutes), 60);
                const heightPct = Math.max(8, (day.minutes / maxMins) * 100);

                return (
                  <div
                    key={day.date}
                    style={{
                      flex: 1,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 6,
                      height: '100%',
                      justifyContent: 'flex-end',
                    }}
                  >
                    <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-main)' }}>
                      {day.minutes > 0 ? `${day.minutes}m` : '0'}
                    </span>
                    <div
                      style={{
                        width: '100%',
                        maxWidth: 44,
                        height: `${heightPct}%`,
                        background: day.minutes > 0 ? 'var(--primary)' : 'var(--bg-hover)',
                        borderRadius: 'var(--radius-sm)',
                        transition: 'height 0.3s ease',
                      }}
                    />
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      {day.dayLabel}
                    </span>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* LEARNING FUNNEL & RETENTION BREAKDOWN */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16 }}>
            <Card title="Spaced Repetition Learning Funnel" subtitle="Question progression through SM-2 stages">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[
                  { label: 'New (Unscheduled)', count: studyTrends.questionsNewCount, color: 'var(--text-muted)' },
                  { label: 'Learning (Interval < 6d)', count: questions.filter((q) => q.status === 'LEARNING').length, color: 'var(--primary)' },
                  { label: 'Reviewing (Interval ≥ 6d)', count: studyTrends.questionsReviewingCount, color: 'var(--warning)' },
                  { label: 'Mastered (Level 4/5)', count: studyTrends.questionsMasteredCount, color: 'var(--success)' },
                ].map((stage, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 14px',
                      background: 'var(--bg-hover)',
                      borderRadius: 'var(--radius-md)',
                    }}
                  >
                    <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-main)' }}>
                      {stage.label}
                    </span>
                    <span style={{ fontSize: '15px', fontWeight: 700, color: stage.color }}>
                      {stage.count}
                    </span>
                  </div>
                ))}
              </div>
            </Card>

            <Card title="Retention & Review Backlog" subtitle="Memory durability and active queue health">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ padding: 14, background: 'var(--bg-hover)', borderRadius: 'var(--radius-md)' }}>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Long-Term Retention Rate</div>
                  <div style={{ fontSize: '28px', fontWeight: 700, color: 'var(--success)', marginTop: 4 }}>
                    {studyTrends.retentionRatePercent !== null ? `${studyTrends.retentionRatePercent}%` : '—'}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: 2 }}>
                    Proportion of cards successfully recalled on due dates
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div style={{ padding: 12, background: 'var(--bg-hover)', borderRadius: 'var(--radius-md)' }}>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Due Today</div>
                    <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--primary)', marginTop: 2 }}>
                      {studyTrends.dueTodayCount}
                    </div>
                  </div>

                  <div style={{ padding: 12, background: 'var(--bg-hover)', borderRadius: 'var(--radius-md)' }}>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Overdue Backlog</div>
                    <div style={{ fontSize: '20px', fontWeight: 700, color: studyTrends.overdueCount > 0 ? 'var(--danger)' : 'var(--text-main)', marginTop: 2 }}>
                      {studyTrends.overdueCount}
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: CODING & CONTESTS (SYSTEM B) */}
      {/* ========================================================================= */}
      {activeTab === 'coding' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* PLATFORM SOLVED VOLUMES */}
          <Card
            title="External Platform Activity"
            subtitle="Problems solved across LeetCode, Codeforces, AtCoder, CodeChef, and GeeksforGeeks"
          >
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
              {codingInsights.platformsBreakdown.map((p) => (
                <div
                  key={p.platformId}
                  style={{
                    padding: 16,
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--bg-hover)',
                    border: '1px solid var(--border-color)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 8,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text-main)' }}>
                      {p.name}
                    </span>
                    {p.handle ? (
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>@{p.handle}</span>
                    ) : (
                      <Badge variant="default" size="sm">Unlinked</Badge>
                    )}
                  </div>

                  <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text-main)', marginTop: 2 }}>
                    {p.totalSolved.toLocaleString()} <span style={{ fontSize: '13px', fontWeight: 400 }}>solved</span>
                  </div>

                  {p.currentRating ? (
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                      Rating: <strong style={{ color: 'var(--primary)' }}>{p.currentRating}</strong> (Peak: {p.maxRating || p.currentRating})
                    </div>
                  ) : null}

                  <div style={{ display: 'flex', gap: 8, fontSize: '11px', marginTop: 4 }}>
                    <span style={{ color: 'var(--success)' }}>{p.easySolved}E</span>
                    <span style={{ color: 'var(--warning)' }}>{p.mediumSolved}M</span>
                    <span style={{ color: 'var(--danger)' }}>{p.hardSolved}H</span>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* LATEST CONTEST RATING MOVEMENTS */}
          <Card
            title="Latest Contest Rating Movements"
            subtitle="Answers: 'How is my contest rating changing?' Chronological delta movements"
          >
            {codingInsights.latestRatingDeltas.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {codingInsights.latestRatingDeltas.map((c, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '12px 16px',
                      borderRadius: 'var(--radius-md)',
                      background: 'var(--bg-hover)',
                      border: '1px solid var(--border-color)',
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text-main)' }}>
                        {c.contestName}
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: 2 }}>
                        {c.platformName} • {new Date(c.date).toLocaleDateString()}
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Rating After</div>
                        <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-main)' }}>
                          {c.ratingAfter}
                        </div>
                      </div>

                      <Badge variant={c.ratingChange >= 0 ? 'success' : 'danger'} size="md">
                        {c.ratingChange >= 0 ? `+${c.ratingChange}` : c.ratingChange}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                icon={<Trophy size={24} />}
                title="No contest rating shifts logged yet"
                description="Contest rating deltas will automatically reflect as you participate in competitive rounds."
              />
            )}
          </Card>
        </div>
      )}
    </div>
  );
};

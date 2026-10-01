import React, { useState } from 'react';
import {
  Calendar,
  RefreshCw,
  ExternalLink,
  ChevronRight,
  ChevronDown,
  Clock,
  BookOpen,
  Award,
  PlusCircle,
  Edit3,
  AlertCircle,
  ShieldCheck,
} from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { EmptyState } from '../../components/ui/EmptyState';
import { useAppStore } from '../../context/AppContext';
import { useToast } from '../../context/ToastContext';
import {
  formatCountdown,
  formatContestDuration,
} from '../../services/contestService';
import type {
  PlatformId,
  ContestRecord,
} from '../../types';

export const ContestsPage: React.FC = () => {
  const {
    platformAccounts,
    contestRecords,
    contestJournal,
    upcomingContests,
    contestAnalysis,
    addContestRecord,
    saveContestJournalEntry,
    refreshUpcomingContests,
    syncAllPlatforms,
    topics,
    navigateTo,
  } = useAppStore();

  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<'overview' | 'upcoming' | 'history' | 'analysis' | 'journal'>('overview');
  const [selectedPlatformGraph, setSelectedPlatformGraph] = useState<PlatformId>('codeforces');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [expandedContestId, setExpandedContestId] = useState<string | null>(null);

  // Journal Modal State
  const [journalModalOpen, setJournalModalOpen] = useState(false);
  const [journalingContest, setJournalingContest] = useState<ContestRecord | null>(null);
  const [journalForm, setJournalForm] = useState<{
    id?: string;
    whatWentWell: string;
    whatWentWrong: string;
    conceptsText: string;
    whatToPractice: string;
    selectedTopicIds: string[];
  }>({
    whatWentWell: '',
    whatWentWrong: '',
    conceptsText: '',
    whatToPractice: '',
    selectedTopicIds: [],
  });

  // Manual Log Contest Modal State
  const [logModalOpen, setLogModalOpen] = useState(false);
  const [logForm, setLogForm] = useState<{
    platform: PlatformId;
    contestName: string;
    contestUrl: string;
    rank: number;
    totalParticipants: number;
    ratingBefore: number;
    ratingAfter: number;
    problemsSolved: number;
    totalProblems: number;
  }>({
    platform: 'leetcode',
    contestName: '',
    contestUrl: '',
    rank: 1500,
    totalParticipants: 20000,
    ratingBefore: 1800,
    ratingAfter: 1840,
    problemsSolved: 3,
    totalProblems: 4,
  });

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([syncAllPlatforms(), refreshUpcomingContests()]);
      showToast('Data Refreshed', 'Upcoming schedules and platform ratings updated.', 'success');
    } catch {
      showToast('Refresh Warning', 'Could not refresh some external feeds.', 'warning');
    } finally {
      setIsRefreshing(false);
    }
  };

  const openJournalModal = (contest: ContestRecord) => {
    setJournalingContest(contest);
    const existing = contestJournal.find(
      (j) => j.id === contest.journalEntryId || j.contestId === contest.id
    );

    if (existing) {
      setJournalForm({
        id: existing.id,
        whatWentWell: existing.whatWentWell,
        whatWentWrong: existing.whatWentWrong,
        conceptsText: existing.conceptsThatCausedProblems.join(', '),
        whatToPractice: existing.whatToPractice,
        selectedTopicIds: existing.linkedTopicIds || [],
      });
    } else {
      setJournalForm({
        whatWentWell: '',
        whatWentWrong: '',
        conceptsText: '',
        whatToPractice: '',
        selectedTopicIds: [],
      });
    }
    setJournalModalOpen(true);
  };

  const handleSaveJournal = () => {
    if (!journalingContest) return;

    const concepts = journalForm.conceptsText
      .split(',')
      .map((c) => c.trim())
      .filter((c) => c.length > 0);

    saveContestJournalEntry({
      id: journalForm.id,
      contestId: journalingContest.id,
      contestName: journalingContest.contestName,
      platform: journalingContest.platform,
      date: journalingContest.date,
      whatWentWell: journalForm.whatWentWell,
      whatWentWrong: journalForm.whatWentWrong,
      conceptsThatCausedProblems: concepts,
      whatToPractice: journalForm.whatToPractice,
      linkedTopicIds: journalForm.selectedTopicIds,
      linkedPatterns: [],
    });

    showToast('Reflection Saved', 'Contest journal entry and weakness links updated.', 'success');
    setJournalModalOpen(false);
  };

  const handleSaveManualContest = () => {
    if (!logForm.contestName.trim()) {
      showToast('Name Required', 'Please enter contest name.', 'warning');
      return;
    }

    const platformNames: Record<PlatformId, string> = {
      codeforces: 'Codeforces',
      leetcode: 'LeetCode',
      codechef: 'CodeChef',
      geeksforgeeks: 'GeeksforGeeks',
      atcoder: 'AtCoder',
    };

    addContestRecord({
      platform: logForm.platform,
      platformName: platformNames[logForm.platform],
      contestName: logForm.contestName,
      contestUrl: logForm.contestUrl || undefined,
      date: new Date().toISOString(),
      rank: Number(logForm.rank),
      totalParticipants: Number(logForm.totalParticipants),
      ratingBefore: Number(logForm.ratingBefore),
      ratingAfter: Number(logForm.ratingAfter),
      ratingChange: Number(logForm.ratingAfter) - Number(logForm.ratingBefore),
      problemsSolved: Number(logForm.problemsSolved),
      totalProblems: Number(logForm.totalProblems),
    });

    showToast('Contest Logged', 'Participation recorded in contest history.', 'success');
    setLogModalOpen(false);
  };

  const getPlatformIcon = (id: PlatformId) => {
    switch (id) {
      case 'leetcode':
        return '🟡';
      case 'codeforces':
        return '🔵';
      case 'codechef':
        return '🟤';
      case 'geeksforgeeks':
        return '🟢';
      case 'atcoder':
        return '⚪';
      default:
        return '🌐';
    }
  };

  const getPlatformBadgeColor = (id: PlatformId) => {
    switch (id) {
      case 'codeforces':
        return 'info';
      case 'leetcode':
        return 'warning';
      case 'codechef':
        return 'default';
      case 'atcoder':
        return 'success';
      default:
        return 'default';
    }
  };

  // Helper for Rating SVG Time-Series Chart
  const selectedPlatformAccount = platformAccounts.find((a) => a.id === selectedPlatformGraph);
  const graphHistory = (selectedPlatformAccount?.ratingHistory || []).slice(-10);

  const renderRatingChart = () => {
    if (!graphHistory || graphHistory.length < 2) {
      return (
        <div style={{ padding: '30px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
          Need at least 2 contest participations on {selectedPlatformAccount?.name || 'this platform'} to render rating trajectory graph.
        </div>
      );
    }

    const ratings = graphHistory.map((h) => h.rating);
    const minRating = Math.min(...ratings) - 40;
    const maxRating = Math.max(...ratings) + 40;
    const range = Math.max(1, maxRating - minRating);

    const width = 640;
    const height = 180;
    const paddingX = 40;
    const paddingY = 24;

    const points = graphHistory.map((item, index) => {
      const x = paddingX + (index / (graphHistory.length - 1)) * (width - 2 * paddingX);
      const y = height - paddingY - ((item.rating - minRating) / range) * (height - 2 * paddingY);
      return { x, y, ...item };
    });

    const svgPath = points.reduce((acc, pt, idx) => `${acc} ${idx === 0 ? 'M' : 'L'} ${pt.x} ${pt.y}`, '');

    return (
      <div style={{ overflowX: 'auto', padding: '10px 0' }}>
        <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: 'auto', minWidth: 460 }}>
          {/* Grid lines */}
          <line x1={paddingX} y1={paddingY} x2={width - paddingX} y2={paddingY} stroke="var(--border-color)" strokeDasharray="3 3" opacity={0.5} />
          <line x1={paddingX} y1={height / 2} x2={width - paddingX} y2={height / 2} stroke="var(--border-color)" strokeDasharray="3 3" opacity={0.5} />
          <line x1={paddingX} y1={height - paddingY} x2={width - paddingX} y2={height - paddingY} stroke="var(--border-color)" strokeDasharray="3 3" opacity={0.5} />

          {/* Sparkline glow and path */}
          <path d={svgPath} fill="none" stroke="var(--primary)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />

          {/* Data Points */}
          {points.map((pt, idx) => (
            <g key={idx}>
              <circle cx={pt.x} cy={pt.y} r="5" fill="var(--bg-card)" stroke="var(--primary)" strokeWidth="2.5" />
              <text x={pt.x} y={pt.y - 10} textAnchor="middle" fontSize="11" fontWeight="600" fill="var(--text-main)">
                {pt.rating}
              </text>
              <text x={pt.x} y={height - 6} textAnchor="middle" fontSize="10" fill="var(--text-muted)">
                {new Date(pt.date).toLocaleDateString(undefined, { month: 'numeric', day: 'numeric' })}
              </text>
            </g>
          ))}
        </svg>
      </div>
    );
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 24, paddingBottom: 40 }}>
      <PageHeader
        title="Contest Dashboard & Ratings (System B)"
        description="Monitor upcoming schedules, live contest rating trajectories, problem breakdowns, and reflective post-contest journaling."
        actions={
          <div style={{ display: 'flex', gap: 10 }}>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing}
            >
              <RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} style={{ marginRight: 6 }} />
              {isRefreshing ? 'Refreshing...' : 'Refresh Schedules'}
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setLogModalOpen(true)}
            >
              <PlusCircle size={14} style={{ marginRight: 6 }} />
              Log Contest
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => navigateTo('test/mock-tests')}
            >
              <Award size={14} style={{ marginRight: 6 }} />
              Saturday Mocks
            </Button>
          </div>
        }
      />

      {/* SYSTEM SEPARATION INVARIANT NOTICE */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 14,
          padding: '12px 18px',
          borderRadius: 'var(--radius-lg)',
          background: 'rgba(245, 158, 11, 0.08)',
          border: '1px solid rgba(245, 158, 11, 0.25)',
          fontSize: '13px',
          color: 'var(--text-main)',
        }}
      >
        <ShieldCheck size={22} style={{ color: 'var(--warning)', flexShrink: 0 }} />
        <div>
          <strong style={{ color: 'var(--text-main)' }}>Dual System Separation Invariant: </strong>
          <span style={{ color: 'var(--text-muted)' }}>
            Competitive contest participations and rating changes do <strong>NOT</strong> automatically insert problems into your personal SRS queue.
            Use the <strong>Contest Journal</strong> to reflect on weaknesses and link topics deliberately.
          </span>
        </div>
      </div>

      {/* NAVIGATION TABS */}
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
          { id: 'overview', label: '🏆 Dashboard & Overview' },
          { id: 'upcoming', label: `📅 Upcoming (${upcomingContests.length})` },
          { id: 'history', label: `📜 Past Contests (${contestRecords.length})` },
          { id: 'analysis', label: '📊 Performance Analysis' },
          { id: 'journal', label: `📓 Contest Journal (${contestJournal.length})` },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            style={{
              padding: '8px 16px',
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

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'overview' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* KPI SUMMARY CARDS */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
            <Card>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 500, textTransform: 'uppercase' }}>
                Peak Contest Rating
              </div>
              <div style={{ fontSize: '28px', fontWeight: 700, color: 'var(--warning)', marginTop: 4 }}>
                {contestAnalysis.peakRating || 'Unrated'}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: 2 }}>
                Best across all platforms
              </div>
            </Card>

            <Card>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 500, textTransform: 'uppercase' }}>
                Best Contest Rank
              </div>
              <div style={{ fontSize: '28px', fontWeight: 700, color: 'var(--primary)', marginTop: 4 }}>
                {contestAnalysis.bestRank ? `#${contestAnalysis.bestRank.toLocaleString()}` : '—'}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: 2 }}>
                Highest global placement
              </div>
            </Card>

            <Card>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 500, textTransform: 'uppercase' }}>
                Avg Solved / Contest
              </div>
              <div style={{ fontSize: '28px', fontWeight: 700, color: 'var(--success)', marginTop: 4 }}>
                {contestAnalysis.averageProblemsSolved} <span style={{ fontSize: '15px', fontWeight: 500 }}>probs</span>
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: 2 }}>
                Across {contestAnalysis.totalContests} logged contests
              </div>
            </Card>

            <Card>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 500, textTransform: 'uppercase' }}>
                Participation Frequency
              </div>
              <div style={{ fontSize: '28px', fontWeight: 700, color: 'var(--danger)', marginTop: 4 }}>
                {contestAnalysis.participationFrequencyPerMonth} <span style={{ fontSize: '15px', fontWeight: 500 }}>/ mo</span>
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: 2 }}>
                Regular competition cadence
              </div>
            </Card>
          </div>

          {/* RATING HISTORY TIME-SERIES CHART */}
          <Card
            title="Rating Progression Trajectory"
            subtitle="Time-series historical rating curve and contest delta shifts"
            headerAction={
              <div style={{ display: 'flex', gap: 6 }}>
                {(['codeforces', 'leetcode', 'atcoder'] as PlatformId[]).map((pId) => (
                  <Button
                    key={pId}
                    variant={selectedPlatformGraph === pId ? 'primary' : 'ghost'}
                    size="sm"
                    onClick={() => setSelectedPlatformGraph(pId)}
                    style={{ fontSize: '12px' }}
                  >
                    <span>{getPlatformIcon(pId)}</span>
                    <span style={{ marginLeft: 4, textTransform: 'capitalize' }}>{pId}</span>
                  </Button>
                ))}
              </div>
            }
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
                <span style={{ fontSize: '22px', fontWeight: 700, color: 'var(--text-main)' }}>
                  {selectedPlatformAccount?.currentRating || 'Unrated'}
                </span>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  Current {selectedPlatformAccount?.name} Rating
                </span>
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                Peak: <strong style={{ color: 'var(--warning)' }}>{selectedPlatformAccount?.maxRating || '—'}</strong>
              </div>
            </div>

            {renderRatingChart()}
          </Card>

          {/* UPCOMING CONTESTS PREVIEW */}
          <Card
            title="Next Upcoming Contests"
            subtitle="Verified official schedules from connected competitive platforms"
            headerAction={
              <Button variant="ghost" size="sm" onClick={() => setActiveTab('upcoming')}>
                View All Upcoming ({upcomingContests.length})
                <ChevronRight size={14} style={{ marginLeft: 4 }} />
              </Button>
            }
          >
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12 }}>
              {upcomingContests.slice(0, 3).map((contest) => (
                <div
                  key={contest.id}
                  style={{
                    padding: 14,
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--bg-hover)',
                    border: '1px solid var(--border-color)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: 12,
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                      <Badge variant={getPlatformBadgeColor(contest.platform)} size="sm">
                        {contest.platformName}
                      </Badge>
                      <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--primary)' }}>
                        {formatCountdown(contest.startTime)}
                      </span>
                    </div>
                    <div style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text-main)' }}>
                      {contest.name}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Clock size={12} />
                      <span>{new Date(contest.startTime).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                      <span>• {formatContestDuration(contest.durationSeconds)}</span>
                    </div>
                  </div>

                  <a
                    href={contest.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ textDecoration: 'none' }}
                  >
                    <Button variant="secondary" size="sm" style={{ width: '100%', fontSize: '12px' }}>
                      <ExternalLink size={12} style={{ marginRight: 6 }} />
                      Go to Contest Page
                    </Button>
                  </a>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* TAB 2: UPCOMING CONTESTS */}
      {activeTab === 'upcoming' && (
        <Card
          title="Upcoming Contests Calendar"
          subtitle="Official contest schedules fetched from Codeforces API and weekly recurring schedules"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {upcomingContests.map((contest) => (
              <div
                key={contest.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '16px 20px',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--bg-hover)',
                  border: '1px solid var(--border-color)',
                  flexWrap: 'wrap',
                  gap: 14,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 260, flex: 1 }}>
                  <span style={{ fontSize: '22px' }}>{getPlatformIcon(contest.platform)}</span>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontWeight: 600, fontSize: '15px', color: 'var(--text-main)' }}>
                        {contest.name}
                      </span>
                      <Badge variant={getPlatformBadgeColor(contest.platform)} size="sm">
                        {contest.platformName}
                      </Badge>
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: 4, display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Calendar size={13} />
                        {new Date(contest.startTime).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <span>• Duration: {formatContestDuration(contest.durationSeconds)}</span>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Countdown</div>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--primary)' }}>
                      {formatCountdown(contest.startTime)}
                    </div>
                  </div>

                  <a
                    href={contest.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ textDecoration: 'none' }}
                  >
                    <Button variant="secondary" size="sm">
                      <ExternalLink size={13} style={{ marginRight: 6 }} />
                      Register / View
                    </Button>
                  </a>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* TAB 3: PAST CONTEST PARTICIPATIONS & DETAILS */}
      {activeTab === 'history' && (
        <Card
          title="Contest Participation History"
          subtitle="Detailed ratings before & after, rank outcomes, solved counts, and individual problem performances"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {contestRecords.map((contest) => {
              const isExpanded = expandedContestId === contest.id;
              const hasJournal = !!contest.journalEntryId || contestJournal.some((j) => j.contestId === contest.id);

              return (
                <div
                  key={contest.id}
                  style={{
                    borderRadius: 'var(--radius-lg)',
                    background: 'var(--bg-hover)',
                    border: '1px solid var(--border-color)',
                    overflow: 'hidden',
                  }}
                >
                  {/* Contest Summary Bar */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '16px 20px',
                      flexWrap: 'wrap',
                      gap: 14,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 260, flex: 1 }}>
                      <span style={{ fontSize: '20px' }}>{getPlatformIcon(contest.platform)}</span>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontWeight: 600, fontSize: '15px', color: 'var(--text-main)' }}>
                            {contest.contestName}
                          </span>
                          <Badge variant={getPlatformBadgeColor(contest.platform)} size="sm">
                            {contest.platformName}
                          </Badge>
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: 2 }}>
                          {new Date(contest.date).toLocaleDateString()} • Solved:{' '}
                          <strong style={{ color: 'var(--text-main)' }}>
                            {contest.problemsSolved} / {contest.totalProblems}
                          </strong>{' '}
                          problems
                        </div>
                      </div>
                    </div>

                    {/* Rank & Rating Deltas */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Contest Rank</div>
                        <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-main)' }}>
                          #{contest.rank.toLocaleString()}
                          {contest.totalParticipants ? (
                            <small style={{ fontWeight: 400, color: 'var(--text-muted)' }}>
                              {' '}/ {contest.totalParticipants.toLocaleString()}
                            </small>
                          ) : null}
                        </div>
                      </div>

                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Rating Change</div>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                          <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-main)' }}>
                            {contest.ratingAfter}
                          </span>
                          <span
                            style={{
                              fontSize: '12px',
                              fontWeight: 600,
                              color: contest.ratingChange >= 0 ? 'var(--success)' : 'var(--danger)',
                            }}
                          >
                            ({contest.ratingChange >= 0 ? `+${contest.ratingChange}` : contest.ratingChange})
                          </span>
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: 6 }}>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openJournalModal(contest)}
                          title="Write or view post-contest reflection"
                          style={{
                            color: hasJournal ? 'var(--primary)' : 'var(--text-muted)',
                          }}
                        >
                          <Edit3 size={14} style={{ marginRight: 4 }} />
                          {hasJournal ? 'Journaled' : 'Journal'}
                        </Button>

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setExpandedContestId(isExpanded ? null : contest.id)}
                        >
                          {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Expanded Problem Performance Breakdown */}
                  {isExpanded && contest.problemsPerformance && contest.problemsPerformance.length > 0 && (
                    <div
                      style={{
                        padding: '14px 20px',
                        background: 'var(--bg-card)',
                        borderTop: '1px solid var(--border-color)',
                      }}
                    >
                      <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 8 }}>
                        PROBLEM PERFORMANCE BREAKDOWN
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 8 }}>
                        {contest.problemsPerformance.map((prob, pIdx) => {
                          const isAC = prob.verdict === 'AC';
                          return (
                            <div
                              key={pIdx}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: '8px 12px',
                                borderRadius: 'var(--radius-sm)',
                                background: 'var(--bg-hover)',
                                border: '1px solid var(--border-color)',
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <span style={{ fontWeight: 700, fontSize: '12px', color: 'var(--text-muted)' }}>
                                  {prob.problemIndex}
                                </span>
                                <div>
                                  <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-main)' }}>
                                    {prob.problemTitle}
                                  </div>
                                  {prob.solveTimeMinutes ? (
                                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                                      Solved in {prob.solveTimeMinutes}m
                                    </div>
                                  ) : null}
                                </div>
                              </div>
                              <Badge variant={isAC ? 'success' : 'danger'} size="sm">
                                {prob.verdict}
                              </Badge>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* TAB 4: DETERMINISTIC PERFORMANCE ANALYSIS */}
      {activeTab === 'analysis' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
            <Card title="Average Contest Rank" subtitle="Global placement accuracy">
              <div style={{ fontSize: '32px', fontWeight: 700, color: 'var(--primary)', marginTop: 6 }}>
                #{contestAnalysis.averageRank.toLocaleString()}
              </div>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: 6 }}>
                Mean finish across {contestAnalysis.totalContests} competitive contests.
              </p>
            </Card>

            <Card title="Avg Rating Delta / Contest" subtitle="Mean progression rate">
              <div
                style={{
                  fontSize: '32px',
                  fontWeight: 700,
                  color: contestAnalysis.averageRatingDelta >= 0 ? 'var(--success)' : 'var(--danger)',
                  marginTop: 6,
                }}
              >
                {contestAnalysis.averageRatingDelta >= 0 ? `+${contestAnalysis.averageRatingDelta}` : contestAnalysis.averageRatingDelta}
              </div>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: 6 }}>
                Average rating delta earned per scored match.
              </p>
            </Card>

            <Card title="Difficulty Solves in Contests" subtitle="Verified live solutions">
              <div style={{ display: 'flex', gap: 12, alignItems: 'baseline', marginTop: 10 }}>
                <span style={{ fontSize: '16px', fontWeight: 700, color: 'var(--success)' }}>
                  {contestAnalysis.difficultySolveCounts.easy} <small style={{ fontWeight: 400, fontSize: '12px' }}>Easy</small>
                </span>
                <span style={{ fontSize: '16px', fontWeight: 700, color: 'var(--warning)' }}>
                  {contestAnalysis.difficultySolveCounts.medium} <small style={{ fontWeight: 400, fontSize: '12px' }}>Medium</small>
                </span>
                <span style={{ fontSize: '16px', fontWeight: 700, color: 'var(--danger)' }}>
                  {contestAnalysis.difficultySolveCounts.hard} <small style={{ fontWeight: 400, fontSize: '12px' }}>Hard</small>
                </span>
              </div>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: 6 }}>
                Distribution of problems accepted under strict countdown timers.
              </p>
            </Card>
          </div>

          {/* TOP WEAK CONCEPTS FROM JOURNAL */}
          <Card
            title="Identified Weak Concepts Under Contest Pressure"
            subtitle="Derived from your post-contest journal reflections"
          >
            {contestAnalysis.topWeakConcepts && contestAnalysis.topWeakConcepts.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {contestAnalysis.topWeakConcepts.map((item, idx) => (
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
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <AlertCircle size={16} style={{ color: 'var(--warning)' }} />
                      <span style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text-main)' }}>
                        {item.concept}
                      </span>
                    </div>
                    <Badge variant="warning" size="sm">
                      Struggled in {item.count} contest{item.count > 1 ? 's' : ''}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                icon={<BookOpen size={24} />}
                title="No weak concepts recorded yet"
                description="Write reflections in your Contest Journal to identify algorithmic patterns that need reinforcement."
              />
            )}
          </Card>
        </div>
      )}

      {/* TAB 5: CONTEST JOURNAL */}
      {activeTab === 'journal' && (
        <Card
          title="Contest Reflections & Journal"
          subtitle="Deliberate post-contest reflections: what went well, what caused penalties, and linked curriculum topics"
        >
          {contestJournal && contestJournal.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {contestJournal.map((entry) => (
                <div
                  key={entry.id}
                  style={{
                    padding: 16,
                    borderRadius: 'var(--radius-lg)',
                    background: 'var(--bg-hover)',
                    border: '1px solid var(--border-color)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 12,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: '18px' }}>{getPlatformIcon(entry.platform)}</span>
                      <span style={{ fontWeight: 700, fontSize: '15px', color: 'var(--text-main)' }}>
                        {entry.contestName}
                      </span>
                    </div>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                      Reflected on {new Date(entry.createdAt).toLocaleDateString()}
                    </span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                    <div style={{ padding: 12, background: 'rgba(16, 185, 129, 0.06)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(16, 185, 129, 0.15)' }}>
                      <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--success)', marginBottom: 4 }}>
                        ✓ WHAT WENT WELL
                      </div>
                      <p style={{ fontSize: '13px', color: 'var(--text-main)', margin: 0, lineHeight: 1.45 }}>
                        {entry.whatWentWell}
                      </p>
                    </div>

                    <div style={{ padding: 12, background: 'rgba(239, 68, 68, 0.06)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(239, 68, 68, 0.15)' }}>
                      <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--danger)', marginBottom: 4 }}>
                        ✕ WHAT CAUSED FRICTION / WRONG ANSWERS
                      </div>
                      <p style={{ fontSize: '13px', color: 'var(--text-main)', margin: 0, lineHeight: 1.45 }}>
                        {entry.whatWentWrong}
                      </p>
                    </div>
                  </div>

                  {entry.conceptsThatCausedProblems && entry.conceptsThatCausedProblems.length > 0 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 500 }}>
                        Weak Concepts:
                      </span>
                      {entry.conceptsThatCausedProblems.map((concept, cIdx) => (
                        <Badge key={cIdx} variant="warning" size="sm">
                          {concept}
                        </Badge>
                      ))}
                    </div>
                  )}

                  {entry.whatToPractice && (
                    <div style={{ fontSize: '13px', color: 'var(--text-main)' }}>
                      <strong>Practice Action: </strong>
                      <span style={{ color: 'var(--text-muted)' }}>{entry.whatToPractice}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={<BookOpen size={24} />}
              title="No contest reflections written yet"
              description="Click 'Journal' on any past contest in the Past Contests tab to record what went well and link weak concepts."
              actionText="View Past Contests"
              onAction={() => setActiveTab('history')}
            />
          )}
        </Card>
      )}

      {/* CONTEST JOURNAL REFLECTION MODAL */}
      <Modal
        isOpen={journalModalOpen}
        onClose={() => setJournalModalOpen(false)}
        title={`Contest Reflection: ${journalingContest?.contestName || ''}`}
        size="lg"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-main)' }}>
              1. What went well?
            </label>
            <textarea
              rows={3}
              placeholder="e.g. Solved problem A and B in 10 mins without penalties..."
              value={journalForm.whatWentWell}
              onChange={(e) => setJournalForm({ ...journalForm, whatWentWell: e.target.value })}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-color)',
                background: 'var(--bg-card)',
                color: 'var(--text-main)',
                fontSize: '13px',
                fontFamily: 'inherit',
              }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-main)' }}>
              2. What went wrong / caused penalties?
            </label>
            <textarea
              rows={3}
              placeholder="e.g. Stuck on Q3 for 40 minutes due to unhandled off-by-one boundary..."
              value={journalForm.whatWentWrong}
              onChange={(e) => setJournalForm({ ...journalForm, whatWentWrong: e.target.value })}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-color)',
                background: 'var(--bg-card)',
                color: 'var(--text-main)',
                fontSize: '13px',
                fontFamily: 'inherit',
              }}
            />
          </div>

          <Input
            label="3. Concepts / Patterns that caused problems (Comma-separated)"
            placeholder="e.g. Binary Search on Answer Space, Monotonic Stack, Bitmask DP"
            value={journalForm.conceptsText}
            onChange={(e) => setJournalForm({ ...journalForm, conceptsText: e.target.value })}
          />

          <Input
            label="4. What should I practice next?"
            placeholder="e.g. Drill 5 medium binary search problems this week"
            value={journalForm.whatToPractice}
            onChange={(e) => setJournalForm({ ...journalForm, whatToPractice: e.target.value })}
          />

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-main)' }}>
              5. Link weakness to Personal Study Topics (Curriculum)
            </label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {topics.map((t) => {
                const isSelected = journalForm.selectedTopicIds.includes(t.id);
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => {
                      const updated = isSelected
                        ? journalForm.selectedTopicIds.filter((id) => id !== t.id)
                        : [...journalForm.selectedTopicIds, t.id];
                      setJournalForm({ ...journalForm, selectedTopicIds: updated });
                    }}
                    style={{
                      padding: '5px 12px',
                      borderRadius: 'var(--radius-full)',
                      border: isSelected ? '1px solid var(--primary)' : '1px solid var(--border-color)',
                      background: isSelected ? 'rgba(59, 130, 246, 0.15)' : 'var(--bg-hover)',
                      color: isSelected ? 'var(--primary)' : 'var(--text-muted)',
                      fontSize: '12px',
                      fontWeight: isSelected ? 600 : 400,
                      cursor: 'pointer',
                    }}
                  >
                    {t.name}
                  </button>
                );
              })}
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 12 }}>
            <Button variant="secondary" onClick={() => setJournalModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSaveJournal}>
              Save Reflection
            </Button>
          </div>
        </div>
      </Modal>

      {/* MANUAL LOG CONTEST MODAL */}
      <Modal
        isOpen={logModalOpen}
        onClose={() => setLogModalOpen(false)}
        title="Log Contest Participation"
        size="md"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Select
            label="Platform"
            value={logForm.platform}
            onChange={(e) => setLogForm({ ...logForm, platform: e.target.value as PlatformId })}
            options={[
              { value: 'leetcode', label: 'LeetCode' },
              { value: 'codeforces', label: 'Codeforces' },
              { value: 'codechef', label: 'CodeChef' },
              { value: 'atcoder', label: 'AtCoder' },
              { value: 'geeksforgeeks', label: 'GeeksforGeeks' },
            ]}
          />

          <Input
            label="Contest Name *"
            placeholder="e.g. Weekly Contest 417"
            value={logForm.contestName}
            onChange={(e) => setLogForm({ ...logForm, contestName: e.target.value })}
          />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Input
              label="Contest Rank"
              type="number"
              value={logForm.rank}
              onChange={(e) => setLogForm({ ...logForm, rank: Number(e.target.value) })}
            />
            <Input
              label="Total Participants"
              type="number"
              value={logForm.totalParticipants}
              onChange={(e) => setLogForm({ ...logForm, totalParticipants: Number(e.target.value) })}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Input
              label="Rating Before"
              type="number"
              value={logForm.ratingBefore}
              onChange={(e) => setLogForm({ ...logForm, ratingBefore: Number(e.target.value) })}
            />
            <Input
              label="Rating After"
              type="number"
              value={logForm.ratingAfter}
              onChange={(e) => setLogForm({ ...logForm, ratingAfter: Number(e.target.value) })}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Input
              label="Problems Solved"
              type="number"
              value={logForm.problemsSolved}
              onChange={(e) => setLogForm({ ...logForm, problemsSolved: Number(e.target.value) })}
            />
            <Input
              label="Total Problems"
              type="number"
              value={logForm.totalProblems}
              onChange={(e) => setLogForm({ ...logForm, totalProblems: Number(e.target.value) })}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 12 }}>
            <Button variant="secondary" onClick={() => setLogModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSaveManualContest}>
              Save Contest Record
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

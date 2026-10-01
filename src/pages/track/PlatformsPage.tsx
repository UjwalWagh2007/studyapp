import React, { useState } from 'react';
import {
  Globe,
  RefreshCw,
  ExternalLink,
  PlusCircle,
  CheckCircle2,
  Flame,
  Trophy,
  Layers,
  Code2,
  Settings,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Select } from '../../components/ui/Select';
import { Input } from '../../components/ui/Input';
import { EmptyState } from '../../components/ui/EmptyState';
import { useAppStore } from '../../context/AppContext';
import { useToast } from '../../context/ToastContext';
import { formatLastSynced } from '../../services/platformSync';
import type { PlatformId, ExternalSubmission, Difficulty } from '../../types';

export const PlatformsPage: React.FC = () => {
  const {
    platformAccounts,
    syncPlatform,
    syncAllPlatforms,
    connectPlatform,
    disconnectPlatform,
    enrollPlatformProblemToStudySystem,
    topics,
    navigateTo,
  } = useAppStore();

  const { showToast } = useToast();

  const [selectedPlatformId, setSelectedPlatformId] = useState<PlatformId | 'all'>('all');
  const [syncingPlatformId, setSyncingPlatformId] = useState<PlatformId | 'all' | null>(null);

  // Modal for Configuring Platform Handles
  const [connectModalOpen, setConnectModalOpen] = useState(false);
  const [editingPlatformId, setEditingPlatformId] = useState<PlatformId | null>(null);
  const [handleInput, setHandleInput] = useState('');
  const [isSavingPlatform, setIsSavingPlatform] = useState(false);

  // Modal for Adding problem to Study System
  const [enrollModalOpen, setEnrollModalOpen] = useState(false);
  const [enrollingSubmission, setEnrollingSubmission] = useState<ExternalSubmission | null>(null);
  const [targetTopicId, setTargetTopicId] = useState<string>('');
  const [customPattern, setCustomPattern] = useState<string>('Other');

  const openConnectModal = (id: PlatformId) => {
    const acc = platformAccounts.find((a) => a.id === id);
    setEditingPlatformId(id);
    setHandleInput(acc?.handle || '');
    setConnectModalOpen(true);
  };

  const handleSavePlatform = async () => {
    if (!editingPlatformId) return;
    if (!handleInput.trim()) {
      showToast('Username Required', 'Please enter your username/handle.', 'error');
      return;
    }

    setIsSavingPlatform(true);
    try {
      await connectPlatform(editingPlatformId, handleInput.trim());
      showToast('Account Connected', `Successfully connected and synced @${handleInput.trim()}.`, 'success');
      setConnectModalOpen(false);
    } catch (err: any) {
      showToast('Connection Warning', err.message || 'Failed to sync platform account.', 'error');
    } finally {
      setIsSavingPlatform(false);
    }
  };

  const handleDisconnect = (id: PlatformId) => {
    disconnectPlatform(id);
    showToast('Account Disconnected', 'Platform account has been disconnected.', 'info');
    setConnectModalOpen(false);
  };

  // Aggregated totals across all connected accounts
  const connectedAccounts = platformAccounts.filter((a) => a.isConnected);
  const totalSolvedAll = connectedAccounts.reduce((sum, a) => sum + (a.totalSolved || 0), 0);
  const totalEasyAll = connectedAccounts.reduce((sum, a) => sum + (a.difficultyBreakdown?.easy || 0), 0);
  const totalMediumAll = connectedAccounts.reduce((sum, a) => sum + (a.difficultyBreakdown?.medium || 0), 0);
  const totalHardAll = connectedAccounts.reduce((sum, a) => sum + (a.difficultyBreakdown?.hard || 0), 0);

  const allSubmissions = platformAccounts.flatMap((a) =>
    (a.recentSubmissions || []).map((s) => ({ ...s, platformName: a.name }))
  );

  const activeAccount =
    selectedPlatformId === 'all'
      ? null
      : platformAccounts.find((a) => a.id === selectedPlatformId);

  const handleSync = async (id: PlatformId) => {
    setSyncingPlatformId(id);
    try {
      await syncPlatform(id);
      showToast('Synced Successfully', 'Platform statistics have been refreshed.', 'success');
    } catch (err: any) {
      showToast('Sync Failed', err.message || 'Could not reach platform API.', 'error');
    } finally {
      setSyncingPlatformId(null);
    }
  };

  const handleSyncAll = async () => {
    setSyncingPlatformId('all');
    try {
      await syncAllPlatforms();
      showToast('All Accounts Synced', 'Updated statistics across all connected platforms.', 'success');
    } catch (err: any) {
      showToast('Sync Warning', 'One or more accounts encountered sync issues.', 'warning');
    } finally {
      setSyncingPlatformId(null);
    }
  };

  const openEnrollModal = (submission: ExternalSubmission) => {
    setEnrollingSubmission(submission);
    setTargetTopicId(topics.length > 0 ? topics[0].id : '');
    setCustomPattern('Other');
    setEnrollModalOpen(true);
  };

  const handleConfirmEnroll = () => {
    if (!enrollingSubmission) return;

    const topicObj = topics.find((t) => t.id === targetTopicId);
    const topicName = topicObj ? topicObj.name : 'General';

    enrollPlatformProblemToStudySystem(enrollingSubmission, targetTopicId, topicName);
    showToast(
      'Enrolled in Study System',
      `"${enrollingSubmission.problemTitle}" is now scheduled in your spaced repetition system.`,
      'success'
    );
    setEnrollModalOpen(false);
    setEnrollingSubmission(null);
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
        title="External Coding Platforms (System B)"
        description="Monitor solved counts, difficulty breakdown, contest ratings, and streaks from external platforms without polluting your personal study queue."
        actions={
          <div style={{ display: 'flex', gap: 10 }}>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleSyncAll}
              disabled={syncingPlatformId !== null}
            >
              <RefreshCw
                size={14}
                className={syncingPlatformId === 'all' ? 'animate-spin' : ''}
                style={{ marginRight: 6 }}
              />
              {syncingPlatformId === 'all' ? 'Syncing All...' : 'Sync All'}
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => navigateTo('settings')}
            >
              <Settings size={14} style={{ marginRight: 6 }} />
              Configure Handles
            </Button>
          </div>
        }
      />

      {/* SYSTEM SEPARATION NOTICE BANNER */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 14,
          padding: '12px 18px',
          borderRadius: 'var(--radius-lg)',
          background: 'rgba(59, 130, 246, 0.08)',
          border: '1px solid rgba(59, 130, 246, 0.25)',
          fontSize: '13px',
          color: 'var(--text-main)',
        }}
      >
        <ShieldCheck size={22} style={{ color: 'var(--primary)', flexShrink: 0 }} />
        <div style={{ flex: 1 }}>
          <strong style={{ color: 'var(--text-main)' }}>System Separation Invariant: </strong>
          <span style={{ color: 'var(--text-muted)' }}>
            External platform solved counts do <strong>NOT</strong> automatically create personal study questions.
            Only questions you deliberately choose to review via the <strong>[+ Add to My Study System]</strong> button
            enter your spaced-repetition queue.
          </span>
        </div>
      </div>

      {/* HIGH LEVEL KPI SUMMARY ROW */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
        <Card>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 500, textTransform: 'uppercase' }}>
                Total External Solved
              </div>
              <div style={{ fontSize: '28px', fontWeight: 700, color: 'var(--text-main)', marginTop: 4 }}>
                {totalSolvedAll.toLocaleString()}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: 2 }}>
                Across {connectedAccounts.length} connected platforms
              </div>
            </div>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 'var(--radius-md)',
                background: 'rgba(59, 130, 246, 0.12)',
                color: 'var(--primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Layers size={22} />
            </div>
          </div>
        </Card>

        <Card>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 500, textTransform: 'uppercase' }}>
                Difficulty Distribution
              </div>
              <div style={{ display: 'flex', gap: 10, alignItems: 'baseline', marginTop: 6 }}>
                <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--success)' }}>
                  {totalEasyAll} <small style={{ fontWeight: 400, fontSize: '11px' }}>Easy</small>
                </span>
                <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--warning)' }}>
                  {totalMediumAll} <small style={{ fontWeight: 400, fontSize: '11px' }}>Med</small>
                </span>
                <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--danger)' }}>
                  {totalHardAll} <small style={{ fontWeight: 400, fontSize: '11px' }}>Hard</small>
                </span>
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: 4 }}>
                {totalSolvedAll > 0
                  ? `${Math.round(((totalMediumAll + totalHardAll) / totalSolvedAll) * 100)}% Medium & Hard`
                  : 'No solved records'}
              </div>
            </div>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 'var(--radius-md)',
                background: 'rgba(16, 185, 129, 0.12)',
                color: 'var(--success)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Code2 size={22} />
            </div>
          </div>
        </Card>

        <Card>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 500, textTransform: 'uppercase' }}>
                Top Contest Rating
              </div>
              <div style={{ fontSize: '28px', fontWeight: 700, color: 'var(--text-main)', marginTop: 4 }}>
                {Math.max(...platformAccounts.map((a) => a.currentRating || 0), 0) || 'Unrated'}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: 2 }}>
                Best across LeetCode & Codeforces
              </div>
            </div>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 'var(--radius-md)',
                background: 'rgba(245, 158, 11, 0.12)',
                color: 'var(--warning)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Trophy size={22} />
            </div>
          </div>
        </Card>

        <Card>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 500, textTransform: 'uppercase' }}>
                External Streak
              </div>
              <div style={{ fontSize: '28px', fontWeight: 700, color: 'var(--text-main)', marginTop: 4 }}>
                {Math.max(...platformAccounts.map((a) => a.streakDays || 0), 0)} <span style={{ fontSize: '16px', fontWeight: 500 }}>days</span>
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: 2 }}>
                Daily coding activity
              </div>
            </div>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 'var(--radius-md)',
                background: 'rgba(239, 68, 68, 0.12)',
                color: 'var(--danger)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Flame size={22} />
            </div>
          </div>
        </Card>
      </div>

      {/* PLATFORM NAVIGATION TABS */}
      <div
        style={{
          display: 'flex',
          gap: 8,
          borderBottom: '1px solid var(--border-color)',
          paddingBottom: 12,
          overflowX: 'auto',
        }}
      >
        <button
          onClick={() => setSelectedPlatformId('all')}
          style={{
            padding: '8px 16px',
            borderRadius: 'var(--radius-full)',
            border: 'none',
            fontSize: '13px',
            fontWeight: selectedPlatformId === 'all' ? 600 : 500,
            background: selectedPlatformId === 'all' ? 'var(--primary)' : 'var(--bg-card)',
            color: selectedPlatformId === 'all' ? '#ffffff' : 'var(--text-muted)',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            whiteSpace: 'nowrap',
          }}
        >
          🌐 All Platforms Overview ({connectedAccounts.length})
        </button>

        {platformAccounts.map((acc) => {
          const isSelected = selectedPlatformId === acc.id;
          return (
            <button
              key={acc.id}
              onClick={() => setSelectedPlatformId(acc.id)}
              style={{
                padding: '8px 16px',
                borderRadius: 'var(--radius-full)',
                border: isSelected ? 'none' : '1px solid var(--border-color)',
                fontSize: '13px',
                fontWeight: isSelected ? 600 : 500,
                background: isSelected ? 'var(--primary)' : 'var(--bg-card)',
                color: isSelected ? '#ffffff' : 'var(--text-main)',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                whiteSpace: 'nowrap',
              }}
            >
              <span>{getPlatformIcon(acc.id)}</span>
              <span>{acc.name}</span>
              {acc.isConnected ? (
                <span
                  style={{
                    fontSize: '11px',
                    opacity: 0.85,
                    background: isSelected ? 'rgba(255,255,255,0.2)' : 'var(--bg-hover)',
                    padding: '1px 6px',
                    borderRadius: 'var(--radius-full)',
                  }}
                >
                  {acc.totalSolved}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      {/* PLATFORM DETAIL OR OVERVIEW VIEW */}
      {selectedPlatformId === 'all' ? (
        /* ALL PLATFORMS AGGREGATED GRID */
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 20 }}>
          {platformAccounts.map((account) => {
            const isConnected = account.isConnected;
            const isSyncing = syncingPlatformId === account.id || account.status === 'SYNCING';
            const total = account.totalSolved || 0;
            const easyPct = total > 0 ? ((account.difficultyBreakdown?.easy || 0) / total) * 100 : 0;
            const medPct = total > 0 ? ((account.difficultyBreakdown?.medium || 0) / total) * 100 : 0;
            const hardPct = total > 0 ? ((account.difficultyBreakdown?.hard || 0) / total) * 100 : 0;

            return (
              <Card
                key={account.id}
                title={
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span>{getPlatformIcon(account.id)}</span>
                    <span>{account.name}</span>
                  </div>
                }
                subtitle={
                  isConnected
                    ? `@${account.handle} • Synced ${formatLastSynced(account.lastSyncedAt)}`
                    : 'Account not configured'
                }
                headerAction={
                  isConnected ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSync(account.id)}
                      disabled={isSyncing}
                      title="Sync stats"
                    >
                      <RefreshCw size={13} className={isSyncing ? 'animate-spin' : ''} />
                    </Button>
                  ) : (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => openConnectModal(account.id)}
                    >
                      Connect
                    </Button>
                  )
                }
              >
                {isConnected ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {/* Solved & Ratings Row */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                      <div style={{ padding: '8px 12px', background: 'var(--bg-hover)', borderRadius: 'var(--radius-md)' }}>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Solved</div>
                        <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-main)', marginTop: 2 }}>
                          {account.totalSolved}
                        </div>
                      </div>
                      <div style={{ padding: '8px 12px', background: 'var(--bg-hover)', borderRadius: 'var(--radius-md)' }}>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Rating</div>
                        <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--primary)', marginTop: 2 }}>
                          {account.currentRating || '—'}
                        </div>
                      </div>
                      <div style={{ padding: '8px 12px', background: 'var(--bg-hover)', borderRadius: 'var(--radius-md)' }}>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Rank</div>
                        <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-main)', marginTop: 4, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                          {account.globalRank || '—'}
                        </div>
                      </div>
                    </div>

                    {/* Difficulty breakdown visualization */}
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: 6 }}>
                        <span style={{ color: 'var(--text-muted)' }}>Difficulty Breakdown</span>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                          <strong style={{ color: 'var(--success)' }}>{account.difficultyBreakdown?.easy || 0}E</strong> /{' '}
                          <strong style={{ color: 'var(--warning)' }}>{account.difficultyBreakdown?.medium || 0}M</strong> /{' '}
                          <strong style={{ color: 'var(--danger)' }}>{account.difficultyBreakdown?.hard || 0}H</strong>
                        </span>
                      </div>
                      <div
                        style={{
                          height: 8,
                          width: '100%',
                          background: 'var(--bg-hover)',
                          borderRadius: 'var(--radius-full)',
                          display: 'flex',
                          overflow: 'hidden',
                        }}
                      >
                        <div style={{ width: `${easyPct}%`, background: 'var(--success)', transition: 'width 0.3s' }} title={`Easy: ${account.difficultyBreakdown?.easy}`} />
                        <div style={{ width: `${medPct}%`, background: 'var(--warning)', transition: 'width 0.3s' }} title={`Medium: ${account.difficultyBreakdown?.medium}`} />
                        <div style={{ width: `${hardPct}%`, background: 'var(--danger)', transition: 'width 0.3s' }} title={`Hard: ${account.difficultyBreakdown?.hard}`} />
                      </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openConnectModal(account.id)}
                      >
                        <Settings size={13} style={{ marginRight: 4 }} />
                        Edit Handle
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedPlatformId(account.id)}
                      >
                        View Details & Submissions
                        <ChevronRight size={14} style={{ marginLeft: 4 }} />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <EmptyState
                    icon={<Globe size={20} />}
                    title="Account not connected"
                    description="Enter your username to track your solve count and statistics."
                    actionText="Connect Handle"
                    onAction={() => openConnectModal(account.id)}
                  />
                )}
              </Card>
            );
          })}
        </div>
      ) : activeAccount ? (
        /* INDIVIDUAL PLATFORM DEEP DIVE */
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Header Card for this platform */}
          <Card
            title={
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: '24px' }}>{getPlatformIcon(activeAccount.id)}</span>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: '18px', fontWeight: 700 }}>{activeAccount.name}</span>
                    {activeAccount.isConnected && (
                      <Badge variant="success" size="sm">
                        Connected
                      </Badge>
                    )}
                  </div>
                  <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                    Handle: <strong style={{ color: 'var(--text-main)' }}>@{activeAccount.handle}</strong> • Last
                    synced {formatLastSynced(activeAccount.lastSyncedAt)}
                  </div>
                </div>
              </div>
            }
            headerAction={
              <div style={{ display: 'flex', gap: 8 }}>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleSync(activeAccount.id)}
                  disabled={syncingPlatformId === activeAccount.id}
                >
                  <RefreshCw
                    size={14}
                    className={syncingPlatformId === activeAccount.id ? 'animate-spin' : ''}
                    style={{ marginRight: 6 }}
                  />
                  Sync Now
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => openConnectModal(activeAccount.id)}
                >
                  <Settings size={14} style={{ marginRight: 6 }} />
                  Edit Handle
                </Button>
              </div>
            }
          >
            {/* Metrics stats row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>
              <div style={{ padding: 14, background: 'var(--bg-hover)', borderRadius: 'var(--radius-md)' }}>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Total Solved</div>
                <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text-main)', marginTop: 4 }}>
                  {activeAccount.totalSolved}
                </div>
              </div>

              <div style={{ padding: 14, background: 'var(--bg-hover)', borderRadius: 'var(--radius-md)' }}>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Current Rating</div>
                <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--primary)', marginTop: 4 }}>
                  {activeAccount.currentRating || 'Unrated'}
                </div>
                {activeAccount.maxRating ? (
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: 2 }}>
                    Peak: {activeAccount.maxRating}
                  </div>
                ) : null}
              </div>

              <div style={{ padding: 14, background: 'var(--bg-hover)', borderRadius: 'var(--radius-md)' }}>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Global Rank</div>
                <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-main)', marginTop: 4 }}>
                  {activeAccount.globalRank || '—'}
                </div>
              </div>

              <div style={{ padding: 14, background: 'var(--bg-hover)', borderRadius: 'var(--radius-md)' }}>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Contests Participated</div>
                <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text-main)', marginTop: 4 }}>
                  {activeAccount.contestsAttended}
                </div>
              </div>

              <div style={{ padding: 14, background: 'var(--bg-hover)', borderRadius: 'var(--radius-md)' }}>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Platform Streak</div>
                <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--danger)', marginTop: 4 }}>
                  {activeAccount.streakDays} <span style={{ fontSize: '14px', fontWeight: 500 }}>days</span>
                </div>
              </div>
            </div>

            {/* Difficulty Breakdown progress bar */}
            <div style={{ marginTop: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-main)' }}>
                  Problem Difficulty Breakdown
                </span>
                <div style={{ display: 'flex', gap: 14, fontSize: '12px' }}>
                  <span style={{ color: 'var(--success)', fontWeight: 600 }}>
                    Easy: {activeAccount.difficultyBreakdown?.easy || 0}
                  </span>
                  <span style={{ color: 'var(--warning)', fontWeight: 600 }}>
                    Medium: {activeAccount.difficultyBreakdown?.medium || 0}
                  </span>
                  <span style={{ color: 'var(--danger)', fontWeight: 600 }}>
                    Hard: {activeAccount.difficultyBreakdown?.hard || 0}
                  </span>
                </div>
              </div>

              <div
                style={{
                  height: 12,
                  width: '100%',
                  background: 'var(--bg-hover)',
                  borderRadius: 'var(--radius-full)',
                  display: 'flex',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    width: `${
                      activeAccount.totalSolved > 0
                        ? ((activeAccount.difficultyBreakdown?.easy || 0) / activeAccount.totalSolved) * 100
                        : 0
                    }%`,
                    background: 'var(--success)',
                  }}
                />
                <div
                  style={{
                    width: `${
                      activeAccount.totalSolved > 0
                        ? ((activeAccount.difficultyBreakdown?.medium || 0) / activeAccount.totalSolved) * 100
                        : 0
                    }%`,
                    background: 'var(--warning)',
                  }}
                />
                <div
                  style={{
                    width: `${
                      activeAccount.totalSolved > 0
                        ? ((activeAccount.difficultyBreakdown?.hard || 0) / activeAccount.totalSolved) * 100
                        : 0
                    }%`,
                    background: 'var(--danger)',
                  }}
                />
              </div>
            </div>
          </Card>

          {/* RECENT SUBMISSIONS WITH THE EXPLICIT "ADD TO MY STUDY SYSTEM" ACTION */}
          <Card
            title="Recent Platform Submissions"
            subtitle="View recent solved activity. Click 'Add to Study System' to enroll a problem into your personal SRS queue."
          >
            {activeAccount.recentSubmissions && activeAccount.recentSubmissions.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {activeAccount.recentSubmissions.map((sub) => (
                  <div
                    key={sub.id}
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
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 260, flex: 1 }}>
                      <Badge variant={getDifficultyBadgeVariant(sub.difficulty)} size="sm">
                        {sub.difficulty}
                      </Badge>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text-main)' }}>
                            {sub.problemTitle}
                          </span>
                          {sub.problemUrl && (
                            <a
                              href={sub.problemUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{ color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center' }}
                              title="Open on platform"
                            >
                              <ExternalLink size={13} />
                            </a>
                          )}
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: 2 }}>
                          {sub.verdict} • {new Date(sub.submittedAt).toLocaleDateString()}
                          {sub.language ? ` • ${sub.language}` : ''}
                        </div>
                      </div>
                    </div>

                    {/* Enrollment CTA Button / Status */}
                    <div>
                      {sub.isEnrolledInStudySystem ? (
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 6,
                            fontSize: '12px',
                            fontWeight: 500,
                            color: 'var(--success)',
                            background: 'rgba(16, 185, 129, 0.1)',
                            padding: '4px 12px',
                            borderRadius: 'var(--radius-full)',
                          }}
                        >
                          <CheckCircle2 size={14} />
                          In Study System
                        </span>
                      ) : (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => openEnrollModal(sub)}
                          style={{ fontSize: '12px' }}
                        >
                          <PlusCircle size={13} style={{ marginRight: 6 }} />
                          ADD TO MY STUDY SYSTEM
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                icon={<Code2 size={24} />}
                title="No recent submissions available"
                description={`Click "Sync Now" above to fetch your latest solved problems from ${activeAccount.name}.`}
                actionText="Sync Now"
                onAction={() => handleSync(activeAccount.id)}
              />
            )}
          </Card>
        </div>
      ) : null}

      {/* ALL RECENT SUBMISSIONS STREAM IF ON "ALL" TAB */}
      {selectedPlatformId === 'all' && allSubmissions.length > 0 && (
        <Card
          title="Recent Cross-Platform Submissions"
          subtitle="Recent solutions across all connected profiles. Deliberately add any problem to your personal review queue."
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {allSubmissions.slice(0, 10).map((sub) => (
              <div
                key={sub.id}
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
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 260, flex: 1 }}>
                  <span style={{ fontSize: '16px' }}>{getPlatformIcon(sub.platform)}</span>
                  <Badge variant={getDifficultyBadgeVariant(sub.difficulty)} size="sm">
                    {sub.difficulty}
                  </Badge>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text-main)' }}>
                        {sub.problemTitle}
                      </span>
                      {sub.problemUrl && (
                        <a
                          href={sub.problemUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ color: 'var(--text-muted)' }}
                          title="Open on platform"
                        >
                          <ExternalLink size={13} />
                        </a>
                      )}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: 2 }}>
                      {sub.platformName} • {sub.verdict} • {new Date(sub.submittedAt).toLocaleDateString()}
                    </div>
                  </div>
                </div>

                <div>
                  {sub.isEnrolledInStudySystem ? (
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        fontSize: '12px',
                        fontWeight: 500,
                        color: 'var(--success)',
                        background: 'rgba(16, 185, 129, 0.1)',
                        padding: '4px 12px',
                        borderRadius: 'var(--radius-full)',
                      }}
                    >
                      <CheckCircle2 size={14} />
                      In Study System
                    </span>
                  ) : (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => openEnrollModal(sub)}
                      style={{ fontSize: '12px' }}
                    >
                      <PlusCircle size={13} style={{ marginRight: 6 }} />
                      ADD TO MY STUDY SYSTEM
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* ENROLL PROBLEM INTO STUDY SYSTEM MODAL */}
      <Modal
        isOpen={enrollModalOpen}
        onClose={() => setEnrollModalOpen(false)}
        title="Add to My Personal Study System"
        size="md"
      >
        {enrollingSubmission && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div
              style={{
                padding: '12px 16px',
                borderRadius: 'var(--radius-md)',
                background: 'var(--bg-hover)',
                border: '1px solid var(--border-color)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <Badge variant={getDifficultyBadgeVariant(enrollingSubmission.difficulty)} size="sm">
                  {enrollingSubmission.difficulty}
                </Badge>
                <span style={{ fontWeight: 600, fontSize: '15px', color: 'var(--text-main)' }}>
                  {enrollingSubmission.problemTitle}
                </span>
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                Source: {enrollingSubmission.platform.toUpperCase()} • Solved on{' '}
                {new Date(enrollingSubmission.submittedAt).toLocaleDateString()}
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <Select
                label="Assign to Topic in Curriculum"
                value={targetTopicId}
                onChange={(e) => setTargetTopicId(e.target.value)}
                options={
                  topics.length > 0
                    ? topics.map((t) => ({ value: t.id, label: `${t.name} (${t.subject || 'DSA'})` }))
                    : [{ value: '', label: 'General Practice' }]
                }
              />

              <Input
                label="Algorithmic Pattern (Optional)"
                placeholder="e.g. Sliding Window, Monotonic Stack, Two Pointers"
                value={customPattern}
                onChange={(e) => setCustomPattern(e.target.value)}
              />

              <p style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.45 }}>
                Enrolling this problem will initialize it with an SM-2 spaced repetition review schedule in your
                personal question bank.
              </p>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 10 }}>
              <Button variant="secondary" onClick={() => setEnrollModalOpen(false)}>
                Cancel
              </Button>
              <Button variant="primary" onClick={handleConfirmEnroll}>
                Confirm & Enroll Question
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* MODAL 2: CONNECT & CONFIGURE PLATFORM HANDLE */}
      <Modal
        isOpen={connectModalOpen}
        onClose={() => setConnectModalOpen(false)}
        title={
          editingPlatformId
            ? `Connect ${platformAccounts.find((a) => a.id === editingPlatformId)?.name || 'Platform'}`
            : 'Connect Platform'
        }
      >
        {editingPlatformId && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '12px 16px',
                background: 'var(--bg-hover)',
                borderRadius: 'var(--radius-md)',
              }}
            >
              <span style={{ fontSize: '24px' }}>{getPlatformIcon(editingPlatformId)}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: '15px', color: 'var(--text-main)' }}>
                  {platformAccounts.find((a) => a.id === editingPlatformId)?.name}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  Enter your public username. Passwords/tokens are never needed.
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-main)' }}>
                Platform Username / Profile Handle
              </label>
              <Input
                placeholder={`e.g. your_${editingPlatformId}_handle`}
                value={handleInput}
                onChange={(e) => setHandleInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSavePlatform();
                }}
                autoFocus
              />
              <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                Your handle is used to retrieve public problem solve counts, difficulty statistics, and ratings.
              </span>
            </div>

            {platformAccounts.find((a) => a.id === editingPlatformId)?.errorMessage && (
              <div
                style={{
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-md)',
                  background: 'rgba(239, 68, 68, 0.12)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  fontSize: '12px',
                  color: 'var(--danger)',
                }}
              >
                ⚠️ {platformAccounts.find((a) => a.id === editingPlatformId)?.errorMessage}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
              {platformAccounts.find((a) => a.id === editingPlatformId)?.isConnected ? (
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => handleDisconnect(editingPlatformId)}
                >
                  Disconnect Account
                </Button>
              ) : (
                <div />
              )}

              <div style={{ display: 'flex', gap: 10 }}>
                <Button variant="secondary" onClick={() => setConnectModalOpen(false)}>
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  onClick={handleSavePlatform}
                  disabled={isSavingPlatform || !handleInput.trim()}
                >
                  {isSavingPlatform ? 'Syncing Profile...' : 'Save & Sync Now'}
                </Button>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

import React, { useState, useRef } from 'react';
import {
  RefreshCw,
  AlertTriangle,
  Unlink,
  ShieldCheck,
  Download,
  Upload,
  Database,
  FileSpreadsheet,
  Trash2,
  RotateCcw,
  CheckCircle2,
  Save,
  AlertCircle,
  Smartphone,
  Laptop,
  Copy,
  Check,
} from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { ConfirmationDialog } from '../components/ui/ConfirmationDialog';
import { useAppStore } from '../context/AppContext';
import { useToast } from '../context/ToastContext';
import { formatLastSynced } from '../services/platformSync';
import { exportFullDataToJson } from '../services/backupService';
import type {
  ThemeMode,
  PlatformId,
  PlatformAccount,
  ImportMode,
  ImportValidationResult,
  LocalBackupSnapshot,
} from '../types';

export const SettingsPage: React.FC = () => {
  const {
    settings,
    setTheme,
    platformAccounts,
    connectPlatform,
    disconnectPlatform,
    syncPlatform,
    syncAllPlatforms,
    notificationPreferences,
    updateNotificationPreferences,

    // PART 13 Data Management
    exportFullBackup,
    exportQuestionsCsv,
    exportMistakesCsv,
    exportInsightsCsv,
    exportStudySessionsCsv,
    exportContestsCsv,
    localSnapshots,
    createLocalBackupSnapshot,
    deleteLocalBackupSnapshot,
    validateBackupFile,
    restoreFromBackup,
    clearAllUserData,
    resetToDemoDatabase,

    topics,
    questions,
    mistakes,
    insights,
    mockTests,
    goals,
    studySessions,
    contestRecords,

    // Multi-Device Sync & Pairing
    syncConfig,
    syncStatus,
    updateSyncConfig,
    triggerCloudSync,
    pairDeviceWithVault,
  } = useAppStore();

  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [syncingAll, setSyncingAll] = useState(false);
  const [savingPlatformId, setSavingPlatformId] = useState<PlatformId | null>(null);

  // Sync state
  const [pairingVaultInput, setPairingVaultInput] = useState('');
  const [isPairingModalOpen, setIsPairingModalOpen] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [isSyncingNow, setIsSyncingNow] = useState(false);

  const handleCopyPairingCode = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(syncConfig.vaultId);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
      showToast('Pairing Code Copied', 'Paste this code into your other device to sync.', 'info');
    }
  };

  const handleManualSyncNow = async () => {
    setIsSyncingNow(true);
    const success = await triggerCloudSync();
    setIsSyncingNow(false);
    if (success) {
      showToast('Sync Complete', 'All study data synchronized successfully.', 'success');
    } else {
      showToast('Local-First Mode', 'Changes safely saved in offline persistent storage.', 'info');
    }
  };

  const handleExecutePairing = async () => {
    if (!pairingVaultInput.trim()) return;
    const success = await pairDeviceWithVault(pairingVaultInput.trim());
    setIsPairingModalOpen(false);
    setPairingVaultInput('');
    if (success) {
      showToast('Device Paired', 'Connected to the shared Personal Study Space.', 'success');
    } else {
      showToast('Pairing Error', 'Could not sync with the specified Vault ID.', 'error');
    }
  };

  // Platform handle inputs
  const [handleInputs, setHandleInputs] = useState<Record<PlatformId, string>>(() => {
    const map: Record<string, string> = {};
    platformAccounts.forEach((acc) => {
      map[acc.id] = acc.handle || '';
    });
    return map as Record<PlatformId, string>;
  });

  // Local Snapshot creation state
  const [snapshotLabelInput, setSnapshotLabelInput] = useState('');
  const [isCreatingSnapshot, setIsCreatingSnapshot] = useState(false);

  // Import modal & validation state
  const [importFile, setImportFile] = useState<File | null>(null);
  const [validationResult, setValidationResult] = useState<ImportValidationResult | null>(null);
  const [importMode, setImportMode] = useState<ImportMode>('MERGE');
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  // Dangerous Confirmation Modals
  const [isClearDataModalOpen, setIsClearDataModalOpen] = useState(false);
  const [isResetDemoModalOpen, setIsResetDemoModalOpen] = useState(false);
  const [clearConfirmationText, setClearConfirmationText] = useState('');

  // Snapshot restore confirmation
  const [snapshotToRestore, setSnapshotToRestore] = useState<LocalBackupSnapshot | null>(null);
  const [isRestoreSnapshotModalOpen, setIsRestoreSnapshotModalOpen] = useState(false);

  const handleHandleChange = (id: PlatformId, value: string) => {
    setHandleInputs((prev) => ({ ...prev, [id]: value }));
  };

  const handleConnect = async (id: PlatformId) => {
    const handle = handleInputs[id]?.trim();
    if (!handle) {
      showToast('Username Required', 'Please enter a valid handle before connecting.', 'warning');
      return;
    }

    setSavingPlatformId(id);
    try {
      await connectPlatform(id, handle);
      showToast('Platform Connected', `Synced public profile for ${handle}.`, 'success');
    } catch (err: any) {
      showToast('Connection Warning', err.message || 'Could not verify username.', 'error');
    } finally {
      setSavingPlatformId(null);
    }
  };

  const handleManualSync = async (account: PlatformAccount) => {
    if (!account.handle) {
      showToast('No Handle Configured', 'Please enter a handle first.', 'warning');
      return;
    }
    try {
      await syncPlatform(account.id);
      showToast('Synchronization Complete', `Updated stats for ${account.name}.`, 'success');
    } catch (err: any) {
      showToast('Sync Failed', err.message || 'Failed to sync platform.', 'error');
    }
  };

  const handleSyncAll = async () => {
    setSyncingAll(true);
    try {
      await syncAllPlatforms();
      showToast('All Accounts Synced', 'Updated stats across all connected platforms.', 'success');
    } catch (err: any) {
      showToast('Sync Error', 'Some platforms failed to update.', 'warning');
    } finally {
      setSyncingAll(false);
    }
  };

  const handleDisconnect = (id: PlatformId, name: string) => {
    disconnectPlatform(id);
    showToast('Platform Disconnected', `Unlinked ${name} profile.`, 'info');
  };

  // --- PART 13 ACTIONS ---

  const handleCreateSnapshot = () => {
    const label = snapshotLabelInput.trim() || `Manual Snapshot (${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})`;
    createLocalBackupSnapshot(label);
    setSnapshotLabelInput('');
    setIsCreatingSnapshot(false);
    showToast('Snapshot Created', `Saved local restore point "${label}".`, 'success');
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportFile(file);
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const result = validateBackupFile(content, file.name);
      setValidationResult(result);
      setIsImportModalOpen(true);
    };
    reader.readAsText(file);
    // Reset file input value so same file can be selected again if needed
    e.target.value = '';
  };

  const handleExecuteImport = () => {
    if (!validationResult?.isValid || !validationResult.payload) {
      showToast('Invalid Import', 'Cannot import malformed or invalid backup file.', 'error');
      return;
    }

    try {
      restoreFromBackup(validationResult.payload, importMode);
      setIsImportModalOpen(false);
      setImportFile(null);
      setValidationResult(null);
      showToast(
        'Data Restored Successfully',
        `Restored data in ${importMode} mode. A safety backup was saved.`,
        'success'
      );
    } catch (err: any) {
      showToast('Import Failed', err.message || 'Failed to parse backup content.', 'error');
    }
  };

  const handleExecuteSnapshotRestore = () => {
    if (!snapshotToRestore) return;
    try {
      restoreFromBackup(snapshotToRestore.payload, 'OVERWRITE');
      setIsRestoreSnapshotModalOpen(false);
      setSnapshotToRestore(null);
      showToast('Snapshot Restored', `Restored data from "${snapshotToRestore.label}".`, 'success');
    } catch (err: any) {
      showToast('Restore Failed', err.message || 'Could not restore snapshot.', 'error');
    }
  };

  const handleExecuteClearAll = () => {
    if (clearConfirmationText.trim() !== 'DELETE MY DATA') {
      showToast('Confirmation Mismatch', 'You must type "DELETE MY DATA" exactly.', 'warning');
      return;
    }

    clearAllUserData();
    setIsClearDataModalOpen(false);
    setClearConfirmationText('');
    showToast(
      'Database Cleared',
      'All personal questions, topics, reviews, and logs have been wiped. A safety snapshot was preserved in backup history.',
      'info'
    );
  };

  const handleExecuteResetDemo = () => {
    resetToDemoDatabase();
    setIsResetDemoModalOpen(false);
    showToast('Demo Data Restored', 'Reset application to standard demo practice curriculum.', 'success');
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

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 24, paddingBottom: 48 }}>
      <PageHeader
        title="Settings & Data Management"
        description="Manage connected competitive coding platforms, appearance, notifications, exports, and complete database backups."
      />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        
        {/* ================================================================= */}
        {/* 1. DATA OWNERSHIP, EXPORTS & BACKUPS (PART 13) */}
        {/* ================================================================= */}
        <Card
          title="Data Ownership & Full Backups"
          subtitle="You own 100% of your data. Export, create local snapshots, and restore from backups anytime."
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Database Inventory Banner */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 12,
                padding: '12px 16px',
                background: 'rgba(59, 130, 246, 0.08)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid rgba(59, 130, 246, 0.2)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Database size={20} color="var(--primary)" />
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-main)' }}>
                    Current Personal Study Database
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    {questions.length} questions • {topics.length} topics • {mistakes.length} mistakes • {insights.length} insights • {studySessions.length} study sessions • {contestRecords.length} contests
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 8 }}>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={exportFullBackup}
                  iconLeft={<Download size={14} />}
                >
                  Download Full JSON Backup
                </Button>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  accept=".json,application/json"
                  style={{ display: 'none' }}
                />
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  iconLeft={<Upload size={14} />}
                >
                  Import JSON Backup
                </Button>
              </div>
            </div>

            {/* Granular CSV Exports Section */}
            <div>
              <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-main)', marginBottom: 8 }}>
                Modular Domain Exports (CSV Spreadsheets)
              </div>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: 12 }}>
                Export individual domains for spreadsheets, external analysis, or documentation.
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 }}>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={exportQuestionsCsv}
                  iconLeft={<FileSpreadsheet size={14} color="#38bdf8" />}
                  style={{ justifyContent: 'flex-start' }}
                >
                  Questions & Reviews ({questions.length})
                </Button>

                <Button
                  variant="secondary"
                  size="sm"
                  onClick={exportMistakesCsv}
                  iconLeft={<FileSpreadsheet size={14} color="#f97316" />}
                  style={{ justifyContent: 'flex-start' }}
                >
                  Mistake Bank ({mistakes.length})
                </Button>

                <Button
                  variant="secondary"
                  size="sm"
                  onClick={exportInsightsCsv}
                  iconLeft={<FileSpreadsheet size={14} color="#a855f7" />}
                  style={{ justifyContent: 'flex-start' }}
                >
                  Knowledge Vault ({insights.length})
                </Button>

                <Button
                  variant="secondary"
                  size="sm"
                  onClick={exportStudySessionsCsv}
                  iconLeft={<FileSpreadsheet size={14} color="#10b981" />}
                  style={{ justifyContent: 'flex-start' }}
                >
                  Study Sessions ({studySessions.length})
                </Button>

                <Button
                  variant="secondary"
                  size="sm"
                  onClick={exportContestsCsv}
                  iconLeft={<FileSpreadsheet size={14} color="#eab308" />}
                  style={{ justifyContent: 'flex-start' }}
                >
                  Contest History ({contestRecords.length})
                </Button>
              </div>
            </div>

            {/* Local Safety Backup Snapshots */}
            <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-main)' }}>
                    Local Restore Points & Snapshots
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    Instant local snapshots automatically generated before imports, resets, or manual triggers.
                  </div>
                </div>

                {!isCreatingSnapshot ? (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setIsCreatingSnapshot(true)}
                    iconLeft={<Save size={13} />}
                  >
                    Create Snapshot
                  </Button>
                ) : (
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <Input
                      placeholder="Snapshot label (e.g., Before Graph Study)..."
                      value={snapshotLabelInput}
                      onChange={(e) => setSnapshotLabelInput(e.target.value)}
                      style={{ width: 220, height: 32, fontSize: '12px' }}
                    />
                    <Button variant="primary" size="sm" onClick={handleCreateSnapshot}>
                      Save
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setIsCreatingSnapshot(false)}>
                      Cancel
                    </Button>
                  </div>
                )}
              </div>

              {localSnapshots.length === 0 ? (
                <div
                  style={{
                    padding: '14px',
                    textAlign: 'center',
                    background: 'var(--bg-hover)',
                    borderRadius: 'var(--radius-md)',
                    fontSize: '12.5px',
                    color: 'var(--text-muted)',
                  }}
                >
                  No local snapshots created yet. Click "Create Snapshot" to save a manual restore point.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {localSnapshots.map((snap) => (
                    <div
                      key={snap.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '10px 14px',
                        background: 'var(--bg-card)',
                        border: '1px solid var(--border-color)',
                        borderRadius: 'var(--radius-md)',
                      }}
                    >
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-main)' }}>
                            {snap.label}
                          </span>
                          <Badge variant="default">
                            {snap.summary.totalQuestions} Questions • {snap.summary.totalMistakes} Mistakes
                          </Badge>
                        </div>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                          Created: {new Date(snap.createdAt).toLocaleString()} • {Math.round((snap.sizeBytes || 0) / 1024)} KB
                        </span>
                      </div>

                      <div style={{ display: 'flex', gap: 6 }}>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => {
                            setSnapshotToRestore(snap);
                            setIsRestoreSnapshotModalOpen(true);
                          }}
                          iconLeft={<RotateCcw size={12} />}
                        >
                          Restore
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => exportFullDataToJson(snap.payload)}
                          iconLeft={<Download size={12} />}
                          title="Download Snapshot JSON"
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteLocalBackupSnapshot(snap.id)}
                          iconLeft={<Trash2 size={12} color="var(--color-danger)" />}
                          title="Delete Snapshot"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </Card>

        {/* ================================================================= */}
        {/* MULTI-DEVICE SYNCHRONIZATION & DEVICE PAIRING (NO ACCOUNTS) */}
        {/* ================================================================= */}
        <Card
          title="Multi-Device Synchronization & Device Pairing"
          subtitle="Pair your laptop, desktop, and mobile phone to synchronize your study database without traditional login accounts."
          headerAction={
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Badge variant={syncConfig.isSyncEnabled ? 'success' : 'default'}>
                {syncConfig.isSyncEnabled ? (syncStatus === 'SYNCING' ? 'Syncing...' : 'Sync Active') : 'Local-First Only'}
              </Badge>
              <Button
                variant="secondary"
                size="sm"
                onClick={handleManualSyncNow}
                disabled={isSyncingNow || syncStatus === 'SYNCING'}
                iconLeft={<RefreshCw size={13} className={isSyncingNow || syncStatus === 'SYNCING' ? 'animate-spin' : ''} />}
              >
                {isSyncingNow || syncStatus === 'SYNCING' ? 'Syncing...' : 'Sync Now'}
              </Button>
            </div>
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Device Info & Vault ID Strip */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                gap: 14,
              }}
            >
              {/* Box 1: Current Device & Vault Key */}
              <div
                style={{
                  padding: '14px 16px',
                  background: 'var(--bg-subtle)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-subtle)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                    <Laptop size={16} color="var(--color-primary)" />
                    <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                      Current Device: {syncConfig.deviceName}
                    </span>
                  </div>
                  <Badge variant="primary">Active Device</Badge>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                  <div
                    style={{
                      flex: 1,
                      fontFamily: 'var(--font-mono)',
                      fontSize: '12px',
                      background: 'var(--bg-elevated)',
                      padding: '6px 10px',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--border-medium)',
                      color: 'var(--text-primary)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {syncConfig.vaultId}
                  </div>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={handleCopyPairingCode}
                    iconLeft={copiedCode ? <Check size={13} color="var(--color-success)" /> : <Copy size={13} />}
                  >
                    {copiedCode ? 'Copied' : 'Copy Key'}
                  </Button>
                </div>
                <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                  Your private Personal Sync Vault ID. Use this key to pair your mobile phone or another computer.
                </span>
              </div>

              {/* Box 2: Pairing Actions */}
              <div
                style={{
                  padding: '14px 16px',
                  background: 'var(--bg-subtle)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-subtle)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: 10,
                }}
              >
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>
                    Pair Another Device (Mobile / Laptop)
                  </div>
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0, lineHeight: 1.4 }}>
                    Enter a Sync Vault ID from another device to merge and keep study data synchronized.
                  </p>
                </div>

                <div style={{ display: 'flex', gap: 8 }}>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => setIsPairingModalOpen(true)}
                    iconLeft={<Smartphone size={14} />}
                  >
                    Pair With Device
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      updateSyncConfig({ isSyncEnabled: !syncConfig.isSyncEnabled });
                      showToast(
                        syncConfig.isSyncEnabled ? 'Sync Paused' : 'Sync Enabled',
                        syncConfig.isSyncEnabled
                          ? 'Multi-device background sync is paused.'
                          : 'Multi-device background sync is active.',
                        'info'
                      );
                    }}
                  >
                    {syncConfig.isSyncEnabled ? 'Disable Auto-Sync' : 'Enable Auto-Sync'}
                  </Button>
                </div>
              </div>
            </div>

            {/* Offline Resilience / Privacy Notice */}
            <div
              style={{
                padding: '10px 14px',
                background: 'rgba(16, 185, 129, 0.08)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid rgba(16, 185, 129, 0.2)',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                fontSize: '12px',
                color: 'var(--color-success)',
              }}
            >
              <ShieldCheck size={16} />
              <span>
                <strong>Offline-First & Account-Free:</strong> Your data is stored locally in IndexedDB and stays 100% available offline. When internet is connected, changes automatically synchronize using your private vault pairing key without requiring passwords or logins.
              </span>
            </div>
          </div>
        </Card>

        {/* ================================================================= */}
        {/* 2. CONNECTED CODING PLATFORMS (SYSTEM B) */}
        {/* ================================================================= */}
        <Card
          title="Connected Coding Accounts"
          subtitle="Manage authorized public profiles for LeetCode, Codeforces, CodeChef, and others"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <ShieldCheck size={18} color="var(--color-success)" />
                <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                  Platform solved counts remain cleanly separated from personal spaced-repetition questions.
                </span>
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={handleSyncAll}
                disabled={syncingAll}
                iconLeft={<RefreshCw size={14} className={syncingAll ? 'animate-spin' : ''} />}
              >
                {syncingAll ? 'Syncing All...' : 'Sync All Accounts'}
              </Button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {platformAccounts.map((account) => {
                const isConnected = account.status === 'CONNECTED';
                const isSaving = savingPlatformId === account.id;

                return (
                  <div
                    key={account.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '12px 16px',
                      background: 'var(--bg-hover)',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border-color)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                      <span style={{ fontSize: '20px' }}>{getPlatformIcon(account.id)}</span>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-main)' }}>
                            {account.name}
                          </span>
                          <Badge variant={isConnected ? 'success' : 'default'}>
                            {isConnected ? 'Connected' : 'Not Connected'}
                          </Badge>
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: 2 }}>
                          {isConnected
                            ? `User: ${account.handle} • ${formatLastSynced(account.lastSyncedAt)}`
                            : 'Configure username to sync statistics and contest performance'}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Input
                        placeholder="Enter username/handle"
                        value={handleInputs[account.id] || ''}
                        onChange={(e) => handleHandleChange(account.id, e.target.value)}
                        style={{ width: 180, height: 32, fontSize: '12px' }}
                        disabled={isSaving}
                      />

                      <Button
                        variant={isConnected ? 'secondary' : 'primary'}
                        size="sm"
                        onClick={() => handleConnect(account.id)}
                        disabled={isSaving}
                      >
                        {isSaving ? 'Connecting...' : isConnected ? 'Update' : 'Connect'}
                      </Button>

                      {isConnected && (
                        <>
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => handleManualSync(account)}
                            iconLeft={<RefreshCw size={12} />}
                            title="Sync Now"
                          >
                            Sync
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDisconnect(account.id, account.name)}
                            iconLeft={<Unlink size={13} color="var(--color-danger)" />}
                            title="Disconnect Account"
                          />
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </Card>

        {/* ================================================================= */}
        {/* 3. APPEARANCE & THEME PREFERENCES */}
        {/* ================================================================= */}
        <Card title="Interface & Appearance" subtitle="Personalize your IDE display mode">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 360 }}>
            <Select
              label="Theme Mode"
              value={settings.theme}
              onChange={(e) => setTheme(e.target.value as ThemeMode)}
              options={[
                { value: 'dark', label: 'Dark Mode (Deep Slate / Midnight)' },
                { value: 'light', label: 'Light Mode (Crisp Clean Minimal)' },
                { value: 'system', label: 'System (Sync with OS preferences)' },
              ]}
            />
          </div>
        </Card>

        {/* ================================================================= */}
        {/* 4. NOTIFICATION PREFERENCES (PART 12) */}
        {/* ================================================================= */}
        <Card
          title="Notification Preferences"
          subtitle="Non-spam meaningful reminders across study cadences and contests"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-main)' }}>
                  Enable In-App Notifications
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  Show high-signal review reminders and milestone alerts
                </div>
              </div>
              <Button
                variant={notificationPreferences.enabled ? 'primary' : 'secondary'}
                size="sm"
                onClick={() =>
                  updateNotificationPreferences({ enabled: !notificationPreferences.enabled })
                }
              >
                {notificationPreferences.enabled ? 'Enabled' : 'Disabled'}
              </Button>
            </div>

            {notificationPreferences.enabled && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, borderTop: '1px solid var(--border-color)', paddingTop: 12 }}>
                <Select
                  label="Preferred Alert Frequency"
                  value={notificationPreferences.preferredTime}
                  onChange={(e) =>
                    updateNotificationPreferences({
                      preferredTime: e.target.value as 'MORNING' | 'EVENING' | 'ALL_DAY',
                    })
                  }
                  options={[
                    { value: 'ALL_DAY', label: 'All Day (Real-time updates as due)' },
                    { value: 'MORNING', label: 'Morning Digest (09:00 AM)' },
                    { value: 'EVENING', label: 'Evening Review Digest (06:00 PM)' },
                  ]}
                />

                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-main)' }}>
                    Category Controls:
                  </span>
                  {[
                    { key: 'srsRevisions', label: '🔵 Spaced Repetition Due Revisions' },
                    { key: 'weeklyMock', label: '🟣 Saturday Weekly Mock Reminders' },
                    { key: 'sundaySpecial', label: '🟠 Sunday Special Revision Queue' },
                    { key: 'contests', label: '🟡 Upcoming Contests Starting Soon' },
                    { key: 'goals', label: '🔴 Goal Deadlines & Targets' },
                    { key: 'streaks', label: '🔥 Streak Milestones' },
                  ].map((cat) => {
                    const isChecked = !!(notificationPreferences.categories as any)[cat.key];
                    return (
                      <label
                        key={cat.key}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 10,
                          fontSize: '13px',
                          color: 'var(--text-main)',
                          cursor: 'pointer',
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) =>
                            updateNotificationPreferences({
                              categories: {
                                ...notificationPreferences.categories,
                                [cat.key]: e.target.checked,
                              },
                            })
                          }
                          style={{ cursor: 'pointer' }}
                        />
                        <span>{cat.label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* ================================================================= */}
        {/* 5. DANGER ZONE & DATA MANAGEMENT (PART 13) */}
        {/* ================================================================= */}
        <div
          style={{
            border: '1px solid rgba(239, 68, 68, 0.35)',
            borderRadius: 'var(--radius-lg)',
            background: 'rgba(239, 68, 68, 0.03)',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <AlertTriangle size={20} color="var(--color-danger)" />
            <div>
              <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--color-danger)' }}>
                Danger Zone & Data Operations
              </div>
              <div style={{ fontSize: '12.5px', color: 'var(--text-muted)' }}>
                Irreversible destructive actions. A safety snapshot is automatically captured prior to any wipe.
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <Button
              variant="danger"
              size="sm"
              onClick={() => setIsClearDataModalOpen(true)}
              iconLeft={<Trash2 size={14} />}
            >
              Clear All Personal Data
            </Button>

            <Button
              variant="secondary"
              size="sm"
              onClick={() => setIsResetDemoModalOpen(true)}
              iconLeft={<RotateCcw size={14} />}
            >
              Reset to Demo Curriculum
            </Button>
          </div>
        </div>
      </div>

      {/* ================================================================= */}
      {/* IMPORT & RESTORE VERIFICATION MODAL */}
      {/* ================================================================= */}
      <Modal
        isOpen={isImportModalOpen}
        onClose={() => {
          setIsImportModalOpen(false);
          setImportFile(null);
          setValidationResult(null);
        }}
        title="Verify & Restore Backup"
        size="md"
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, width: '100%' }}>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setIsImportModalOpen(false);
                setImportFile(null);
                setValidationResult(null);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleExecuteImport}
              disabled={!validationResult?.isValid}
              iconLeft={<Upload size={14} />}
            >
              {importMode === 'OVERWRITE' ? 'Overwrite & Restore Data' : 'Merge into Existing Data'}
            </Button>
          </div>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {validationResult && !validationResult.isValid ? (
            <div
              style={{
                display: 'flex',
                gap: 12,
                padding: '12px 14px',
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid var(--color-danger)',
                borderRadius: 'var(--radius-md)',
              }}
            >
              <AlertCircle size={18} color="var(--color-danger)" style={{ flexShrink: 0 }} />
              <div style={{ fontSize: '13px', color: 'var(--text-main)' }}>
                <strong>Validation Error:</strong> {validationResult.error}
              </div>
            </div>
          ) : validationResult?.summary ? (
            <>
              <div
                style={{
                  display: 'flex',
                  gap: 12,
                  padding: '12px 14px',
                  background: 'rgba(16, 185, 129, 0.1)',
                  border: '1px solid var(--color-success)',
                  borderRadius: 'var(--radius-md)',
                }}
              >
                <CheckCircle2 size={18} color="var(--color-success)" style={{ flexShrink: 0 }} />
                <div style={{ fontSize: '13px', color: 'var(--text-main)' }}>
                  <strong>Valid Backup Archive:</strong> File "{importFile?.name}" verified successfully.
                </div>
              </div>

              {/* Data Summary Grid */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: 8,
                  padding: '12px',
                  background: 'var(--bg-hover)',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '12px',
                }}
              >
                <div><strong>{validationResult.summary.totalQuestions}</strong> Questions</div>
                <div><strong>{validationResult.summary.totalTopics}</strong> Topics</div>
                <div><strong>{validationResult.summary.totalMistakes}</strong> Mistakes</div>
                <div><strong>{validationResult.summary.totalInsights}</strong> Insights</div>
                <div><strong>{validationResult.summary.totalGoals}</strong> Goals</div>
                <div><strong>{validationResult.summary.totalStudySessions}</strong> Sessions</div>
                <div><strong>{validationResult.summary.totalContestRecords}</strong> Contests</div>
                <div><strong>{validationResult.summary.totalMockTests}</strong> Mocks</div>
                <div><strong>{validationResult.summary.totalPlatformAccounts}</strong> Accounts</div>
              </div>

              {/* Import Mode Selector */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-main)' }}>
                  Select Import Strategy:
                </span>

                <label
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 10,
                    padding: '10px 12px',
                    borderRadius: 'var(--radius-md)',
                    border: importMode === 'MERGE' ? '1.5px solid var(--primary)' : '1px solid var(--border-color)',
                    background: importMode === 'MERGE' ? 'rgba(59, 130, 246, 0.08)' : 'transparent',
                    cursor: 'pointer',
                  }}
                >
                  <input
                    type="radio"
                    name="importMode"
                    value="MERGE"
                    checked={importMode === 'MERGE'}
                    onChange={() => setImportMode('MERGE')}
                    style={{ marginTop: 2 }}
                  />
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-main)' }}>
                      Merge with Existing Database (Recommended)
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                      Preserves your existing items and appends new questions, mistakes, and insights without overwriting.
                    </div>
                  </div>
                </label>

                <label
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 10,
                    padding: '10px 12px',
                    borderRadius: 'var(--radius-md)',
                    border: importMode === 'OVERWRITE' ? '1.5px solid var(--color-danger)' : '1px solid var(--border-color)',
                    background: importMode === 'OVERWRITE' ? 'rgba(239, 68, 68, 0.08)' : 'transparent',
                    cursor: 'pointer',
                  }}
                >
                  <input
                    type="radio"
                    name="importMode"
                    value="OVERWRITE"
                    checked={importMode === 'OVERWRITE'}
                    onChange={() => setImportMode('OVERWRITE')}
                    style={{ marginTop: 2 }}
                  />
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-main)' }}>
                      Complete Overwrite & Replace
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                      Replaces current database state with the backup archive. An auto-safety snapshot of current data is saved before executing.
                    </div>
                  </div>
                </label>
              </div>
            </>
          ) : null}
        </div>
      </Modal>

      {/* ================================================================= */}
      {/* CLEAR ALL DATA STRICT CONFIRMATION MODAL */}
      {/* ================================================================= */}
      <Modal
        isOpen={isClearDataModalOpen}
        onClose={() => {
          setIsClearDataModalOpen(false);
          setClearConfirmationText('');
        }}
        title="Permanently Clear All Personal Data?"
        size="md"
        footer={
          <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
            <Button
              variant="outline"
              size="sm"
              onClick={exportFullBackup}
              iconLeft={<Download size={13} />}
            >
              Download Backup First
            </Button>

            <div style={{ display: 'flex', gap: 8 }}>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setIsClearDataModalOpen(false);
                  setClearConfirmationText('');
                }}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={handleExecuteClearAll}
                disabled={clearConfirmationText.trim() !== 'DELETE MY DATA'}
                iconLeft={<Trash2 size={13} />}
              >
                Permanently Delete Everything
              </Button>
            </div>
          </div>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div
            style={{
              padding: '12px 14px',
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid var(--color-danger)',
              borderRadius: 'var(--radius-md)',
              fontSize: '13px',
              color: 'var(--text-main)',
            }}
          >
            <strong>Warning:</strong> This will irreversibly delete all personal data from local storage:
          </div>

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 4,
              fontSize: '12.5px',
              color: 'var(--text-muted)',
              paddingLeft: 10,
            }}
          >
            <div>• All <strong>{questions.length}</strong> questions, SRS intervals, review logs & mastery levels</div>
            <div>• All <strong>{topics.length}</strong> custom topics and taxonomies</div>
            <div>• All <strong>{mistakes.length}</strong> recorded mistake entries</div>
            <div>• All <strong>{insights.length}</strong> knowledge vault cards & personal observations</div>
            <div>• All <strong>{mockTests.length}</strong> Saturday mock test score records</div>
            <div>• All <strong>{goals.length}</strong> study goals & target horizons</div>
            <div>• All <strong>{studySessions.length}</strong> focus timer study session logs</div>
            <div>• All <strong>{contestRecords.length}</strong> contest entries and reflections</div>
          </div>

          <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
            <em>Note: A safety snapshot will be automatically recorded to your local restore points list before deleting.</em>
          </p>

          <div style={{ marginTop: 4 }}>
            <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-main)', display: 'block', marginBottom: 6 }}>
              Type <code>DELETE MY DATA</code> below to confirm:
            </label>
            <Input
              value={clearConfirmationText}
              onChange={(e) => setClearConfirmationText(e.target.value)}
              placeholder="Type DELETE MY DATA..."
            />
          </div>
        </div>
      </Modal>

      {/* ================================================================= */}
      {/* RESTORE SNAPSHOT CONFIRMATION DIALOG */}
      {/* ================================================================= */}
      <ConfirmationDialog
        isOpen={isRestoreSnapshotModalOpen}
        title="Restore Local Snapshot?"
        description={
          snapshotToRestore
            ? `Restoring "${snapshotToRestore.label}" will replace current database state with the data from ${new Date(
                snapshotToRestore.createdAt
              ).toLocaleString()} (${snapshotToRestore.summary.totalQuestions} questions, ${
                snapshotToRestore.summary.totalMistakes
              } mistakes). An automatic safety snapshot of your current state will be saved first.`
            : 'Are you sure you want to restore this snapshot?'
        }
        confirmText="Yes, Restore Snapshot"
        isDangerous={false}
        onConfirm={handleExecuteSnapshotRestore}
        onCancel={() => {
          setIsRestoreSnapshotModalOpen(false);
          setSnapshotToRestore(null);
        }}
      />

      {/* ================================================================= */}
      {/* RESET TO DEMO CURRICULUM CONFIRMATION DIALOG */}
      {/* ================================================================= */}
      <ConfirmationDialog
        isOpen={isResetDemoModalOpen}
        title="Reset to Demo Curriculum?"
        description="This will restore the standard sample questions, sliding window/two pointers topics, and starter insights. A safety snapshot of your current state will be preserved."
        confirmText="Reset to Clean Data"
        isDangerous={false}
        onConfirm={handleExecuteResetDemo}
        onCancel={() => setIsResetDemoModalOpen(false)}
      />

      {/* ================================================================= */}
      {/* PAIR ANOTHER DEVICE MODAL */}
      {/* ================================================================= */}
      <Modal
        isOpen={isPairingModalOpen}
        onClose={() => setIsPairingModalOpen(false)}
        title="Pair Device to Personal Sync Vault"
        footer={
          <>
            <Button variant="ghost" onClick={() => setIsPairingModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleExecutePairing}
              disabled={!pairingVaultInput.trim()}
              iconLeft={<Smartphone size={14} />}
            >
              Connect & Sync
            </Button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
            To connect another device (such as your phone or secondary computer), copy the <strong>Sync Vault Key</strong> from that device and paste it below:
          </p>

          <div>
            <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', display: 'block', marginBottom: 6 }}>
              Target Sync Vault Key
            </label>
            <Input
              value={pairingVaultInput}
              onChange={(e) => setPairingVaultInput(e.target.value)}
              placeholder="Paste Vault Key (e.g., psync-xxxx-xxxx-xxxx)..."
            />
          </div>

          <div
            style={{
              padding: '10px 12px',
              backgroundColor: 'var(--bg-subtle)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-subtle)',
              fontSize: '11.5px',
              color: 'var(--text-muted)',
              lineHeight: 1.4,
            }}
          >
            💡 <strong>How it works:</strong> Pairing establishes a direct cryptographic sync channel between your devices. Your local study questions, SRS review history, and sessions will automatically merge and sync across devices.
          </div>
        </div>
      </Modal>
    </div>
  );
};

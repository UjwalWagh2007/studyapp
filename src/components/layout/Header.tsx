import React, { useState } from 'react';
import {
  Moon,
  Sun,
  Menu,
  Clock,
  Cloud,
  RefreshCw,
  CloudOff,
  Copy,
  Check,
  Link as LinkIcon,
  Smartphone,
  Laptop,
} from 'lucide-react';
import { useAppStore } from '../../context/AppContext';
import { IconButton } from '../ui/IconButton';
import { Badge } from '../ui/Badge';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { getPairingUrl } from '../../services/syncService';

interface HeaderProps {
  pageTitle: string;
}

export const Header: React.FC<HeaderProps> = ({ pageTitle }) => {
  const {
    settings,
    toggleTheme,
    openMobileSidebar,
    dueTodayProblems,
    syncConfig,
    syncStatus,
    isOnline,
    triggerCloudSync,
    connectWorkspace,
  } = useAppStore();

  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const [connectIdInput, setConnectIdInput] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectError, setConnectError] = useState('');
  const [copiedId, setCopiedId] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const handleCopyId = () => {
    if (typeof navigator !== 'undefined') {
      navigator.clipboard.writeText(syncConfig.vaultId);
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
    }
  };

  const handleCopyLink = () => {
    if (typeof navigator !== 'undefined') {
      const url = getPairingUrl(syncConfig.vaultId);
      navigator.clipboard.writeText(url);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  const handleConnectWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!connectIdInput.trim()) return;
    setIsConnecting(true);
    setConnectError('');
    try {
      const ok = await connectWorkspace(connectIdInput.trim());
      if (ok) {
        setConnectIdInput('');
        setIsSyncModalOpen(false);
      } else {
        setConnectError('Could not connect to workspace. Check the ID and try again.');
      }
    } catch {
      setConnectError('Connection error occurred.');
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <>
      <header className="app-header">
        {/* Left side: Mobile menu toggle + Current Page Title */}
        <div className="header-left">
          <div className="mobile-only">
            <IconButton
              icon={<Menu size={20} />}
              label="Open navigation menu"
              onClick={openMobileSidebar}
            />
          </div>

          <h1 className="header-page-title">{pageTitle}</h1>
        </div>

        {/* Right side: Sync Status, Revisions due counter & Theme toggle */}
        <div className="header-right-actions">
          {/* Unobtrusive Sync Status Indicator */}
          <button
            type="button"
            className={`sync-status-btn ${
              !isOnline || syncStatus === 'OFFLINE'
                ? 'offline'
                : syncStatus === 'SYNCING'
                ? 'syncing'
                : syncStatus === 'ERROR'
                ? 'error'
                : 'synced'
            }`}
            onClick={() => setIsSyncModalOpen(true)}
            title="Personal Workspace Sync Settings & Device Pairing"
            aria-label="Workspace sync status"
          >
            {!isOnline || syncStatus === 'OFFLINE' ? (
              <>
                <CloudOff size={12} />
                <span className="badge-text-full">Offline</span>
              </>
            ) : syncStatus === 'SYNCING' ? (
              <>
                <RefreshCw size={12} className="sync-spin" />
                <span className="badge-text-full">Syncing...</span>
              </>
            ) : syncStatus === 'ERROR' ? (
              <>
                <CloudOff size={12} />
                <span className="badge-text-full">Retry Sync</span>
              </>
            ) : (
              <>
                <Cloud size={12} />
                <span className="badge-text-full">Synced</span>
              </>
            )}
          </button>

          {dueTodayProblems.length > 0 ? (
            <Badge variant="primary" size="md">
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                <Clock size={13} />
                <span className="badge-text-full">
                  {dueTodayProblems.length} Revision{dueTodayProblems.length === 1 ? '' : 's'} Due Today
                </span>
                <span className="badge-text-short">{dueTodayProblems.length} Due</span>
              </span>
            </Badge>
          ) : (
            <Badge variant="success" size="md">
              <span className="badge-text-full">All Caught Up</span>
              <span className="badge-text-short">Caught Up</span>
            </Badge>
          )}

          {/* Quick Theme Toggle */}
          <IconButton
            icon={settings.theme === 'dark' ? <Sun size={18} color="#fbbf24" /> : <Moon size={18} color="#6366f1" />}
            label={`Switch theme (currently ${settings.theme})`}
            onClick={toggleTheme}
          />
        </div>
      </header>

      {/* Personal Workspace Sync & Device Pairing Modal */}
      <Modal
        isOpen={isSyncModalOpen}
        onClose={() => setIsSyncModalOpen(false)}
        title="Personal Workspace Sync"
        subtitle="Automatic real-time sync across Laptop, Phone, and Tablet without accounts or passwords."
        icon={<Cloud size={20} color="var(--color-primary)" />}
        size="md"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Section 1: Current Workspace Details & Pairing */}
          <div className="workspace-section">
            <div className="workspace-section-title" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Laptop size={16} /> Current Workspace Identity
            </div>
            <div className="workspace-section-desc">
              Your study data is automatically synced to this personal workspace. Open this workspace on your phone to keep everything synchronized.
            </div>

            <div className="workspace-box">
              <div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Workspace ID
                </div>
                <div className="workspace-id-badge">{syncConfig.vaultId}</div>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <Button variant="secondary" size="sm" onClick={handleCopyId}>
                  {copiedId ? <Check size={14} color="var(--color-success)" /> : <Copy size={14} />}
                  {copiedId ? 'Copied' : 'Copy ID'}
                </Button>
                <Button variant="primary" size="sm" onClick={handleCopyLink}>
                  {copiedLink ? <Check size={14} /> : <LinkIcon size={14} />}
                  {copiedLink ? 'Copied Link' : 'Pair Link'}
                </Button>
              </div>
            </div>
          </div>

          {/* Section 2: Connect another device / workspace */}
          <div className="workspace-section">
            <div className="workspace-section-title" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Smartphone size={16} /> Connect to an Existing Workspace
            </div>
            <div className="workspace-section-desc">
              Already have a workspace on another device? Enter its Workspace ID below to link this device.
            </div>

            <form onSubmit={handleConnectWorkspace} style={{ display: 'flex', gap: 8, marginTop: 4 }}>
              <Input
                placeholder="e.g. STUDY-ABCD-1234"
                value={connectIdInput}
                onChange={(e) => setConnectIdInput(e.target.value)}
                style={{ flex: 1, textTransform: 'uppercase', fontFamily: 'var(--font-mono, monospace)' }}
              />
              <Button type="submit" variant="primary" size="md" isLoading={isConnecting}>
                Connect
              </Button>
            </form>
            {connectError && (
              <div style={{ fontSize: '12px', color: 'var(--color-danger)', marginTop: 4 }}>
                {connectError}
              </div>
            )}
          </div>

          {/* Section 3: Sync controls & Status */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 8 }}>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              Status: <strong>{!isOnline ? 'Offline (Saved Locally)' : syncStatus === 'SYNCING' ? 'Syncing...' : 'Synced & Ready'}</strong>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => triggerCloudSync()}
              isLoading={syncStatus === 'SYNCING'}
            >
              <RefreshCw size={13} className={syncStatus === 'SYNCING' ? 'sync-spin' : ''} />
              Sync Now
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
};


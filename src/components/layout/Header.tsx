import React, { useState } from 'react';
import {
  Moon,
  Sun,
  Menu,
  Clock,
  Cloud,
  RefreshCw,
  CloudOff,
  CheckCircle2,
  Smartphone,
  Laptop,
} from 'lucide-react';
import { useAppStore } from '../../context/AppContext';
import { IconButton } from '../ui/IconButton';
import { Badge } from '../ui/Badge';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';

interface HeaderProps {
  pageTitle: string;
}

export const Header: React.FC<HeaderProps> = ({ pageTitle }) => {
  const {
    settings,
    toggleTheme,
    openMobileSidebar,
    dueTodayProblems,
    syncStatus,
    isOnline,
    triggerCloudSync,
  } = useAppStore();

  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);

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
          {/* Unobtrusive Universal Sync Status Indicator */}
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
            title="Cloud Sync Status"
            aria-label="Cloud sync status"
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

      {/* Universal Cloud Sync Status Modal */}
      <Modal
        isOpen={isSyncModalOpen}
        onClose={() => setIsSyncModalOpen(false)}
        title="Personal Study Cloud Sync"
        subtitle="Automatic universal synchronization across all your devices."
        icon={<Cloud size={20} color="var(--color-primary)" />}
        size="md"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="workspace-box" style={{ background: 'rgba(16, 185, 129, 0.08)', borderColor: 'rgba(16, 185, 129, 0.25)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <CheckCircle2 size={20} color="var(--color-success)" />
              <div>
                <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-success)' }}>
                  Universal Sync Active
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  {!isOnline
                    ? 'Currently Offline — all changes saved locally and will sync when reconnected.'
                    : syncStatus === 'SYNCING'
                    ? 'Syncing changes in real time...'
                    : 'Your workspace is up to date and shared across all devices.'}
                </div>
              </div>
            </div>
          </div>

          <div className="workspace-section">
            <div className="workspace-section-title" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Laptop size={15} /> <Smartphone size={15} /> One Seamless Workspace
            </div>
            <div className="workspace-section-desc">
              Opening this link on your phone, laptop, or tablet connects directly to this exact study dataset. All topics, problems, SRS intervals, study sessions, and mock tests are synced automatically without passwords or pairing codes.
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 6 }}>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              Status: <strong>{!isOnline ? 'Offline' : syncStatus === 'SYNCING' ? 'Syncing...' : 'Connected & Synced'}</strong>
            </div>
            <Button
              variant="primary"
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



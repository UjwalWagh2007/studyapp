import React, { useState, useRef, useEffect } from 'react';
import {
  Search,
  Moon,
  Sun,
  Bell,
  Menu,
  Check,
  Settings as SettingsIcon,
  BookOpen,
  Award,
  Zap,
  Trophy,
  Target,
  Flame,
  ChevronRight,
  CheckCheck,
} from 'lucide-react';
import { useAppStore } from '../../context/AppContext';
import { IconButton } from '../ui/IconButton';
import { Badge } from '../ui/Badge';
import type { ThemeMode, NotificationCategory } from '../../types';

interface HeaderProps {
  pageTitle: string;
}

export const Header: React.FC<HeaderProps> = ({ pageTitle }) => {
  const {
    settings,
    setTheme,
    toggleTheme,
    openMobileSidebar,
    notifications,
    unreadNotificationsCount,
    markNotificationRead,
    clearAllNotifications,
    navigateTo,
  } = useAppStore();

  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleDocClick = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setIsNotificationsOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setIsProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleDocClick);
    return () => document.removeEventListener('mousedown', handleDocClick);
  }, []);

  const getCategoryIcon = (category: NotificationCategory) => {
    switch (category) {
      case 'SRS_REVISIONS':
        return <BookOpen size={14} color="#38bdf8" />;
      case 'WEEKLY_MOCK':
        return <Award size={14} color="#a855f7" />;
      case 'SUNDAY_SPECIAL':
        return <Zap size={14} color="#f97316" />;
      case 'CONTESTS':
        return <Trophy size={14} color="#eab308" />;
      case 'GOALS':
        return <Target size={14} color="#ef4444" />;
      case 'STREAK':
        return <Flame size={14} color="#ef4444" />;
      default:
        return <Bell size={14} />;
    }
  };

  const handleNotificationAction = (notif: any) => {
    markNotificationRead(notif.id);
    setIsNotificationsOpen(false);
    if (notif.actionRoute) {
      navigateTo(notif.actionRoute);
    } else if (notif.externalUrl) {
      window.open(notif.externalUrl, '_blank');
    }
  };

  return (
    <header className="app-header">
      {/* Left side: Mobile menu toggle + Current Page Title */}
      <div className="header-left">
        <div className="mobile-only" style={{ display: 'none' }}>
          <IconButton
            icon={<Menu size={20} />}
            label="Open navigation menu"
            onClick={openMobileSidebar}
          />
        </div>

        <h1 className="header-page-title">{pageTitle}</h1>
      </div>

      {/* Center: Global search placeholder */}
      <div className="header-search-bar" role="search">
        <Search size={15} />
        <span>Quick search...</span>
      </div>

      {/* Right side: Notifications, Theme toggle, Profile menu */}
      <div className="header-right-actions">
        {/* Meaningful Notifications Popover */}
        <div style={{ position: 'relative' }} ref={notifRef}>
          <IconButton
            icon={
              <div style={{ position: 'relative', display: 'flex' }}>
                <Bell size={18} />
                {unreadNotificationsCount > 0 && (
                  <span
                    style={{
                      position: 'absolute',
                      top: -4,
                      right: -4,
                      minWidth: 14,
                      height: 14,
                      padding: '0 3px',
                      borderRadius: 'var(--radius-full)',
                      backgroundColor: 'var(--danger)',
                      color: '#ffffff',
                      fontSize: '9px',
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {unreadNotificationsCount}
                  </span>
                )}
              </div>
            }
            label="Notifications"
            onClick={() => setIsNotificationsOpen((prev) => !prev)}
          />

          {isNotificationsOpen && (
            <div
              className="popover-menu"
              style={{
                width: 360,
                maxHeight: 480,
                overflowY: 'auto',
                padding: 0,
                boxShadow: 'var(--shadow-xl)',
              }}
            >
              {/* Header */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 16px',
                  borderBottom: '1px solid var(--border-color)',
                  background: 'var(--bg-card)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-main)' }}>
                    Notifications
                  </span>
                  {unreadNotificationsCount > 0 && (
                    <Badge variant="primary" size="sm">
                      {unreadNotificationsCount} new
                    </Badge>
                  )}
                </div>

                {unreadNotificationsCount > 0 && (
                  <button
                    onClick={clearAllNotifications}
                    style={{
                      fontSize: '11px',
                      color: 'var(--primary)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                      fontWeight: 500,
                    }}
                  >
                    <CheckCheck size={13} />
                    Mark all read
                  </button>
                )}
              </div>

              {/* Notification Items List */}
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {notifications.length > 0 ? (
                  notifications.map((notif) => (
                    <div
                      key={notif.id}
                      style={{
                        padding: '12px 16px',
                        borderBottom: '1px solid var(--border-color)',
                        background: notif.isRead ? 'transparent' : 'rgba(59, 130, 246, 0.05)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 6,
                        transition: 'background 0.15s ease',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          {getCategoryIcon(notif.category)}
                          <span style={{ fontSize: '13px', fontWeight: notif.isRead ? 500 : 700, color: 'var(--text-main)' }}>
                            {notif.title}
                          </span>
                        </div>
                        {!notif.isRead && (
                          <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--primary)' }} />
                        )}
                      </div>

                      <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0, lineHeight: 1.4 }}>
                        {notif.message}
                      </p>

                      {(notif.actionRoute || notif.externalUrl) && (
                        <div style={{ display: 'flex', justifyContent: 'flex-start', marginTop: 4 }}>
                          <button
                            onClick={() => handleNotificationAction(notif)}
                            style={{
                              fontSize: '11.5px',
                              fontWeight: 600,
                              color: 'var(--primary)',
                              background: 'rgba(59, 130, 246, 0.1)',
                              border: 'none',
                              padding: '4px 10px',
                              borderRadius: 'var(--radius-sm)',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4,
                            }}
                          >
                            <span>{notif.actionText || 'Take Action'}</span>
                            <ChevronRight size={12} />
                          </button>
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <div style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '12.5px' }}>
                    <Check size={20} style={{ color: 'var(--success)', margin: '0 auto 6px' }} />
                    <div>All caught up! No unread notifications.</div>
                  </div>
                )}
              </div>

              {/* Footer: Preferences shortcut */}
              <div
                style={{
                  padding: '8px 14px',
                  background: 'var(--bg-card)',
                  borderTop: '1px solid var(--border-color)',
                  display: 'flex',
                  justifyContent: 'center',
                }}
              >
                <button
                  onClick={() => {
                    navigateTo('settings');
                    setIsNotificationsOpen(false);
                  }}
                  style={{
                    fontSize: '11.5px',
                    color: 'var(--text-muted)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <SettingsIcon size={12} />
                  <span>Configure Notification Preferences</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Quick Theme Toggle */}
        <IconButton
          icon={settings.theme === 'dark' ? <Sun size={18} color="#fbbf24" /> : <Moon size={18} color="#6366f1" />}
          label={`Switch theme (currently ${settings.theme})`}
          onClick={toggleTheme}
        />

        {/* User Profile Menu */}
        <div style={{ position: 'relative' }} ref={profileRef}>
          <button
            onClick={() => setIsProfileOpen((prev) => !prev)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '4px 8px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-subtle)',
              backgroundColor: 'var(--bg-subtle)',
              cursor: 'pointer',
            }}
            aria-label="User profile menu"
          >
            <div
              style={{
                width: 24,
                height: 24,
                borderRadius: '50%',
                backgroundColor: 'var(--color-primary)',
                color: '#fff',
                fontSize: '11px',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {settings.userName.charAt(0).toUpperCase()}
            </div>
            <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)' }}>
              {settings.userName}
            </span>
          </button>

          {isProfileOpen && (
            <div className="popover-menu" style={{ width: 220 }}>
              <div
                style={{
                  padding: '8px 12px 6px',
                  borderBottom: '1px solid var(--border-subtle)',
                  marginBottom: 4,
                }}
              >
                <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                  {settings.userName}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  {settings.email || 'Personal Study OS'}
                </div>
              </div>

              <div style={{ padding: '4px 12px', fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                Theme
              </div>

              {(['light', 'dark', 'system'] as ThemeMode[]).map((mode) => (
                <button
                  key={mode}
                  className="popover-menu-item"
                  onClick={() => {
                    setTheme(mode);
                    setIsProfileOpen(false);
                  }}
                  style={{ justifyContent: 'space-between' }}
                >
                  <span style={{ textTransform: 'capitalize' }}>{mode} Theme</span>
                  {settings.theme === mode && <Check size={14} color="var(--color-primary)" />}
                </button>
              ))}

              <div style={{ borderTop: '1px solid var(--border-subtle)', marginTop: 4, paddingTop: 4 }}>
                <button
                  className="popover-menu-item"
                  onClick={() => {
                    navigateTo('settings');
                    setIsProfileOpen(false);
                  }}
                >
                  <SettingsIcon size={14} />
                  <span>Settings & Preferences</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

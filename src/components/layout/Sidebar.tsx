import React from 'react';
import {
  FolderTree,
  Repeat,
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  X,
} from 'lucide-react';
import { useAppStore } from '../../context/AppContext';
import { IconButton } from '../ui/IconButton';
import type { RoutePath } from '../../types';

interface NavItem {
  id: RoutePath;
  label: string;
  icon: React.ReactNode;
  badgeCount?: number;
}

export const Sidebar: React.FC = () => {
  const {
    currentPath,
    navigateTo,
    isSidebarCollapsed,
    toggleSidebar,
    isMobileSidebarOpen,
    closeMobileSidebar,
    dueTodayProblems,
  } = useAppStore();

  const navItems: NavItem[] = [
    {
      id: 'topics',
      label: 'Topics',
      icon: <FolderTree size={18} />,
    },
    {
      id: 'revision',
      label: 'Revision',
      icon: <Repeat size={18} />,
      badgeCount: dueTodayProblems.length,
    },
    {
      id: 'calendar',
      label: 'Calendar',
      icon: <CalendarIcon size={18} />,
    },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileSidebarOpen && (
        <div
          className="sidebar-backdrop"
          onClick={closeMobileSidebar}
          aria-label="Close navigation overlay"
        />
      )}

      <aside
        className={`app-sidebar ${isSidebarCollapsed ? 'collapsed' : ''} ${
          isMobileSidebarOpen ? 'mobile-open' : ''
        }`}
      >
        {/* Brand Header */}
        <div className="sidebar-header">
          <div className="sidebar-brand">
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--color-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                flexShrink: 0,
              }}
            >
              <Sparkles size={16} />
            </div>
            {!isSidebarCollapsed && (
              <span style={{ fontWeight: 700, fontSize: '15px', letterSpacing: '-0.01em' }}>
                StudyOS
              </span>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <div className="desktop-only">
              <IconButton
                icon={isSidebarCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
                label={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                size="sm"
                onClick={toggleSidebar}
              />
            </div>
            <div className="mobile-only" style={{ display: 'none' }}>
              <IconButton
                icon={<X size={16} />}
                label="Close sidebar"
                size="sm"
                onClick={closeMobileSidebar}
              />
            </div>
          </div>
        </div>

        {/* Primary Navigation */}
        <nav className="sidebar-nav-list" aria-label="Main Navigation">
          {navItems.map((item) => {
            const isActive = currentPath === item.id;
            return (
              <button
                key={item.id}
                className={`sidebar-nav-item ${isActive ? 'active' : ''}`}
                onClick={() => navigateTo(item.id)}
                title={isSidebarCollapsed ? item.label : undefined}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  width: '100%',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  {item.icon}
                  {!isSidebarCollapsed && <span>{item.label}</span>}
                </div>

                {!isSidebarCollapsed && Boolean(item.badgeCount && item.badgeCount > 0) && (
                  <span
                    style={{
                      backgroundColor: 'var(--color-primary)',
                      color: '#ffffff',
                      fontSize: '11px',
                      fontWeight: 700,
                      padding: '2px 7px',
                      borderRadius: 'var(--radius-full)',
                      lineHeight: 1,
                    }}
                  >
                    {item.badgeCount}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </aside>
    </>
  );
};

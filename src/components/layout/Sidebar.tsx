import React from 'react';
import {
  Home,
  BookOpen,
  Repeat,
  CheckSquare,
  Activity,
  BarChart3,
  Target,
  Settings as SettingsIcon,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  X,
} from 'lucide-react';
import { useAppStore } from '../../context/AppContext';
import { IconButton } from '../ui/IconButton';
import type { RoutePath, NavGroupKey } from '../../types';

interface SubNavItem {
  id: RoutePath;
  label: string;
}

interface NavGroupItem {
  key: NavGroupKey;
  label: string;
  icon: React.ReactNode;
  children: SubNavItem[];
}

export const Sidebar: React.FC = () => {
  const {
    currentPath,
    navigateTo,
    isSidebarCollapsed,
    toggleSidebar,
    isMobileSidebarOpen,
    closeMobileSidebar,
    expandedGroups,
    toggleGroup,
  } = useAppStore();

  const navGroups: NavGroupItem[] = [
    {
      key: 'learn',
      label: 'LEARN',
      icon: <BookOpen size={16} />,
      children: [
        { id: 'learn/topics', label: 'Topics' },
        { id: 'learn/questions', label: 'Questions' },
        { id: 'learn/resources', label: 'Resources' },
      ],
    },
    {
      key: 'review',
      label: 'REVIEW',
      icon: <Repeat size={16} />,
      children: [
        { id: 'review/due-today', label: 'Due Today' },
        { id: 'review/calendar', label: 'Calendar' },
      ],
    },
    {
      key: 'test',
      label: 'TEST',
      icon: <CheckSquare size={16} />,
      children: [
        { id: 'test/mock-tests', label: 'Mock Tests' },
        { id: 'test/mistake-bank', label: 'Mistake Bank' },
      ],
    },
    {
      key: 'track',
      label: 'TRACK',
      icon: <Activity size={16} />,
      children: [
        { id: 'track/platforms', label: 'Platforms' },
        { id: 'track/contests', label: 'Contests' },
      ],
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

        {/* Navigation Item Tree */}
        <nav className="sidebar-nav-list" aria-label="Main Navigation">
          {/* HOME */}
          <button
            className={`sidebar-nav-item ${currentPath === 'home' ? 'active' : ''}`}
            onClick={() => navigateTo('home')}
            title={isSidebarCollapsed ? 'HOME' : undefined}
          >
            <Home size={16} />
            {!isSidebarCollapsed && <span>HOME</span>}
          </button>

          {/* COLLAPSIBLE GROUPS: LEARN, REVIEW, TEST, TRACK */}
          {navGroups.map((group) => {
            const isExpanded = expandedGroups[group.key];
            const isGroupActive = group.children.some((child) => child.id === currentPath);

            return (
              <div key={group.key} style={{ display: 'flex', flexDirection: 'column' }}>
                <button
                  className={`sidebar-group-header ${isGroupActive ? 'group-active' : ''}`}
                  onClick={() => {
                    if (isSidebarCollapsed) {
                      toggleSidebar();
                    } else {
                      toggleGroup(group.key);
                    }
                  }}
                  title={isSidebarCollapsed ? group.label : undefined}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    {group.icon}
                    {!isSidebarCollapsed && <span>{group.label}</span>}
                  </div>
                  {!isSidebarCollapsed && (
                    <div style={{ color: 'var(--text-muted)' }}>
                      {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    </div>
                  )}
                </button>

                {/* Sub-items */}
                {!isSidebarCollapsed && isExpanded && (
                  <div className="sidebar-group-children">
                    {group.children.map((subItem) => {
                      const isSubActive = currentPath === subItem.id;
                      return (
                        <button
                          key={subItem.id}
                          className={`sidebar-sub-item ${isSubActive ? 'active' : ''}`}
                          onClick={() => navigateTo(subItem.id)}
                        >
                          <span>{subItem.label}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}

          {/* INSIGHTS */}
          <button
            className={`sidebar-nav-item ${currentPath === 'insights' ? 'active' : ''}`}
            onClick={() => navigateTo('insights')}
            title={isSidebarCollapsed ? 'INSIGHTS' : undefined}
          >
            <BarChart3 size={16} />
            {!isSidebarCollapsed && <span>INSIGHTS</span>}
          </button>

          {/* GOALS */}
          <button
            className={`sidebar-nav-item ${currentPath === 'goals' ? 'active' : ''}`}
            onClick={() => navigateTo('goals')}
            title={isSidebarCollapsed ? 'GOALS' : undefined}
          >
            <Target size={16} />
            {!isSidebarCollapsed && <span>GOALS</span>}
          </button>

          {/* SETTINGS */}
          <button
            className={`sidebar-nav-item ${currentPath === 'settings' ? 'active' : ''}`}
            onClick={() => navigateTo('settings')}
            title={isSidebarCollapsed ? 'SETTINGS' : undefined}
          >
            <SettingsIcon size={16} />
            {!isSidebarCollapsed && <span>SETTINGS</span>}
          </button>
        </nav>
      </aside>
    </>
  );
};

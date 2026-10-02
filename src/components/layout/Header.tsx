import React from 'react';
import {
  Moon,
  Sun,
  Menu,
  Clock,
} from 'lucide-react';
import { useAppStore } from '../../context/AppContext';
import { IconButton } from '../ui/IconButton';
import { Badge } from '../ui/Badge';

interface HeaderProps {
  pageTitle: string;
}

export const Header: React.FC<HeaderProps> = ({ pageTitle }) => {
  const {
    settings,
    toggleTheme,
    openMobileSidebar,
    dueTodayProblems,
  } = useAppStore();

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

      {/* Right side: Revisions due counter & Theme toggle */}
      <div className="header-right-actions" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {dueTodayProblems.length > 0 ? (
          <Badge variant="primary" size="md">
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
              <Clock size={13} />
              {dueTodayProblems.length} Revision{dueTodayProblems.length === 1 ? '' : 's'} Due Today
            </span>
          </Badge>
        ) : (
          <Badge variant="success" size="md">
            All Caught Up
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
  );
};

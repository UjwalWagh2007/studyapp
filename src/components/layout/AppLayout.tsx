import React from 'react';
import { useAppStore } from '../../context/AppContext';
import { Sidebar } from './Sidebar';
import { Header } from './Header';

// Pages
import { DashboardPage } from '../../pages/DashboardPage';
import { TopicsPage } from '../../pages/TopicsPage';
import { RevisionPage } from '../../pages/RevisionPage';
import { CalendarPage } from '../../pages/CalendarPage';

export const AppLayout: React.FC = () => {
  const { currentPath } = useAppStore();

  const getPageTitleAndComponent = () => {
    switch (currentPath) {
      case 'dashboard':
        return { title: 'Dashboard', component: <DashboardPage /> };
      case 'topics':
        return { title: 'Topics & Problems', component: <TopicsPage /> };
      case 'revision':
        return { title: 'Spaced Repetition Revision', component: <RevisionPage /> };
      case 'calendar':
        return { title: 'Revision Calendar', component: <CalendarPage /> };
      default:
        return { title: 'Dashboard', component: <DashboardPage /> };
    }
  };

  const { title, component } = getPageTitleAndComponent();

  return (
    <div className="app-shell">
      {/* Collapsible / Responsive Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="app-main-content-wrapper">
        <Header pageTitle={title} />
        <main className="app-page-scrollable" id="main-content">
          {component}
        </main>
      </div>
    </div>
  );
};

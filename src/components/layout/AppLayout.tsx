import React from 'react';
import { useAppStore } from '../../context/AppContext';
import { Sidebar } from './Sidebar';
import { Header } from './Header';

// Pages
import { HomePage } from '../../pages/HomePage';
import { TopicsPage } from '../../pages/learn/TopicsPage';
import { QuestionsPage } from '../../pages/learn/QuestionsPage';
import { ResourcesPage } from '../../pages/learn/ResourcesPage';
import { DueTodayPage } from '../../pages/review/DueTodayPage';
import { CalendarPage } from '../../pages/review/CalendarPage';
import { MockTestsPage } from '../../pages/test/MockTestsPage';
import { MistakeBankPage } from '../../pages/test/MistakeBankPage';
import { PlatformsPage } from '../../pages/track/PlatformsPage';
import { ContestsPage } from '../../pages/track/ContestsPage';
import { InsightsPage } from '../../pages/InsightsPage';
import { GoalsPage } from '../../pages/GoalsPage';
import { SettingsPage } from '../../pages/SettingsPage';

export const AppLayout: React.FC = () => {
  const { currentPath } = useAppStore();

  const getPageTitleAndComponent = () => {
    switch (currentPath) {
      case 'home':
        return { title: 'Home', component: <HomePage /> };
      case 'learn/topics':
        return { title: 'Learn / Topics', component: <TopicsPage /> };
      case 'learn/questions':
        return { title: 'Learn / Questions', component: <QuestionsPage /> };
      case 'learn/resources':
        return { title: 'Learn / Resources', component: <ResourcesPage /> };
      case 'review/due-today':
        return { title: 'Review / Due Today', component: <DueTodayPage /> };
      case 'review/calendar':
        return { title: 'Review / Calendar', component: <CalendarPage /> };
      case 'test/mock-tests':
        return { title: 'Test / Mock Tests', component: <MockTestsPage /> };
      case 'test/mistake-bank':
        return { title: 'Test / Mistake Bank', component: <MistakeBankPage /> };
      case 'track/platforms':
        return { title: 'Track / Platforms', component: <PlatformsPage /> };
      case 'track/contests':
        return { title: 'Track / Contests', component: <ContestsPage /> };
      case 'insights':
        return { title: 'Insights', component: <InsightsPage /> };
      case 'goals':
        return { title: 'Goals', component: <GoalsPage /> };
      case 'settings':
        return { title: 'Settings', component: <SettingsPage /> };
      default:
        return { title: 'Home', component: <HomePage /> };
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

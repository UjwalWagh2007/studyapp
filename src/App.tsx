import React from 'react';
import { AppProvider } from './context/AppContext';
import { ToastProvider } from './context/ToastContext';
import { AppLayout } from './components/layout/AppLayout';
import { ErrorBoundary } from './components/layout/ErrorBoundary';
import './index.css';
import './styles/components.css';

export const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <AppProvider>
          <AppLayout />
        </AppProvider>
      </ToastProvider>
    </ErrorBoundary>
  );
};

export default App;

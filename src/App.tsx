import React from 'react';
import { AppProvider } from './context/AppContext';
import { ToastProvider } from './context/ToastContext';
import { AppLayout } from './components/layout/AppLayout';
import './index.css';
import './styles/components.css';

export const App: React.FC = () => {
  return (
    <ToastProvider>
      <AppProvider>
        <AppLayout />
      </AppProvider>
    </ToastProvider>
  );
};

export default App;

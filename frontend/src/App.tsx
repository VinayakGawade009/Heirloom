import { HashRouter, Routes, Route } from 'react-router-dom';
import TopBar from './components/TopBar';
import BottomBar from './components/BottomBar';
import ErrorBoundary from './components/ErrorBoundary';
import LibraryPage from './pages/LibraryPage';
import AddPage from './pages/AddPage';
import PageView from './pages/PageView';
import SettingsPage from './pages/SettingsPage';
import NotFoundPage from './pages/NotFoundPage';
import { SettingsProvider, useSettings } from './state/SettingsContext';

function AppLayout() {
  const { settings } = useSettings();
  const modelName = settings?.model || 'unknown';

  return (
    <div className="min-h-screen flex flex-col bg-canvas text-ink font-sans">
      <TopBar />
      <main className="flex-1 w-full max-w-7xl mx-auto px-8 py-8">
        <ErrorBoundary>
          <Routes>
            <Route path="/" element={<LibraryPage />} />
            <Route path="/add" element={<AddPage />} />
            <Route path="/pages/:id" element={<PageView />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </ErrorBoundary>
      </main>
      <BottomBar name={modelName} />
    </div>
  );
}

export default function App() {
  return (
    <HashRouter>
      <SettingsProvider>
        <AppLayout />
      </SettingsProvider>
    </HashRouter>
  );
}

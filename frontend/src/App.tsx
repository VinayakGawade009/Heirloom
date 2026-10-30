import { HashRouter, Routes, Route } from 'react-router-dom';
import TopBar from './components/TopBar';
import BottomBar from './components/BottomBar';
import LibraryPage from './pages/LibraryPage';
import AddPage from './pages/AddPage';
import DocumentPage from './pages/DocumentPage';
import SettingsPage from './pages/SettingsPage';

export default function App() {
  return (
    <HashRouter>
      <div className="min-h-screen flex flex-col bg-canvas text-ink font-sans">
        <TopBar />
        <main className="flex-1 w-full max-w-7xl mx-auto px-8 py-8">
          <Routes>
            <Route path="/" element={<LibraryPage />} />
            <Route path="/add" element={<AddPage />} />
            <Route path="/pages/:id" element={<DocumentPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Routes>
        </main>
        <BottomBar name="gemma4:e2b" />
      </div>
    </HashRouter>
  );
}

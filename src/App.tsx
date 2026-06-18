import { Route, Routes } from 'react-router-dom';
import Landing from './pages/Landing';
import PublicCard from './pages/PublicCard';
import NotFound from './pages/NotFound';
import { AuthProvider } from './admin/AuthContext';
import Auth from './admin/Auth';
import Protected from './admin/Protected';
import CardList from './admin/CardList';
import CardEditor from './admin/CardEditor';
import { configured } from './lib/supabase';

function NotConfigured() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-2 bg-slate-50 px-6 text-center">
      <p className="text-base font-semibold text-slate-800">Supabase is not configured.</p>
      <p className="max-w-md text-sm text-slate-500">
        Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file, then restart the dev server.
      </p>
    </div>
  );
}

export default function App() {
  if (!configured) return <NotConfigured />;
  return (
    <AuthProvider>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Auth mode="login" />} />
        <Route path="/signup" element={<Auth mode="signup" />} />
        <Route element={<Protected />}>
          <Route path="/dashboard" element={<CardList />} />
          <Route path="/dashboard/cards/:id" element={<CardEditor />} />
        </Route>
        <Route path="/:slug" element={<PublicCard />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </AuthProvider>
  );
}

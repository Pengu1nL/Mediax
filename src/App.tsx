/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom';
import TopNavBar from './components/TopNavBar';
import { FullScreenLoader, InlineAlert, NotFoundState } from './components/PageState';
import { AppProvider, useAppStore } from './context/AppContext';
import Brand from './pages/Brand';
import Dashboard from './pages/Dashboard';
import DraftEditor from './pages/DraftEditor';
import Drafts from './pages/Drafts';
import Library from './pages/Library';
import Login from './pages/Login';
import Onboarding from './pages/Onboarding';
import PlanDetails from './pages/PlanDetails';
import Plans from './pages/Plans';

function RequireAuth() {
  const { ready, currentUser } = useAppStore();
  const location = useLocation();

  if (!ready) {
    return <FullScreenLoader />;
  }

  if (!currentUser) {
    const redirect = `${location.pathname}${location.search}`;
    return <Navigate to={`/login?redirect=${encodeURIComponent(redirect)}`} replace />;
  }

  return <Outlet />;
}

function LoginRoute() {
  const { ready, currentUser } = useAppStore();
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const redirect = params.get('redirect') || '/dashboard';

  if (!ready) {
    return <FullScreenLoader />;
  }

  if (currentUser) {
    return <Navigate to={redirect} replace />;
  }

  return <Login />;
}

function ShellLayout() {
  const location = useLocation();
  const { error, clearError } = useAppStore();

  return (
    <div className="min-h-screen flex flex-col">
      <TopNavBar />

      <main className="flex-grow pt-8 px-4 md:px-8 max-w-[1300px] mx-auto w-full relative">
        <div className="fixed top-0 left-0 w-full h-[800px] pointer-events-none -z-10 opacity-30 overflow-hidden">
          <svg className="w-full h-full" viewBox="0 0 1440 800" fill="none">
            <path d="M-200 800 Q400 -200 1600 600" stroke="#F37338" strokeWidth="1" opacity="0.5" />
            <path d="M-100 900 C300 100 800 900 1500 200" stroke="#F37338" strokeWidth="0.5" opacity="0.3" />
          </svg>
        </div>

        {error ? <InlineAlert message={error} onDismiss={clearError} /> : null}

        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </main>

      <footer className="py-12 border-t border-zinc-100 mt-20">
        <div className="max-w-[1300px] mx-auto px-8 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="text-xl font-black tracking-tighter text-ink-black">Mediax</div>
          <div className="text-sm font-bold text-zinc-300">© 2026 Mediax Studios. All rights reserved.</div>
          <div className="flex gap-8 text-sm font-bold text-slate-gray">
            <span className="text-zinc-300">Privacy</span>
            <span className="text-zinc-300">Terms</span>
            <span className="text-zinc-300">Support</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

function ProtectedNotFound() {
  return (
    <NotFoundState
      title="这个页面还没有被记录进工作台"
      description="请检查访问地址，或返回看板继续浏览现有模块。"
      backTo="/dashboard"
      backLabel="返回 Dashboard"
    />
  );
}

export default function App() {
  return (
    <AppProvider>
      <Routes>
        <Route path="/login" element={<LoginRoute />} />
        <Route element={<RequireAuth />}>
          <Route path="/onboarding" element={<Onboarding />} />
          <Route element={<ShellLayout />}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/brand" element={<Brand />} />
            <Route path="/library" element={<Library />} />
            <Route path="/plans" element={<Plans />} />
            <Route path="/plans/:planId" element={<PlanDetails />} />
            <Route path="/drafts" element={<Drafts />} />
            <Route path="/drafts/:draftId" element={<DraftEditor />} />
            <Route path="*" element={<ProtectedNotFound />} />
          </Route>
        </Route>
      </Routes>
    </AppProvider>
  );
}

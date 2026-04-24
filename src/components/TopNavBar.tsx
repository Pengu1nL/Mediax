import React from 'react';
import { motion } from 'motion/react';
import { Bell, LogOut, Settings } from 'lucide-react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAppStore } from '../context/AppContext';

const navItems = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/brand', label: 'Brand' },
  { to: '/library', label: 'Library' },
  { to: '/plans', label: 'Plans' },
  { to: '/drafts', label: 'Drafts' },
];

export default function TopNavBar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser, logout } = useAppStore();

  return (
    <nav className="w-[95%] max-w-[1400px] mx-auto mt-6 flex justify-between items-center px-8 py-3 glass-nav rounded-full">
      <button
        type="button"
        className="text-xl font-black tracking-tighter text-ink-black cursor-pointer flex items-center gap-2"
        onClick={() => navigate('/dashboard')}
      >
        Mediax
      </button>

      <ul className="flex items-center gap-8 text-sm tracking-tight">
        {navItems.map((item) => {
          const active =
            location.pathname === item.to ||
            (item.to === '/plans' && location.pathname.startsWith('/plans/')) ||
            (item.to === '/drafts' && location.pathname.startsWith('/drafts/'));

          return (
            <li key={item.to} className="relative">
              <NavLink
                to={item.to}
                className={`font-medium transition-all ${
                  active ? 'text-ink-black font-semibold' : 'text-ink-black/50 hover:text-signal-orange'
                }`}
              >
                {item.label}
              </NavLink>
              {active ? (
                <motion.div
                  layoutId="nav-pill"
                  className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-1 h-1 bg-signal-orange rounded-full"
                />
              ) : null}
            </li>
          );
        })}
      </ul>

      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={() => navigate('/onboarding')}
          className="bg-ink-black text-white px-5 py-2 rounded-full text-sm font-medium hover:bg-zinc-800 transition-colors active:scale-95"
        >
          New Brand
        </button>
        <div className="flex gap-1">
          <button
            type="button"
            title="通知中心将在下一阶段上线"
            className="w-10 h-10 flex items-center justify-center rounded-full text-ink-black/40 cursor-not-allowed"
          >
            <Bell size={20} />
          </button>
          <button
            type="button"
            title="系统设置将在下一阶段上线"
            className="w-10 h-10 flex items-center justify-center rounded-full text-ink-black/40 cursor-not-allowed"
          >
            <Settings size={20} />
          </button>
        </div>
        <div className="hidden md:flex flex-col items-end">
          <span className="text-xs font-black tracking-[0.25em] uppercase text-zinc-300">Admin</span>
          <span className="text-sm font-bold text-ink-black">{currentUser?.name ?? 'Mediax Admin'}</span>
        </div>
        <button
          type="button"
          onClick={async () => {
            await logout();
            navigate('/login');
          }}
          className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-zinc-100 transition-colors text-ink-black/60 hover:text-signal-orange"
          aria-label="退出登录"
        >
          <LogOut size={18} />
        </button>
      </div>
    </nav>
  );
}

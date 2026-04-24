import React, { useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { DEFAULT_ADMIN_CREDENTIALS } from '../constants';
import { InlineAlert } from '../components/PageState';
import { useAppStore } from '../context/AppContext';

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, clearError } = useAppStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [formError, setFormError] = useState('');

  const redirect = new URLSearchParams(location.search).get('redirect') || '/dashboard';

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError('');
    clearError();

    if (!email.trim() || !password.trim()) {
      setFormError('请输入邮箱和密码。');
      return;
    }

    const result = login({
      email,
      password,
    });

    if (result.ok) {
      navigate(redirect, { replace: true });
      return;
    }

    setFormError(result.message || '登录失败，请重试。');
  };

  return (
    <div className="min-h-screen bg-canvas-cream flex items-center justify-center p-8 relative overflow-hidden">
      <div className="absolute top-[-10%] right-[-10%] w-[520px] h-[520px] bg-signal-orange/10 rounded-full blur-[120px]" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[520px] h-[520px] bg-light-orange/10 rounded-full blur-[120px]" />

      <div className="w-full max-w-4xl grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch relative z-10">
        <div className="bg-ink-black rounded-[36px] p-10 text-white flex flex-col justify-between">
          <div>
            <div className="text-[10px] font-black uppercase tracking-[0.45em] text-orange-200">Mediax</div>
            <h1 className="text-4xl font-black tracking-tight mt-6 leading-tight">进入 Mediax 工作台</h1>
            <p className="text-zinc-400 mt-4 font-medium leading-relaxed">
              当前是单品牌、单管理员的首发版本。登录后即可访问 Dashboard、Brand、Plans 与 Drafts 全部路由。
            </p>
          </div>
          <div className="space-y-3">
            <div className="text-xs font-black uppercase tracking-[0.35em] text-zinc-500">Demo Credentials</div>
            <p className="text-sm font-bold">{DEFAULT_ADMIN_CREDENTIALS.email}</p>
            <p className="text-sm font-bold">{DEFAULT_ADMIN_CREDENTIALS.password}</p>
          </div>
        </div>

        <div className="bg-white rounded-[36px] p-10 shadow-2xl border border-black/5">
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="login-email" className="block text-sm font-black text-ink-black mb-3">
                邮箱
              </label>
              <input
                id="login-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="w-full rounded-3xl border border-zinc-100 bg-zinc-50 px-6 py-4 text-lg font-bold"
              />
            </div>

            <div>
              <label htmlFor="login-password" className="block text-sm font-black text-ink-black mb-3">
                密码
              </label>
              <input
                id="login-password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full rounded-3xl border border-zinc-100 bg-zinc-50 px-6 py-4 text-lg font-bold"
              />
            </div>

            {formError ? <InlineAlert message={formError} onDismiss={() => setFormError('')} /> : null}

            <button
              type="submit"
              className="w-full bg-ink-black text-white font-bold text-sm px-10 py-5 rounded-3xl shadow-xl hover:translate-y-[-2px] transition-all flex items-center justify-center gap-2 group"
            >
              登录并继续
              <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

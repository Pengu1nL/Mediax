import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';

describe('App routing', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  function signInSession() {
    window.localStorage.setItem(
      'mediax.session.v1',
      JSON.stringify({
        id: 'admin-1',
        name: 'Mediax Admin',
        email: 'admin@mediax.local',
        role: 'admin',
      }),
    );
  }

  it('redirects unauthenticated users to login and returns them after sign in', async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter initialEntries={['/plans']}>
        <App />
      </MemoryRouter>,
    );

    expect(await screen.findByRole('heading', { name: '进入 Mediax 工作台' })).toBeInTheDocument();

    await user.type(screen.getByLabelText('邮箱'), 'admin@mediax.local');
    await user.type(screen.getByLabelText('密码'), 'mediax2026');
    await user.click(screen.getByRole('button', { name: '登录并继续' }));

    expect(await screen.findByRole('heading', { name: '发布计划' })).toBeInTheDocument();
  });

  it('renders a non-fixed top navigation after sign in', async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <App />
      </MemoryRouter>,
    );

    await user.type(screen.getByLabelText('邮箱'), 'admin@mediax.local');
    await user.type(screen.getByLabelText('密码'), 'mediax2026');
    await user.click(screen.getByRole('button', { name: '登录并继续' }));

    const navigation = await screen.findByRole('navigation');
    expect(navigation).not.toHaveClass('fixed');
  });

  it('renders industry news on the dashboard after sign in', async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <App />
      </MemoryRouter>,
    );

    await user.type(screen.getByLabelText('邮箱'), 'admin@mediax.local');
    await user.type(screen.getByLabelText('密码'), 'mediax2026');
    await user.click(screen.getByRole('button', { name: '登录并继续' }));

    expect(await screen.findByRole('heading', { name: '行业新闻' })).toBeInTheDocument();
    expect(screen.getByText('教育 / 民办高中')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: '内容生产热力' })).not.toBeInTheDocument();
  });

  it('asks for confirmation before deleting a plan task', async () => {
    signInSession();
    const user = userEvent.setup();
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);

    render(
      <MemoryRouter initialEntries={['/plans/p1']}>
        <App />
      </MemoryRouter>,
    );

    expect(await screen.findByText('主视觉海报发布 - 微信公众号')).toBeInTheDocument();

    await user.click(screen.getAllByRole('button', { name: '删除' })[0]);

    expect(confirm).toHaveBeenCalledWith('删除任务后，关联草稿会保留但不再挂在任务下。确认继续吗？');
    expect(screen.getByText('主视觉海报发布 - 微信公众号')).toBeInTheDocument();
  });

  it('shows local folder access guidance in unsupported browsers', async () => {
    signInSession();

    render(
      <MemoryRouter initialEntries={['/library']}>
        <App />
      </MemoryRouter>,
    );

    expect(await screen.findByText('当前浏览器不支持本地文件夹访问')).toBeInTheDocument();
    expect(screen.getByText('请使用 Chrome 或 Edge 打开 Mediax，再绑定本地素材文件夹。')).toBeInTheDocument();
  });
});

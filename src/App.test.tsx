import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';
import App from './App';

describe('App routing', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

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
});

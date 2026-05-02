import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';
import { createSeedAppData } from './constants';
import { createLocalStorageRepositories } from './repositories/localStorageRepositories';

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

  async function completeBrandSetup(repos: ReturnType<typeof createLocalStorageRepositories>) {
    const brand = await repos.brand.getProfile();
    await repos.brand.saveProfile({
      ...brand,
      setupComplete: true,
    });
  }

  it('redirects unauthenticated users to login and returns them after sign in', async () => {
    const user = userEvent.setup();
    const repos = createLocalStorageRepositories(window.localStorage);
    await completeBrandSetup(repos);

    render(
      <MemoryRouter initialEntries={['/plans']}>
        <App repositories={repos} />
      </MemoryRouter>,
    );

    expect(await screen.findByRole('heading', { name: '进入 Mediax 工作台' })).toBeInTheDocument();

    await user.type(screen.getByLabelText('邮箱'), 'admin@mediax.local');
    await user.type(screen.getByLabelText('密码'), 'mediax2026');
    await user.click(screen.getByRole('button', { name: '登录并继续' }));

    expect(await screen.findByRole('heading', { name: '发布计划' })).toBeInTheDocument();
  });

  it('redirects authenticated users to onboarding until brand setup is complete', async () => {
    const user = userEvent.setup();
    const repos = createLocalStorageRepositories(window.localStorage);

    render(
      <MemoryRouter initialEntries={['/plans']}>
        <App repositories={repos} />
      </MemoryRouter>,
    );

    expect(await screen.findByRole('heading', { name: '进入 Mediax 工作台' })).toBeInTheDocument();

    await user.type(screen.getByLabelText('邮箱'), 'admin@mediax.local');
    await user.type(screen.getByLabelText('密码'), 'mediax2026');
    await user.click(screen.getByRole('button', { name: '登录并继续' }));

    expect(await screen.findByRole('heading', { name: /定义您的品牌/ })).toBeInTheDocument();
  });

  it('saves first-time brand context from onboarding', async () => {
    const user = userEvent.setup();
    const repos = createLocalStorageRepositories(window.localStorage);

    render(
      <MemoryRouter initialEntries={['/onboarding']}>
        <App repositories={repos} />
      </MemoryRouter>,
    );

    expect(await screen.findByRole('heading', { name: '进入 Mediax 工作台' })).toBeInTheDocument();

    await user.type(screen.getByLabelText('邮箱'), 'admin@mediax.local');
    await user.type(screen.getByLabelText('密码'), 'mediax2026');
    await user.click(screen.getByRole('button', { name: '登录并继续' }));

    // Step 1: fill brand name and industry
    const brandNameInput = await screen.findByLabelText('品牌名称');
    await user.click(brandNameInput);
    await user.keyboard('{Control>}a{/Control}{Backspace}');
    await user.type(brandNameInput, '建桥融高');
    expect(brandNameInput).toHaveValue('建桥融高');
    await user.selectOptions(screen.getByLabelText('所属行业'), '教育 / 民办高中');

    // Navigate to step 2
    await user.click(screen.getByRole('button', { name: /下一步/ }));

    // Step 2: fill brand voice fields
    expect(await screen.findByLabelText('品牌简介')).toBeInTheDocument();
    await user.type(screen.getByLabelText('品牌简介'), '专注于融合教育领域的品牌');
    await user.type(screen.getByLabelText('目标受众'), '关注融合教育的学生家庭');
    await user.type(screen.getByLabelText('品牌语气'), '专业、温暖、可信');
    await user.type(screen.getByLabelText('禁用表达'), '不夸大升学结果, 不制造焦虑');

    // Navigate to step 3
    await user.click(screen.getByRole('button', { name: /下一步/ }));

    // Step 3: submit
    expect(await screen.findByText('必须人工审核')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /保存并进入品牌页/ }));

    expect(await screen.findByRole('heading', { name: '建桥融高' })).toBeInTheDocument();
  });

  it('renders a non-fixed top navigation after sign in', async () => {
    const user = userEvent.setup();
    const repos = createLocalStorageRepositories(window.localStorage);
    await completeBrandSetup(repos);

    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <App repositories={repos} />
      </MemoryRouter>,
    );

    expect(await screen.findByRole('heading', { name: '进入 Mediax 工作台' })).toBeInTheDocument();

    await user.type(screen.getByLabelText('邮箱'), 'admin@mediax.local');
    await user.type(screen.getByLabelText('密码'), 'mediax2026');
    await user.click(screen.getByRole('button', { name: '登录并继续' }));

    const navigation = await screen.findByRole('navigation');
    expect(navigation).not.toHaveClass('fixed');
  });

  it('renders industry news on the dashboard after sign in', async () => {
    const user = userEvent.setup();
    const repos = createLocalStorageRepositories(window.localStorage);
    await completeBrandSetup(repos);

    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <App repositories={repos} />
      </MemoryRouter>,
    );

    expect(await screen.findByRole('heading', { name: '进入 Mediax 工作台' })).toBeInTheDocument();

    await user.type(screen.getByLabelText('邮箱'), 'admin@mediax.local');
    await user.type(screen.getByLabelText('密码'), 'mediax2026');
    await user.click(screen.getByRole('button', { name: '登录并继续' }));

    expect(await screen.findByRole('heading', { name: '行业新闻' })).toBeInTheDocument();
    expect(screen.getByText('媒体与出版')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: '内容生产热力' })).not.toBeInTheDocument();
  });

  it('asks for confirmation before deleting a plan task', async () => {
    signInSession();
    const user = userEvent.setup();
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    const repos = createLocalStorageRepositories(window.localStorage);
    await completeBrandSetup(repos);

    render(
      <MemoryRouter initialEntries={['/plans/p1']}>
        <App repositories={repos} />
      </MemoryRouter>,
    );

    expect(await screen.findByText('主视觉海报发布 - 微信公众号')).toBeInTheDocument();

    // 打开第一个任务的三点菜单
    await user.click(screen.getAllByRole('button', { name: '任务操作' })[0]);
    // 点击菜单中的删除
    const deleteButtons = screen.getAllByText('删除');
    await user.click(deleteButtons[0]);

    expect(confirm).toHaveBeenCalledWith('删除任务后，关联草稿会保留但不再挂在任务下。确认继续吗？');
    expect(screen.getByText('主视觉海报发布 - 微信公众号')).toBeInTheDocument();
  });

  it('shows the knowledge base page', async () => {
    signInSession();
    const repos = createLocalStorageRepositories(window.localStorage);
    await completeBrandSetup(repos);

    render(
      <MemoryRouter initialEntries={['/knowledge']}>
        <App repositories={repos} />
      </MemoryRouter>,
    );

    expect(await screen.findByRole('heading', { name: '知识库' })).toBeInTheDocument();
  });

  it('creates an agent-ready task and shows brief, channel, contentType and reviewPolicy on task detail page', async () => {
    signInSession();
    const user = userEvent.setup();
    const repos = createLocalStorageRepositories(window.localStorage);
    await completeBrandSetup(repos);

    render(
      <MemoryRouter initialEntries={['/plans/p1']}>
        <App repositories={repos} />
      </MemoryRouter>,
    );

    expect(await screen.findByText('主视觉海报发布 - 微信公众号')).toBeInTheDocument();

    // Open task detail by clicking task title
    await user.click(screen.getByText('主视觉海报发布 - 微信公众号'));

    // Assert the TaskDetails page shows agent-ready fields
    expect(await screen.findByRole('heading', { name: '任务 Brief' })).toBeInTheDocument();
    expect(screen.getByText('发布秋季招生主视觉海报，突出融合教育理念和临港校区环境，配合招生简章下载入口。')).toBeInTheDocument();
    expect(screen.getByText('微信公众号')).toBeInTheDocument();
    expect(screen.getByText('图文')).toBeInTheDocument();
    expect(screen.getByText('必须人工审核')).toBeInTheDocument();
  });

  it('shows the brand knowledge count on the brand page', async () => {
    signInSession();

    // Seed a knowledge entry directly (createKnowledgeItem was removed)
    const seedData = createSeedAppData();
    seedData.knowledgeEntries.push({
      id: 'knowledge-1',
      brandId: 'brand-1',
      sourceType: 'text',
      originalName: '品牌语气规则.txt',
      originalMimeType: 'text/plain',
      originalSizeBytes: 100,
      status: 'ready',
      summary: '品牌表达保持专业、可信、温暖。',
      tags: ['品牌语气'],
      mdFilePath: '/knowledge/knowledge-1.md',
      extractionConfidence: 0.9,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    window.localStorage.setItem('mediax.app-data.v1', JSON.stringify(seedData));

    const repos = createLocalStorageRepositories(window.localStorage);
    await completeBrandSetup(repos);

    render(
      <MemoryRouter initialEntries={['/brand']}>
        <App repositories={repos} />
      </MemoryRouter>,
    );

    expect(await screen.findByText('品牌知识条目')).toBeInTheDocument();
  });
});

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../App';
import { createLocalStorageRepositories } from '../repositories/localStorageRepositories';

describe('Onboarding 3-step wizard', () => {
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

  function renderOnboarding() {
    const repos = createLocalStorageRepositories(window.localStorage);
    render(
      <MemoryRouter initialEntries={['/onboarding']}>
        <App repositories={repos} />
      </MemoryRouter>,
    );
  }

  it('shows a 3-step indicator with correct labels', async () => {
    signInSession();
    renderOnboarding();

    expect(await screen.findByText('品牌身份')).toBeInTheDocument();
    expect(screen.getByText('品牌声音')).toBeInTheDocument();
    expect(screen.getByText('审核确认')).toBeInTheDocument();
  });

  it('shows step 1 fields: brand name, industry, keywords', async () => {
    signInSession();
    renderOnboarding();

    expect(await screen.findByLabelText('品牌名称')).toBeInTheDocument();
    expect(screen.getByLabelText('所属行业')).toBeInTheDocument();
    expect(screen.getByLabelText('核心关键词')).toBeInTheDocument();

    // Step 2 fields should not be visible
    expect(screen.queryByLabelText('品牌简介')).not.toBeInTheDocument();
  });

  it('advances from step 1 to step 2 with Next button', async () => {
    signInSession();
    const user = userEvent.setup();
    renderOnboarding();

    expect(await screen.findByLabelText('品牌名称')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /下一步/ }));

    // Step 2 fields should now be visible
    expect(await screen.findByLabelText('品牌简介')).toBeInTheDocument();
    expect(screen.getByLabelText('品牌语气')).toBeInTheDocument();
    expect(screen.getByLabelText('目标受众')).toBeInTheDocument();
    expect(screen.getByLabelText('品牌定位')).toBeInTheDocument();
    expect(screen.getByLabelText('禁用表达')).toBeInTheDocument();

    // Step 1 fields should not be visible
    expect(screen.queryByLabelText('品牌名称')).not.toBeInTheDocument();
  });

  it('returns to step 1 from step 2 with Back button', async () => {
    signInSession();
    const user = userEvent.setup();
    renderOnboarding();

    expect(await screen.findByLabelText('品牌名称')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /下一步/ }));
    expect(await screen.findByLabelText('品牌简介')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /上一步/ }));
    expect(await screen.findByLabelText('品牌名称')).toBeInTheDocument();
  });

  it('persists form data when switching between steps', async () => {
    signInSession();
    const user = userEvent.setup();
    renderOnboarding();

    expect(await screen.findByLabelText('品牌名称')).toBeInTheDocument();
    const nameInput = screen.getByLabelText('品牌名称');
    // Use keyboard select-all + delete pattern to clear controlled input
    await user.click(nameInput);
    await user.keyboard('{Control>}a{/Control}{Backspace}');
    await user.type(nameInput, 'Test Brand');
    expect(nameInput).toHaveValue('Test Brand');

    // Go to step 2 and back
    await user.click(screen.getByRole('button', { name: /下一步/ }));
    expect(await screen.findByLabelText('品牌简介')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /上一步/ }));

    // Data should persist
    expect(await screen.findByLabelText('品牌名称')).toHaveValue('Test Brand');
  });

  it('shows step 3 with review policy radio cards', async () => {
    signInSession();
    const user = userEvent.setup();
    renderOnboarding();

    expect(await screen.findByLabelText('品牌名称')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /下一步/ }));
    expect(await screen.findByLabelText('品牌简介')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /下一步/ }));

    // Step 3 shows review policy descriptions
    expect(await screen.findByText('必须人工审核')).toBeInTheDocument();
    expect(screen.getByText(/每次 AI 生成内容后/)).toBeInTheDocument();
    expect(screen.getByText('低风险自动通过')).toBeInTheDocument();
    expect(screen.getByText('自动发布')).toBeInTheDocument();
  });

  it('shows "稍后完善" button on step 1, not on step 2/3', async () => {
    signInSession();
    const user = userEvent.setup();
    renderOnboarding();

    expect(await screen.findByRole('button', { name: '稍后完善' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /下一步/ }));
    expect(await screen.findByLabelText('品牌简介')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '稍后完善' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /下一步/ }));
    expect(await screen.findByText('必须人工审核')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '稍后完善' })).not.toBeInTheDocument();
  });

  it('navigates to step from indicator by clicking completed step', async () => {
    signInSession();
    const user = userEvent.setup();
    renderOnboarding();

    expect(await screen.findByLabelText('品牌名称')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /下一步/ }));
    expect(await screen.findByLabelText('品牌简介')).toBeInTheDocument();

    // Click step 1 indicator to go back
    await user.click(screen.getByText('品牌身份'));
    expect(await screen.findByLabelText('品牌名称')).toBeInTheDocument();
  });

  it('saves brand profile and navigates to /brand on successful submit', async () => {
    signInSession();
    const user = userEvent.setup();
    renderOnboarding();

    // Step 1: fill brand name and industry
    expect(await screen.findByLabelText('品牌名称')).toBeInTheDocument();
    const nameInput = screen.getByLabelText('品牌名称');
    await user.click(nameInput);
    await user.keyboard('{Control>}a{/Control}{Backspace}');
    await user.type(nameInput, 'Test Brand');
    await user.selectOptions(screen.getByLabelText('所属行业'), '科技与软件');

    // Step 2: fill summary (required)
    await user.click(screen.getByRole('button', { name: /下一步/ }));
    expect(await screen.findByLabelText('品牌简介')).toBeInTheDocument();
    await user.type(screen.getByLabelText('品牌简介'), 'A test brand summary text');

    // Step 3: submit
    await user.click(screen.getByRole('button', { name: /下一步/ }));
    expect(await screen.findByText('必须人工审核')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /保存并进入品牌页/ }));

    // Should navigate to /brand
    expect(await screen.findByRole('heading', { name: 'Test Brand' })).toBeInTheDocument();
  });

  it('shows 16+ preset industry options including "其他（自定义）"', async () => {
    signInSession();
    renderOnboarding();

    expect(await screen.findByLabelText('所属行业')).toBeInTheDocument();

    const options = screen.getAllByRole('option');
    const optionTexts = options.map((o) => (o as HTMLOptionElement).textContent);

    expect(options.length).toBeGreaterThanOrEqual(16);
    expect(optionTexts).toContain('其他（自定义）');
    expect(optionTexts).toContain('教育 / 民办高中');
    expect(optionTexts).toContain('餐饮与食品');
    expect(optionTexts).toContain('医疗健康');
  });

  it('reveals custom input when "其他（自定义）" is selected', async () => {
    signInSession();
    const user = userEvent.setup();
    renderOnboarding();

    expect(await screen.findByLabelText('所属行业')).toBeInTheDocument();
    expect(screen.queryByPlaceholderText('请输入您的行业')).not.toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText('所属行业'), '其他（自定义）');

    const customInput = await screen.findByPlaceholderText('请输入您的行业');
    expect(customInput).toBeInTheDocument();
    expect(customInput).toHaveFocus();
  });

  it('hides custom input when switching back to preset', async () => {
    signInSession();
    const user = userEvent.setup();
    renderOnboarding();

    expect(await screen.findByLabelText('所属行业')).toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText('所属行业'), '其他（自定义）');
    expect(await screen.findByPlaceholderText('请输入您的行业')).toBeInTheDocument();
    await user.type(screen.getByPlaceholderText('请输入您的行业'), 'My Custom Industry');

    await user.selectOptions(screen.getByLabelText('所属行业'), '科技与软件');
    expect(screen.queryByPlaceholderText('请输入您的行业')).not.toBeInTheDocument();

    // Switch back to custom — previous text should be preserved
    await user.selectOptions(screen.getByLabelText('所属行业'), '其他（自定义）');
    expect(await screen.findByPlaceholderText('请输入您的行业')).toHaveValue('My Custom Industry');
  });

  it('saves custom industry value on submit', async () => {
    signInSession();
    const user = userEvent.setup();
    renderOnboarding();

    expect(await screen.findByLabelText('品牌名称')).toBeInTheDocument();
    const nameInput = screen.getByLabelText('品牌名称');
    await user.click(nameInput);
    await user.keyboard('{Control>}a{/Control}{Backspace}');
    await user.type(nameInput, 'Custom Brand');

    await user.selectOptions(screen.getByLabelText('所属行业'), '其他（自定义）');
    await user.type(screen.getByPlaceholderText('请输入您的行业'), '航空航天');

    await user.click(screen.getByRole('button', { name: /下一步/ }));
    expect(await screen.findByLabelText('品牌简介')).toBeInTheDocument();
    await user.type(screen.getByLabelText('品牌简介'), 'A test summary');

    await user.click(screen.getByRole('button', { name: /下一步/ }));
    expect(await screen.findByText('必须人工审核')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /保存并进入品牌页/ }));

    expect(await screen.findByRole('heading', { name: 'Custom Brand' })).toBeInTheDocument();
  });
});

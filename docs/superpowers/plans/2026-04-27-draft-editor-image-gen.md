# Draft Editor Image Generation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Integrate image generation into the draft editor with platform-aware sizing, user-choice dialog before execution, and cover image preview panel.

**Architecture:** Add `CoverImage` to the Draft type, create a platform-size preset table, extend the agent execution flow with a confirmation dialog and image-size parameter, update the draft editor with a cover preview panel and regenerate button, and add a new API route for cover regeneration.

**Tech Stack:** React + TypeScript (frontend), Express + TypeScript (backend), OpenAI-compatible image API

---

### Task 1: Add CoverImage type and update Draft interface

**Files:**
- Modify: `src/types.ts:153-172`

- [ ] **Step 1: Add CoverImage interface and coverImage field to Draft**

Add after `DraftSource` (after line 136):
```typescript
export interface CoverImage {
  base64: string;
  prompt: string;
  size: string;
  format: string;
  generatedAt: string;
}
```

Add to Draft interface (after `contentType`, line 165):
```typescript
  coverImage?: CoverImage;
```

- [ ] **Step 2: Commit**

```bash
git add src/types.ts
git commit -m "feat: add CoverImage type and coverImage field to Draft"
```

---

### Task 2: Create platform image size presets

**Files:**
- Create: `src/platformImageSizes.ts`

- [ ] **Step 1: Create the presets file**

```typescript
// Platform × ContentType → recommended image size
// Sizes follow the OpenAI image generation format: WxH
// All dimensions are multiples of 16, max 3840px, aspect ratio ≤ 3:1

export interface ImageSizePreset {
  width: number;
  height: number;
  label: string;
  description: string;
}

type PlatformKey = string; // e.g. "微信公众号", "小红书"

const PLATFORM_SIZE_MAP: Record<string, Record<string, ImageSizePreset>> = {
  '微信公众号': {
    '图文': { width: 900, height: 383, label: '900×383', description: '头图 2.35:1' },
    '海报': { width: 1080, height: 1920, label: '1080×1920', description: '竖版海报 9:16' },
  },
  '小红书': {
    '图文': { width: 1080, height: 1440, label: '1080×1440', description: '封面 3:4' },
    '海报': { width: 1080, height: 1440, label: '1080×1440', description: '封面 3:4' },
    '短视频': { width: 1080, height: 1920, label: '1080×1920', description: '视频封面 9:16' },
  },
  '抖音': {
    '图文': { width: 1080, height: 1920, label: '1080×1920', description: '竖屏 9:16' },
    '海报': { width: 1080, height: 1920, label: '1080×1920', description: '竖屏 9:16' },
    '短视频': { width: 1080, height: 1920, label: '1080×1920', description: '视频封面 9:16' },
  },
  '视频号': {
    '图文': { width: 1080, height: 607, label: '1080×607', description: '封面 16:9' },
    '海报': { width: 1080, height: 607, label: '1080×607', description: '封面 16:9' },
  },
};

const DEFAULT_PRESET: ImageSizePreset = {
  width: 1024, height: 1024, label: '1024×1024', description: '通用方形',
};

export function getImageSizeForPlatform(
  platform: string,
  contentType: string,
): ImageSizePreset {
  const platformSizes = PLATFORM_SIZE_MAP[platform];
  if (platformSizes && platformSizes[contentType]) {
    return platformSizes[contentType];
  }
  // Try partial match on platform name
  for (const key of Object.keys(PLATFORM_SIZE_MAP)) {
    if (platform.includes(key) || key.includes(platform)) {
      const sizes = PLATFORM_SIZE_MAP[key];
      if (sizes[contentType]) return sizes[contentType];
    }
  }
  return DEFAULT_PRESET;
}

export function imageSizeToString(preset: ImageSizePreset): string {
  return `${preset.width}x${preset.height}`;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/platformImageSizes.ts
git commit -m "feat: add platform image size presets"
```

---

### Task 3: Extend backend agent run API to accept image params

**Files:**
- Modify: `server/routes/data.ts:604-613`

- [ ] **Step 1: Pass request body params to runAgentTask**

Change the route handler:
```typescript
router.post('/tasks/:taskId/agent-runs', async (req: Request, res: Response) => {
  try {
    const { taskId } = req.params;
    const { generateImage, imageSize } = (req.body || {}) as {
      generateImage?: boolean;
      imageSize?: string;
    };
    const agentRun = await runAgentTask(taskId, { generateImage, imageSize });
    res.status(201).json(agentRun);
  } catch (err: any) {
    const status = err.message.includes('未找到') ? 404 : 500;
    res.status(status).json({ error: err.message });
  }
});
```

- [ ] **Step 2: Commit**

```bash
git add server/routes/data.ts
git commit -m "feat: accept generateImage and imageSize params in agent-runs route"
```

---

### Task 4: Update runAgentTask to use image params and store coverImage

**Files:**
- Modify: `server/agent/runAgentTask.ts`

- [ ] **Step 1: Update function signature and image gen logic**

Change the function to accept options:
```typescript
export async function runAgentTask(
  taskId: string,
  options?: { generateImage?: boolean; imageSize?: string },
): Promise<AgentRun> {
```

In the image generation block (line 88-131), change:
- `if (imageGen && needsImage)` → `if (imageGen && needsImage && options?.generateImage !== false)`
- `size: '1024x1024'` → `size: options?.imageSize || '1024x1024'`

- [ ] **Step 2: Change draft creation to store coverImage instead of embedding in content**

Replace lines 134-159 (the draft creation in `updateData`). Change:
```typescript
content: imageBase64
  ? `${draftInput.content}\n\n![配图](data:image/png;base64,${imageBase64})`
  : draftInput.content,
```
to:
```typescript
content: draftInput.content,
```

And replace:
```typescript
assets: imageAssetId ? [imageAssetId] : [],
```
with:
```typescript
assets: imageAssetId ? [imageAssetId] : [],
coverImage: imageBase64 ? {
  base64: imageBase64,
  prompt: /* image prompt */,
  size: options?.imageSize || '1024x1024',
  format: 'png',
  generatedAt: now,
} : undefined,
```

Need to extract imagePrompt to a variable accessible in the `updateData` closure.

- [ ] **Step 3: Commit**

```bash
git add server/agent/runAgentTask.ts
git commit -m "feat: store coverImage separately, accept generateImage/imageSize params"
```

---

### Task 5: Add regenerate cover API route

**Files:**
- Modify: `server/routes/data.ts`

- [ ] **Step 1: Add POST /api/drafts/:draftId/generate-cover route**

Add after the existing draft PUT route (around line 482):
```typescript
router.post('/drafts/:draftId/generate-cover', async (req: Request, res: Response) => {
  try {
    const { draftId } = req.params;
    const { prompt, size } = (req.body || {}) as { prompt: string; size?: string };

    const data = await loadData();
    const imageGen = getImageGenerator(data.config?.imageGen);
    if (!imageGen) {
      res.status(400).json({ error: '未配置图片生成服务。' });
      return;
    }

    const result = await imageGen.generate({
      prompt: prompt || 'Generate a cover image',
      size: size || '1024x1024',
      n: 1,
      quality: 'medium',
    });

    if (!result.images.length || !result.images[0].base64) {
      res.status(500).json({ error: '图片生成返回空结果。' });
      return;
    }

    const coverImage = {
      base64: result.images[0].base64,
      prompt: prompt || '',
      size: size || '1024x1024',
      format: 'png' as const,
      generatedAt: new Date().toISOString(),
    };

    const updated = await updateData((current) => {
      const draft = current.drafts.find((d) => d.id === draftId);
      if (!draft) throw new Error('未找到对应的草稿。');
      draft.coverImage = coverImage;
      draft.updatedAt = new Date().toISOString();
      return { data: current, result: draft };
    });

    res.json(updated);
  } catch (err: any) {
    res.status(err.message.includes('未找到') ? 404 : 500).json({ error: err.message });
  }
});
```

Add import at top of file:
```typescript
import { getImageGenerator } from '../media/imageGen';
```

- [ ] **Step 2: Commit**

```bash
git add server/routes/data.ts
git commit -m "feat: add regenerate cover image API route"
```

---

### Task 6: Add frontend API client method for generate-cover

**Files:**
- Modify: `src/repositories/apiRepositories.ts`
- Modify: `src/context/AppContext.tsx`

- [ ] **Step 1: Add generateCover method to ApiDraftRepository**

In `apiRepositories.ts`, add to the `ApiDraftRepository` interface:
```typescript
  generateCover(draftId: string, prompt: string, size?: string): Promise<Draft>;
```

In the implementation object (inside `drafts:`):
```typescript
      async generateCover(draftId, prompt, size) {
        return apiClient.post<Draft>(`/drafts/${draftId}/generate-cover`, { prompt, size });
      },
```

- [ ] **Step 2: Add generateCover to AppContext**

In `AppContext.tsx`, add to the `AppContextValue` interface:
```typescript
  generateCover: (draftId: string, prompt: string, size?: string) => Promise<Draft | undefined>;
```

Add implementation alongside other draft methods:
```typescript
      generateCover: (draftId, prompt, size) =>
        runMutation(() => dataRepos.drafts.generateCover(draftId, prompt, size)),
```

- [ ] **Step 3: Commit**

```bash
git add src/repositories/apiRepositories.ts src/context/AppContext.tsx
git commit -m "feat: add generateCover to frontend API client and context"
```

---

### Task 7: Create RunAgentDialog component

**Files:**
- Create: `src/components/RunAgentDialog.tsx`

- [ ] **Step 1: Write the component**

```tsx
import React, { useState } from 'react';
import { Image, Play, X } from 'lucide-react';
import { PlanTask } from '../types';
import { getImageSizeForPlatform, imageSizeToString, ImageSizePreset } from '../platformImageSizes';

const IMAGE_CONTENT_TYPES = ['图文', '海报', '短视频'];

interface RunAgentDialogProps {
  task: PlanTask;
  onConfirm: (options: { generateImage: boolean; imageSize?: string }) => void;
  onCancel: () => void;
}

export default function RunAgentDialog({ task, onConfirm, onCancel }: RunAgentDialogProps) {
  const supportsImage = IMAGE_CONTENT_TYPES.includes(task.contentType || '');
  const sizePreset: ImageSizePreset = getImageSizeForPlatform(
    task.channel || '',
    task.contentType || '',
  );
  const [generateImage, setGenerateImage] = useState(supportsImage);
  const [imageSize, setImageSize] = useState(imageSizeToString(sizePreset));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-ink-black/40 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-white rounded-[32px] p-10 max-w-lg w-full mx-4 shadow-2xl">
        <button
          type="button"
          onClick={onCancel}
          className="absolute top-6 right-6 text-zinc-400 hover:text-ink-black transition-colors"
        >
          <X size={24} />
        </button>

        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-full bg-signal-orange/10 flex items-center justify-center mx-auto mb-4">
            <Play size={28} className="text-signal-orange" />
          </div>
          <h2 className="text-2xl font-black text-ink-black">启动 Agent 执行</h2>
          <p className="text-slate-gray font-medium mt-2">确认执行参数后开始自动生成</p>
        </div>

        <div className="space-y-4 mb-8 p-5 bg-zinc-50 rounded-2xl">
          <Row label="任务" value={task.title} />
          <Row label="平台" value={task.channel || '未设置'} />
          <Row label="内容类型" value={task.contentType || '未设置'} />
          <Row label="推荐尺寸" value={sizePreset.label} sub={sizePreset.description} />
        </div>

        {supportsImage ? (
          <div className="p-5 bg-purple-50 rounded-2xl mb-8 space-y-4">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={generateImage}
                onChange={(e) => setGenerateImage(e.target.checked)}
                className="w-5 h-5 rounded border-zinc-300 text-signal-orange focus:ring-signal-orange"
              />
              <Image size={20} className="text-purple-600" />
              <span className="text-sm font-black text-ink-black">自动生成配图</span>
            </label>

            {generateImage ? (
              <div className="pl-10">
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">图片尺寸</label>
                <input
                  type="text"
                  value={imageSize}
                  onChange={(e) => setImageSize(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 font-bold text-sm"
                  placeholder="1024x1024"
                />
              </div>
            ) : null}
          </div>
        ) : (
          <p className="text-sm font-medium text-zinc-400 text-center mb-8">
            当前内容类型不支持配图生成
          </p>
        )}

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 px-6 py-4 rounded-2xl font-bold border-2 border-zinc-200 text-ink-black hover:border-zinc-300 transition-colors"
          >
            取消
          </button>
          <button
            type="button"
            onClick={() => onConfirm({
              generateImage: supportsImage ? generateImage : false,
              imageSize: generateImage ? imageSize : undefined,
            })}
            className="flex-1 px-6 py-4 rounded-2xl font-bold bg-signal-orange text-white hover:bg-light-orange transition-colors"
          >
            确认执行
          </button>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <span className="text-xs font-black uppercase tracking-widest text-zinc-400 shrink-0">{label}</span>
      <span className="text-sm font-bold text-ink-black text-right">
        {value}
        {sub ? <span className="block text-xs font-medium text-zinc-400">{sub}</span> : null}
      </span>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/RunAgentDialog.tsx
git commit -m "feat: add RunAgentDialog component"
```

---

### Task 8: Wire RunAgentDialog into TaskDetails page

**Files:**
- Modify: `src/pages/TaskDetails.tsx`

- [ ] **Step 1: Import and integrate RunAgentDialog**

Add imports:
```typescript
import RunAgentDialog from '../components/RunAgentDialog';
```

Add state:
```typescript
const [showAgentDialog, setShowAgentDialog] = useState(false);
```

Change `handleStartAgent` to show dialog instead of directly executing:
```typescript
const handleStartAgent = () => {
  if (!taskReady || agentLoading) return;
  setShowAgentDialog(true);
};

const handleConfirmRun = async (options: { generateImage: boolean; imageSize?: string }) => {
  setShowAgentDialog(false);
  setAgentLoading(true);
  try {
    const run = await startAgentRun(task.id, options);
    if (run) {
      navigate(`/agent-runs/${run.id}`);
    }
  } finally {
    setAgentLoading(false);
  }
};
```

Add the dialog component at the end of the return (before the closing `</div>`):
```tsx
{showAgentDialog ? (
  <RunAgentDialog
    task={task}
    onConfirm={handleConfirmRun}
    onCancel={() => setShowAgentDialog(false)}
  />
) : null}
```

- [ ] **Step 2: Update AppContext to pass options to startAgentRun**

In `AppContext.tsx`:
```typescript
  startAgentRun: (taskId: string, options?: { generateImage?: boolean; imageSize?: string }) =>
    Promise<AgentRun | undefined>;
```

And:
```typescript
      startAgentRun: (taskId, options) =>
        runMutation(() => dataRepos.agentRuns.startAgentRun(taskId, options)),
```

In `apiRepositories.ts`:
```typescript
  startAgentRun(taskId: string, options?: { generateImage?: boolean; imageSize?: string }): Promise<AgentRun>;
```

And:
```typescript
      async startAgentRun(taskId, options) {
        return apiClient.post<AgentRun>(`/tasks/${taskId}/agent-runs`, options);
      },
```

- [ ] **Step 3: Commit**

```bash
git add src/pages/TaskDetails.tsx src/context/AppContext.tsx src/repositories/apiRepositories.ts
git commit -m "feat: wire RunAgentDialog into task execution flow"
```

---

### Task 9: Update DraftEditor with cover image preview panel

**Files:**
- Modify: `src/pages/DraftEditor.tsx`

- [ ] **Step 1: Add cover image preview to the right sidebar**

After the Agent Source / 关联上下文 panel (around line 325), add a cover image preview panel when `draft.coverImage` exists:

```tsx
{/* Cover Image Preview */}
{draft.coverImage ? (
  <div className="bento-card p-8">
    <div className="text-[10px] font-black uppercase tracking-[0.35em] text-zinc-400">配图预览</div>
    <div className="mt-4">
      <img
        src={`data:image/${draft.coverImage.format || 'png'};base64,${draft.coverImage.base64}`}
        alt="Cover"
        className="w-full rounded-2xl border border-zinc-100"
      />
      <div className="mt-3 space-y-1">
        <p className="text-xs font-medium text-zinc-400">
          尺寸：{draft.coverImage.size} | 生成时间：{formatRelativeTimestamp(draft.coverImage.generatedAt)}
        </p>
        <p className="text-xs text-zinc-400 line-clamp-2">Prompt: {draft.coverImage.prompt}</p>
      </div>
      <button
        type="button"
        onClick={() => setShowRegenDialog(true)}
        className="mt-3 w-full flex items-center justify-center gap-2 px-4 py-3 rounded-2xl font-bold text-sm bg-purple-50 text-purple-700 border border-purple-200 hover:bg-purple-100 transition-colors"
      >
        <RotateCcw size={14} />
        重新生成配图
      </button>
    </div>
  </div>
) : null}
```

- [ ] **Step 2: Add regenerate cover dialog state and logic**

Add state at top of component:
```typescript
const [showRegenDialog, setShowRegenDialog] = useState(false);
const [regenPrompt, setRegenPrompt] = useState('');
const [regenSize, setRegenSize] = useState('');
```

Add to the `useAppStore` destructuring:
```typescript
const { ..., generateCover } = useAppStore();
```

Add handler:
```typescript
const handleRegenerateCover = async () => {
  setSaving(true);
  const result = await generateCover(
    draft.id,
    regenPrompt || draft.coverImage?.prompt || '',
    regenSize || draft.coverImage?.size || '1024x1024',
  );
  setSaving(false);
  if (result) {
    setNotice('配图已重新生成。');
    setShowRegenDialog(false);
  }
};
```

- [ ] **Step 3: Add regenerate dialog modal**

At the end of the return (before closing `</div>`):
```tsx
{showRegenDialog ? (
  <div className="fixed inset-0 z-50 flex items-center justify-center">
    <div className="absolute inset-0 bg-ink-black/40 backdrop-blur-sm" onClick={() => setShowRegenDialog(false)} />
    <div className="relative bg-white rounded-[32px] p-8 max-w-lg w-full mx-4 shadow-2xl">
      <h2 className="text-xl font-black text-ink-black mb-6">重新生成配图</h2>
      <div className="space-y-4">
        <div>
          <label className="text-xs font-black uppercase tracking-widest text-zinc-400">图片 Prompt</label>
          <textarea
            rows={3}
            value={regenPrompt}
            onChange={(e) => setRegenPrompt(e.target.value)}
            className="w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-5 py-3 font-medium text-sm resize-none mt-2"
            placeholder={draft.coverImage?.prompt || '描述你想要的配图...'}
          />
        </div>
        <div>
          <label className="text-xs font-black uppercase tracking-widest text-zinc-400">尺寸 (WxH)</label>
          <input
            type="text"
            value={regenSize}
            onChange={(e) => setRegenSize(e.target.value)}
            className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 font-bold text-sm mt-2"
            placeholder={draft.coverImage?.size || '1024x1024'}
          />
        </div>
      </div>
      <div className="flex gap-3 mt-6">
        <button
          type="button"
          onClick={() => setShowRegenDialog(false)}
          className="flex-1 px-4 py-3 rounded-2xl font-bold border-2 border-zinc-200"
        >
          取消
        </button>
        <button
          type="button"
          onClick={handleRegenerateCover}
          disabled={saving}
          className="flex-1 px-4 py-3 rounded-2xl font-bold bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50"
        >
          {saving ? '生成中...' : '开始生成'}
        </button>
      </div>
    </div>
  </div>
) : null}
```

- [ ] **Step 4: Commit**

```bash
git add src/pages/DraftEditor.tsx
git commit -m "feat: add cover image preview and regenerate to draft editor"
```

---

### Task 10: Add Drafts list cover thumbnail indicator

**Files:**
- Modify: `src/pages/Drafts.tsx`

- [ ] **Step 1: Add cover thumbnail indicator on draft cards**

In the draft card rendering (find the card area), add a small cover indicator when `draft.coverImage` exists:

```tsx
{draft.coverImage ? (
  <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0 border border-zinc-100">
    <img
      src={`data:image/${draft.coverImage.format || 'png'};base64,${draft.coverImage.base64}`}
      alt=""
      className="w-full h-full object-cover"
    />
  </div>
) : null}
```

- [ ] **Step 2: Commit**

```bash
git add src/pages/Drafts.tsx
git commit -m "feat: show cover thumbnail in drafts list"
```

---

### Task 11: Handle localStorage repository type compatibility

**Files:**
- Modify: `src/repositories/localStorageRepositories.ts`

- [ ] **Step 1: Add startAgentRun options and generateCover to localStorage repos**

In the `AppRepositories` interface (or wherever agentRuns are defined), add the updated signatures to match `apiRepositories.ts`:
```typescript
startAgentRun(taskId: string, options?: { generateImage?: boolean; imageSize?: string }): Promise<AgentRun>;
generateCover(draftId: string, prompt: string, size?: string): Promise<Draft>;
```

- [ ] **Step 2: Commit**

```bash
git add src/repositories/localStorageRepositories.ts
git commit -m "fix: update localStorage repo types for image gen methods"
```

---

### Task 12: End-to-end verification

- [ ] **Step 1: Build check**

```bash
npx tsc --noEmit
```

Fix any type errors.

- [ ] **Step 2: Run existing tests**

```bash
npm test
```

- [ ] **Step 3: Manual smoke test flow**

1. Configure image gen API in Settings (V-API + gpt-image-2)
2. Create a task with channel=小红书, contentType=图文
3. Click "启动 Agent 执行" → verify dialog shows with size 1080×1440
4. Check "自动生成配图" → confirm → verify Agent runs
5. Open resulting draft → verify cover image shows in preview panel
6. Click "重新生成配图" → change prompt → verify new image appears
7. Verify drafts list shows cover thumbnail

- [ ] **Step 4: Commit any fixes**

```bash
git add -A
git commit -m "fix: type errors and edge cases from e2e testing"
```

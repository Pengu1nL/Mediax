/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface BrandChannel {
  id: string;
  name: string;
  handle: string;
  kind: 'wechat' | 'xiaohongshu' | 'douyin' | 'video';
  active: boolean;
}

export type ReviewPolicy = 'manual_required' | 'auto_if_low_risk' | 'auto_publish';

export interface BrandProfile {
  id: string;
  name: string;
  industry: string;
  keywords: string[];
  summary: string;
  website?: string;
  establishedAt?: string;
  audience?: string;
  positioning?: string;
  toneOfVoice?: string;
  doAndDonts?: string[];
  defaultReviewPolicy: ReviewPolicy;
  setupComplete: boolean;
  channels: BrandChannel[];
}

// Knowledge entry source type
export type KnowledgeSourceType = 'image' | 'pdf' | 'document' | 'text' | 'video';

// Processing status
export type KnowledgeProcessingStatus = 'processing' | 'ready' | 'failed';

export interface KnowledgeEntry {
  id: string;
  brandId: string;
  sourceType: KnowledgeSourceType;
  originalName: string;
  originalMimeType: string;
  originalSizeBytes: number;
  status: KnowledgeProcessingStatus;
  summary: string;
  tags: string[];
  mdFilePath: string;
  extractionConfidence: number;
  extractionError?: string;
  migratedFromLegacy?: boolean;
  createdAt: string;
  updatedAt: string;
}

export type PlanStatus = 'active' | 'draft' | 'completed';
export type AutomationLevel = 'assistive' | 'agent_draft' | 'agent_publish';

export interface Plan {
  id: string;
  title: string;
  status: PlanStatus;
  startDate: string;
  endDate: string;
  category?: string;
  brandId?: string;
  objective?: string;
  audience?: string;
  channels?: string[];
  successMetrics?: string[];
  automationLevel?: AutomationLevel;
  reviewPolicy?: ReviewPolicy;
}

export type AgentTaskStatus =
  | 'draft'
  | 'queued'
  | 'researching'
  | 'planning'
  | 'creating'
  | 'ready_for_review'
  | 'approved'
  | 'publishing'
  | 'published'
  | 'failed'
  | 'cancelled';

/** @deprecated Use AgentTaskStatus instead. */
export type PlanTaskStatus = AgentTaskStatus;

export type ExecutionType = 'single' | 'recurring';

export interface PlanTask {
  id: string;
  planId: string;
  title: string;
  subtitle?: string;
  executionType: ExecutionType;
  schedule: string;
  status: AgentTaskStatus;
  linkedDraftId?: string;
  brandId?: string;
  brief?: string;
  channel?: string;
  contentType?: string;
  requirements?: string[];
  researchInstructions?: string;
  assetScope?: string[];
  reviewPolicy?: ReviewPolicy;
  publishPolicy?: ReviewPolicy;
  linkedDraftIds?: string[];
  agentRunId?: string;
  publishSchedule?: string;
}

export type DraftStatus = 'draft' | 'review' | 'ready';

export interface DraftReviewState {
  status: 'not_required' | 'pending' | 'approved' | 'rejected' | 'changes_requested';
  reviewerNote?: string;
  reviewedAt?: string;
}

export interface DraftSource {
  type: 'agent' | 'manual' | 'import';
  agentRunId?: string;
  description: string;
}

export interface CoverImage {
  base64: string;
  prompt: string;
  size: string;
  format: string;
  generatedAt: string;
}

export interface DraftQualityCheck {
  label: string;
  passed: boolean;
  message: string;
}

export interface DraftVersion {
  id: string;
  title: string;
  excerpt: string;
  content: string;
  createdAt: string;
  agentRunId?: string;
}

export interface Draft {
  id: string;
  planId?: string;
  taskId?: string;
  platform: string;
  group: string;
  title: string;
  excerpt: string;
  content: string;
  status: DraftStatus;
  updatedAt: string;
  agentRunId?: string;
  contentType?: string;
  coverImage?: CoverImage;
  assets?: string[];
  sources?: DraftSource[];
  qualityChecks?: DraftQualityCheck[];
  reviewState?: DraftReviewState;
  versions?: DraftVersion[];
  publishState?: string;
}

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: 'admin';
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export type AgentRunStatus = 'queued' | 'running' | 'waiting_for_review' | 'completed' | 'failed' | 'cancelled';

export interface AgentRunStep {
  id: string;
  label: string;
  status: 'queued' | 'running' | 'completed' | 'failed';
  message: string;
  startedAt?: string;
  completedAt?: string;
}

export interface AgentRun {
  id: string;
  brandId: string;
  taskId: string;
  status: AgentRunStatus;
  currentStep: string;
  steps: AgentRunStep[];
  usedKnowledgeEntryIds: string[];
  usedAssetIds: string[];
  outputDraftId?: string;
  error?: string;
  startedAt: string;
  completedAt?: string;
}

export type PublishStatus = 'pending' | 'published' | 'failed' | 'exported';

export interface PublishRecord {
  id: string;
  draftId: string;
  taskId?: string;
  planId?: string;
  platform: string;
  status: PublishStatus;
  title: string;
  content: string;
  excerpt: string;
  publishedAt: string;
  error?: string;
}

export interface LlmConfig {
  provider: string;
  apiKey: string;
  baseUrl: string;
  model: string;
}

export interface ImageGenConfig {
  provider: string;
  apiKey: string;
  baseUrl: string;
  model: string;
}

export interface VideoGenConfig {
  provider: string;
  apiKey: string;
  baseUrl: string;
  model: string;
}

export interface SystemConfig {
  llm: LlmConfig;
  imageGen: ImageGenConfig;
  videoGen: VideoGenConfig;
}

export interface ConfigStatusEntry {
  configured: boolean;
  source: 'stored' | 'env' | 'none';
  hasApiKey: boolean;
  provider: string;
  model: string;
}

export interface ConfigStatus {
  llm: ConfigStatusEntry;
  imageGen: ConfigStatusEntry;
}

export interface AppData {
  brand: BrandProfile;
  knowledgeEntries: KnowledgeEntry[];
  plans: Plan[];
  planTasks: PlanTask[];
  drafts: Draft[];
  agentRuns: AgentRun[];
  publishRecords: PublishRecord[];
  config: SystemConfig;
}

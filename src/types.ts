/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Asset {
  id: string;
  name: string;
  type: 'image' | 'video' | 'pdf' | 'folder';
  size?: string;
  updatedAt: string;
  url?: string;
  thumbnail?: string;
}

export interface BrandChannel {
  id: string;
  name: string;
  handle: string;
  kind: 'wechat' | 'xiaohongshu' | 'douyin' | 'video';
  active: boolean;
}

export type ReviewPolicy = 'manual_required' | 'auto_if_low_risk' | 'auto_publish';
export type KnowledgeSourceType = 'asset' | 'website' | 'manual_note' | 'historic_content';
export type KnowledgeContentType = 'text' | 'image' | 'video' | 'pdf' | 'document' | 'spreadsheet' | 'presentation';
export type KnowledgeProcessingStatus = 'queued' | 'processing' | 'ready' | 'failed';

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

export interface BrandKnowledgeItem {
  id: string;
  brandId: string;
  sourceType: KnowledgeSourceType;
  sourceName: string;
  sourceUri?: string;
  contentType: KnowledgeContentType;
  status: KnowledgeProcessingStatus;
  summary: string;
  tags: string[];
  extractedText?: string;
  assetIds: string[];
  confidence: number;
  error?: string;
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

export interface AppData {
  brand: BrandProfile;
  assets: Asset[];
  knowledgeItems: BrandKnowledgeItem[];
  plans: Plan[];
  planTasks: PlanTask[];
  drafts: Draft[];
}

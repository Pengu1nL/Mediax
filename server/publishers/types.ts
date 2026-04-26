import { Draft, PublishRecord } from '../../src/types';

export interface PublishInput {
  draft: Draft;
  taskReviewPolicy?: string;
  planReviewPolicy?: string;
  brandReviewPolicy: string;
}

export interface PublishResult {
  record: PublishRecord;
  taskStatus: string;
}

export interface ExportPackage {
  title: string;
  platform: string;
  group: string;
  excerpt: string;
  content: string;
  publishedAt: string;
  assets: string[];
  platformNote: string;
}

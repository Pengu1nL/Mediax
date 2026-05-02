import type { LlmConfig } from '../../src/types';
import { getLlmProvider } from '../llm';
import { writeKnowledgeFiles } from './storage';

export interface ProcessedEntry {
  id: string;
  originalName: string;
  sourceType: 'image' | 'pdf' | 'document' | 'text' | 'video';
  status: 'ready' | 'failed';
  summary: string;
  tags: string[];
  extractionConfidence: number;
  extractionError?: string;
}

interface FileToProcess {
  buffer: Buffer;
  originalName: string;
  mimeType: string;
}

function detectSourceType(mimeType: string, fileName: string): 'image' | 'pdf' | 'document' | 'text' | 'video' {
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType === 'application/pdf') return 'pdf';
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') return 'document';
  if (mimeType.startsWith('text/') || fileName.endsWith('.md') || fileName.endsWith('.csv')) return 'text';
  const ext = fileName.split('.').pop()?.toLowerCase();
  if (ext === 'pdf') return 'pdf';
  if (ext === 'docx') return 'document';
  if (ext === 'txt' || ext === 'md' || ext === 'csv') return 'text';
  return 'text';
}

async function processText(buffer: Buffer, llmConfig?: LlmConfig): Promise<{ summary: string; tags: string[]; confidence: number }> {
  const text = buffer.toString('utf-8').slice(0, 4000);
  const llm = getLlmProvider(llmConfig);
  if (!llm) {
    return { summary: text.slice(0, 160), tags: [], confidence: 0 };
  }
  const prompt = `为以下文本内容生成摘要（不超过160字）和关键标签（3-5个，逗号分隔）。\n\n文本内容：\n${text}\n\n请按以下JSON格式输出：\n{"summary": "摘要内容", "tags": ["标签1", "标签2"]}`;
  try {
    const output = await llm.generate({ systemPrompt: '你是品牌知识分析助手。', userPrompt: prompt, maxTokens: 300, temperature: 0.3 });
    const jsonMatch = output.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return { summary: parsed.summary || text.slice(0, 160), tags: parsed.tags || [], confidence: 0.8 };
    }
    return { summary: output.slice(0, 160), tags: [], confidence: 0.7 };
  } catch {
    return { summary: text.slice(0, 160), tags: [], confidence: 0 };
  }
}

async function processPdf(buffer: Buffer, llmConfig?: LlmConfig): Promise<{ summary: string; tags: string[]; confidence: number }> {
  let text: string;
  try {
    const { PDFParse } = await import('pdf-parse');
    const pdf = new PDFParse({ data: buffer });
    const textResult = await pdf.getText();
    text = textResult.text.slice(0, 4000);
    await pdf.destroy();
  } catch {
    return { summary: 'PDF文件（无法解析内容）', tags: ['PDF'], confidence: 0 };
  }
  const llm = getLlmProvider(llmConfig);
  if (!llm) {
    return { summary: text.slice(0, 160), tags: [], confidence: 0 };
  }
  const prompt = `为以下PDF文档内容生成结构化摘要（不超过160字）和3-5个关键标签（逗号分隔）。\n\nPDF内容：\n${text}\n\n请按JSON格式输出：{"summary": "...", "tags": [...]}`;
  try {
    const output = await llm.generate({ systemPrompt: '你是品牌文档分析助手。', userPrompt: prompt, maxTokens: 300, temperature: 0.3 });
    const jsonMatch = output.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return { summary: parsed.summary || text.slice(0, 160), tags: parsed.tags || [], confidence: 0.85 };
    }
    return { summary: output.slice(0, 160), tags: [], confidence: 0.7 };
  } catch {
    return { summary: text.slice(0, 160), tags: [], confidence: 0 };
  }
}

async function processDocx(buffer: Buffer, llmConfig?: LlmConfig): Promise<{ summary: string; tags: string[]; confidence: number }> {
  let text: string;
  try {
    const mammoth = await import('mammoth');
    const result = await mammoth.extractRawText({ buffer });
    text = result.value.slice(0, 4000);
  } catch {
    return { summary: 'Word文档（无法解析内容）', tags: ['文档'], confidence: 0 };
  }
  const llm = getLlmProvider(llmConfig);
  if (!llm) {
    return { summary: text.slice(0, 160), tags: [], confidence: 0 };
  }
  const prompt = `为以下Word文档内容生成摘要（不超过160字）和3-5个关键标签（逗号分隔）。\n\n文档内容：\n${text}\n\n请按JSON格式输出：{"summary": "...", "tags": [...]}`;
  try {
    const output = await llm.generate({ systemPrompt: '你是品牌文档分析助手。', userPrompt: prompt, maxTokens: 300, temperature: 0.3 });
    const jsonMatch = output.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return { summary: parsed.summary || text.slice(0, 160), tags: parsed.tags || [], confidence: 0.85 };
    }
    return { summary: output.slice(0, 160), tags: [], confidence: 0.7 };
  } catch {
    return { summary: text.slice(0, 160), tags: [], confidence: 0 };
  }
}

async function processImage(buffer: Buffer, fileName: string, llmConfig?: LlmConfig): Promise<{ summary: string; tags: string[]; confidence: number }> {
  const llm = getLlmProvider(llmConfig);
  if (!llm) {
    return { summary: `图片：${fileName}`, tags: ['图片'], confidence: 0 };
  }
  const base64 = buffer.toString('base64');
  const mimeType = fileName.endsWith('.png') ? 'image/png' : fileName.endsWith('.webp') ? 'image/webp' : 'image/jpeg';
  const prompt = '请描述这张图片的内容，分析其品牌视觉风格，并给出3-5个标签。输出JSON格式：\n{"summary": "内容描述（不超过160字）", "tags": ["标签1", "标签2"], "styleAnalysis": "品牌风格分析"}';
  try {
    const output = await llm.generate({
      systemPrompt: '你是品牌视觉分析助手，擅长分析图片的品牌调性和视觉风格。',
      userPrompt: [prompt, `![图片](${base64})`].join('\n'),
      maxTokens: 400,
      temperature: 0.3,
    });
    const jsonMatch = output.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      const summary = parsed.styleAnalysis
        ? `${parsed.summary}\n\n## 品牌风格分析\n\n${parsed.styleAnalysis}`
        : parsed.summary;
      return { summary: summary || `图片：${fileName}`, tags: parsed.tags || [], confidence: 0.75 };
    }
    return { summary: output.slice(0, 160), tags: [], confidence: 0.6 };
  } catch {
    return { summary: `图片：${fileName}（当前模型不支持图片解析）`, tags: ['图片'], confidence: 0 };
  }
}

export async function processFile(
  entryId: string,
  brandId: string,
  file: FileToProcess,
  llmConfig?: LlmConfig,
): Promise<ProcessedEntry> {
  const sourceType = detectSourceType(file.mimeType, file.originalName);
  const now = new Date().toISOString();

  if (sourceType === 'video') {
    await writeKnowledgeFiles(entryId, file.buffer, `# ${file.originalName}\n\n视频文件，暂不支持解析。`, {
      brandId,
      sourceType: 'video',
      originalName: file.originalName,
      originalMimeType: file.mimeType,
      originalSizeBytes: file.buffer.length,
      status: 'failed',
      extractionConfidence: 0,
      extractionError: '视频解析暂不支持',
      createdAt: now,
      updatedAt: now,
    });
    return {
      id: entryId,
      originalName: file.originalName,
      sourceType: 'video',
      status: 'failed',
      summary: `视频文件：${file.originalName}`,
      tags: ['视频'],
      extractionConfidence: 0,
      extractionError: '视频解析暂不支持',
    };
  }

  let result: { summary: string; tags: string[]; confidence: number };
  try {
    switch (sourceType) {
      case 'text':
        result = await processText(file.buffer, llmConfig);
        break;
      case 'pdf':
        result = await processPdf(file.buffer, llmConfig);
        break;
      case 'document':
        result = await processDocx(file.buffer, llmConfig);
        break;
      case 'image':
        result = await processImage(file.buffer, file.originalName, llmConfig);
        break;
      default:
        result = { summary: file.originalName, tags: [], confidence: 0 };
    }
  } catch (err) {
    result = { summary: `处理失败：${err instanceof Error ? err.message : '未知错误'}`, tags: [], confidence: 0 };
  }

  const summaryMd = [
    `# ${file.originalName}`,
    '',
    `**来源类型：** ${sourceType}`,
    `**标签：** ${result.tags.join(', ') || '无'}`,
    '',
    result.summary,
  ].join('\n');

  await writeKnowledgeFiles(entryId, file.buffer, summaryMd, {
    brandId,
    sourceType,
    originalName: file.originalName,
    originalMimeType: file.mimeType,
    originalSizeBytes: file.buffer.length,
    status: 'ready',
    extractionConfidence: result.confidence,
    createdAt: now,
    updatedAt: now,
  });

  return {
    id: entryId,
    originalName: file.originalName,
    sourceType,
    status: 'ready',
    summary: result.summary.slice(0, 160),
    tags: result.tags,
    extractionConfidence: result.confidence,
  };
}

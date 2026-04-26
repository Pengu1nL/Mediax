export interface LlmMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LlmGenerateInput {
  systemPrompt: string;
  userPrompt: string;
  maxTokens?: number;
  temperature?: number;
}

export interface LlmProvider {
  generate(input: LlmGenerateInput): Promise<string>;
}

import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

describe('local development entrypoint', () => {
  it('runs the API server and Vite client from npm run dev', async () => {
    const packageJson = JSON.parse(await readFile('package.json', 'utf-8')) as {
      scripts: Record<string, string>;
    };
    const readme = await readFile('README.md', 'utf-8');

    expect(packageJson.scripts.dev).toBe('tsx server/dev.ts');
    expect(await readFile('server/dev.ts', 'utf-8')).toContain('server/index.ts');
    expect(await readFile('server/dev.ts', 'utf-8')).toContain('vite');
    expect(readme).toContain('npm run dev');
    expect(readme).toContain('API');
  });
});

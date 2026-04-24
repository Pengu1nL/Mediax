import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { createAuthRouter } from './auth';
import { createDataRouter } from './routes/data';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
const PORT = parseInt(process.env.SERVER_PORT || '3001', 10);

app.use(cors());
app.use(express.json());

// Auth routes
app.use('/api/auth', createAuthRouter());

// Data routes (protected by requireAuth)
app.use('/api', createDataRouter());

// In production, serve the built SPA
if (process.env.NODE_ENV === 'production') {
  const distPath = path.resolve(__dirname, '..', 'dist');
  app.use(express.static(distPath));
  app.get('*', (_req, res, next) => {
    // Don't intercept API calls
    if (_req.path.startsWith('/api')) return next();
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`[server] Mediax API server running on http://localhost:${PORT}`);
  console.log(`[server] Endpoints:`);
  console.log(`  Auth:  POST /api/auth/login  |  GET /api/auth/me`);
  console.log(`  Data:  GET /api/data  |  PUT /api/brand`);
  console.log(`         Plans  CRUD at /api/plans[/:planId]`);
  console.log(`         Tasks  CRUD at /api/plans/:planId/tasks[/:taskId]`);
  console.log(`         Drafts CRUD at /api/drafts[/:draftId]`);
});

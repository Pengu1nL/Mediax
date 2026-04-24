import { Request, Response, NextFunction, Router } from 'express';
import jwt from 'jsonwebtoken';
import { SessionUser } from '../src/types';

function getSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret === 'change-me-in-production') {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('JWT_SECRET must be set in production');
    }
    // Generate a dev secret on first use
    const devSecret = `dev-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    process.env.JWT_SECRET = devSecret;
    return devSecret;
  }
  return secret;
}

export function signToken(user: SessionUser): string {
  return jwt.sign(
    { sub: user.id, email: user.email, role: user.role },
    getSecret(),
    { expiresIn: '24h' },
  );
}

export function verifyToken(token: string): SessionUser {
  const payload = jwt.verify(token, getSecret()) as jwt.JwtPayload;
  return {
    id: payload.sub as string,
    name: 'Mediax Admin',
    email: payload.email as string,
    role: payload.role as 'admin',
  };
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    res.status(401).json({ error: '未登录或登录已过期。' });
    return;
  }

  try {
    const token = header.slice(7);
    const user = verifyToken(token);
    (req as any).user = user;
    next();
  } catch {
    res.status(401).json({ error: '登录已过期，请重新登录。' });
  }
}

export function createAuthRouter() {
  const router = Router();

  const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const adminPassword = process.env.ADMIN_PASSWORD?.trim();

  if (!adminEmail || !adminPassword) {
    console.warn('[auth] ADMIN_EMAIL or ADMIN_PASSWORD not set in environment. Auth will reject all logins.');
  }

  router.post('/login', (req: Request, res: Response) => {
    const { email, password } = req.body ?? {};

    if (!email || !password) {
      res.status(400).json({ error: '请输入邮箱和密码。' });
      return;
    }

    if (!adminEmail || !adminPassword) {
      res.status(500).json({ error: '未配置管理员凭据，请检查服务端环境变量。' });
      return;
    }

    if (email.trim().toLowerCase() !== adminEmail || password.trim() !== adminPassword) {
      res.status(401).json({ error: '邮箱或密码不正确。' });
      return;
    }

    const user: SessionUser = {
      id: 'admin-1',
      name: 'Mediax Admin',
      email: adminEmail,
      role: 'admin',
    };

    const token = signToken(user);
    res.json({ token, user });
  });

  router.get('/me', requireAuth, (req: Request, res: Response) => {
    res.json({ user: (req as any).user as SessionUser });
  });

  return router;
}

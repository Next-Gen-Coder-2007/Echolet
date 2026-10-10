import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AppDataSource } from '../config/database';
import { User } from '../entities/User';

export interface AuthenticatedRequest extends Request {
  user?: User;
}

interface JwtPayload {
  userId: string;
  username: string;
  email: string;
}

export const authMiddleware = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const token =
      req.cookies?.echolet_token ||
      (req.headers.authorization?.startsWith('Bearer ')
        ? req.headers.authorization.substring(7).trim()
        : req.headers.authorization);

    if (!token) {
      res.status(401).json({
        status: 'error',
        message: 'Authentication required. No session credentials provided.',
      });
      return;
    }

    const secret = process.env.JWT_SECRET || 'fallback_echolet_secret_key';
    const decoded = jwt.verify(token, secret) as JwtPayload;

    if (!decoded || !decoded.userId) {
      res.status(401).json({
        status: 'error',
        message: 'Invalid or expired session.',
      });
      return;
    }

    const userRepository = AppDataSource.getRepository(User);
    const user = await userRepository.findOne({
      where: { id: decoded.userId },
    });

    if (!user) {
      res.status(401).json({
        status: 'error',
        message: 'User belonging to this session no longer exists.',
      });
      return;
    }

    req.user = user;
    next();
  } catch (error: any) {
    if (error.name === 'TokenExpiredError') {
      res.status(401).json({
        status: 'error',
        message: 'Session has expired. Please sign in again.',
      });
      return;
    }

    res.status(401).json({
      status: 'error',
      message: 'Authentication failed. Invalid session cookie.',
    });
  }
};

export const optionalAuthMiddleware = async (
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const token =
      req.cookies?.echolet_token ||
      (req.headers.authorization?.startsWith('Bearer ')
        ? req.headers.authorization.substring(7).trim()
        : req.headers.authorization);
    if (!token) {
      req.user = undefined;
      return next();
    }

    const secret = process.env.JWT_SECRET || 'fallback_echolet_secret_key';
    const decoded = jwt.verify(token, secret) as JwtPayload;

    if (decoded?.userId) {
      const userRepository = AppDataSource.getRepository(User);
      const user = await userRepository.findOne({
        where: { id: decoded.userId },
      });
      if (user) {
        req.user = user;
      }
    }
    next();
  } catch {
    req.user = undefined;
    next();
  }
};


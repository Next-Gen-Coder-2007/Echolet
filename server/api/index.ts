import 'reflect-metadata';
import type { Request, Response } from 'express';
import app from '../src/app';

// Vercel serverless function entrypoint
export default function handler(req: Request, res: Response) {
  return app(req, res);
}

import { Response } from 'express';
import { AppDataSource } from '../config/database';
import { GlobalMessage } from '../entities/GlobalMessage';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import {
  emitGlobalMessage,
  emitGlobalMessageEdited,
  emitGlobalMessageDeleted,
  emitGlobalReactionUpdated,
  getGlobalOnlineCount,
} from '../socket';

// Rate limiting and spam protection state (in-memory)
interface UserRateRecord {
  timestamps: number[];
  lastMessageTime: number;
}
const userRateLimits = new Map<string, UserRateRecord>();

const RATE_LIMIT_WINDOW_MS = 10000; // 10 seconds
const MAX_MESSAGES_PER_WINDOW = 5;
const MIN_INTERVAL_BETWEEN_MESSAGES_MS = 800; // 0.8 seconds

const checkRateLimit = (userId: string): { allowed: boolean; waitMs?: number; reason?: string } => {
  const now = Date.now();
  let record = userRateLimits.get(userId);

  if (!record) {
    record = { timestamps: [], lastMessageTime: 0 };
    userRateLimits.set(userId, record);
  }

  // Minimum interval check
  const timeSinceLast = now - record.lastMessageTime;
  if (timeSinceLast < MIN_INTERVAL_BETWEEN_MESSAGES_MS) {
    return {
      allowed: false,
      waitMs: MIN_INTERVAL_BETWEEN_MESSAGES_MS - timeSinceLast,
      reason: 'Please wait a moment before sending another message.',
    };
  }

  // Filter timestamps within window
  record.timestamps = record.timestamps.filter((ts) => now - ts < RATE_LIMIT_WINDOW_MS);

  if (record.timestamps.length >= MAX_MESSAGES_PER_WINDOW) {
    const oldest = record.timestamps[0];
    const waitMs = RATE_LIMIT_WINDOW_MS - (now - oldest);
    return {
      allowed: false,
      waitMs: Math.max(waitMs, 1000),
      reason: `Slow down! Rate limit exceeded. Try again in ${Math.ceil(waitMs / 1000)}s.`,
    };
  }

  record.timestamps.push(now);
  record.lastMessageTime = now;
  return { allowed: true };
};

// Simple spam detection: repetitive characters / patterns
const isSpamContent = (content: string): boolean => {
  if (!content) return false;
  // Check for repeated identical single characters > 40 times (e.g. "aaaaa...")
  if (/(.)\1{39,}/.test(content)) return true;
  // Check for repeated 2-4 character words repeated excessively
  if (/(\b\w{2,5}\b\s*)\1{15,}/i.test(content)) return true;
  return false;
};

export const getGlobalMessages = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const limit = Math.min(Math.max(parseInt(req.query.limit as string) || 50, 1), 100);
    const before = req.query.before as string | undefined;

    const messageRepo = AppDataSource.getRepository(GlobalMessage);

    const query = messageRepo
      .createQueryBuilder('msg')
      .leftJoinAndSelect('msg.sender', 'sender')
      .orderBy('msg.createdAt', 'DESC')
      .take(limit);

    if (before) {
      const beforeDate = new Date(before);
      if (!isNaN(beforeDate.getTime())) {
        query.where('msg.createdAt < :beforeDate', { beforeDate });
      }
    }

    const rawMessages = await query.getMany();
    // Return in chronological order
    const messages = rawMessages.reverse().map((m) => {
      if (m.sender) {
        // Sanitize sensitive fields
        delete (m.sender as any).password;
        delete (m.sender as any).googleId;
      }
      return m;
    });

    res.json({
      status: 'success',
      messages,
      onlineCount: getGlobalOnlineCount(),
    });
  } catch (err: any) {
    console.error('getGlobalMessages error:', err);
    res.status(500).json({ status: 'error', message: 'Failed to fetch global messages' });
  }
};

export const sendGlobalMessage = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized' });
      return;
    }

    const {
      content,
      messageType = 'text',
      mediaUrl,
      fileName,
      fileSize,
      poll,
      audioUrl,
      audioDuration,
      replyTo,
    } = req.body;

    let trimmed = typeof content === 'string' ? content.trim() : '';
    if (!trimmed && (messageType === 'voice' || messageType === 'audio')) {
      trimmed = 'Voice note';
    } else if (!trimmed && (messageType === 'image' || messageType === 'video')) {
      trimmed = messageType === 'image' ? 'Photo' : 'Video';
    } else if (!trimmed && messageType === 'document') {
      trimmed = fileName || 'Document';
    } else if (!trimmed && messageType === 'poll') {
      trimmed = poll?.question || 'Poll';
    } else if (!trimmed && messageType === 'post') {
      trimmed = 'Shared an echo';
    } else if (!trimmed && messageType === 'reel') {
      trimmed = 'Shared a reel';
    }

    if (!trimmed && !audioUrl && !mediaUrl && !poll) {
      res.status(400).json({ status: 'error', message: 'Message content or attachment is required' });
      return;
    }

    if (trimmed.length > 2000) {
      res.status(400).json({ status: 'error', message: 'Message exceeds 2000 characters limit' });
      return;
    }

    if (isSpamContent(trimmed)) {
      res.status(400).json({ status: 'error', message: 'Message flagged as repetitive spam.' });
      return;
    }

    // Rate limit check
    const rateCheck = checkRateLimit(userId);
    if (!rateCheck.allowed) {
      res.status(429).json({
        status: 'error',
        message: rateCheck.reason,
        retryAfterMs: rateCheck.waitMs,
      });
      return;
    }

    let formattedPoll = undefined;
    if (poll && typeof poll === 'object') {
      const q = (poll.question || '').trim();
      const rawOpts = Array.isArray(poll.options) ? poll.options : [];
      const opts = rawOpts.map((opt: any, idx: number) => {
        if (typeof opt === 'string') {
          return { id: String(idx), text: opt.trim(), voterIds: [] };
        }
        return {
          id: opt.id !== undefined ? String(opt.id) : String(idx),
          text: (opt.text || '').trim(),
          voterIds: Array.isArray(opt.voterIds) ? opt.voterIds : [],
        };
      });

      let expiresAt: string | null = poll.expiresAt || null;
      const dur = poll.duration || poll.expiresIn;
      if (!expiresAt && dur && dur !== 'none') {
        const durMap: Record<string, number> = {
          '5m': 5 * 60 * 1000,
          '1h': 60 * 60 * 1000,
          '6h': 6 * 3600 * 1000,
          '12h': 12 * 3600 * 1000,
          '24h': 24 * 3600 * 1000,
          '1d': 24 * 3600 * 1000,
          '3d': 3 * 24 * 3600 * 1000,
          '7d': 7 * 24 * 3600 * 1000,
        };
        if (durMap[dur]) {
          expiresAt = new Date(Date.now() + durMap[dur]).toISOString();
        }
      }

      formattedPoll = {
        question: q,
        options: opts,
        expiresAt,
      };
    }

    const messageRepo = AppDataSource.getRepository(GlobalMessage);
    const newMsg = messageRepo.create({
      senderId: userId,
      sender: req.user,
      content: trimmed,
      messageType: messageType || 'text',
      mediaUrl: mediaUrl || undefined,
      fileName: fileName || undefined,
      fileSize: fileSize || undefined,
      poll: formattedPoll,
      audioUrl: audioUrl || undefined,
      audioDuration: audioDuration ? Number(audioDuration) : undefined,
      replyTo: replyTo && replyTo.id ? replyTo : undefined,
      reactions: {},
      isPinned: false,
      isDeleted: false,
      isEdited: false,
    });

    const saved = await messageRepo.save(newMsg);

    // Populate sender safe view
    const completeMessage = await messageRepo.findOne({
      where: { id: saved.id },
      relations: { sender: true },
    });

    if (completeMessage?.sender) {
      delete (completeMessage.sender as any).password;
      delete (completeMessage.sender as any).googleId;
    }

    const resultMessage = completeMessage || saved;

    // Broadcast in real-time
    emitGlobalMessage(resultMessage);

    res.status(201).json({
      status: 'success',
      message: resultMessage,
    });
  } catch (err: any) {
    console.error('sendGlobalMessage error:', err);
    res.status(500).json({ status: 'error', message: 'Failed to send global message' });
  }
};

export const reactGlobalMessage = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized' });
      return;
    }

    const id = req.params.id as string;
    const { emoji } = req.body;

    if (!emoji || typeof emoji !== 'string' || emoji.length > 10) {
      res.status(400).json({ status: 'error', message: 'Valid emoji required' });
      return;
    }

    const messageRepo = AppDataSource.getRepository(GlobalMessage);
    const msg = await messageRepo.findOne({ where: { id } });

    if (!msg) {
      res.status(404).json({ status: 'error', message: 'Message not found' });
      return;
    }

    const reactions = (msg.reactions || {}) as Record<string, string[]>;
    const currentUsers = reactions[emoji] || [];

    if (currentUsers.includes(userId)) {
      // Remove reaction
      reactions[emoji] = currentUsers.filter((u) => u !== userId);
      if (reactions[emoji].length === 0) {
        delete reactions[emoji];
      }
    } else {
      // Add reaction
      reactions[emoji] = [...currentUsers, userId];
    }

    msg.reactions = { ...reactions };
    await messageRepo.save(msg);

    // Broadcast reaction change
    emitGlobalReactionUpdated(msg.id, msg.reactions);

    res.json({
      status: 'success',
      messageId: msg.id,
      reactions: msg.reactions,
    });
  } catch (err: any) {
    console.error('reactGlobalMessage error:', err);
    res.status(500).json({ status: 'error', message: 'Failed to react to message' });
  }
};


export const deleteGlobalMessage = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized' });
      return;
    }

    const id = req.params.id as string;
    const messageRepo = AppDataSource.getRepository(GlobalMessage);
    const msg = await messageRepo.findOne({ where: { id } });

    if (!msg) {
      res.status(404).json({ status: 'error', message: 'Message not found' });
      return;
    }

    if (msg.senderId !== userId) {
      res.status(403).json({ status: 'error', message: 'You can only delete your own messages' });
      return;
    }

    // Soft delete to maintain thread history
    msg.isDeleted = true;
    msg.content = 'This message was deleted';
    msg.isPinned = false;
    msg.pinnedAt = undefined;
    msg.pinnedBy = undefined;
    msg.audioUrl = undefined;
    msg.mediaUrl = undefined;
    msg.poll = undefined;
    msg.reactions = {};
    await messageRepo.save(msg);

    emitGlobalMessageDeleted(msg.id);

    res.json({
      status: 'success',
      messageId: msg.id,
    });
  } catch (err: any) {
    console.error('deleteGlobalMessage error:', err);
    res.status(500).json({ status: 'error', message: 'Failed to delete message' });
  }
};

export const voteGlobalMessagePoll = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized' });
      return;
    }

    const id = req.params.id as string;
    const { optionId } = req.body;

    if (!optionId) {
      res.status(400).json({ status: 'error', message: 'Option ID is required' });
      return;
    }

    const messageRepo = AppDataSource.getRepository(GlobalMessage);
    const msg = await messageRepo.findOne({ where: { id }, relations: { sender: true } });

    if (!msg || !msg.poll || !Array.isArray(msg.poll.options)) {
      res.status(404).json({ status: 'error', message: 'Poll message not found' });
      return;
    }

    if (msg.poll.expiresAt && new Date(msg.poll.expiresAt).getTime() <= Date.now()) {
      res.status(400).json({ status: 'error', message: 'This poll has ended and voting is closed' });
      return;
    }

    const poll = { ...msg.poll };
    poll.options = poll.options.map((opt) => {
      const voters = Array.isArray(opt.voterIds) ? [...opt.voterIds] : [];
      if (opt.id === optionId) {
        if (voters.includes(userId)) {
          return { ...opt, voterIds: voters.filter((u) => u !== userId) };
        } else {
          return { ...opt, voterIds: [...voters, userId] };
        }
      } else {
        return { ...opt, voterIds: voters.filter((u) => u !== userId) };
      }
    });

    msg.poll = poll;
    const saved = await messageRepo.save(msg);

    if (saved.sender) {
      delete (saved.sender as any).password;
      delete (saved.sender as any).googleId;
    }

    emitGlobalMessageEdited(saved);

    res.json({
      status: 'success',
      message: saved,
    });
  } catch (err: any) {
    console.error('voteGlobalMessagePoll error:', err);
    res.status(500).json({ status: 'error', message: 'Failed to vote on poll' });
  }
};

export const editGlobalMessage = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized' });
      return;
    }

    const id = req.params.id as string;
    const { content } = req.body;
    const trimmed = typeof content === 'string' ? content.trim() : '';

    if (!trimmed) {
      res.status(400).json({ status: 'error', message: 'Content cannot be empty' });
      return;
    }

    const messageRepo = AppDataSource.getRepository(GlobalMessage);
    const msg = await messageRepo.findOne({ where: { id }, relations: { sender: true } });

    if (!msg) {
      res.status(404).json({ status: 'error', message: 'Message not found' });
      return;
    }

    if (msg.senderId !== userId) {
      res.status(403).json({ status: 'error', message: 'You can only edit your own messages' });
      return;
    }

    if (msg.isDeleted) {
      res.status(400).json({ status: 'error', message: 'Cannot edit deleted message' });
      return;
    }

    msg.content = trimmed;
    msg.isEdited = true;
    msg.editedAt = new Date();
    await messageRepo.save(msg);

    if (msg.sender) {
      delete (msg.sender as any).password;
      delete (msg.sender as any).googleId;
    }

    emitGlobalMessageEdited(msg);

    res.json({
      status: 'success',
      message: msg,
    });
  } catch (err: any) {
    console.error('editGlobalMessage error:', err);
    res.status(500).json({ status: 'error', message: 'Failed to edit message' });
  }
};

export const reportGlobalMessage = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;
    const { reason } = req.body;

    console.log(`[Report] User ${userId} reported global message ${id}: reason="${reason}"`);

    res.json({
      status: 'success',
      message: 'Thank you for reporting. Our moderation team has been alerted.',
    });
  } catch (err: any) {
    console.error('reportGlobalMessage error:', err);
    res.status(500).json({ status: 'error', message: 'Failed to submit report' });
  }
};

export const getGlobalStats = async (
  _req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const messageRepo = AppDataSource.getRepository(GlobalMessage);
    const totalCount = await messageRepo.count();
    const onlineCount = getGlobalOnlineCount();

    res.json({
      status: 'success',
      onlineCount,
      totalCount,
    });
  } catch (err: any) {
    console.error('getGlobalStats error:', err);
    res.status(500).json({ status: 'error', message: 'Failed to fetch stats' });
  }
};

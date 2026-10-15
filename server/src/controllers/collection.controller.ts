import { Response } from 'express';
import { AppDataSource } from '../config/database';
import { BookmarkCollection } from '../entities/BookmarkCollection';
import { PostBookmark } from '../entities/PostBookmark';
import { ReelBookmark } from '../entities/ReelBookmark';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';

/**
 * Get all collections for current user with counts
 */
export const getCollections = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const currentUserId = req.user?.id;
    if (!currentUserId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized' });
      return;
    }

    const collectionRepo = AppDataSource.getRepository(BookmarkCollection);
    const postBookmarkRepo = AppDataSource.getRepository(PostBookmark);
    const reelBookmarkRepo = AppDataSource.getRepository(ReelBookmark);

    // Purge any legacy starter collections ('Memes', 'Movies', 'Programming')
    const legacyDefaultNames = ['memes', 'movies', 'programming'];
    const legacyCollections = await collectionRepo
      .createQueryBuilder('c')
      .where('c.userId = :userId AND LOWER(c.name) IN (:...names)', {
        userId: currentUserId,
        names: legacyDefaultNames,
      })
      .getMany();

    if (legacyCollections.length > 0) {
      for (const legacy of legacyCollections) {
        await postBookmarkRepo.update(
          { userId: currentUserId, collectionName: legacy.name },
          { collectionName: '' }
        );
        await reelBookmarkRepo.update(
          { userId: currentUserId, collectionName: legacy.name },
          { collectionName: '' }
        );
        await collectionRepo.remove(legacy);
      }
    }

    const userCollections = await collectionRepo.find({
      where: { userId: currentUserId },
      order: { createdAt: 'ASC' },
    });

    // Aggregate post bookmark counts per collection
    const postBookmarks = await postBookmarkRepo.find({
      where: { userId: currentUserId },
      select: { collectionName: true },
    });

    // Aggregate reel bookmark counts per collection
    const reelBookmarks = await reelBookmarkRepo.find({
      where: { userId: currentUserId },
      select: { collectionName: true },
    });

    const postCounts: Record<string, number> = {};
    for (const pb of postBookmarks) {
      const cName = pb.collectionName || 'Default';
      postCounts[cName] = (postCounts[cName] || 0) + 1;
    }

    const reelCounts: Record<string, number> = {};
    for (const rb of reelBookmarks) {
      const cName = rb.collectionName || 'Default';
      reelCounts[cName] = (reelCounts[cName] || 0) + 1;
    }

    const totalSavedPosts = postBookmarks.length;
    const totalSavedReels = reelBookmarks.length;
    const grandTotal = totalSavedPosts + totalSavedReels;

    const formattedCollections = userCollections.map((col) => {
      const postsCount = postCounts[col.name] || 0;
      const reelsCount = reelCounts[col.name] || 0;
      return {
        id: col.id,
        name: col.name,
        icon: col.icon,
        color: col.color,
        postsCount,
        reelsCount,
        totalCount: postsCount + reelsCount,
        createdAt: col.createdAt,
      };
    });

    res.json({
      status: 'success',
      grandTotal,
      totalSavedPosts,
      totalSavedReels,
      collections: formattedCollections,
    });
  } catch (error) {
    console.error('Get collections error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to fetch collections' });
  }
};

/**
 * Create a new custom collection
 */
export const createCollection = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const currentUserId = req.user?.id;
    if (!currentUserId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized' });
      return;
    }

    const rawName = (req.body.name || '').trim();
    if (!rawName) {
      res.status(400).json({ status: 'error', message: 'Collection name is required' });
      return;
    }

    if (rawName.toLowerCase() === 'all' || rawName.toLowerCase() === 'default') {
      res.status(400).json({
        status: 'error',
        message: 'That name is reserved. Please choose another collection name.',
      });
      return;
    }

    if (rawName.length > 60) {
      res.status(400).json({
        status: 'error',
        message: 'Collection name cannot exceed 60 characters',
      });
      return;
    }

    const collectionRepo = AppDataSource.getRepository(BookmarkCollection);

    // Case-insensitive duplicate check
    const existing = await collectionRepo
      .createQueryBuilder('c')
      .where('c.userId = :userId AND LOWER(c.name) = LOWER(:name)', {
        userId: currentUserId,
        name: rawName,
      })
      .getOne();

    if (existing) {
      res.status(409).json({
        status: 'error',
        message: 'A collection with this name already exists',
      });
      return;
    }

    const newCol = new BookmarkCollection();
    newCol.userId = currentUserId;
    newCol.name = rawName;
    newCol.icon = req.body.icon || '';
    newCol.color = req.body.color || '#6366f1';

    const saved = await collectionRepo.save(newCol);

    res.status(201).json({
      status: 'success',
      collection: {
        id: saved.id,
        name: saved.name,
        icon: saved.icon,
        color: saved.color,
        postsCount: 0,
        reelsCount: 0,
        totalCount: 0,
        createdAt: saved.createdAt,
      },
    });
  } catch (error) {
    console.error('Create collection error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to create collection' });
  }
};

/**
 * Update a collection (rename, change icon/color)
 */
export const updateCollection = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const currentUserId = req.user?.id;
    if (!currentUserId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized' });
      return;
    }

    const id = req.params.id as string;
    const collectionRepo = AppDataSource.getRepository(BookmarkCollection);
    const postBookmarkRepo = AppDataSource.getRepository(PostBookmark);
    const reelBookmarkRepo = AppDataSource.getRepository(ReelBookmark);

    const collection = await collectionRepo.findOne({
      where: { id, userId: currentUserId },
    });

    if (!collection) {
      res.status(404).json({ status: 'error', message: 'Collection not found' });
      return;
    }

    const oldName = collection.name;
    const newName = req.body.name ? req.body.name.trim() : oldName;

    if (!newName) {
      res.status(400).json({ status: 'error', message: 'Collection name cannot be empty' });
      return;
    }

    if (newName.toLowerCase() !== oldName.toLowerCase()) {
      if (newName.toLowerCase() === 'all' || newName.toLowerCase() === 'default') {
        res.status(400).json({ status: 'error', message: 'Reserved collection name' });
        return;
      }

      const duplicate = await collectionRepo
        .createQueryBuilder('c')
        .where('c.userId = :userId AND LOWER(c.name) = LOWER(:name) AND c.id != :id', {
          userId: currentUserId,
          name: newName,
          id,
        })
        .getOne();

      if (duplicate) {
        res.status(409).json({
          status: 'error',
          message: 'A collection with this name already exists',
        });
        return;
      }

      // Rename collection in all existing bookmarks
      await postBookmarkRepo.update(
        { userId: currentUserId, collectionName: oldName },
        { collectionName: newName }
      );
      await reelBookmarkRepo.update(
        { userId: currentUserId, collectionName: oldName },
        { collectionName: newName }
      );
    }

    collection.name = newName;
    if (req.body.icon) collection.icon = req.body.icon;
    if (req.body.color) collection.color = req.body.color;

    const saved = await collectionRepo.save(collection);

    res.json({
      status: 'success',
      collection: {
        id: saved.id,
        name: saved.name,
        icon: saved.icon,
        color: saved.color,
        createdAt: saved.createdAt,
      },
    });
  } catch (error) {
    console.error('Update collection error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to update collection' });
  }
};

/**
 * Delete a collection
 */
export const deleteCollection = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const currentUserId = req.user?.id;
    if (!currentUserId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized' });
      return;
    }

    const id = req.params.id as string;
    const collectionRepo = AppDataSource.getRepository(BookmarkCollection);
    const postBookmarkRepo = AppDataSource.getRepository(PostBookmark);
    const reelBookmarkRepo = AppDataSource.getRepository(ReelBookmark);

    const collection = await collectionRepo.findOne({
      where: { id, userId: currentUserId },
    });

    if (!collection) {
      res.status(404).json({ status: 'error', message: 'Collection not found' });
      return;
    }

    const action = req.body?.action || req.query?.action || 'move_to_default';

    if (action === 'delete_bookmarks') {
      await postBookmarkRepo.delete({
        userId: currentUserId,
        collectionName: collection.name,
      });
      await reelBookmarkRepo.delete({
        userId: currentUserId,
        collectionName: collection.name,
      });
    } else {
      // Default: move saved items to 'Default' so nothing is lost
      await postBookmarkRepo.update(
        { userId: currentUserId, collectionName: collection.name },
        { collectionName: 'Default' }
      );
      await reelBookmarkRepo.update(
        { userId: currentUserId, collectionName: collection.name },
        { collectionName: 'Default' }
      );
    }

    await collectionRepo.remove(collection);

    res.json({
      status: 'success',
      message: `Collection "${collection.name}" removed successfully`,
    });
  } catch (error) {
    console.error('Delete collection error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to delete collection' });
  }
};

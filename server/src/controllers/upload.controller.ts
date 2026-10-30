import { Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import { supabaseStorage, StorageFolder } from '../services/supabaseStorage.service';

/**
 * Handle single or multiple file uploads to Supabase Storage
 */
export const uploadFile = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const currentUserId = req.user?.id;
    if (!currentUserId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized' });
      return;
    }

    const folder = ((req.body.folder || req.query.folder || 'posts') as string).trim() as StorageFolder;

    // Handle single file
    if (req.file) {
      const file = req.file;
      const result = await supabaseStorage.uploadBuffer(
        currentUserId,
        file.buffer,
        file.mimetype,
        folder,
        file.originalname
      );

      res.status(201).json({
        status: 'success',
        url: result.url,
        path: result.path,
        size: result.size,
        mimeType: result.mimeType,
      });
      return;
    }

    // Handle multiple files
    if (req.files && Array.isArray(req.files) && req.files.length > 0) {
      const files = req.files as Express.Multer.File[];
      const uploadPromises = files.map((f) =>
        supabaseStorage.uploadBuffer(
          currentUserId,
          f.buffer,
          f.mimetype,
          folder,
          f.originalname
        )
      );

      const results = await Promise.all(uploadPromises);

      res.status(201).json({
        status: 'success',
        urls: results.map((r) => r.url),
        files: results,
      });
      return;
    }

    res.status(400).json({
      status: 'error',
      message: 'No file uploaded. Please attach a file using the "file" or "files" field.',
    });
  } catch (error: any) {
    console.error('File upload error:', error);
    res.status(400).json({
      status: 'error',
      message: error?.message || 'Failed to upload file',
    });
  }
};

/**
 * Delete a file from Supabase Storage with strict user ownership validation
 */
export const deleteFile = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const currentUserId = req.user?.id;
    if (!currentUserId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized' });
      return;
    }

    const urlOrPath = req.body.url || req.body.path || req.query.url || req.query.path;
    if (!urlOrPath || typeof urlOrPath !== 'string') {
      res.status(400).json({ status: 'error', message: 'File URL or path is required' });
      return;
    }

    const deleted = await supabaseStorage.deleteFileByUrl(currentUserId, urlOrPath);

    res.json({
      status: 'success',
      message: deleted
        ? 'File successfully deleted from Supabase Storage'
        : 'File was removed or does not exist',
    });
  } catch (error: any) {
    console.error('Delete file error:', error);
    res.status(500).json({
      status: 'error',
      message: error?.message || 'Failed to delete file',
    });
  }
};

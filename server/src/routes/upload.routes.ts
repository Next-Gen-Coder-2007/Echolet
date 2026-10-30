import { Router } from 'express';
import multer from 'multer';
import { uploadFile, deleteFile } from '../controllers/upload.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

const router = Router();

// Configure Multer with memory storage for serverless and container portability
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 125 * 1024 * 1024, // 125MB maximum limit per file
    files: 10, // Up to 10 files at once
  },
});

router.use(authMiddleware);

// Accept either single file in 'file' or multiple files in 'files' or 'file'
router.post(
  '/',
  upload.fields([
    { name: 'file', maxCount: 1 },
    { name: 'files', maxCount: 10 },
  ]),
  (req, res, next) => {
    // Normalize fields so controller can read req.file or req.files easily
    const filesMap = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
    if (filesMap) {
      if (filesMap.file && filesMap.file.length > 0) {
        req.file = filesMap.file[0];
      }
      if (filesMap.files && filesMap.files.length > 0) {
        req.files = filesMap.files;
      }
    }
    next();
  },
  uploadFile
);

router.delete('/', deleteFile);

export default router;

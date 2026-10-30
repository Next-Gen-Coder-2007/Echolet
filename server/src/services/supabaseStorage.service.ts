import { createClient, SupabaseClient } from '@supabase/supabase-js';
import crypto from 'crypto';

export interface UploadResult {
  url: string;
  path: string;
  size: number;
  mimeType: string;
}

export type StorageFolder =
  | 'avatars'
  | 'banners'
  | 'posts'
  | 'stories'
  | 'reels'
  | 'chat'
  | 'groups'
  | 'documents';

const ALLOWED_MIME_TYPES: Record<string, string[]> = {
  image: [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'image/gif',
    'image/svg+xml',
    'image/bmp',
    'image/x-icon',
  ],
  video: [
    'video/mp4',
    'video/webm',
    'video/quicktime',
    'video/x-matroska',
    'video/ogg',
    'video/mpeg',
  ],
  audio: [
    'audio/mpeg',
    'audio/mp3',
    'audio/wav',
    'audio/webm',
    'audio/ogg',
    'audio/aac',
    'audio/m4a',
    'audio/x-m4a',
    'audio/mp4',
  ],
  document: [
    'application/pdf',
    'text/plain',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ],
};

const MAX_FILE_SIZES: Record<string, number> = {
  image: 15 * 1024 * 1024, // 15MB
  audio: 35 * 1024 * 1024, // 35MB
  video: 120 * 1024 * 1024, // 120MB
  document: 35 * 1024 * 1024, // 35MB
};

const MIME_EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/svg+xml': 'svg',
  'video/mp4': 'mp4',
  'video/webm': 'webm',
  'video/quicktime': 'mov',
  'audio/mpeg': 'mp3',
  'audio/mp3': 'mp3',
  'audio/wav': 'wav',
  'audio/webm': 'webm',
  'audio/ogg': 'ogg',
  'audio/m4a': 'm4a',
  'application/pdf': 'pdf',
  'text/plain': 'txt',
};

class SupabaseStorageService {
  private client: SupabaseClient | null = null;
  private bucketName: string;
  private supabaseUrl: string;
  private isConfigured = false;
  private bucketVerified = false;

  constructor() {
    this.bucketName = process.env.SUPABASE_STORAGE_BUCKET?.trim() || 'echolet-media';

    // Resolve Supabase URL
    let url = process.env.SUPABASE_URL?.trim();
    if (!url) {
      // Auto-extract from DATABASE_URL if available
      const dbUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL || '';
      const poolerMatch = dbUrl.match(/postgres\.([a-zA-Z0-9_-]+):/);
      if (poolerMatch && poolerMatch[1]) {
        url = `https://${poolerMatch[1]}.supabase.co`;
      }
    }
    this.supabaseUrl = url || '';

    // Secret service role key kept ONLY on backend!
    const key =
      process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
      process.env.SUPABASE_SERVICE_KEY?.trim() ||
      process.env.SUPABASE_ANON_KEY?.trim();

    if (this.supabaseUrl && key) {
      try {
        this.client = createClient(this.supabaseUrl, key, {
          auth: {
            persistSession: false,
            autoRefreshToken: false,
          },
        });
        this.isConfigured = true;
        console.log(`Supabase Storage initialized for bucket "${this.bucketName}" (${this.supabaseUrl})`);
      } catch (err) {
        console.warn('Failed to initialize Supabase client:', err);
      }
    } else {
      console.warn(
        'Supabase Storage warning: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are not fully configured. Using fallback local/base64 handling.'
      );
    }
  }

  public isStorageConfigured(): boolean {
    return this.isConfigured && this.client !== null;
  }

  public getBucketName(): string {
    return this.bucketName;
  }

  public getSupabaseUrl(): string {
    return this.supabaseUrl;
  }

  /**
   * Ensures the storage bucket exists in Supabase, auto-creating it with public access if needed.
   */
  public async ensureBucket(): Promise<boolean> {
    if (!this.isStorageConfigured() || !this.client) return false;
    if (this.bucketVerified) return true;

    try {
      const { data: buckets, error: listError } = await this.client.storage.listBuckets();
      if (listError) {
        console.warn('Supabase listBuckets error:', listError.message);
        return false;
      }

      const existing = buckets?.find((b) => b.name === this.bucketName);
      if (!existing) {
        const { error: createError } = await this.client.storage.createBucket(this.bucketName, {
          public: true,
          fileSizeLimit: '125MB',
        });
        if (createError && !createError.message.includes('already exists')) {
          console.warn(`Could not auto-create bucket ${this.bucketName}:`, createError.message);
        } else {
          console.log(`Supabase storage bucket "${this.bucketName}" successfully created and made public.`);
        }
      } else if (!existing.public) {
        const { error: updateError } = await this.client.storage.updateBucket(this.bucketName, {
          public: true,
        });
        if (updateError) {
          console.warn(`Could not update bucket ${this.bucketName} to public:`, updateError.message);
        } else {
          console.log(`Supabase storage bucket "${this.bucketName}" updated to public.`);
        }
      }
      this.bucketVerified = true;
      return true;
    } catch (err: any) {
      console.warn('Failed to verify or create bucket:', err?.message || err);
      return false;
    }
  }

  /**
   * Validate MIME type and file size
   */
  public validateFile(mimeType: string, fileSize: number): void {
    const cleanMime = (mimeType || '').toLowerCase().trim();
    const typeGroup = cleanMime.startsWith('image/')
      ? 'image'
      : cleanMime.startsWith('video/')
      ? 'video'
      : cleanMime.startsWith('audio/')
      ? 'audio'
      : 'document';

    const allowed = ALLOWED_MIME_TYPES[typeGroup] || [];
    const isAllowed = allowed.some(
      (m) => m === cleanMime || cleanMime.startsWith(m.replace('*', ''))
    );

    if (!isAllowed) {
      throw new Error(
        `Unsupported file type "${cleanMime}". Allowed formats: JPG, PNG, WEBP, GIF, MP4, WEBM, MP3, WAV, PDF, DOCX`
      );
    }

    const maxSize = MAX_FILE_SIZES[typeGroup] || 25 * 1024 * 1024;
    if (fileSize > maxSize) {
      const maxMb = Math.round(maxSize / (1024 * 1024));
      throw new Error(`File size (${(fileSize / (1024 * 1024)).toFixed(1)}MB) exceeds limit of ${maxMb}MB`);
    }
  }

  /**
   * Build a secure, user-scoped storage path enforcing strict user ownership:
   * Pattern: {folder}/{userId}/{timestamp}_{randomUuid}.{ext}
   */
  public buildUserScopedPath(
    userId: string,
    folder: string,
    mimeType: string,
    originalName?: string
  ): string {
    const cleanFolder = folder.replace(/[^a-zA-Z0-9_-]/g, '').toLowerCase() || 'media';
    const cleanUserId = userId.replace(/[^a-zA-Z0-9_-]/g, '');

    let ext = MIME_EXTENSIONS[mimeType.toLowerCase()] || '';
    if (!ext && originalName) {
      const match = originalName.match(/\.([a-zA-Z0-9]+)$/);
      if (match) ext = match[1].toLowerCase();
    }
    if (!ext) {
      if (mimeType.startsWith('image/')) ext = 'jpg';
      else if (mimeType.startsWith('video/')) ext = 'mp4';
      else if (mimeType.startsWith('audio/')) ext = 'mp3';
      else ext = 'bin';
    }

    const timestamp = Date.now();
    const randomId = crypto.randomUUID().slice(0, 12);
    return `${cleanFolder}/${cleanUserId}/${timestamp}_${randomId}.${ext}`;
  }

  /**
   * Upload binary Buffer to Supabase Storage
   */
  public async uploadBuffer(
    userId: string,
    buffer: Buffer,
    mimeType: string,
    folder: StorageFolder | string = 'posts',
    originalName?: string
  ): Promise<UploadResult> {
    this.validateFile(mimeType, buffer.length);

    if (!this.isStorageConfigured() || !this.client) {
      // Fallback: If Supabase not yet configured, generate a base64 data URL so nothing breaks!
      const base64 = `data:${mimeType};base64,${buffer.toString('base64')}`;
      return {
        url: base64,
        path: `fallback/${userId}/${Date.now()}`,
        size: buffer.length,
        mimeType,
      };
    }

    await this.ensureBucket();

    const filePath = this.buildUserScopedPath(userId, folder, mimeType, originalName);

    const { data, error } = await this.client.storage
      .from(this.bucketName)
      .upload(filePath, buffer, {
        contentType: mimeType,
        cacheControl: '31536000', // 1 year immutable cache for unique assets
        upsert: false,
      });

    if (error) {
      console.error('Supabase upload error:', error);
      throw new Error(`Failed to upload file to Supabase Storage: ${error.message}`);
    }

    const { data: publicUrlData } = this.client.storage
      .from(this.bucketName)
      .getPublicUrl(data?.path || filePath);

    return {
      url: publicUrlData.publicUrl,
      path: data?.path || filePath,
      size: buffer.length,
      mimeType,
    };
  }

  /**
   * Upload base64 data URL to Supabase Storage.
   * If input is already an HTTP/HTTPS URL, returns it immediately without re-uploading.
   */
  public async uploadBase64(
    userId: string,
    base64DataUrlOrUrl: string,
    folder: StorageFolder | string = 'posts'
  ): Promise<string> {
    if (!base64DataUrlOrUrl || typeof base64DataUrlOrUrl !== 'string') {
      return base64DataUrlOrUrl;
    }

    const trimmed = base64DataUrlOrUrl.trim();

    // If it's already an HTTP/HTTPS URL, keep it as is (no data loss for existing media)
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      return trimmed;
    }

    // Check if it is a valid data URL
    const match = trimmed.match(/^data:([a-zA-Z0-9\/+.-]+);base64,(.+)$/);
    if (!match) {
      return trimmed;
    }

    const mimeType = match[1];
    const base64Data = match[2];
    const buffer = Buffer.from(base64Data, 'base64');

    const result = await this.uploadBuffer(userId, buffer, mimeType, folder);
    return result.url;
  }

  /**
   * Delete a file from Supabase Storage enforcing strict user ownership.
   * Returns true if deleted or safely ignored.
   */
  public async deleteFileByUrl(
    userId: string,
    fileUrlOrPath: string,
    bypassOwnership = false
  ): Promise<boolean> {
    if (!fileUrlOrPath || typeof fileUrlOrPath !== 'string') return false;
    if (!this.isStorageConfigured() || !this.client) return false;

    try {
      const storagePath = this.extractStoragePath(fileUrlOrPath);
      if (!storagePath) {
        // Not a Supabase storage URL belonging to this bucket, safe to ignore
        return false;
      }

      // Enforce user ownership: The path must belong to the user (e.g. "posts/<userId>/...")
      if (!bypassOwnership) {
        const pathSegments = storagePath.split('/');
        const pathUserId = pathSegments[1];
        if (pathUserId !== userId && !storagePath.includes(`/${userId}/`)) {
          console.warn(`User ${userId} attempted to delete unowned file: ${storagePath}`);
          return false;
        }
      }

      const { error } = await this.client.storage
        .from(this.bucketName)
        .remove([storagePath]);

      if (error) {
        console.warn(`Failed to delete file "${storagePath}" from Supabase:`, error.message);
        return false;
      }

      return true;
    } catch (err: any) {
      console.warn('Delete file error:', err?.message || err);
      return false;
    }
  }

  /**
   * Extract bucket-relative path from a full public Supabase URL or relative path
   */
  public extractStoragePath(urlOrPath: string): string | null {
    if (!urlOrPath) return null;
    const trimmed = urlOrPath.trim();

    // Already a relative path: e.g. "posts/123/img.jpg"
    if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
      return trimmed.replace(/^\/+/, '');
    }

    try {
      const parsed = new URL(trimmed);
      // Supabase public URL format:
      // .../storage/v1/object/public/{bucketName}/{path}
      const marker = `/storage/v1/object/public/${this.bucketName}/`;
      const idx = parsed.pathname.indexOf(marker);
      if (idx !== -1) {
        return decodeURIComponent(parsed.pathname.slice(idx + marker.length));
      }

      // Alternative signed URL format:
      // .../storage/v1/object/sign/{bucketName}/{path}
      const signMarker = `/storage/v1/object/sign/${this.bucketName}/`;
      const signIdx = parsed.pathname.indexOf(signMarker);
      if (signIdx !== -1) {
        return decodeURIComponent(parsed.pathname.slice(signIdx + signMarker.length));
      }

      return null;
    } catch {
      return null;
    }
  }
}

export const supabaseStorage = new SupabaseStorageService();
export default supabaseStorage;

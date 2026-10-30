import api from './api';

export interface UploadResponse {
  status: string;
  url: string;
  path: string;
  size: number;
  mimeType: string;
}

export interface MultiUploadResponse {
  status: string;
  urls: string[];
  files: UploadResponse[];
}

export type UploadFolder =
  | 'avatars'
  | 'banners'
  | 'posts'
  | 'stories'
  | 'reels'
  | 'chat'
  | 'groups'
  | 'documents';

export const uploadService = {
  /**
   * Upload a single file (File or Blob) to Supabase Storage via backend API
   */
  async uploadFile(
    file: File | Blob,
    folder: UploadFolder = 'posts',
    fileName?: string
  ): Promise<UploadResponse> {
    const formData = new FormData();
    const resolvedName =
      fileName || (file instanceof File ? file.name : `upload_${Date.now()}.bin`);

    formData.append('file', file, resolvedName);
    formData.append('folder', folder);

    const response = await api.post<UploadResponse>('/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return response.data;
  },

  /**
   * Upload multiple files to Supabase Storage
   */
  async uploadFiles(
    files: (File | Blob)[],
    folder: UploadFolder = 'posts'
  ): Promise<string[]> {
    if (!files.length) return [];

    const formData = new FormData();
    files.forEach((file, idx) => {
      const resolvedName =
        file instanceof File ? file.name : `upload_${Date.now()}_${idx}.bin`;
      formData.append('files', file, resolvedName);
    });
    formData.append('folder', folder);

    const response = await api.post<MultiUploadResponse>('/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return response.data.urls || [];
  },

  /**
   * Delete a file from Supabase Storage enforcing user ownership
   */
  async deleteFile(urlOrPath: string): Promise<boolean> {
    if (!urlOrPath) return false;

    try {
      const response = await api.delete<{ status: string; message: string }>('/upload', {
        data: { url: urlOrPath },
      });
      return response.data.status === 'success';
    } catch {
      return false;
    }
  },
};

export default uploadService;

import api from './api';

export interface BookmarkCollection {
  id: string;
  name: string;
  icon: string;
  color: string;
  postsCount?: number;
  reelsCount?: number;
  totalCount: number;
  createdAt?: string;
}

export interface CollectionsResponse {
  status: string;
  grandTotal: number;
  totalSavedPosts: number;
  totalSavedReels: number;
  collections: BookmarkCollection[];
}

const collectionService = {
  async getCollections(): Promise<CollectionsResponse> {
    const res = await api.get<CollectionsResponse>('/collections');
    return res.data;
  },

  async createCollection(data: {
    name: string;
    icon?: string;
    color?: string;
  }): Promise<BookmarkCollection> {
    const res = await api.post<{ status: string; collection: BookmarkCollection }>(
      '/collections',
      data
    );
    return res.data.collection;
  },

  async updateCollection(
    id: string,
    data: { name?: string; icon?: string; color?: string }
  ): Promise<BookmarkCollection> {
    const res = await api.put<{ status: string; collection: BookmarkCollection }>(
      `/collections/${encodeURIComponent(id)}`,
      data
    );
    return res.data.collection;
  },

  async deleteCollection(
    id: string,
    action: 'move_to_default' | 'delete_bookmarks' = 'move_to_default'
  ): Promise<void> {
    await api.delete(`/collections/${encodeURIComponent(id)}`, {
      data: { action },
    });
  },
};

export default collectionService;

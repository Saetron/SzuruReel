import {
  AppConfig,
  PostSafety,
  SzuruComment,
  SzuruFullUser,
  SzuruInstanceInfo,
  SzuruNote,
  SzuruPool,
  SzuruPoolCategory,
  SzuruPost,
  SzuruPostRelation,
  SzuruSearchResult,
  SzuruSnapshot,
  SzuruTag,
  SzuruTagCategory,
} from '../types/szuru';

export const DEFAULT_TAG_CATEGORIES: SzuruTagCategory[] = [
  { name: 'general', color: '#60a5fa', order: 1, default: true },
  { name: 'character', color: '#4ade80', order: 2 },
  { name: 'artist', color: '#f87171', order: 3 },
  { name: 'copyright', color: '#c084fc', order: 4 },
  { name: 'meta', color: '#fb923c', order: 5 },
];

export class SzuruApiService {
  private config: AppConfig;

  constructor(config: AppConfig) {
    this.config = config;
  }

  public updateConfig(config: AppConfig) {
    this.config = config;
  }

  private getAuthHeaders(): HeadersInit {
    const headers: Record<string, string> = {
      Accept: 'application/json',
    };

    if (this.config.username && this.config.apiToken) {
      const credentials = btoa(`${this.config.username}:${this.config.apiToken}`);
      headers['Authorization'] = `Token ${credentials}`;
    }

    return headers;
  }

  public getTargetUrl(path: string): string {
    const base = (this.config.instanceUrl || '').replace(/\/+$/, '');
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    const fullUrl = base ? `${base}${cleanPath}` : cleanPath;

    if (this.config.useProxy) {
      return `/api/proxy?url=${encodeURIComponent(fullUrl)}`;
    }
    return fullUrl;
  }

  public resolveMediaUrl(url: string | undefined): string {
    if (!url) return '';
    if (
      url.startsWith('http://') ||
      url.startsWith('https://') ||
      url.startsWith('blob:') ||
      url.startsWith('data:')
    ) {
      return url;
    }
    const base = (this.config.instanceUrl || '').replace(/\/+$/, '');
    const cleanPath = url.startsWith('/') ? url : `/${url}`;
    const full = base ? `${base}${cleanPath}` : cleanPath;

    if (this.config.useProxy) {
      return `/api/proxy?url=${encodeURIComponent(full)}`;
    }
    return full;
  }

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const targetUrl = this.getTargetUrl(path);
    const headers = {
      ...this.getAuthHeaders(),
      ...(options.headers || {}),
    };

    const res = await fetch(targetUrl, {
      ...options,
      headers,
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      let errorMsg = `Szurubooru API Error (${res.status} ${res.statusText})`;
      try {
        const json = JSON.parse(errText);
        if (json.description || json.title || json.message) {
          errorMsg = json.description || json.title || json.message;
        }
      } catch {
        if (errText) errorMsg += `: ${errText.slice(0, 150)}`;
      }
      throw new Error(errorMsg);
    }

    // Handle 204 No Content
    if (res.status === 204) {
      return {} as T;
    }

    return res.json() as Promise<T>;
  }

  // ==================== SYSTEM & INFO ====================

  public async getInfo(): Promise<SzuruInstanceInfo> {
    return await this.request<SzuruInstanceInfo>('/api/info');
  }

  // ==================== POSTS ====================

  public async getPosts(params: {
    query?: string;
    offset?: number;
    limit?: number;
    safety?: PostSafety | 'all';
  }): Promise<SzuruSearchResult<SzuruPost>> {
    const queryParts: string[] = [];
    if (params.query && params.query.trim()) {
      queryParts.push(params.query.trim());
    }
    if (params.safety && params.safety !== 'all') {
      queryParts.push(`safety:${params.safety}`);
    }

    const fullQuery = queryParts.join(' ');
    const offset = params.offset || 0;
    const limit = params.limit || 20;

    const endpoint = `/api/posts/?query=${encodeURIComponent(fullQuery)}&offset=${offset}&limit=${limit}`;
    return await this.request<SzuruSearchResult<SzuruPost>>(endpoint);
  }

  public async getPost(id: number): Promise<SzuruPost> {
    return await this.request<SzuruPost>(`/api/post/${id}`);
  }

  public async updatePost(
    id: number,
    version: number,
    data: {
      tags?: string[];
      safety?: PostSafety;
      source?: string;
      relations?: number[];
      notes?: SzuruNote[];
      flags?: string[];
    }
  ): Promise<SzuruPost> {
    return await this.request<SzuruPost>(`/api/post/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ version, ...data }),
    });
  }

  public async deletePost(id: number, version?: number): Promise<void> {
    await this.request(`/api/post/${id}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: version !== undefined ? JSON.stringify({ version }) : undefined,
    });
  }

  public async mergePosts(removeId: number, mergeToId: number, replaceContent = false): Promise<void> {
    await this.request('/api/post-merge', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        remove: removeId,
        mergeTo: mergeToId,
        replaceContent,
      }),
    });
  }

  public async setFavorite(id: number, favorite: boolean): Promise<void> {
    if (favorite) {
      await this.request(`/api/post/${id}/favorite`, { method: 'POST' });
    } else {
      await this.request(`/api/post/${id}/favorite`, { method: 'DELETE' });
    }
  }

  public async setScore(id: number, score: number): Promise<number> {
    const res = await this.request<{ score: number }>(`/api/post/${id}/score`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ score }),
    });
    return res.score;
  }

  public async uploadPost(data: {
    file?: File;
    contentUrl?: string;
    tags: string[];
    safety: PostSafety;
    source?: string;
    relations?: number[];
    anonymous?: boolean;
  }): Promise<SzuruPost> {
    const metadata: Record<string, any> = {
      tags: data.tags,
      safety: data.safety,
      source: data.source || undefined,
      relations: data.relations || undefined,
      anonymous: data.anonymous || undefined,
    };

    if (data.file) {
      const formData = new FormData();
      formData.append('content', data.file);
      formData.append('metadata', JSON.stringify(metadata));

      const targetUrl = this.getTargetUrl('/api/posts/');
      const headers = { ...this.getAuthHeaders() };

      const res = await fetch(targetUrl, {
        method: 'POST',
        headers,
        body: formData,
      });

      if (!res.ok) {
        const err = await res.text().catch(() => '');
        throw new Error(`Upload failed (${res.status}): ${err.slice(0, 150)}`);
      }
      return res.json() as Promise<SzuruPost>;
    } else if (data.contentUrl) {
      metadata.contentUrl = data.contentUrl;
      return await this.request<SzuruPost>('/api/posts/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(metadata),
      });
    } else {
      throw new Error('Must provide either a file or a content URL to upload.');
    }
  }

  public async findSimilarPosts(file: File): Promise<{ exact: boolean; distance: number; post: SzuruPost }[]> {
    const formData = new FormData();
    formData.append('content', file);

    const targetUrl = this.getTargetUrl('/api/posts/from-image');
    const headers = { ...this.getAuthHeaders() };

    const res = await fetch(targetUrl, {
      method: 'POST',
      headers,
      body: formData,
    });

    if (!res.ok) {
      return [];
    }
    const json = await res.json().catch(() => ({ results: [] }));
    return json.results || [];
  }

  // ==================== COMMENTS ====================

  public async getComments(params: {
    query?: string;
    offset?: number;
    limit?: number;
  }): Promise<SzuruSearchResult<SzuruComment>> {
    const query = params.query ? encodeURIComponent(params.query.trim()) : '';
    const offset = params.offset || 0;
    const limit = params.limit || 20;
    const endpoint = `/api/comments/?query=${query}&offset=${offset}&limit=${limit}`;
    return await this.request<SzuruSearchResult<SzuruComment>>(endpoint);
  }

  public async createComment(postId: number, text: string): Promise<SzuruComment> {
    return await this.request<SzuruComment>('/api/comments/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ postId, text }),
    });
  }

  public async updateComment(commentId: number, version: number, text: string): Promise<SzuruComment> {
    return await this.request<SzuruComment>(`/api/comment/${commentId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ version, text }),
    });
  }

  public async deleteComment(commentId: number, version?: number): Promise<void> {
    await this.request(`/api/comment/${commentId}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: version !== undefined ? JSON.stringify({ version }) : undefined,
    });
  }

  public async setCommentScore(commentId: number, score: number): Promise<number> {
    const res = await this.request<{ score: number }>(`/api/comment/${commentId}/score`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ score }),
    });
    return res.score;
  }

  // ==================== TAGS & CATEGORIES ====================

  public async getTags(params: {
    query?: string;
    offset?: number;
    limit?: number;
  }): Promise<SzuruSearchResult<SzuruTag>> {
    const query = params.query ? encodeURIComponent(params.query.trim()) : '';
    const offset = params.offset || 0;
    const limit = params.limit || 20;
    return await this.request<SzuruSearchResult<SzuruTag>>(
      `/api/tags/?query=${query}&offset=${offset}&limit=${limit}`
    );
  }

  public async searchTags(query: string, limit = 15): Promise<SzuruTag[]> {
    try {
      const endpoint = `/api/tags/?query=${encodeURIComponent(query)}&limit=${limit}`;
      const res = await this.request<{ results: SzuruTag[] }>(endpoint);
      return res.results || [];
    } catch {
      return [];
    }
  }

  public async getTag(name: string): Promise<SzuruTag> {
    return await this.request<SzuruTag>(`/api/tag/${encodeURIComponent(name)}`);
  }

  public async createTag(data: {
    names: string[];
    category: string;
    suggestions?: string[];
    implications?: string[];
  }): Promise<SzuruTag> {
    return await this.request<SzuruTag>('/api/tags/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  }

  public async updateTag(
    name: string,
    version: number,
    data: {
      names?: string[];
      category?: string;
      suggestions?: string[];
      implications?: string[];
    }
  ): Promise<SzuruTag> {
    return await this.request<SzuruTag>(`/api/tag/${encodeURIComponent(name)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ version, ...data }),
    });
  }

  public async deleteTag(name: string, version?: number): Promise<void> {
    await this.request(`/api/tag/${encodeURIComponent(name)}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: version !== undefined ? JSON.stringify({ version }) : undefined,
    });
  }

  public async getTagCategories(): Promise<SzuruTagCategory[]> {
    try {
      const result = await this.request<{ results: SzuruTagCategory[] }>('/api/tag-categories/');
      return result.results && result.results.length > 0 ? result.results : DEFAULT_TAG_CATEGORIES;
    } catch {
      return DEFAULT_TAG_CATEGORIES;
    }
  }

  public async createTagCategory(data: { name: string; color: string; order?: number }): Promise<SzuruTagCategory> {
    return await this.request<SzuruTagCategory>('/api/tag-categories/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  }

  public async updateTagCategory(
    name: string,
    version: number,
    data: { name?: string; color?: string; order?: number }
  ): Promise<SzuruTagCategory> {
    return await this.request<SzuruTagCategory>(`/api/tag-category/${encodeURIComponent(name)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ version, ...data }),
    });
  }

  public async deleteTagCategory(name: string): Promise<void> {
    await this.request(`/api/tag-category/${encodeURIComponent(name)}`, {
      method: 'DELETE',
    });
  }

  // ==================== POOLS ====================

  public async getPools(params: {
    query?: string;
    offset?: number;
    limit?: number;
  }): Promise<SzuruSearchResult<SzuruPool>> {
    const query = params.query ? encodeURIComponent(params.query.trim()) : '';
    const offset = params.offset || 0;
    const limit = params.limit || 20;
    return await this.request<SzuruSearchResult<SzuruPool>>(
      `/api/pools/?query=${query}&offset=${offset}&limit=${limit}`
    );
  }

  public async getPool(id: number): Promise<SzuruPool> {
    return await this.request<SzuruPool>(`/api/pool/${id}`);
  }

  public async createPool(data: {
    category: string;
    names: string[];
    description?: string;
    postIds?: number[];
  }): Promise<SzuruPool> {
    return await this.request<SzuruPool>('/api/pools/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  }

  public async updatePool(
    id: number,
    version: number,
    data: {
      category?: string;
      names?: string[];
      description?: string;
      postIds?: number[];
    }
  ): Promise<SzuruPool> {
    return await this.request<SzuruPool>(`/api/pool/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ version, ...data }),
    });
  }

  public async deletePool(id: number, version?: number): Promise<void> {
    await this.request(`/api/pool/${id}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: version !== undefined ? JSON.stringify({ version }) : undefined,
    });
  }

  public async getPoolCategories(): Promise<SzuruPoolCategory[]> {
    try {
      const res = await this.request<{ results: SzuruPoolCategory[] }>('/api/pool-categories/');
      return res.results || [{ name: 'series', color: '#8b5cf6', default: true }];
    } catch {
      return [{ name: 'series', color: '#8b5cf6', default: true }];
    }
  }

  // ==================== USERS ====================

  public async getUsers(params: {
    query?: string;
    offset?: number;
    limit?: number;
  }): Promise<SzuruSearchResult<SzuruFullUser>> {
    const query = params.query ? encodeURIComponent(params.query.trim()) : '';
    const offset = params.offset || 0;
    const limit = params.limit || 20;
    return await this.request<SzuruSearchResult<SzuruFullUser>>(
      `/api/users/?query=${query}&offset=${offset}&limit=${limit}`
    );
  }

  public async getUser(name: string): Promise<SzuruFullUser> {
    return await this.request<SzuruFullUser>(`/api/user/${encodeURIComponent(name)}`);
  }

  // ==================== SNAPSHOTS / HISTORY ====================

  public async getSnapshots(params: {
    query?: string;
    offset?: number;
    limit?: number;
  }): Promise<SzuruSearchResult<SzuruSnapshot>> {
    const query = params.query ? encodeURIComponent(params.query.trim()) : '';
    const offset = params.offset || 0;
    const limit = params.limit || 30;
    return await this.request<SzuruSearchResult<SzuruSnapshot>>(
      `/api/snapshots/?query=${query}&offset=${offset}&limit=${limit}`
    );
  }
}

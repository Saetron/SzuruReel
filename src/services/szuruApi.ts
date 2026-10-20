import { AppConfig, PostSafety, SzuruComment, SzuruInstanceInfo, SzuruPost, SzuruSearchResult, SzuruTag, SzuruTagCategory } from '../types/szuru';
import { MOCK_CATEGORIES, MOCK_POSTS } from './mockData';

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
      'Accept': 'application/json',
    };

    if (this.config.username && this.config.apiToken) {
      const credentials = btoa(`${this.config.username}:${this.config.apiToken}`);
      headers['Authorization'] = `Token ${credentials}`;
    }

    return headers;
  }

  public getTargetUrl(path: string): string {
    const base = this.config.instanceUrl.replace(/\/+$/, '');
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    const fullUrl = `${base}${cleanPath}`;

    if (this.config.useProxy) {
      return `/api/proxy?url=${encodeURIComponent(fullUrl)}`;
    }
    return fullUrl;
  }

  public resolveMediaUrl(url: string | undefined): string {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('blob:') || url.startsWith('data:')) {
      return url;
    }
    const base = this.config.instanceUrl.replace(/\/+$/, '');
    const cleanPath = url.startsWith('/') ? url : `/${url}`;
    const full = `${base}${cleanPath}`;

    // For media, if using proxy and direct access might fail, can pass through proxy
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

    return res.json() as Promise<T>;
  }

  // --- API Methods ---

  public async getInfo(): Promise<SzuruInstanceInfo> {
    if (this.config.isDemoMode) {
      return {
        title: 'SzuruReel Demo Booru',
        name: 'SzuruReel Demo',
        version: '1.20.0-mock',
        totalPosts: MOCK_POSTS.length,
      };
    }
    try {
      return await this.request<SzuruInstanceInfo>('/api/info');
    } catch (e) {
      if (this.config.isDemoMode) {
        return {
          title: 'Demo Booru',
          name: 'Demo Booru',
          totalPosts: MOCK_POSTS.length,
        };
      }
      throw e;
    }
  }

  public async getTagCategories(): Promise<SzuruTagCategory[]> {
    if (this.config.isDemoMode) {
      return MOCK_CATEGORIES;
    }
    try {
      const result = await this.request<{ results: SzuruTagCategory[] }>('/api/tag-categories/');
      return result.results || MOCK_CATEGORIES;
    } catch {
      return MOCK_CATEGORIES;
    }
  }

  public async getPosts(params: {
    query?: string;
    offset?: number;
    limit?: number;
    safety?: PostSafety | 'all';
  }): Promise<SzuruSearchResult<SzuruPost>> {
    if (this.config.isDemoMode) {
      // Filter mock posts
      let filtered = [...MOCK_POSTS];
      if (params.query) {
        const q = params.query.toLowerCase().trim();
        filtered = filtered.filter((p) => {
          if (q === 'type:video') return p.type === 'video';
          if (q === 'type:image') return p.type === 'image';
          return (
            p.tags.some((t) => t.names.some((n) => n.toLowerCase().includes(q))) ||
            p.user?.name.toLowerCase().includes(q)
          );
        });
      }
      if (params.safety && params.safety !== 'all') {
        filtered = filtered.filter((p) => p.safety === params.safety);
      }
      const offset = params.offset || 0;
      const limit = params.limit || 20;
      return {
        query: params.query || '',
        offset,
        limit,
        total: filtered.length,
        results: filtered.slice(offset, offset + limit),
      };
    }

    // Prepare szurubooru query string
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
    if (this.config.isDemoMode) {
      const found = MOCK_POSTS.find((p) => p.id === id);
      if (found) return found;
      return MOCK_POSTS[0];
    }
    return await this.request<SzuruPost>(`/api/post/${id}`);
  }

  public async setFavorite(id: number, favorite: boolean): Promise<void> {
    if (this.config.isDemoMode) {
      const p = MOCK_POSTS.find((post) => post.id === id);
      if (p) p.ownFavorite = favorite;
      return;
    }

    if (favorite) {
      await this.request(`/api/post/${id}/favorite`, {
        method: 'POST',
      });
    } else {
      await this.request(`/api/post/${id}/favorite`, {
        method: 'DELETE',
      });
    }
  }

  public async setScore(id: number, score: number): Promise<number> {
    if (this.config.isDemoMode) {
      const p = MOCK_POSTS.find((post) => post.id === id);
      if (p) {
        p.ownScore = score;
        p.score += score;
        return p.score;
      }
      return score;
    }

    const res = await this.request<{ score: number }>(`/api/post/${id}/score`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ score }),
    });
    return res.score;
  }

  public async createComment(postId: number, text: string): Promise<SzuruComment> {
    if (this.config.isDemoMode) {
      const newComment: SzuruComment = {
        id: Math.floor(Math.random() * 10000) + 10,
        creationTime: new Date().toISOString(),
        user: { name: this.config.username || 'You' },
        text,
        score: 0,
      };
      const p = MOCK_POSTS.find((post) => post.id === postId);
      if (p) {
        if (!p.comments) p.comments = [];
        p.comments.push(newComment);
      }
      return newComment;
    }

    return await this.request<SzuruComment>('/api/comments/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ postId, text }),
    });
  }

  public async deleteComment(commentId: number): Promise<void> {
    if (this.config.isDemoMode) {
      for (const p of MOCK_POSTS) {
        if (p.comments) {
          p.comments = p.comments.filter((c) => c.id !== commentId);
        }
      }
      return;
    }

    await this.request(`/api/comment/${commentId}`, {
      method: 'DELETE',
    });
  }

  public async searchTags(query: string, limit = 15): Promise<SzuruTag[]> {
    if (this.config.isDemoMode) {
      const q = query.toLowerCase().trim();
      const allTags: SzuruTag[] = [];
      MOCK_POSTS.forEach((p) => {
        p.tags.forEach((t) => {
          allTags.push({
            names: t.names,
            category: t.category,
            usages: t.usages || 1,
          });
        });
      });
      return allTags
        .filter((t) => t.names.some((n) => n.toLowerCase().includes(q)))
        .slice(0, limit);
    }

    try {
      const endpoint = `/api/tags/?query=${encodeURIComponent(query)}&limit=${limit}`;
      const res = await this.request<{ results: SzuruTag[] }>(endpoint);
      return res.results || [];
    } catch {
      return [];
    }
  }

  public async uploadPost(data: {
    file: File;
    tags: string[];
    safety: PostSafety;
    source?: string;
  }): Promise<SzuruPost> {
    if (this.config.isDemoMode) {
      const newPost: SzuruPost = {
        id: Math.floor(Math.random() * 900) + 200,
        version: 1,
        creationTime: new Date().toISOString(),
        safety: data.safety,
        source: data.source || '',
        type: data.file.type.startsWith('video/') ? 'video' : 'image',
        mimeType: data.file.type,
        checksum: 'demo_upload_' + Date.now(),
        fileSize: data.file.size,
        canvasWidth: 1080,
        canvasHeight: 1920,
        contentUrl: URL.createObjectURL(data.file),
        thumbnailUrl: URL.createObjectURL(data.file),
        flags: [],
        tags: data.tags.map((t) => ({ names: [t], category: 'general', usages: 1 })),
        score: 0,
        user: { name: this.config.username || 'You' },
        comments: [],
      };
      MOCK_POSTS.unshift(newPost);
      return newPost;
    }

    const formData = new FormData();
    formData.append('content', data.file);
    const metadata = {
      tags: data.tags,
      safety: data.safety,
      source: data.source || undefined,
    };
    formData.append('metadata', JSON.stringify(metadata));

    const targetUrl = this.getTargetUrl('/api/posts/');
    const headers = {
      ...this.getAuthHeaders(),
    };
    // Let browser set boundary for multipart
    const res = await fetch(targetUrl, {
      method: 'POST',
      headers,
      body: formData,
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Upload failed: ${err.slice(0, 150)}`);
    }

    return res.json() as Promise<SzuruPost>;
  }
}

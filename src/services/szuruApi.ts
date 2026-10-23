import { AppConfig, PostSafety, SzuruComment, SzuruInstanceInfo, SzuruPost, SzuruSearchResult, SzuruTag, SzuruTagCategory } from '../types/szuru';

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
      'Accept': 'application/json',
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
    if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('blob:') || url.startsWith('data:')) {
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

    return res.json() as Promise<T>;
  }

  // --- API Methods ---

  public async getInfo(): Promise<SzuruInstanceInfo> {
    return await this.request<SzuruInstanceInfo>('/api/info');
  }

  public async getTagCategories(): Promise<SzuruTagCategory[]> {
    try {
      const result = await this.request<{ results: SzuruTagCategory[] }>('/api/tag-categories/');
      return result.results && result.results.length > 0 ? result.results : DEFAULT_TAG_CATEGORIES;
    } catch {
      return DEFAULT_TAG_CATEGORIES;
    }
  }

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

  public async setFavorite(id: number, favorite: boolean): Promise<void> {
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
    const res = await this.request<{ score: number }>(`/api/post/${id}/score`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ score }),
    });
    return res.score;
  }

  public async createComment(postId: number, text: string): Promise<SzuruComment> {
    return await this.request<SzuruComment>('/api/comments/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ postId, text }),
    });
  }

  public async deleteComment(commentId: number): Promise<void> {
    await this.request(`/api/comment/${commentId}`, {
      method: 'DELETE',
    });
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

  public async uploadPost(data: {
    file: File;
    tags: string[];
    safety: PostSafety;
    source?: string;
  }): Promise<SzuruPost> {
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
  }
}

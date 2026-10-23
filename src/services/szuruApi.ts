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
  SzuruTagRef,
  SzuruTagCategory,
} from '../types/szuru';

export const DEFAULT_TAG_CATEGORIES: SzuruTagCategory[] = [
  { name: 'general', color: '#60a5fa', order: 1, default: true },
  { name: 'character', color: '#4ade80', order: 2 },
  { name: 'artist', color: '#f87171', order: 3 },
  { name: 'copyright', color: '#c084fc', order: 4 },
  { name: 'meta', color: '#fb923c', order: 5 },
];

function mapDanbooruPostToSzuruPost(p: any): SzuruPost {
  let safety: PostSafety = 'safe';
  const r = (p.rating || '').toLowerCase();
  if (r === 's' || r === 'g') safety = 'safe';
  else if (r === 'q') safety = 'sketchy';
  else if (r === 'e') safety = 'unsafe';

  const ext = (p.file_ext || '').toLowerCase();
  let type: 'image' | 'video' | 'animation' = 'image';
  if (ext === 'mp4' || ext === 'webm') type = 'video';
  else if (ext === 'gif') type = 'animation';

  const tags: SzuruTagRef[] = [];
  const addTags = (tagStr: string | undefined, category: string) => {
    if (!tagStr) return;
    tagStr.split(/\s+/).filter(Boolean).forEach((t) => {
      tags.push({ names: [t], category });
    });
  };

  if (p.tag_string_artist || p.tag_string_character || p.tag_string_copyright || p.tag_string_meta || p.tag_string_general) {
    addTags(p.tag_string_artist, 'artist');
    addTags(p.tag_string_character, 'character');
    addTags(p.tag_string_copyright, 'copyright');
    addTags(p.tag_string_meta, 'meta');
    addTags(p.tag_string_general, 'general');
  } else if (p.tag_string) {
    addTags(p.tag_string, 'general');
  }

  const contentUrl = p.file_url || p.large_file_url || '';
  const thumbnailUrl = p.preview_file_url || p.large_file_url || p.file_url || '';

  return {
    id: p.id,
    version: 1,
    creationTime: p.created_at || new Date().toISOString(),
    safety,
    type,
    mimeType:
      ext === 'png'
        ? 'image/png'
        : ext === 'gif'
        ? 'image/gif'
        : ext === 'mp4'
        ? 'video/mp4'
        : ext === 'webm'
        ? 'video/webm'
        : 'image/jpeg',
    checksum: p.md5 || '',
    fileSize: p.file_size || 0,
    canvasWidth: p.image_width || 1000,
    canvasHeight: p.image_height || 1000,
    contentUrl,
    thumbnailUrl,
    flags: [],
    tags,
    user: {
      name: p.uploader_name || (p.uploader_id ? `user_${p.uploader_id}` : 'system'),
    },
    score: p.score ?? 0,
    ownScore: p.is_favorited ? 1 : 0,
    source: p.source || '',
  };
}

export class SzuruApiService {
  private config: AppConfig;
  private dialect: 'auto' | 'szuru' | 'danbooru' = 'auto';
  private cachedTags: Map<string, SzuruTag> = new Map();
  private totalCountEstimate = 0;

  constructor(config: AppConfig) {
    this.config = config;
  }

  public updateConfig(config: AppConfig) {
    if (this.config.instanceUrl !== config.instanceUrl) {
      this.dialect = 'auto';
      this.cachedTags.clear();
      this.totalCountEstimate = 0;
    }
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
      url.startsWith('/api/proxy') ||
      url.startsWith('blob:') ||
      url.startsWith('data:')
    ) {
      return url;
    }

    if (this.config.useProxy) {
      if (url.startsWith('http://') || url.startsWith('https://')) {
        return `/api/proxy?url=${encodeURIComponent(url)}`;
      }
      const base = (this.config.instanceUrl || '').replace(/\/+$/, '');
      const cleanPath = url.startsWith('/') ? url : `/${url}`;
      const full = base ? `${base}${cleanPath}` : cleanPath;
      return `/api/proxy?url=${encodeURIComponent(full)}`;
    }

    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    const base = (this.config.instanceUrl || '').replace(/\/+$/, '');
    const cleanPath = url.startsWith('/') ? url : `/${url}`;
    return base ? `${base}${cleanPath}` : cleanPath;
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
      let errorMsg = `Booru API Error (${res.status} ${res.statusText})`;
      try {
        const json = JSON.parse(errText);
        if (json.description || json.title || json.message || json.detail) {
          errorMsg = json.description || json.title || json.message || json.detail;
        }
      } catch {
        if (errText) errorMsg += `: ${errText.slice(0, 150)}`;
      }
      const err = new Error(errorMsg) as any;
      err.status = res.status;
      throw err;
    }

    // Handle 204 No Content
    if (res.status === 204) {
      return {} as T;
    }

    return res.json() as Promise<T>;
  }

  // ==================== SYSTEM & INFO ====================

  public async getInfo(): Promise<SzuruInstanceInfo> {
    if (this.dialect !== 'danbooru') {
      try {
        const info = await this.request<SzuruInstanceInfo>('/api/info');
        this.dialect = 'szuru';
        return info;
      } catch (err: any) {
        if (this.dialect === 'szuru') throw err;
      }
    }

    try {
      const health = await this.request<any>('/health').catch(() => null);
      const counts = await this.request<any>('/counts/posts').catch(() => null);
      this.dialect = 'danbooru';
      if (counts?.counts?.posts) {
        this.totalCountEstimate = counts.counts.posts;
      }
      return {
        name: health?.status === 'healthy' ? 'SzuruRelay' : 'Danbooru API',
        title: health?.backend_url ? `SzuruRelay (${health.version || '2.0'})` : 'Booru Instance',
        version: health?.version || '2.1.1',
        servingFiles: true,
        totalPosts: this.totalCountEstimate || undefined,
      };
    } catch {
      try {
        const posts = await this.request<any[]>('/posts?limit=1');
        if (Array.isArray(posts)) {
          this.dialect = 'danbooru';
          return {
            name: 'Danbooru API',
            title: 'Booru Instance',
            version: '1.0',
            servingFiles: true,
          };
        }
      } catch {
        // preserve
      }
      throw new Error('Could not connect to Szurubooru or Danbooru API at this URL.');
    }
  }

  // ==================== POSTS ====================

  public async getPosts(params: {
    query?: string;
    offset?: number;
    limit?: number;
    safety?: PostSafety | 'all';
  }): Promise<SzuruSearchResult<SzuruPost>> {
    const offset = params.offset || 0;
    const limit = params.limit || 20;

    if (this.dialect === 'danbooru') {
      return await this.getDanbooruPosts(params);
    }

    const queryParts: string[] = [];
    if (params.query && params.query.trim()) {
      queryParts.push(params.query.trim());
    }
    if (params.safety && params.safety !== 'all') {
      queryParts.push(`safety:${params.safety}`);
    }

    const fullQuery = queryParts.join(' ');
    const endpoint = `/api/posts/?query=${encodeURIComponent(fullQuery)}&offset=${offset}&limit=${limit}`;

    try {
      const res = await this.request<SzuruSearchResult<SzuruPost>>(endpoint);
      this.dialect = 'szuru';
      return res;
    } catch (err: any) {
      if (
        this.dialect === 'auto' &&
        (err.status === 404 || err.message?.includes('404') || err.message?.includes('Not Found'))
      ) {
        this.dialect = 'danbooru';
        return await this.getDanbooruPosts(params);
      }
      throw err;
    }
  }

  private async getDanbooruPosts(params: {
    query?: string;
    offset?: number;
    limit?: number;
    safety?: PostSafety | 'all';
  }): Promise<SzuruSearchResult<SzuruPost>> {
    const offset = params.offset || 0;
    const limit = params.limit || 20;
    const page = Math.floor(offset / limit) + 1;

    const tagsList: string[] = [];
    if (params.query && params.query.trim()) {
      const terms = params.query.trim().split(/\s+/);
      for (const t of terms) {
        if (t.startsWith('safety:')) {
          const val = t.replace('safety:', '');
          if (val === 'safe') tagsList.push('rating:s');
          else if (val === 'sketchy') tagsList.push('rating:q');
          else if (val === 'unsafe') tagsList.push('rating:e');
        } else if (t.startsWith('sort:')) {
          const sortVal = t.replace('sort:', '');
          if (sortVal === 'score-desc') tagsList.push('order:score');
          else if (sortVal === 'random') tagsList.push('order:random');
        } else {
          tagsList.push(t);
        }
      }
    }

    if (params.safety && params.safety !== 'all') {
      if (params.safety === 'safe') tagsList.push('rating:s');
      else if (params.safety === 'sketchy') tagsList.push('rating:q');
      else if (params.safety === 'unsafe') tagsList.push('rating:e');
    }

    const tagsParam = tagsList.join(' ');
    const endpoint = `/posts?limit=${limit}&page=${page}${tagsParam ? `&tags=${encodeURIComponent(tagsParam)}` : ''}`;

    const raw = await this.request<any[]>(endpoint).catch(() => []);
    const results = Array.isArray(raw) ? raw.map(mapDanbooruPostToSzuruPost) : [];

    for (const post of results) {
      for (const t of post.tags) {
        const tagName = t.names[0];
        if (tagName && !this.cachedTags.has(tagName)) {
          this.cachedTags.set(tagName, {
            names: [tagName],
            category: t.category,
            usages: 1,
            version: 1,
          });
        }
      }
    }

    const total =
      this.totalCountEstimate ||
      (results.length < limit ? offset + results.length : offset + results.length + 100);

    return {
      query: tagsParam,
      offset,
      limit,
      total,
      results,
    };
  }

  public async getPost(id: number): Promise<SzuruPost> {
    if (this.dialect === 'danbooru') {
      const raw = await this.request<any>(`/posts/${id}`);
      return mapDanbooruPostToSzuruPost(raw);
    }

    try {
      return await this.request<SzuruPost>(`/api/post/${id}`);
    } catch (err: any) {
      if (
        this.dialect === 'auto' &&
        (err.status === 404 || err.message?.includes('404') || err.message?.includes('Not Found'))
      ) {
        this.dialect = 'danbooru';
        const raw = await this.request<any>(`/posts/${id}`);
        return mapDanbooruPostToSzuruPost(raw);
      }
      throw err;
    }
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
    if (this.dialect === 'danbooru') {
      if (favorite) {
        await this.request('/favorites', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ post_id: id }),
        }).catch(() => null);
      } else {
        await this.request(`/favorites/${id}`, { method: 'DELETE' }).catch(() => null);
      }
      return;
    }

    if (favorite) {
      await this.request(`/api/post/${id}/favorite`, { method: 'POST' });
    } else {
      await this.request(`/api/post/${id}/favorite`, { method: 'DELETE' });
    }
  }

  public async setScore(id: number, score: number): Promise<number> {
    if (this.dialect === 'danbooru') {
      try {
        await this.request('/post_votes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ post_id: id, score }),
        });
      } catch {
        // ignore
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
    if (this.dialect === 'danbooru') {
      return [];
    }
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
    if (this.dialect === 'danbooru') {
      return { query: params.query || '', offset: params.offset || 0, limit: params.limit || 20, total: 0, results: [] };
    }
    const query = params.query ? encodeURIComponent(params.query.trim()) : '';
    const offset = params.offset || 0;
    const limit = params.limit || 20;
    const endpoint = `/api/comments/?query=${query}&offset=${offset}&limit=${limit}`;
    try {
      return await this.request<SzuruSearchResult<SzuruComment>>(endpoint);
    } catch {
      return { query: params.query || '', offset, limit, total: 0, results: [] };
    }
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
    if (this.dialect === 'danbooru') {
      const q = (params.query || '').toLowerCase();
      const results: SzuruTag[] = [];
      for (const [name, tag] of this.cachedTags) {
        if (!q || name.toLowerCase().includes(q)) {
          results.push(tag);
        }
      }
      return {
        query: params.query || '',
        offset: params.offset || 0,
        limit: params.limit || 20,
        total: results.length,
        results: results.slice(params.offset || 0, (params.offset || 0) + (params.limit || 20)),
      };
    }
    const query = params.query ? encodeURIComponent(params.query.trim()) : '';
    const offset = params.offset || 0;
    const limit = params.limit || 20;
    try {
      return await this.request<SzuruSearchResult<SzuruTag>>(
        `/api/tags/?query=${query}&offset=${offset}&limit=${limit}`
      );
    } catch {
      return { query: params.query || '', offset, limit, total: 0, results: [] };
    }
  }

  public async searchTags(query: string, limit = 15): Promise<SzuruTag[]> {
    if (!query.trim()) return [];

    if (this.dialect === 'danbooru') {
      const q = query.toLowerCase();
      const matches: SzuruTag[] = [];
      for (const [name, tag] of this.cachedTags) {
        if (name.toLowerCase().includes(q)) {
          matches.push(tag);
          if (matches.length >= limit) break;
        }
      }
      return matches;
    }

    try {
      const endpoint = `/api/tags/?query=${encodeURIComponent(query)}&limit=${limit}`;
      const res = await this.request<{ results: SzuruTag[] }>(endpoint);
      return res.results || [];
    } catch {
      const q = query.toLowerCase();
      const fallback: SzuruTag[] = [];
      for (const [name, tag] of this.cachedTags) {
        if (name.toLowerCase().includes(q)) {
          fallback.push(tag);
          if (fallback.length >= limit) break;
        }
      }
      return fallback;
    }
  }

  public async getTag(name: string): Promise<SzuruTag> {
    if (this.dialect === 'danbooru') {
      return this.cachedTags.get(name) || {
        names: [name],
        category: 'general',
        usages: 1,
        version: 1,
      };
    }
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
    if (this.dialect === 'danbooru') {
      return DEFAULT_TAG_CATEGORIES;
    }
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
    if (this.dialect === 'danbooru') {
      return { query: params.query || '', offset: params.offset || 0, limit: params.limit || 20, total: 0, results: [] };
    }
    const query = params.query ? encodeURIComponent(params.query.trim()) : '';
    const offset = params.offset || 0;
    const limit = params.limit || 20;
    try {
      return await this.request<SzuruSearchResult<SzuruPool>>(
        `/api/pools/?query=${query}&offset=${offset}&limit=${limit}`
      );
    } catch {
      return { query: params.query || '', offset, limit, total: 0, results: [] };
    }
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
    if (this.dialect === 'danbooru') {
      return [{ name: 'series', color: '#8b5cf6', default: true }];
    }
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
    if (this.dialect === 'danbooru') {
      try {
        const raw = await this.request<any[]>(`/users?limit=${params.limit || 20}`);
        const results: SzuruFullUser[] = Array.isArray(raw)
          ? raw.map((u: any) => ({
              name: u.name || `user_${u.id}`,
              avatarUrl: u.avatar_url,
              rank: (u.level_string || 'regular').toLowerCase(),
              creationTime: u.created_at,
              lastLoginTime: u.last_logged_in_at,
              uploadCount: u.post_upload_count ?? 0,
              favoriteCount: u.favorite_count ?? 0,
              commentCount: u.comment_count ?? 0,
            }))
          : [];
        return {
          query: params.query || '',
          offset: params.offset || 0,
          limit: params.limit || 20,
          total: results.length,
          results,
        };
      } catch {
        return { query: params.query || '', offset: 0, limit: 20, total: 0, results: [] };
      }
    }

    const query = params.query ? encodeURIComponent(params.query.trim()) : '';
    const offset = params.offset || 0;
    const limit = params.limit || 20;
    try {
      return await this.request<SzuruSearchResult<SzuruFullUser>>(
        `/api/users/?query=${query}&offset=${offset}&limit=${limit}`
      );
    } catch {
      return { query: params.query || '', offset, limit, total: 0, results: [] };
    }
  }

  public async getUser(name: string): Promise<SzuruFullUser> {
    if (this.dialect === 'danbooru') {
      try {
        const raw = await this.request<any>(`/users/${encodeURIComponent(name)}`);
        if (raw && (raw.name || raw.id)) {
          return {
            name: raw.name || name,
            avatarUrl: raw.avatar_url,
            rank: (raw.level_string || 'regular').toLowerCase(),
            creationTime: raw.created_at,
            lastLoginTime: raw.last_logged_in_at,
            uploadCount: raw.post_upload_count ?? 0,
            favoriteCount: raw.favorite_count ?? 0,
            commentCount: raw.comment_count ?? 0,
          };
        }
      } catch {
        // try profile endpoint
      }

      try {
        const profile = await this.request<any>('/profile');
        if (profile && (profile.name?.toLowerCase() === name.toLowerCase() || name === 'self')) {
          return {
            name: profile.name,
            avatarUrl: profile.avatar_url,
            rank: (profile.level_string || 'regular').toLowerCase(),
            creationTime: profile.created_at,
            lastLoginTime: profile.last_logged_in_at,
            uploadCount: profile.post_upload_count ?? 0,
            favoriteCount: profile.favorite_count ?? 0,
            commentCount: profile.comment_count ?? 0,
          };
        }
      } catch {
        // fallback
      }

      return {
        name,
        rank: 'regular',
        uploadCount: 0,
        favoriteCount: 0,
      };
    }

    try {
      return await this.request<SzuruFullUser>(`/api/user/${encodeURIComponent(name)}`);
    } catch (err: any) {
      if (
        this.dialect === 'auto' &&
        (err.status === 404 || err.message?.includes('404') || err.message?.includes('Not Found'))
      ) {
        this.dialect = 'danbooru';
        return await this.getUser(name);
      }
      throw err;
    }
  }

  // ==================== SNAPSHOTS / HISTORY ====================

  public async getSnapshots(params: {
    query?: string;
    offset?: number;
    limit?: number;
  }): Promise<SzuruSearchResult<SzuruSnapshot>> {
    if (this.dialect === 'danbooru') {
      return { query: params.query || '', offset: params.offset || 0, limit: params.limit || 30, total: 0, results: [] };
    }
    const query = params.query ? encodeURIComponent(params.query.trim()) : '';
    const offset = params.offset || 0;
    const limit = params.limit || 30;
    try {
      return await this.request<SzuruSearchResult<SzuruSnapshot>>(
        `/api/snapshots/?query=${query}&offset=${offset}&limit=${limit}`
      );
    } catch {
      return { query: params.query || '', offset, limit, total: 0, results: [] };
    }
  }
}

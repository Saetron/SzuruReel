export type PostSafety = 'safe' | 'sketchy' | 'unsafe';
export type PostType = 'image' | 'animation' | 'video' | 'flash';

export interface SzuruTagRef {
  names: string[];
  category: string;
  usages?: number;
}

export interface SzuruTagCategory {
  name: string;
  color: string;
  order?: number;
  default?: boolean;
}

export interface SzuruUser {
  name: string;
  avatarUrl?: string;
  rank?: string;
  creationTime?: string;
}

export interface SzuruComment {
  id: number;
  version?: number;
  creationTime: string;
  lastEditTime?: string;
  user: SzuruUser;
  text: string;
  score: number;
  ownScore?: number;
}

export interface SzuruPost {
  id: number;
  version: number;
  creationTime: string;
  lastEditTime?: string;
  safety: PostSafety;
  source?: string;
  type: PostType;
  mimeType: string;
  checksum: string;
  fileSize: number;
  canvasWidth: number;
  canvasHeight: number;
  contentUrl: string;
  thumbnailUrl: string;
  flags: string[];
  tags: SzuruTagRef[];
  relations?: { id: number; type?: string }[];
  comments?: SzuruComment[];
  score: number;
  ownScore?: number;
  ownFavorite?: boolean;
  user?: SzuruUser;
}

export interface SzuruSearchResult<T> {
  query: string;
  offset: number;
  limit: number;
  total: number;
  results: T[];
}

export interface SzuruTag {
  names: string[];
  category: string;
  usages: number;
  suggestions?: string[];
  implications?: string[];
}

export interface SzuruInstanceInfo {
  title?: string;
  name?: string;
  version?: string;
  contactEmail?: string;
  servingFiles?: boolean;
  totalPosts?: number;
}

export interface AppConfig {
  instanceUrl: string;
  username: string;
  apiToken: string;
  useProxy: boolean;
  isDemoMode: boolean;
  autoPlaySound: boolean;
  defaultSafety: PostSafety | 'all';
  defaultSort: string;
}

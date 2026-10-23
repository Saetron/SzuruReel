export type PostSafety = 'safe' | 'sketchy' | 'unsafe';
export type PostType = 'image' | 'animation' | 'video' | 'flash';
export type UserRank = 'anonymous' | 'regular' | 'power' | 'moderator' | 'administrator';

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
  rank?: UserRank | string;
  creationTime?: string;
}

export interface SzuruFullUser extends SzuruUser {
  email?: string;
  lastLoginTime?: string;
  uploadCount?: number;
  favoriteCount?: number;
  commentCount?: number;
}

export interface SzuruNote {
  polygon: [number, number][]; // 4 points: [[x1, y1], [x2, y2], [x3, y3], [x4, y4]]
  text: string;
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
  post?: SzuruPost | { id: number; thumbnailUrl?: string; contentUrl?: string; type?: PostType };
  postId?: number;
}

export interface SzuruPoolPostRef {
  id: number;
  thumbnailUrl?: string;
  contentUrl?: string;
  type?: PostType;
  safety?: PostSafety;
}

export interface SzuruPool {
  id: number;
  version: number;
  category: string;
  names: string[];
  description?: string;
  posts: (SzuruPost | SzuruPoolPostRef)[];
  postCount?: number;
}

export interface SzuruPoolCategory {
  name: string;
  color?: string;
  default?: boolean;
}

export interface SzuruPostRelation {
  id: number;
  type?: string;
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
  relations?: SzuruPostRelation[];
  notes?: SzuruNote[];
  comments?: SzuruComment[];
  pools?: SzuruPool[];
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
  version?: number;
  suggestions?: string[];
  implications?: string[];
}

export interface SzuruSnapshot {
  id: number;
  operation: 'created' | 'modified' | 'deleted' | string;
  type: 'post' | 'tag' | 'pool' | 'comment' | 'user' | string;
  resourceId?: number | string;
  user?: SzuruUser;
  time: string;
  data?: any;
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
  autoPlaySound: boolean;
  defaultSafety: PostSafety | 'all';
  defaultSort: string;
}

export interface DockerServerConfig {
  instanceUrl: string;
  username: string;
  apiToken: string;
  useProxy: boolean;
  defaultSafety: PostSafety | 'all';
  autoPlaySound: boolean;
  defaultSort: string;
}

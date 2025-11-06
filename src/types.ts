export interface MergedPR {
  title: string;
  number: number;
  author: string;
  authorAvatar: string;
  url: string;
  mergedAt: string;
  repository: string;
}

export interface RepoConfig {
  owner: string;
  repo: string;
}

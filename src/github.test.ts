import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GitHubClient } from './github';
import { RepoConfig } from './types';

// Mock the Octokit class
vi.mock('@octokit/rest', () => {
  return {
    Octokit: vi.fn().mockImplementation(() => {
      return {
        pulls: {
          list: vi.fn(),
        },
      };
    }),
  };
});

describe('GitHubClient', () => {
  let githubClient: GitHubClient;
  let mockOctokit: any;

  beforeEach(() => {
    vi.clearAllMocks();
    githubClient = new GitHubClient('test-token');
    // Access the mocked Octokit instance
    mockOctokit = (githubClient as any).octokit;
  });

  describe('getMergedPRsInTimeWindow', () => {
    it('should return empty array when no PRs are merged', async () => {
      const repos: RepoConfig[] = [{ owner: 'octocat', repo: 'hello-world' }];

      mockOctokit.pulls.list.mockResolvedValue({ data: [] });

      const result = await githubClient.getMergedPRsInTimeWindow(repos);

      expect(result).toEqual([]);
      expect(mockOctokit.pulls.list).toHaveBeenCalledWith({
        owner: 'octocat',
        repo: 'hello-world',
        state: 'closed',
        sort: 'updated',
        direction: 'desc',
        per_page: 100,
      });
    });

    it('should filter out PRs without merged_at timestamp', async () => {
      const repos: RepoConfig[] = [{ owner: 'octocat', repo: 'hello-world' }];

      mockOctokit.pulls.list.mockResolvedValue({
        data: [
          {
            number: 1,
            title: 'Closed but not merged',
            user: { login: 'user1', avatar_url: 'https://avatar.com/user1' },
            html_url: 'https://github.com/octocat/hello-world/pull/1',
            merged_at: null, // Not merged
          },
        ],
      });

      const result = await githubClient.getMergedPRsInTimeWindow(repos);

      expect(result).toEqual([]);
    });

    it('should return PRs merged in the last 24 hours', async () => {
      const repos: RepoConfig[] = [{ owner: 'octocat', repo: 'hello-world' }];
      const now = new Date();
      const recentMerge = new Date(now.getTime() - 12 * 60 * 60 * 1000); // 12 hours ago

      mockOctokit.pulls.list.mockResolvedValue({
        data: [
          {
            number: 123,
            title: 'Add amazing feature',
            user: { login: 'alice', avatar_url: 'https://avatar.com/alice' },
            html_url: 'https://github.com/octocat/hello-world/pull/123',
            merged_at: recentMerge.toISOString(),
          },
        ],
      });

      const result = await githubClient.getMergedPRsInTimeWindow(repos);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        title: 'Add amazing feature',
        number: 123,
        author: 'alice',
        authorAvatar: 'https://avatar.com/alice',
        url: 'https://github.com/octocat/hello-world/pull/123',
        mergedAt: recentMerge.toISOString(),
        repository: 'octocat/hello-world',
      });
    });

    it('should filter out PRs merged more than 24 hours ago', async () => {
      const repos: RepoConfig[] = [{ owner: 'octocat', repo: 'hello-world' }];
      const now = new Date();
      const recentMerge = new Date(now.getTime() - 12 * 60 * 60 * 1000); // 12 hours ago
      const oldMerge = new Date(now.getTime() - 48 * 60 * 60 * 1000); // 48 hours ago

      mockOctokit.pulls.list.mockResolvedValue({
        data: [
          {
            number: 123,
            title: 'Recent PR',
            user: { login: 'alice', avatar_url: 'https://avatar.com/alice' },
            html_url: 'https://github.com/octocat/hello-world/pull/123',
            merged_at: recentMerge.toISOString(),
          },
          {
            number: 122,
            title: 'Old PR',
            user: { login: 'bob', avatar_url: 'https://avatar.com/bob' },
            html_url: 'https://github.com/octocat/hello-world/pull/122',
            merged_at: oldMerge.toISOString(),
          },
        ],
      });

      const result = await githubClient.getMergedPRsInTimeWindow(repos);

      expect(result).toHaveLength(1);
      expect(result[0].number).toBe(123);
      expect(result[0].title).toBe('Recent PR');
    });

    it('should handle multiple repositories', async () => {
      const repos: RepoConfig[] = [
        { owner: 'octocat', repo: 'hello-world' },
        { owner: 'microsoft', repo: 'vscode' },
      ];
      const now = new Date();
      const merge1 = new Date(now.getTime() - 12 * 60 * 60 * 1000); // 12 hours ago
      const merge2 = new Date(now.getTime() - 6 * 60 * 60 * 1000); // 6 hours ago (more recent)

      mockOctokit.pulls.list
        .mockResolvedValueOnce({
          data: [
            {
              number: 123,
              title: 'PR from repo 1',
              user: { login: 'alice', avatar_url: 'https://avatar.com/alice' },
              html_url: 'https://github.com/octocat/hello-world/pull/123',
              merged_at: merge1.toISOString(),
            },
          ],
        })
        .mockResolvedValueOnce({
          data: [
            {
              number: 456,
              title: 'PR from repo 2',
              user: { login: 'bob', avatar_url: 'https://avatar.com/bob' },
              html_url: 'https://github.com/microsoft/vscode/pull/456',
              merged_at: merge2.toISOString(),
            },
          ],
        });

      const result = await githubClient.getMergedPRsInTimeWindow(repos);

      expect(result).toHaveLength(2);
      expect(result[0].repository).toBe('microsoft/vscode'); // More recent, appears first
      expect(result[1].repository).toBe('octocat/hello-world');
    });

    it('should sort PRs by merged date (most recent first)', async () => {
      const repos: RepoConfig[] = [{ owner: 'octocat', repo: 'hello-world' }];
      const now = new Date();
      const merge1 = new Date(now.getTime() - 6 * 60 * 60 * 1000); // 6 hours ago
      const merge2 = new Date(now.getTime() - 12 * 60 * 60 * 1000); // 12 hours ago
      const merge3 = new Date(now.getTime() - 2 * 60 * 60 * 1000); // 2 hours ago

      mockOctokit.pulls.list.mockResolvedValue({
        data: [
          {
            number: 122,
            title: 'Second oldest',
            user: { login: 'alice', avatar_url: 'https://avatar.com/alice' },
            html_url: 'https://github.com/octocat/hello-world/pull/122',
            merged_at: merge1.toISOString(),
          },
          {
            number: 121,
            title: 'Oldest',
            user: { login: 'bob', avatar_url: 'https://avatar.com/bob' },
            html_url: 'https://github.com/octocat/hello-world/pull/121',
            merged_at: merge2.toISOString(),
          },
          {
            number: 123,
            title: 'Newest',
            user: { login: 'charlie', avatar_url: 'https://avatar.com/charlie' },
            html_url: 'https://github.com/octocat/hello-world/pull/123',
            merged_at: merge3.toISOString(),
          },
        ],
      });

      const result = await githubClient.getMergedPRsInTimeWindow(repos);

      expect(result).toHaveLength(3);
      expect(result[0].number).toBe(123); // Newest first
      expect(result[1].number).toBe(122);
      expect(result[2].number).toBe(121); // Oldest last
    });

    it('should handle missing user information gracefully', async () => {
      const repos: RepoConfig[] = [{ owner: 'octocat', repo: 'hello-world' }];
      const now = new Date();
      const recentMerge = new Date(now.getTime() - 12 * 60 * 60 * 1000);

      mockOctokit.pulls.list.mockResolvedValue({
        data: [
          {
            number: 123,
            title: 'PR without user',
            user: null,
            html_url: 'https://github.com/octocat/hello-world/pull/123',
            merged_at: recentMerge.toISOString(),
          },
        ],
      });

      const result = await githubClient.getMergedPRsInTimeWindow(repos);

      expect(result).toHaveLength(1);
      expect(result[0].author).toBe('Unknown');
      expect(result[0].authorAvatar).toBe('');
    });

    it('should handle API errors gracefully and continue with other repos', async () => {
      const repos: RepoConfig[] = [
        { owner: 'octocat', repo: 'hello-world' },
        { owner: 'microsoft', repo: 'vscode' },
      ];
      const now = new Date();
      const recentMerge = new Date(now.getTime() - 12 * 60 * 60 * 1000);

      // Mock console.error to suppress error output
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      mockOctokit.pulls.list
        .mockRejectedValueOnce(new Error('API Error'))
        .mockResolvedValueOnce({
          data: [
            {
              number: 456,
              title: 'PR from repo 2',
              user: { login: 'bob', avatar_url: 'https://avatar.com/bob' },
              html_url: 'https://github.com/microsoft/vscode/pull/456',
              merged_at: recentMerge.toISOString(),
            },
          ],
        });

      const result = await githubClient.getMergedPRsInTimeWindow(repos);

      expect(result).toHaveLength(1);
      expect(result[0].repository).toBe('microsoft/vscode');
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error fetching PRs for octocat/hello-world:',
        expect.any(Error)
      );

      consoleErrorSpy.mockRestore();
    });

    it('should respect custom merge window parameter', async () => {
      const repos: RepoConfig[] = [{ owner: 'octocat', repo: 'hello-world' }];
      const now = new Date();
      const mergeAt6Hours = new Date(now.getTime() - 6 * 60 * 60 * 1000); // 6 hours ago
      const mergeAt15Hours = new Date(now.getTime() - 15 * 60 * 60 * 1000); // 15 hours ago

      mockOctokit.pulls.list.mockResolvedValue({
        data: [
          {
            number: 123,
            title: 'Recent PR (6 hours ago)',
            user: { login: 'alice', avatar_url: 'https://avatar.com/alice' },
            html_url: 'https://github.com/octocat/hello-world/pull/123',
            merged_at: mergeAt6Hours.toISOString(),
          },
          {
            number: 122,
            title: 'Older PR (15 hours ago)',
            user: { login: 'bob', avatar_url: 'https://avatar.com/bob' },
            html_url: 'https://github.com/octocat/hello-world/pull/122',
            merged_at: mergeAt15Hours.toISOString(),
          },
        ],
      });

      // With 12 hour window, should only get the 6 hour old PR
      const result = await githubClient.getMergedPRsInTimeWindow(repos, 12);

      expect(result).toHaveLength(1);
      expect(result[0].number).toBe(123);
      expect(result[0].title).toBe('Recent PR (6 hours ago)');
    });

    it('should default to 24 hours when no window is specified', async () => {
      const repos: RepoConfig[] = [{ owner: 'octocat', repo: 'hello-world' }];
      const now = new Date();
      const merge20HoursAgo = new Date(now.getTime() - 20 * 60 * 60 * 1000);
      const merge30HoursAgo = new Date(now.getTime() - 30 * 60 * 60 * 1000);

      mockOctokit.pulls.list.mockResolvedValue({
        data: [
          {
            number: 123,
            title: 'Within 24 hours',
            user: { login: 'alice', avatar_url: 'https://avatar.com/alice' },
            html_url: 'https://github.com/octocat/hello-world/pull/123',
            merged_at: merge20HoursAgo.toISOString(),
          },
          {
            number: 122,
            title: 'Outside 24 hours',
            user: { login: 'bob', avatar_url: 'https://avatar.com/bob' },
            html_url: 'https://github.com/octocat/hello-world/pull/122',
            merged_at: merge30HoursAgo.toISOString(),
          },
        ],
      });

      // Call without specifying hours, should default to 24
      const result = await githubClient.getMergedPRsInTimeWindow(repos);

      expect(result).toHaveLength(1);
      expect(result[0].number).toBe(123);
    });
  });
});

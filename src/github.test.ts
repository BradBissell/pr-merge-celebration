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
        paginate: {
          iterator: vi.fn(),
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

      mockOctokit.paginate.iterator.mockImplementation(async function* () {
        yield { data: [] };
      });

      const result = await githubClient.getMergedPRsInTimeWindow(repos);

      expect(result).toEqual([]);
    });

    it('should filter out PRs without merged_at timestamp', async () => {
      const repos: RepoConfig[] = [{ owner: 'octocat', repo: 'hello-world' }];

      mockOctokit.paginate.iterator.mockImplementation(async function* () {
        yield {
          data: [
            {
              number: 1,
              title: 'Closed but not merged',
              user: { login: 'user1', avatar_url: 'https://avatar.com/user1' },
              html_url: 'https://github.com/octocat/hello-world/pull/1',
              merged_at: null, // Not merged
              updated_at: new Date().toISOString(),
            },
          ],
        };
      });

      const result = await githubClient.getMergedPRsInTimeWindow(repos);

      expect(result).toEqual([]);
    });

    it('should return PRs merged in the last 24 hours', async () => {
      const repos: RepoConfig[] = [{ owner: 'octocat', repo: 'hello-world' }];
      const now = new Date();
      const recentMerge = new Date(now.getTime() - 12 * 60 * 60 * 1000); // 12 hours ago

      mockOctokit.paginate.iterator.mockImplementation(async function* () {
        yield {
          data: [
            {
              number: 123,
              title: 'Add amazing feature',
              user: { login: 'alice', avatar_url: 'https://avatar.com/alice' },
              html_url: 'https://github.com/octocat/hello-world/pull/123',
              merged_at: recentMerge.toISOString(),
              updated_at: recentMerge.toISOString(),
            },
          ],
        };
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

      mockOctokit.paginate.iterator.mockImplementation(async function* () {
        yield {
          data: [
            {
              number: 123,
              title: 'Recent PR',
              user: { login: 'alice', avatar_url: 'https://avatar.com/alice' },
              html_url: 'https://github.com/octocat/hello-world/pull/123',
              merged_at: recentMerge.toISOString(),
              updated_at: recentMerge.toISOString(),
            },
            {
              number: 122,
              title: 'Old PR',
              user: { login: 'bob', avatar_url: 'https://avatar.com/bob' },
              html_url: 'https://github.com/octocat/hello-world/pull/122',
              merged_at: oldMerge.toISOString(),
              updated_at: oldMerge.toISOString(),
            },
          ],
        };
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

      let callCount = 0;
      mockOctokit.paginate.iterator.mockImplementation(async function* () {
        if (callCount === 0) {
          callCount++;
          yield {
            data: [
              {
                number: 123,
                title: 'PR from repo 1',
                user: { login: 'alice', avatar_url: 'https://avatar.com/alice' },
                html_url: 'https://github.com/octocat/hello-world/pull/123',
                merged_at: merge1.toISOString(),
                updated_at: merge1.toISOString(),
              },
            ],
          };
        } else {
          yield {
            data: [
              {
                number: 456,
                title: 'PR from repo 2',
                user: { login: 'bob', avatar_url: 'https://avatar.com/bob' },
                html_url: 'https://github.com/microsoft/vscode/pull/456',
                merged_at: merge2.toISOString(),
                updated_at: merge2.toISOString(),
              },
            ],
          };
        }
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

      mockOctokit.paginate.iterator.mockImplementation(async function* () {
        yield {
          data: [
            {
              number: 122,
              title: 'Second oldest',
              user: { login: 'alice', avatar_url: 'https://avatar.com/alice' },
              html_url: 'https://github.com/octocat/hello-world/pull/122',
              merged_at: merge1.toISOString(),
              updated_at: merge1.toISOString(),
            },
            {
              number: 121,
              title: 'Oldest',
              user: { login: 'bob', avatar_url: 'https://avatar.com/bob' },
              html_url: 'https://github.com/octocat/hello-world/pull/121',
              merged_at: merge2.toISOString(),
              updated_at: merge2.toISOString(),
            },
            {
              number: 123,
              title: 'Newest',
              user: { login: 'charlie', avatar_url: 'https://avatar.com/charlie' },
              html_url: 'https://github.com/octocat/hello-world/pull/123',
              merged_at: merge3.toISOString(),
              updated_at: merge3.toISOString(),
            },
          ],
        };
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

      mockOctokit.paginate.iterator.mockImplementation(async function* () {
        yield {
          data: [
            {
              number: 123,
              title: 'PR without user',
              user: null,
              html_url: 'https://github.com/octocat/hello-world/pull/123',
              merged_at: recentMerge.toISOString(),
              updated_at: recentMerge.toISOString(),
            },
          ],
        };
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

      let callCount = 0;
      mockOctokit.paginate.iterator.mockImplementation(async function* () {
        if (callCount === 0) {
          callCount++;
          throw new Error('API Error');
        } else {
          yield {
            data: [
              {
                number: 456,
                title: 'PR from repo 2',
                user: { login: 'bob', avatar_url: 'https://avatar.com/bob' },
                html_url: 'https://github.com/microsoft/vscode/pull/456',
                merged_at: recentMerge.toISOString(),
                updated_at: recentMerge.toISOString(),
              },
            ],
          };
        }
      });

      const result = await githubClient.getMergedPRsInTimeWindow(repos);

      expect(result).toHaveLength(1);
      expect(result[0].repository).toBe('microsoft/vscode');
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Error fetching PRs for octocat/hello-world:'),
        expect.any(Error)
      );

      consoleErrorSpy.mockRestore();
    });

    it('should respect custom merge window parameter', async () => {
      const repos: RepoConfig[] = [{ owner: 'octocat', repo: 'hello-world' }];
      const now = new Date();
      const mergeAt6Hours = new Date(now.getTime() - 6 * 60 * 60 * 1000); // 6 hours ago
      const mergeAt15Hours = new Date(now.getTime() - 15 * 60 * 60 * 1000); // 15 hours ago

      mockOctokit.paginate.iterator.mockImplementation(async function* () {
        yield {
          data: [
            {
              number: 123,
              title: 'Recent PR (6 hours ago)',
              user: { login: 'alice', avatar_url: 'https://avatar.com/alice' },
              html_url: 'https://github.com/octocat/hello-world/pull/123',
              merged_at: mergeAt6Hours.toISOString(),
              updated_at: mergeAt6Hours.toISOString(),
            },
            {
              number: 122,
              title: 'Older PR (15 hours ago)',
              user: { login: 'bob', avatar_url: 'https://avatar.com/bob' },
              html_url: 'https://github.com/octocat/hello-world/pull/122',
              merged_at: mergeAt15Hours.toISOString(),
              updated_at: mergeAt15Hours.toISOString(),
            },
          ],
        };
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

      mockOctokit.paginate.iterator.mockImplementation(async function* () {
        yield {
          data: [
            {
              number: 123,
              title: 'Within 24 hours',
              user: { login: 'alice', avatar_url: 'https://avatar.com/alice' },
              html_url: 'https://github.com/octocat/hello-world/pull/123',
              merged_at: merge20HoursAgo.toISOString(),
              updated_at: merge20HoursAgo.toISOString(),
            },
            {
              number: 122,
              title: 'Outside 24 hours',
              user: { login: 'bob', avatar_url: 'https://avatar.com/bob' },
              html_url: 'https://github.com/octocat/hello-world/pull/122',
              merged_at: merge30HoursAgo.toISOString(),
              updated_at: merge30HoursAgo.toISOString(),
            },
          ],
        };
      });

      // Call without specifying hours, should default to 24
      const result = await githubClient.getMergedPRsInTimeWindow(repos);

      expect(result).toHaveLength(1);
      expect(result[0].number).toBe(123);
    });
  });

  describe('pagination behavior', () => {
    it('should stop fetching after reaching safety limit of 1000 PRs', async () => {
      const repos: RepoConfig[] = [{ owner: 'octocat', repo: 'hello-world' }];
      const now = new Date();
      const recentMerge = new Date(now.getTime() - 12 * 60 * 60 * 1000);

      // Mock console.log to suppress output and verify safety limit message
      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      // Create a generator that yields many pages
      mockOctokit.paginate.iterator.mockImplementation(async function* () {
        // Yield 11 pages of 100 PRs each (1100 total)
        for (let page = 0; page < 11; page++) {
          const prs = Array.from({ length: 100 }, (_, i) => ({
            number: page * 100 + i,
            title: `PR ${page * 100 + i}`,
            user: { login: 'alice', avatar_url: 'https://avatar.com/alice' },
            html_url: `https://github.com/octocat/hello-world/pull/${page * 100 + i}`,
            merged_at: recentMerge.toISOString(),
            updated_at: recentMerge.toISOString(),
          }));
          yield { data: prs };
        }
      });

      const result = await githubClient.getMergedPRsInTimeWindow(repos);

      // Should stop at 1000 PRs, not fetch all 1100
      expect(result.length).toBeLessThanOrEqual(1000);

      // Verify the safety limit message was logged
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Reached safety limit of 1000 PRs')
      );

      consoleLogSpy.mockRestore();
    });

    it('should stop fetching when PRs become older than cutoff time', async () => {
      const repos: RepoConfig[] = [{ owner: 'octocat', repo: 'hello-world' }];
      const now = new Date();
      const recentTime = new Date(now.getTime() - 6 * 60 * 60 * 1000); // 6 hours ago
      const oldTime = new Date(now.getTime() - 30 * 60 * 60 * 1000); // 30 hours ago

      let pageCount = 0;
      mockOctokit.paginate.iterator.mockImplementation(async function* () {
        // First page: recent PRs
        pageCount++;
        yield {
          data: [
            {
              number: 1,
              title: 'Recent PR 1',
              user: { login: 'alice', avatar_url: 'https://avatar.com/alice' },
              html_url: 'https://github.com/octocat/hello-world/pull/1',
              merged_at: recentTime.toISOString(),
              updated_at: recentTime.toISOString(),
            },
          ],
        };

        // Second page: old PRs (should trigger early termination)
        pageCount++;
        yield {
          data: [
            {
              number: 2,
              title: 'Old PR',
              user: { login: 'bob', avatar_url: 'https://avatar.com/bob' },
              html_url: 'https://github.com/octocat/hello-world/pull/2',
              merged_at: oldTime.toISOString(),
              updated_at: oldTime.toISOString(),
            },
          ],
        };

        // Third page: should never be fetched due to early termination
        pageCount++;
        yield {
          data: [
            {
              number: 3,
              title: 'Even older PR',
              user: { login: 'charlie', avatar_url: 'https://avatar.com/charlie' },
              html_url: 'https://github.com/octocat/hello-world/pull/3',
              merged_at: oldTime.toISOString(),
              updated_at: oldTime.toISOString(),
            },
          ],
        };
      });

      const result = await githubClient.getMergedPRsInTimeWindow(repos, 24);

      // Should only return the recent PR, not the old ones
      expect(result).toHaveLength(1);
      expect(result[0].number).toBe(1);

      // Should have stopped after the second page (early termination)
      // Note: pageCount will be 2 because the generator stopped after page 2
      expect(pageCount).toBeLessThanOrEqual(2);
    });

    it('should handle multiple pages of recent PRs', async () => {
      const repos: RepoConfig[] = [{ owner: 'octocat', repo: 'hello-world' }];
      const now = new Date();
      const recentTime = new Date(now.getTime() - 12 * 60 * 60 * 1000);

      mockOctokit.paginate.iterator.mockImplementation(async function* () {
        // Page 1: 2 recent PRs
        yield {
          data: [
            {
              number: 1,
              title: 'PR 1',
              user: { login: 'alice', avatar_url: 'https://avatar.com/alice' },
              html_url: 'https://github.com/octocat/hello-world/pull/1',
              merged_at: recentTime.toISOString(),
              updated_at: recentTime.toISOString(),
            },
            {
              number: 2,
              title: 'PR 2',
              user: { login: 'bob', avatar_url: 'https://avatar.com/bob' },
              html_url: 'https://github.com/octocat/hello-world/pull/2',
              merged_at: recentTime.toISOString(),
              updated_at: recentTime.toISOString(),
            },
          ],
        };

        // Page 2: 2 more recent PRs
        yield {
          data: [
            {
              number: 3,
              title: 'PR 3',
              user: { login: 'charlie', avatar_url: 'https://avatar.com/charlie' },
              html_url: 'https://github.com/octocat/hello-world/pull/3',
              merged_at: recentTime.toISOString(),
              updated_at: recentTime.toISOString(),
            },
            {
              number: 4,
              title: 'PR 4',
              user: { login: 'david', avatar_url: 'https://avatar.com/david' },
              html_url: 'https://github.com/octocat/hello-world/pull/4',
              merged_at: recentTime.toISOString(),
              updated_at: recentTime.toISOString(),
            },
          ],
        };
      });

      const result = await githubClient.getMergedPRsInTimeWindow(repos);

      // Should get all 4 PRs from both pages
      expect(result).toHaveLength(4);
      expect(result.map((pr) => pr.number)).toEqual([1, 2, 3, 4]);
    });

    it('should handle empty pages gracefully', async () => {
      const repos: RepoConfig[] = [{ owner: 'octocat', repo: 'hello-world' }];

      mockOctokit.paginate.iterator.mockImplementation(async function* () {
        yield { data: [] };
      });

      const result = await githubClient.getMergedPRsInTimeWindow(repos);

      expect(result).toEqual([]);
    });

    it('should continue pagination when page has PRs within cutoff', async () => {
      const repos: RepoConfig[] = [{ owner: 'octocat', repo: 'hello-world' }];
      const now = new Date();
      const time20HoursAgo = new Date(now.getTime() - 20 * 60 * 60 * 1000);
      const time10HoursAgo = new Date(now.getTime() - 10 * 60 * 60 * 1000);

      mockOctokit.paginate.iterator.mockImplementation(async function* () {
        // Page 1: oldest PR is still within 24 hour window
        yield {
          data: [
            {
              number: 1,
              title: 'Recent PR',
              user: { login: 'alice', avatar_url: 'https://avatar.com/alice' },
              html_url: 'https://github.com/octocat/hello-world/pull/1',
              merged_at: time10HoursAgo.toISOString(),
              updated_at: time10HoursAgo.toISOString(),
            },
            {
              number: 2,
              title: 'Older but still within window',
              user: { login: 'bob', avatar_url: 'https://avatar.com/bob' },
              html_url: 'https://github.com/octocat/hello-world/pull/2',
              merged_at: time20HoursAgo.toISOString(),
              updated_at: time20HoursAgo.toISOString(),
            },
          ],
        };

        // Page 2: should be fetched because previous page's oldest was within window
        yield {
          data: [
            {
              number: 3,
              title: 'Another PR',
              user: { login: 'charlie', avatar_url: 'https://avatar.com/charlie' },
              html_url: 'https://github.com/octocat/hello-world/pull/3',
              merged_at: time10HoursAgo.toISOString(),
              updated_at: time10HoursAgo.toISOString(),
            },
          ],
        };
      });

      const result = await githubClient.getMergedPRsInTimeWindow(repos, 24);

      // Should get all 3 PRs from both pages
      expect(result).toHaveLength(3);
    });
  });
});

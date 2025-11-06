import { Octokit } from '@octokit/rest';
import { MergedPR, RepoConfig } from './types';

export class GitHubClient {
  private octokit: Octokit;

  constructor(token: string) {
    this.octokit = new Octokit({ auth: token });
  }

  async getMergedPRsInTimeWindow(repos: RepoConfig[], hoursBack: number = 24): Promise<MergedPR[]> {
    const allPRs: MergedPR[] = [];
    const cutoffTime = new Date();
    cutoffTime.setHours(cutoffTime.getHours() - hoursBack);

    for (const { owner, repo } of repos) {
      try {
        console.log(`Checking ${owner}/${repo} for merged PRs...`);

        // Fetch recently closed PRs
        const { data: pullRequests } = await this.octokit.pulls.list({
          owner,
          repo,
          state: 'closed',
          sort: 'updated',
          direction: 'desc',
          per_page: 100,
        });

        // Filter for merged PRs in the time window
        const mergedPRs = pullRequests.filter((pr) => {
          if (!pr.merged_at) return false;
          const mergedAt = new Date(pr.merged_at);
          return mergedAt >= cutoffTime;
        });

        console.log(`Found ${mergedPRs.length} merged PRs in ${owner}/${repo}`);

        // Map to our MergedPR type
        const formattedPRs: MergedPR[] = mergedPRs.map((pr) => ({
          title: pr.title,
          number: pr.number,
          author: pr.user?.login || 'Unknown',
          authorAvatar: pr.user?.avatar_url || '',
          url: pr.html_url,
          mergedAt: pr.merged_at!,
          repository: `${owner}/${repo}`,
        }));

        allPRs.push(...formattedPRs);
      } catch (error) {
        console.error(`Error fetching PRs for ${owner}/${repo}:`, error);
      }
    }

    // Sort by merged date (most recent first)
    allPRs.sort((a, b) => new Date(b.mergedAt).getTime() - new Date(a.mergedAt).getTime());

    return allPRs;
  }
}

"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GitHubClient = void 0;
const chalk_1 = __importDefault(require("chalk"));
const rest_1 = require("@octokit/rest");
class GitHubClient {
    constructor(token) {
        this.octokit = new rest_1.Octokit({ auth: token });
    }
    async getMergedPRsInTimeWindow(repos, hoursBack = 24) {
        const allPRs = [];
        const cutoffTime = new Date(Date.now() - hoursBack * 60 * 60 * 1000);
        for (const { owner, repo } of repos) {
            try {
                console.log(chalk_1.default.blue(`Checking ${chalk_1.default.bold(`${owner}/${repo}`)} for merged PRs...`));
                // Fetch all recently closed PRs with pagination
                const pullRequests = [];
                const iterator = this.octokit.paginate.iterator(this.octokit.pulls.list, {
                    owner,
                    repo,
                    state: 'closed',
                    sort: 'updated',
                    direction: 'desc',
                    per_page: 100,
                });
                // Iterate through pages until we find PRs older than our cutoff
                for await (const response of iterator) {
                    const prsInPage = response.data;
                    // Add PRs from this page
                    pullRequests.push(...prsInPage);
                    // If we've found a PR that was updated before our cutoff, we can stop
                    // (since PRs are sorted by update time descending)
                    const oldestUpdatedInPage = prsInPage[prsInPage.length - 1]?.updated_at;
                    if (oldestUpdatedInPage && new Date(oldestUpdatedInPage) < cutoffTime) {
                        break;
                    }
                    // Safety limit: stop after 10 pages (1000 PRs)
                    if (pullRequests.length >= 1000) {
                        console.log(chalk_1.default.yellow(`Reached safety limit of 1000 PRs for ${owner}/${repo}`));
                        break;
                    }
                }
                // Filter for merged PRs in the time window
                const mergedPRs = pullRequests.filter((pr) => {
                    if (!pr.merged_at)
                        return false;
                    const mergedAt = new Date(pr.merged_at);
                    return mergedAt >= cutoffTime;
                });
                console.log(chalk_1.default.green(`Found ${chalk_1.default.bold(mergedPRs.length.toString())} merged PRs in ${owner}/${repo}`));
                // Map to our MergedPR type
                const formattedPRs = mergedPRs.map((pr) => ({
                    title: pr.title,
                    number: pr.number,
                    author: pr.user?.login || 'Unknown',
                    authorAvatar: pr.user?.avatar_url || '',
                    url: pr.html_url,
                    mergedAt: pr.merged_at,
                    repository: `${owner}/${repo}`,
                }));
                allPRs.push(...formattedPRs);
            }
            catch (error) {
                console.error(chalk_1.default.red(`Error fetching PRs for ${owner}/${repo}:`), error);
            }
        }
        // Sort by merged date (most recent first)
        allPRs.sort((a, b) => new Date(b.mergedAt).getTime() - new Date(a.mergedAt).getTime());
        return allPRs;
    }
}
exports.GitHubClient = GitHubClient;

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getConfig = getConfig;
function getConfig() {
    const githubToken = process.env.GITHUB_TOKEN;
    const slackWebhookUrl = process.env.SLACK_WEBHOOK_URL;
    const reposToCheck = process.env.REPOS_TO_CHECK;
    const mergeWindow = process.env.MERGE_WINDOW || '24';
    if (!githubToken) {
        throw new Error('GITHUB_TOKEN environment variable is required');
    }
    if (!slackWebhookUrl) {
        throw new Error('SLACK_WEBHOOK_URL environment variable is required');
    }
    if (!slackWebhookUrl.startsWith('https://hooks.slack.com/')) {
        throw new Error('SLACK_WEBHOOK_URL must be a valid Slack webhook URL (should start with https://hooks.slack.com/)');
    }
    if (!reposToCheck) {
        throw new Error('REPOS_TO_CHECK environment variable is required (format: owner/repo,owner/repo)');
    }
    const mergeWindowHours = parseInt(mergeWindow, 10);
    if (isNaN(mergeWindowHours) || mergeWindowHours <= 0 || mergeWindowHours > 720) {
        throw new Error('MERGE_WINDOW must be a positive number between 1 and 720 hours (30 days)');
    }
    const repos = parseRepos(reposToCheck);
    return {
        githubToken,
        slackWebhookUrl,
        repos,
        mergeWindowHours,
    };
}
function parseRepos(reposString) {
    const repos = reposString
        .split(',')
        .map((repo) => repo.trim())
        .filter((repo) => repo.length > 0);
    return repos.map((repo) => {
        const [owner, name] = repo.split('/');
        if (!owner || !name) {
            throw new Error(`Invalid repo format: ${repo}. Expected format: owner/repo`);
        }
        return { owner, repo: name };
    });
}

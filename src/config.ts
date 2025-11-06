import { RepoConfig } from './types';

export function getConfig() {
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

  if (!reposToCheck) {
    throw new Error('REPOS_TO_CHECK environment variable is required (format: owner/repo,owner/repo)');
  }

  const mergeWindowHours = parseInt(mergeWindow, 10);
  if (isNaN(mergeWindowHours) || mergeWindowHours <= 0) {
    throw new Error('MERGE_WINDOW must be a positive number');
  }

  const repos = parseRepos(reposToCheck);

  return {
    githubToken,
    slackWebhookUrl,
    repos,
    mergeWindowHours,
  };
}

function parseRepos(reposString: string): RepoConfig[] {
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

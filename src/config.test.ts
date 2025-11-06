import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getConfig } from './config';

describe('getConfig', () => {
  beforeEach(() => {
    // Clear all environment variables before each test
    delete process.env.GITHUB_TOKEN;
    delete process.env.SLACK_WEBHOOK_URL;
    delete process.env.REPOS_TO_CHECK;
    delete process.env.MERGE_WINDOW;
  });

  it('should throw error when GITHUB_TOKEN is missing', () => {
    process.env.SLACK_WEBHOOK_URL = 'https://hooks.slack.com/test';
    process.env.REPOS_TO_CHECK = 'owner/repo';

    expect(() => getConfig()).toThrow('GITHUB_TOKEN environment variable is required');
  });

  it('should throw error when SLACK_WEBHOOK_URL is missing', () => {
    process.env.GITHUB_TOKEN = 'ghp_token123';
    process.env.REPOS_TO_CHECK = 'owner/repo';

    expect(() => getConfig()).toThrow('SLACK_WEBHOOK_URL environment variable is required');
  });

  it('should throw error when REPOS_TO_CHECK is missing', () => {
    process.env.GITHUB_TOKEN = 'ghp_token123';
    process.env.SLACK_WEBHOOK_URL = 'https://hooks.slack.com/test';

    expect(() => getConfig()).toThrow(
      'REPOS_TO_CHECK environment variable is required (format: owner/repo,owner/repo)'
    );
  });

  it('should parse single repository correctly', () => {
    process.env.GITHUB_TOKEN = 'ghp_token123';
    process.env.SLACK_WEBHOOK_URL = 'https://hooks.slack.com/test';
    process.env.REPOS_TO_CHECK = 'octocat/hello-world';

    const config = getConfig();

    expect(config.githubToken).toBe('ghp_token123');
    expect(config.slackWebhookUrl).toBe('https://hooks.slack.com/test');
    expect(config.repos).toEqual([{ owner: 'octocat', repo: 'hello-world' }]);
    expect(config.mergeWindowHours).toBe(24); // Default value
  });

  it('should parse multiple repositories correctly', () => {
    process.env.GITHUB_TOKEN = 'ghp_token123';
    process.env.SLACK_WEBHOOK_URL = 'https://hooks.slack.com/test';
    process.env.REPOS_TO_CHECK = 'octocat/hello-world,microsoft/vscode,facebook/react';

    const config = getConfig();

    expect(config.repos).toEqual([
      { owner: 'octocat', repo: 'hello-world' },
      { owner: 'microsoft', repo: 'vscode' },
      { owner: 'facebook', repo: 'react' },
    ]);
  });

  it('should handle whitespace in repository list', () => {
    process.env.GITHUB_TOKEN = 'ghp_token123';
    process.env.SLACK_WEBHOOK_URL = 'https://hooks.slack.com/test';
    process.env.REPOS_TO_CHECK = ' octocat/hello-world , microsoft/vscode ';

    const config = getConfig();

    expect(config.repos).toEqual([
      { owner: 'octocat', repo: 'hello-world' },
      { owner: 'microsoft', repo: 'vscode' },
    ]);
  });

  it('should filter out empty repository strings', () => {
    process.env.GITHUB_TOKEN = 'ghp_token123';
    process.env.SLACK_WEBHOOK_URL = 'https://hooks.slack.com/test';
    process.env.REPOS_TO_CHECK = 'octocat/hello-world,,microsoft/vscode';

    const config = getConfig();

    expect(config.repos).toEqual([
      { owner: 'octocat', repo: 'hello-world' },
      { owner: 'microsoft', repo: 'vscode' },
    ]);
  });

  it('should throw error for invalid repository format (missing slash)', () => {
    process.env.GITHUB_TOKEN = 'ghp_token123';
    process.env.SLACK_WEBHOOK_URL = 'https://hooks.slack.com/test';
    process.env.REPOS_TO_CHECK = 'invalid-repo';

    expect(() => getConfig()).toThrow('Invalid repo format: invalid-repo. Expected format: owner/repo');
  });

  it('should throw error for invalid repository format (only owner)', () => {
    process.env.GITHUB_TOKEN = 'ghp_token123';
    process.env.SLACK_WEBHOOK_URL = 'https://hooks.slack.com/test';
    process.env.REPOS_TO_CHECK = 'octocat/';

    expect(() => getConfig()).toThrow('Invalid repo format: octocat/. Expected format: owner/repo');
  });

  it('should throw error for invalid repository format (only repo)', () => {
    process.env.GITHUB_TOKEN = 'ghp_token123';
    process.env.SLACK_WEBHOOK_URL = 'https://hooks.slack.com/test';
    process.env.REPOS_TO_CHECK = '/hello-world';

    expect(() => getConfig()).toThrow('Invalid repo format: /hello-world. Expected format: owner/repo');
  });

  it('should use default merge window of 24 hours when not specified', () => {
    process.env.GITHUB_TOKEN = 'ghp_token123';
    process.env.SLACK_WEBHOOK_URL = 'https://hooks.slack.com/test';
    process.env.REPOS_TO_CHECK = 'octocat/hello-world';

    const config = getConfig();

    expect(config.mergeWindowHours).toBe(24);
  });

  it('should use custom merge window when specified', () => {
    process.env.GITHUB_TOKEN = 'ghp_token123';
    process.env.SLACK_WEBHOOK_URL = 'https://hooks.slack.com/test';
    process.env.REPOS_TO_CHECK = 'octocat/hello-world';
    process.env.MERGE_WINDOW = '12';

    const config = getConfig();

    expect(config.mergeWindowHours).toBe(12);
  });

  it('should throw error for invalid merge window (not a number)', () => {
    process.env.GITHUB_TOKEN = 'ghp_token123';
    process.env.SLACK_WEBHOOK_URL = 'https://hooks.slack.com/test';
    process.env.REPOS_TO_CHECK = 'octocat/hello-world';
    process.env.MERGE_WINDOW = 'invalid';

    expect(() => getConfig()).toThrow('MERGE_WINDOW must be a positive number between 1 and 720 hours (30 days)');
  });

  it('should throw error for negative merge window', () => {
    process.env.GITHUB_TOKEN = 'ghp_token123';
    process.env.SLACK_WEBHOOK_URL = 'https://hooks.slack.com/test';
    process.env.REPOS_TO_CHECK = 'octocat/hello-world';
    process.env.MERGE_WINDOW = '-5';

    expect(() => getConfig()).toThrow('MERGE_WINDOW must be a positive number between 1 and 720 hours (30 days)');
  });

  it('should throw error for zero merge window', () => {
    process.env.GITHUB_TOKEN = 'ghp_token123';
    process.env.SLACK_WEBHOOK_URL = 'https://hooks.slack.com/test';
    process.env.REPOS_TO_CHECK = 'octocat/hello-world';
    process.env.MERGE_WINDOW = '0';

    expect(() => getConfig()).toThrow('MERGE_WINDOW must be a positive number between 1 and 720 hours (30 days)');
  });

  it('should throw error for merge window exceeding 720 hours', () => {
    process.env.GITHUB_TOKEN = 'ghp_token123';
    process.env.SLACK_WEBHOOK_URL = 'https://hooks.slack.com/test';
    process.env.REPOS_TO_CHECK = 'octocat/hello-world';
    process.env.MERGE_WINDOW = '721';

    expect(() => getConfig()).toThrow('MERGE_WINDOW must be a positive number between 1 and 720 hours (30 days)');
  });

  it('should accept merge window at maximum bound (720 hours)', () => {
    process.env.GITHUB_TOKEN = 'ghp_token123';
    process.env.SLACK_WEBHOOK_URL = 'https://hooks.slack.com/test';
    process.env.REPOS_TO_CHECK = 'octocat/hello-world';
    process.env.MERGE_WINDOW = '720';

    const config = getConfig();

    expect(config.mergeWindowHours).toBe(720);
  });
});

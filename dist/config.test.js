"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const config_1 = require("./config");
(0, vitest_1.describe)('getConfig', () => {
    (0, vitest_1.beforeEach)(() => {
        // Clear all environment variables before each test
        delete process.env.GITHUB_TOKEN;
        delete process.env.SLACK_WEBHOOK_URL;
        delete process.env.REPOS_TO_CHECK;
        delete process.env.MERGE_WINDOW;
    });
    (0, vitest_1.it)('should throw error when GITHUB_TOKEN is missing', () => {
        process.env.SLACK_WEBHOOK_URL = 'https://hooks.slack.com/test';
        process.env.REPOS_TO_CHECK = 'owner/repo';
        (0, vitest_1.expect)(() => (0, config_1.getConfig)()).toThrow('GITHUB_TOKEN environment variable is required');
    });
    (0, vitest_1.it)('should throw error when SLACK_WEBHOOK_URL is missing', () => {
        process.env.GITHUB_TOKEN = 'ghp_token123';
        process.env.REPOS_TO_CHECK = 'owner/repo';
        (0, vitest_1.expect)(() => (0, config_1.getConfig)()).toThrow('SLACK_WEBHOOK_URL environment variable is required');
    });
    (0, vitest_1.it)('should throw error when SLACK_WEBHOOK_URL is invalid format', () => {
        process.env.GITHUB_TOKEN = 'ghp_token123';
        process.env.SLACK_WEBHOOK_URL = 'https://example.com/webhook';
        process.env.REPOS_TO_CHECK = 'owner/repo';
        (0, vitest_1.expect)(() => (0, config_1.getConfig)()).toThrow('SLACK_WEBHOOK_URL must be a valid Slack webhook URL (should start with https://hooks.slack.com/)');
    });
    (0, vitest_1.it)('should accept valid Slack webhook URL', () => {
        process.env.GITHUB_TOKEN = 'ghp_token123';
        process.env.SLACK_WEBHOOK_URL = 'https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXX';
        process.env.REPOS_TO_CHECK = 'owner/repo';
        const config = (0, config_1.getConfig)();
        (0, vitest_1.expect)(config.slackWebhookUrl).toBe('https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXX');
    });
    (0, vitest_1.describe)('Slack webhook URL validation edge cases', () => {
        (0, vitest_1.it)('should reject http:// URLs (only https:// allowed)', () => {
            process.env.GITHUB_TOKEN = 'ghp_token123';
            process.env.SLACK_WEBHOOK_URL = 'http://hooks.slack.com/services/T/B/X';
            process.env.REPOS_TO_CHECK = 'owner/repo';
            (0, vitest_1.expect)(() => (0, config_1.getConfig)()).toThrow('SLACK_WEBHOOK_URL must be a valid Slack webhook URL (should start with https://hooks.slack.com/)');
        });
        (0, vitest_1.it)('should reject URL with wrong subdomain', () => {
            process.env.GITHUB_TOKEN = 'ghp_token123';
            process.env.SLACK_WEBHOOK_URL = 'https://api.slack.com/webhook';
            process.env.REPOS_TO_CHECK = 'owner/repo';
            (0, vitest_1.expect)(() => (0, config_1.getConfig)()).toThrow('SLACK_WEBHOOK_URL must be a valid Slack webhook URL (should start with https://hooks.slack.com/)');
        });
        (0, vitest_1.it)('should reject URL without proper prefix', () => {
            process.env.GITHUB_TOKEN = 'ghp_token123';
            process.env.SLACK_WEBHOOK_URL = 'https://slack.com/hooks/services/T/B/X';
            process.env.REPOS_TO_CHECK = 'owner/repo';
            (0, vitest_1.expect)(() => (0, config_1.getConfig)()).toThrow('SLACK_WEBHOOK_URL must be a valid Slack webhook URL (should start with https://hooks.slack.com/)');
        });
        (0, vitest_1.it)('should accept Slack webhook URL with trailing slash', () => {
            process.env.GITHUB_TOKEN = 'ghp_token123';
            process.env.SLACK_WEBHOOK_URL = 'https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXX/';
            process.env.REPOS_TO_CHECK = 'owner/repo';
            const config = (0, config_1.getConfig)();
            (0, vitest_1.expect)(config.slackWebhookUrl).toBe('https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXX/');
        });
        (0, vitest_1.it)('should accept Slack webhook URL with query parameters', () => {
            process.env.GITHUB_TOKEN = 'ghp_token123';
            process.env.SLACK_WEBHOOK_URL = 'https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXX?foo=bar';
            process.env.REPOS_TO_CHECK = 'owner/repo';
            const config = (0, config_1.getConfig)();
            (0, vitest_1.expect)(config.slackWebhookUrl).toBe('https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXX?foo=bar');
        });
        (0, vitest_1.it)('should accept short Slack webhook URL format', () => {
            process.env.GITHUB_TOKEN = 'ghp_token123';
            process.env.SLACK_WEBHOOK_URL = 'https://hooks.slack.com/test';
            process.env.REPOS_TO_CHECK = 'owner/repo';
            const config = (0, config_1.getConfig)();
            (0, vitest_1.expect)(config.slackWebhookUrl).toBe('https://hooks.slack.com/test');
        });
        (0, vitest_1.it)('should reject empty string as webhook URL', () => {
            process.env.GITHUB_TOKEN = 'ghp_token123';
            process.env.SLACK_WEBHOOK_URL = '';
            process.env.REPOS_TO_CHECK = 'owner/repo';
            (0, vitest_1.expect)(() => (0, config_1.getConfig)()).toThrow('SLACK_WEBHOOK_URL environment variable is required');
        });
        (0, vitest_1.it)('should reject URL with typo in domain', () => {
            process.env.GITHUB_TOKEN = 'ghp_token123';
            process.env.SLACK_WEBHOOK_URL = 'https://hooks.slak.com/services/T/B/X';
            process.env.REPOS_TO_CHECK = 'owner/repo';
            (0, vitest_1.expect)(() => (0, config_1.getConfig)()).toThrow('SLACK_WEBHOOK_URL must be a valid Slack webhook URL (should start with https://hooks.slack.com/)');
        });
    });
    (0, vitest_1.it)('should throw error when REPOS_TO_CHECK is missing', () => {
        process.env.GITHUB_TOKEN = 'ghp_token123';
        process.env.SLACK_WEBHOOK_URL = 'https://hooks.slack.com/test';
        (0, vitest_1.expect)(() => (0, config_1.getConfig)()).toThrow('REPOS_TO_CHECK environment variable is required (format: owner/repo,owner/repo)');
    });
    (0, vitest_1.it)('should parse single repository correctly', () => {
        process.env.GITHUB_TOKEN = 'ghp_token123';
        process.env.SLACK_WEBHOOK_URL = 'https://hooks.slack.com/test';
        process.env.REPOS_TO_CHECK = 'octocat/hello-world';
        const config = (0, config_1.getConfig)();
        (0, vitest_1.expect)(config.githubToken).toBe('ghp_token123');
        (0, vitest_1.expect)(config.slackWebhookUrl).toBe('https://hooks.slack.com/test');
        (0, vitest_1.expect)(config.repos).toEqual([{ owner: 'octocat', repo: 'hello-world' }]);
        (0, vitest_1.expect)(config.mergeWindowHours).toBe(24); // Default value
    });
    (0, vitest_1.it)('should parse multiple repositories correctly', () => {
        process.env.GITHUB_TOKEN = 'ghp_token123';
        process.env.SLACK_WEBHOOK_URL = 'https://hooks.slack.com/test';
        process.env.REPOS_TO_CHECK = 'octocat/hello-world,microsoft/vscode,facebook/react';
        const config = (0, config_1.getConfig)();
        (0, vitest_1.expect)(config.repos).toEqual([
            { owner: 'octocat', repo: 'hello-world' },
            { owner: 'microsoft', repo: 'vscode' },
            { owner: 'facebook', repo: 'react' },
        ]);
    });
    (0, vitest_1.it)('should handle whitespace in repository list', () => {
        process.env.GITHUB_TOKEN = 'ghp_token123';
        process.env.SLACK_WEBHOOK_URL = 'https://hooks.slack.com/test';
        process.env.REPOS_TO_CHECK = ' octocat/hello-world , microsoft/vscode ';
        const config = (0, config_1.getConfig)();
        (0, vitest_1.expect)(config.repos).toEqual([
            { owner: 'octocat', repo: 'hello-world' },
            { owner: 'microsoft', repo: 'vscode' },
        ]);
    });
    (0, vitest_1.it)('should filter out empty repository strings', () => {
        process.env.GITHUB_TOKEN = 'ghp_token123';
        process.env.SLACK_WEBHOOK_URL = 'https://hooks.slack.com/test';
        process.env.REPOS_TO_CHECK = 'octocat/hello-world,,microsoft/vscode';
        const config = (0, config_1.getConfig)();
        (0, vitest_1.expect)(config.repos).toEqual([
            { owner: 'octocat', repo: 'hello-world' },
            { owner: 'microsoft', repo: 'vscode' },
        ]);
    });
    (0, vitest_1.it)('should throw error for invalid repository format (missing slash)', () => {
        process.env.GITHUB_TOKEN = 'ghp_token123';
        process.env.SLACK_WEBHOOK_URL = 'https://hooks.slack.com/test';
        process.env.REPOS_TO_CHECK = 'invalid-repo';
        (0, vitest_1.expect)(() => (0, config_1.getConfig)()).toThrow('Invalid repo format: invalid-repo. Expected format: owner/repo');
    });
    (0, vitest_1.it)('should throw error for invalid repository format (only owner)', () => {
        process.env.GITHUB_TOKEN = 'ghp_token123';
        process.env.SLACK_WEBHOOK_URL = 'https://hooks.slack.com/test';
        process.env.REPOS_TO_CHECK = 'octocat/';
        (0, vitest_1.expect)(() => (0, config_1.getConfig)()).toThrow('Invalid repo format: octocat/. Expected format: owner/repo');
    });
    (0, vitest_1.it)('should throw error for invalid repository format (only repo)', () => {
        process.env.GITHUB_TOKEN = 'ghp_token123';
        process.env.SLACK_WEBHOOK_URL = 'https://hooks.slack.com/test';
        process.env.REPOS_TO_CHECK = '/hello-world';
        (0, vitest_1.expect)(() => (0, config_1.getConfig)()).toThrow('Invalid repo format: /hello-world. Expected format: owner/repo');
    });
    (0, vitest_1.it)('should use default merge window of 24 hours when not specified', () => {
        process.env.GITHUB_TOKEN = 'ghp_token123';
        process.env.SLACK_WEBHOOK_URL = 'https://hooks.slack.com/test';
        process.env.REPOS_TO_CHECK = 'octocat/hello-world';
        const config = (0, config_1.getConfig)();
        (0, vitest_1.expect)(config.mergeWindowHours).toBe(24);
    });
    (0, vitest_1.it)('should use custom merge window when specified', () => {
        process.env.GITHUB_TOKEN = 'ghp_token123';
        process.env.SLACK_WEBHOOK_URL = 'https://hooks.slack.com/test';
        process.env.REPOS_TO_CHECK = 'octocat/hello-world';
        process.env.MERGE_WINDOW = '12';
        const config = (0, config_1.getConfig)();
        (0, vitest_1.expect)(config.mergeWindowHours).toBe(12);
    });
    (0, vitest_1.it)('should throw error for invalid merge window (not a number)', () => {
        process.env.GITHUB_TOKEN = 'ghp_token123';
        process.env.SLACK_WEBHOOK_URL = 'https://hooks.slack.com/test';
        process.env.REPOS_TO_CHECK = 'octocat/hello-world';
        process.env.MERGE_WINDOW = 'invalid';
        (0, vitest_1.expect)(() => (0, config_1.getConfig)()).toThrow('MERGE_WINDOW must be a positive number between 1 and 720 hours (30 days)');
    });
    (0, vitest_1.it)('should throw error for negative merge window', () => {
        process.env.GITHUB_TOKEN = 'ghp_token123';
        process.env.SLACK_WEBHOOK_URL = 'https://hooks.slack.com/test';
        process.env.REPOS_TO_CHECK = 'octocat/hello-world';
        process.env.MERGE_WINDOW = '-5';
        (0, vitest_1.expect)(() => (0, config_1.getConfig)()).toThrow('MERGE_WINDOW must be a positive number between 1 and 720 hours (30 days)');
    });
    (0, vitest_1.it)('should throw error for zero merge window', () => {
        process.env.GITHUB_TOKEN = 'ghp_token123';
        process.env.SLACK_WEBHOOK_URL = 'https://hooks.slack.com/test';
        process.env.REPOS_TO_CHECK = 'octocat/hello-world';
        process.env.MERGE_WINDOW = '0';
        (0, vitest_1.expect)(() => (0, config_1.getConfig)()).toThrow('MERGE_WINDOW must be a positive number between 1 and 720 hours (30 days)');
    });
    (0, vitest_1.it)('should throw error for merge window exceeding 720 hours', () => {
        process.env.GITHUB_TOKEN = 'ghp_token123';
        process.env.SLACK_WEBHOOK_URL = 'https://hooks.slack.com/test';
        process.env.REPOS_TO_CHECK = 'octocat/hello-world';
        process.env.MERGE_WINDOW = '721';
        (0, vitest_1.expect)(() => (0, config_1.getConfig)()).toThrow('MERGE_WINDOW must be a positive number between 1 and 720 hours (30 days)');
    });
    (0, vitest_1.it)('should accept merge window at maximum bound (720 hours)', () => {
        process.env.GITHUB_TOKEN = 'ghp_token123';
        process.env.SLACK_WEBHOOK_URL = 'https://hooks.slack.com/test';
        process.env.REPOS_TO_CHECK = 'octocat/hello-world';
        process.env.MERGE_WINDOW = '720';
        const config = (0, config_1.getConfig)();
        (0, vitest_1.expect)(config.mergeWindowHours).toBe(720);
    });
});

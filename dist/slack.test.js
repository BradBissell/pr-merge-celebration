"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const axios_1 = __importDefault(require("axios"));
const slack_1 = require("./slack");
// Mock axios
vitest_1.vi.mock('axios');
// Mock chalk to return plain strings without ANSI codes
vitest_1.vi.mock('chalk', () => ({
    default: {
        yellow: (str) => str,
        green: (str) => str,
        red: (str) => str,
        bold: (str) => str,
    },
}));
(0, vitest_1.describe)('SlackNotifier', () => {
    let slackNotifier;
    const mockWebhookUrl = 'https://hooks.slack.com/services/test';
    const defaultMergeWindowHours = 24;
    (0, vitest_1.beforeEach)(() => {
        vitest_1.vi.clearAllMocks();
        slackNotifier = new slack_1.SlackNotifier(mockWebhookUrl, defaultMergeWindowHours);
    });
    (0, vitest_1.describe)('sendCelebration', () => {
        (0, vitest_1.it)('should not send message when there are no PRs', async () => {
            const consoleLogSpy = vitest_1.vi.spyOn(console, 'log').mockImplementation(() => { });
            await slackNotifier.sendCelebration([]);
            (0, vitest_1.expect)(axios_1.default.post).not.toHaveBeenCalled();
            (0, vitest_1.expect)(consoleLogSpy).toHaveBeenCalledWith('No merged PRs found - skipping Slack notification');
            consoleLogSpy.mockRestore();
        });
        (0, vitest_1.it)('should send celebration message for single PR', async () => {
            const prs = [
                {
                    title: 'Add amazing feature',
                    number: 123,
                    author: 'alice',
                    authorAvatar: 'https://avatar.com/alice',
                    url: 'https://github.com/octocat/hello-world/pull/123',
                    mergedAt: '2024-01-01T12:00:00Z',
                    repository: 'octocat/hello-world',
                },
            ];
            axios_1.default.post.mockResolvedValue({ status: 200 });
            await slackNotifier.sendCelebration(prs);
            (0, vitest_1.expect)(axios_1.default.post).toHaveBeenCalledWith(mockWebhookUrl, vitest_1.expect.any(Object));
            const sentMessage = axios_1.default.post.mock.calls[0][1];
            (0, vitest_1.expect)(sentMessage.blocks).toBeDefined();
            (0, vitest_1.expect)(sentMessage.blocks.length).toBeGreaterThan(0);
        });
        (0, vitest_1.it)('should send celebration message for multiple PRs', async () => {
            const prs = [
                {
                    title: 'Add feature A',
                    number: 123,
                    author: 'alice',
                    authorAvatar: 'https://avatar.com/alice',
                    url: 'https://github.com/octocat/hello-world/pull/123',
                    mergedAt: '2024-01-01T12:00:00Z',
                    repository: 'octocat/hello-world',
                },
                {
                    title: 'Fix bug B',
                    number: 124,
                    author: 'bob',
                    authorAvatar: 'https://avatar.com/bob',
                    url: 'https://github.com/octocat/hello-world/pull/124',
                    mergedAt: '2024-01-01T13:00:00Z',
                    repository: 'octocat/hello-world',
                },
            ];
            axios_1.default.post.mockResolvedValue({ status: 200 });
            await slackNotifier.sendCelebration(prs);
            (0, vitest_1.expect)(axios_1.default.post).toHaveBeenCalledWith(mockWebhookUrl, vitest_1.expect.any(Object));
        });
        (0, vitest_1.it)('should group PRs by repository', async () => {
            const prs = [
                {
                    title: 'PR from repo 1',
                    number: 123,
                    author: 'alice',
                    authorAvatar: 'https://avatar.com/alice',
                    url: 'https://github.com/octocat/hello-world/pull/123',
                    mergedAt: '2024-01-01T12:00:00Z',
                    repository: 'octocat/hello-world',
                },
                {
                    title: 'PR from repo 2',
                    number: 456,
                    author: 'bob',
                    authorAvatar: 'https://avatar.com/bob',
                    url: 'https://github.com/microsoft/vscode/pull/456',
                    mergedAt: '2024-01-01T13:00:00Z',
                    repository: 'microsoft/vscode',
                },
                {
                    title: 'Another PR from repo 1',
                    number: 124,
                    author: 'charlie',
                    authorAvatar: 'https://avatar.com/charlie',
                    url: 'https://github.com/octocat/hello-world/pull/124',
                    mergedAt: '2024-01-01T14:00:00Z',
                    repository: 'octocat/hello-world',
                },
            ];
            axios_1.default.post.mockResolvedValue({ status: 200 });
            await slackNotifier.sendCelebration(prs);
            const sentMessage = axios_1.default.post.mock.calls[0][1];
            const blocks = sentMessage.blocks;
            // Find sections with repository headers
            const repoSections = blocks.filter((block) => block.type === 'section' && block.text?.text?.includes('📦'));
            (0, vitest_1.expect)(repoSections.length).toBe(2); // Two different repositories
        });
        (0, vitest_1.it)('should include correct contributor count', async () => {
            const prs = [
                {
                    title: 'PR 1',
                    number: 123,
                    author: 'alice',
                    authorAvatar: 'https://avatar.com/alice',
                    url: 'https://github.com/octocat/hello-world/pull/123',
                    mergedAt: '2024-01-01T12:00:00Z',
                    repository: 'octocat/hello-world',
                },
                {
                    title: 'PR 2',
                    number: 124,
                    author: 'bob',
                    authorAvatar: 'https://avatar.com/bob',
                    url: 'https://github.com/octocat/hello-world/pull/124',
                    mergedAt: '2024-01-01T13:00:00Z',
                    repository: 'octocat/hello-world',
                },
                {
                    title: 'PR 3',
                    number: 125,
                    author: 'alice', // Same author as PR 1
                    authorAvatar: 'https://avatar.com/alice',
                    url: 'https://github.com/octocat/hello-world/pull/125',
                    mergedAt: '2024-01-01T14:00:00Z',
                    repository: 'octocat/hello-world',
                },
            ];
            axios_1.default.post.mockResolvedValue({ status: 200 });
            await slackNotifier.sendCelebration(prs);
            const sentMessage = axios_1.default.post.mock.calls[0][1];
            const summaryBlock = sentMessage.blocks.find((block) => block.type === 'section' && block.text?.text?.includes('contributor'));
            (0, vitest_1.expect)(summaryBlock.text.text).toContain('*3* awesome PRs');
            (0, vitest_1.expect)(summaryBlock.text.text).toContain('*2* contributors'); // alice and bob
        });
        (0, vitest_1.it)('should use singular form for single PR and contributor', async () => {
            const prs = [
                {
                    title: 'Single PR',
                    number: 123,
                    author: 'alice',
                    authorAvatar: 'https://avatar.com/alice',
                    url: 'https://github.com/octocat/hello-world/pull/123',
                    mergedAt: '2024-01-01T12:00:00Z',
                    repository: 'octocat/hello-world',
                },
            ];
            axios_1.default.post.mockResolvedValue({ status: 200 });
            await slackNotifier.sendCelebration(prs);
            const sentMessage = axios_1.default.post.mock.calls[0][1];
            const summaryBlock = sentMessage.blocks.find((block) => block.type === 'section' && block.text?.text?.includes('contributor'));
            (0, vitest_1.expect)(summaryBlock.text.text).toContain('*1* awesome PR merged');
            (0, vitest_1.expect)(summaryBlock.text.text).toContain('*1* contributor!');
        });
        (0, vitest_1.it)('should include PR details in message', async () => {
            const prs = [
                {
                    title: 'Add amazing feature',
                    number: 123,
                    author: 'alice',
                    authorAvatar: 'https://avatar.com/alice',
                    url: 'https://github.com/octocat/hello-world/pull/123',
                    mergedAt: '2024-01-01T12:00:00Z',
                    repository: 'octocat/hello-world',
                },
            ];
            axios_1.default.post.mockResolvedValue({ status: 200 });
            await slackNotifier.sendCelebration(prs);
            const sentMessage = axios_1.default.post.mock.calls[0][1];
            const prSections = sentMessage.blocks.filter((block) => block.type === 'section' && block.text?.text?.includes('#123'));
            (0, vitest_1.expect)(prSections.length).toBeGreaterThan(0);
            const prBlock = prSections[0];
            (0, vitest_1.expect)(prBlock.text.text).toContain('🔀');
            (0, vitest_1.expect)(prBlock.text.text).toContain('Add amazing feature');
            (0, vitest_1.expect)(prBlock.text.text).toContain('👤 @alice');
            (0, vitest_1.expect)(prBlock.text.text).toContain('https://github.com/octocat/hello-world/pull/123');
        });
        (0, vitest_1.it)('should include header with random emoji and message', async () => {
            const prs = [
                {
                    title: 'Test PR',
                    number: 123,
                    author: 'alice',
                    authorAvatar: 'https://avatar.com/alice',
                    url: 'https://github.com/octocat/hello-world/pull/123',
                    mergedAt: '2024-01-01T12:00:00Z',
                    repository: 'octocat/hello-world',
                },
            ];
            axios_1.default.post.mockResolvedValue({ status: 200 });
            await slackNotifier.sendCelebration(prs);
            const sentMessage = axios_1.default.post.mock.calls[0][1];
            const headerBlock = sentMessage.blocks.find((block) => block.type === 'header');
            (0, vitest_1.expect)(headerBlock).toBeDefined();
            (0, vitest_1.expect)(headerBlock.text.text).toBeTruthy();
        });
        (0, vitest_1.it)('should include footer with encouraging message', async () => {
            const prs = [
                {
                    title: 'Test PR',
                    number: 123,
                    author: 'alice',
                    authorAvatar: 'https://avatar.com/alice',
                    url: 'https://github.com/octocat/hello-world/pull/123',
                    mergedAt: '2024-01-01T12:00:00Z',
                    repository: 'octocat/hello-world',
                },
            ];
            axios_1.default.post.mockResolvedValue({ status: 200 });
            await slackNotifier.sendCelebration(prs);
            const sentMessage = axios_1.default.post.mock.calls[0][1];
            const contextBlock = sentMessage.blocks.find((block) => block.type === 'context');
            (0, vitest_1.expect)(contextBlock).toBeDefined();
            (0, vitest_1.expect)(contextBlock.elements[0].text).toContain('Amazing work everyone! Keep shipping!');
        });
        (0, vitest_1.it)('should throw error when Slack API fails', async () => {
            const prs = [
                {
                    title: 'Test PR',
                    number: 123,
                    author: 'alice',
                    authorAvatar: 'https://avatar.com/alice',
                    url: 'https://github.com/octocat/hello-world/pull/123',
                    mergedAt: '2024-01-01T12:00:00Z',
                    repository: 'octocat/hello-world',
                },
            ];
            const error = new Error('Slack API Error');
            axios_1.default.post.mockRejectedValue(error);
            const consoleErrorSpy = vitest_1.vi.spyOn(console, 'error').mockImplementation(() => { });
            await (0, vitest_1.expect)(slackNotifier.sendCelebration(prs)).rejects.toThrow('Slack API Error');
            (0, vitest_1.expect)(consoleErrorSpy).toHaveBeenCalledWith('Error sending message to Slack:', error);
            consoleErrorSpy.mockRestore();
        });
        (0, vitest_1.it)('should log success message when celebration is sent', async () => {
            const prs = [
                {
                    title: 'Test PR',
                    number: 123,
                    author: 'alice',
                    authorAvatar: 'https://avatar.com/alice',
                    url: 'https://github.com/octocat/hello-world/pull/123',
                    mergedAt: '2024-01-01T12:00:00Z',
                    repository: 'octocat/hello-world',
                },
            ];
            axios_1.default.post.mockResolvedValue({ status: 200 });
            const consoleLogSpy = vitest_1.vi.spyOn(console, 'log').mockImplementation(() => { });
            await slackNotifier.sendCelebration(prs);
            (0, vitest_1.expect)(consoleLogSpy).toHaveBeenCalledWith('Successfully sent celebration for 1 PRs to Slack (incoming webhook)!');
            consoleLogSpy.mockRestore();
        });
        (0, vitest_1.it)('should use configured merge window hours in message', async () => {
            const customMergeWindow = 12;
            const customNotifier = new slack_1.SlackNotifier(mockWebhookUrl, customMergeWindow);
            const prs = [
                {
                    title: 'Test PR',
                    number: 123,
                    author: 'alice',
                    authorAvatar: 'https://avatar.com/alice',
                    url: 'https://github.com/octocat/hello-world/pull/123',
                    mergedAt: '2024-01-01T12:00:00Z',
                    repository: 'octocat/hello-world',
                },
            ];
            axios_1.default.post.mockResolvedValue({ status: 200 });
            await customNotifier.sendCelebration(prs);
            const sentMessage = axios_1.default.post.mock.calls[0][1];
            const summaryBlock = sentMessage.blocks.find((block) => block.type === 'section' && block.text?.text?.includes('merged in the last'));
            (0, vitest_1.expect)(summaryBlock.text.text).toContain('merged in the last 12 hours');
        });
        (0, vitest_1.it)('should use singular hour when merge window is 1', async () => {
            const singleHourNotifier = new slack_1.SlackNotifier(mockWebhookUrl, 1);
            const prs = [
                {
                    title: 'Test PR',
                    number: 123,
                    author: 'alice',
                    authorAvatar: 'https://avatar.com/alice',
                    url: 'https://github.com/octocat/hello-world/pull/123',
                    mergedAt: '2024-01-01T12:00:00Z',
                    repository: 'octocat/hello-world',
                },
            ];
            axios_1.default.post.mockResolvedValue({ status: 200 });
            await singleHourNotifier.sendCelebration(prs);
            const sentMessage = axios_1.default.post.mock.calls[0][1];
            const summaryBlock = sentMessage.blocks.find((block) => block.type === 'section' && block.text?.text?.includes('merged in the last'));
            (0, vitest_1.expect)(summaryBlock.text.text).toContain('merged in the last 1 hour by');
        });
    });
    (0, vitest_1.describe)('groupPRsByRepo (via integration)', () => {
        (0, vitest_1.it)('should correctly group multiple PRs from the same repository', async () => {
            const prs = [
                {
                    title: 'PR 1',
                    number: 123,
                    author: 'alice',
                    authorAvatar: 'https://avatar.com/alice',
                    url: 'https://github.com/octocat/hello-world/pull/123',
                    mergedAt: '2024-01-01T12:00:00Z',
                    repository: 'octocat/hello-world',
                },
                {
                    title: 'PR 2',
                    number: 124,
                    author: 'bob',
                    authorAvatar: 'https://avatar.com/bob',
                    url: 'https://github.com/octocat/hello-world/pull/124',
                    mergedAt: '2024-01-01T13:00:00Z',
                    repository: 'octocat/hello-world',
                },
            ];
            axios_1.default.post.mockResolvedValue({ status: 200 });
            await slackNotifier.sendCelebration(prs);
            const sentMessage = axios_1.default.post.mock.calls[0][1];
            const prSections = sentMessage.blocks.filter((block) => block.type === 'section' && (block.text?.text?.includes('#123') || block.text?.text?.includes('#124')));
            (0, vitest_1.expect)(prSections.length).toBe(2);
        });
    });
    (0, vitest_1.describe)('Webhook type detection and formatting', () => {
        (0, vitest_1.it)('should detect incoming webhook from URL and send Block Kit format', async () => {
            const incomingWebhookUrl = 'https://hooks.slack.com/services/T00000000/B00000000/XXXX';
            const notifier = new slack_1.SlackNotifier(incomingWebhookUrl);
            const prs = [
                {
                    title: 'Test PR',
                    number: 123,
                    author: 'alice',
                    authorAvatar: 'https://avatar.com/alice',
                    url: 'https://github.com/octocat/hello-world/pull/123',
                    mergedAt: '2024-01-01T12:00:00Z',
                    repository: 'octocat/hello-world',
                },
            ];
            axios_1.default.post.mockResolvedValue({ status: 200 });
            const consoleLogSpy = vitest_1.vi.spyOn(console, 'log').mockImplementation(() => { });
            await notifier.sendCelebration(prs);
            const sentMessage = axios_1.default.post.mock.calls[0][1];
            (0, vitest_1.expect)(sentMessage).toHaveProperty('blocks');
            (0, vitest_1.expect)(Array.isArray(sentMessage.blocks)).toBe(true);
            (0, vitest_1.expect)(consoleLogSpy).toHaveBeenCalledWith(vitest_1.expect.stringContaining('incoming webhook'));
            consoleLogSpy.mockRestore();
        });
        (0, vitest_1.it)('should detect workflow webhook from URL with /workflows/ and send simple text format', async () => {
            const workflowWebhookUrl = 'https://hooks.slack.com/workflows/T00000000/A00000000/XXXX';
            const notifier = new slack_1.SlackNotifier(workflowWebhookUrl);
            const prs = [
                {
                    title: 'Test PR',
                    number: 123,
                    author: 'alice',
                    authorAvatar: 'https://avatar.com/alice',
                    url: 'https://github.com/octocat/hello-world/pull/123',
                    mergedAt: '2024-01-01T12:00:00Z',
                    repository: 'octocat/hello-world',
                },
            ];
            axios_1.default.post.mockResolvedValue({ status: 200 });
            const consoleLogSpy = vitest_1.vi.spyOn(console, 'log').mockImplementation(() => { });
            await notifier.sendCelebration(prs);
            const sentMessage = axios_1.default.post.mock.calls[0][1];
            (0, vitest_1.expect)(sentMessage).toHaveProperty('message');
            (0, vitest_1.expect)(typeof sentMessage.message).toBe('string');
            (0, vitest_1.expect)(sentMessage.message).toContain('🔀');
            (0, vitest_1.expect)(sentMessage.message).toContain('Test PR');
            (0, vitest_1.expect)(sentMessage.message).toContain('👤 @alice');
            (0, vitest_1.expect)(sentMessage.message).toContain('https://github.com/octocat/hello-world/pull/123');
            (0, vitest_1.expect)(consoleLogSpy).toHaveBeenCalledWith(vitest_1.expect.stringContaining('workflow webhook'));
            consoleLogSpy.mockRestore();
        });
        (0, vitest_1.it)('should detect workflow webhook from URL with /triggers/ and send simple text format', async () => {
            const triggerWebhookUrl = 'https://hooks.slack.com/triggers/T00000000/1234567890/XXXX';
            const notifier = new slack_1.SlackNotifier(triggerWebhookUrl);
            const prs = [
                {
                    title: 'Fix bug',
                    number: 456,
                    author: 'bob',
                    authorAvatar: 'https://avatar.com/bob',
                    url: 'https://github.com/microsoft/vscode/pull/456',
                    mergedAt: '2024-01-01T14:00:00Z',
                    repository: 'microsoft/vscode',
                },
            ];
            axios_1.default.post.mockResolvedValue({ status: 200 });
            await notifier.sendCelebration(prs);
            const sentMessage = axios_1.default.post.mock.calls[0][1];
            (0, vitest_1.expect)(sentMessage).toHaveProperty('message');
            (0, vitest_1.expect)(typeof sentMessage.message).toBe('string');
            (0, vitest_1.expect)(sentMessage.message).toContain('🔀');
            (0, vitest_1.expect)(sentMessage.message).toContain('Fix bug');
            (0, vitest_1.expect)(sentMessage.message).toContain('👤 @bob');
        });
        (0, vitest_1.it)('should include all PR details in workflow webhook text message', async () => {
            const workflowWebhookUrl = 'https://hooks.slack.com/workflows/T00000000/A00000000/XXXX';
            const notifier = new slack_1.SlackNotifier(workflowWebhookUrl, 48);
            const prs = [
                {
                    title: 'Add feature A',
                    number: 100,
                    author: 'alice',
                    authorAvatar: 'https://avatar.com/alice',
                    url: 'https://github.com/org/repo1/pull/100',
                    mergedAt: '2024-01-01T12:00:00Z',
                    repository: 'org/repo1',
                },
                {
                    title: 'Fix bug B',
                    number: 200,
                    author: 'bob',
                    authorAvatar: 'https://avatar.com/bob',
                    url: 'https://github.com/org/repo2/pull/200',
                    mergedAt: '2024-01-01T14:00:00Z',
                    repository: 'org/repo2',
                },
            ];
            axios_1.default.post.mockResolvedValue({ status: 200 });
            await notifier.sendCelebration(prs);
            const sentMessage = axios_1.default.post.mock.calls[0][1];
            // Check header is present
            (0, vitest_1.expect)(sentMessage.message).toMatch(/[🎉🚀✨🎊🎈🌟💫🔥]/);
            // Check summary with counts
            (0, vitest_1.expect)(sentMessage.message).toContain('*2* awesome PR');
            (0, vitest_1.expect)(sentMessage.message).toContain('48 hours');
            (0, vitest_1.expect)(sentMessage.message).toContain('*2* contributor');
            // Check repo grouping
            (0, vitest_1.expect)(sentMessage.message).toContain('📦 org/repo1');
            (0, vitest_1.expect)(sentMessage.message).toContain('📦 org/repo2');
            // Check PR details
            (0, vitest_1.expect)(sentMessage.message).toContain('🔀 #100: Add feature A');
            (0, vitest_1.expect)(sentMessage.message).toContain('https://github.com/org/repo1/pull/100');
            (0, vitest_1.expect)(sentMessage.message).toContain('👤 @alice');
            (0, vitest_1.expect)(sentMessage.message).toContain('🔀 #200: Fix bug B');
            (0, vitest_1.expect)(sentMessage.message).toContain('https://github.com/org/repo2/pull/200');
            (0, vitest_1.expect)(sentMessage.message).toContain('👤 @bob');
            // Check footer
            (0, vitest_1.expect)(sentMessage.message).toContain('🙌 Amazing work everyone! Keep shipping! 🙌');
        });
    });
});

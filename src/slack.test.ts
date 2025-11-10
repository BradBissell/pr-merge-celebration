import { describe, it, expect, beforeEach, vi } from 'vitest';
import axios from 'axios';
import { SlackNotifier } from './slack';
import { MergedPR } from './types';

// Mock axios
vi.mock('axios');

// Mock chalk to return plain strings without ANSI codes
vi.mock('chalk', () => ({
  default: {
    yellow: (str: string) => str,
    green: (str: string) => str,
    red: (str: string) => str,
    bold: (str: string) => str,
  },
}));

describe('SlackNotifier', () => {
  let slackNotifier: SlackNotifier;
  const mockWebhookUrl = 'https://hooks.slack.com/services/test';
  const defaultMergeWindowHours = 24;

  beforeEach(() => {
    vi.clearAllMocks();
    slackNotifier = new SlackNotifier(mockWebhookUrl, defaultMergeWindowHours);
  });

  describe('sendCelebration', () => {
    it('should not send message when there are no PRs', async () => {
      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      await slackNotifier.sendCelebration([]);

      expect(axios.post).not.toHaveBeenCalled();
      expect(consoleLogSpy).toHaveBeenCalledWith('No merged PRs found - skipping Slack notification');

      consoleLogSpy.mockRestore();
    });

    it('should send celebration message for single PR', async () => {
      const prs: MergedPR[] = [
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

      (axios.post as any).mockResolvedValue({ status: 200 });

      await slackNotifier.sendCelebration(prs);

      expect(axios.post).toHaveBeenCalledWith(mockWebhookUrl, expect.any(Object));

      const sentMessage = (axios.post as any).mock.calls[0][1];
      expect(sentMessage.blocks).toBeDefined();
      expect(sentMessage.blocks.length).toBeGreaterThan(0);
    });

    it('should send celebration message for multiple PRs', async () => {
      const prs: MergedPR[] = [
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

      (axios.post as any).mockResolvedValue({ status: 200 });

      await slackNotifier.sendCelebration(prs);

      expect(axios.post).toHaveBeenCalledWith(mockWebhookUrl, expect.any(Object));
    });

    it('should group PRs by repository', async () => {
      const prs: MergedPR[] = [
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

      (axios.post as any).mockResolvedValue({ status: 200 });

      await slackNotifier.sendCelebration(prs);

      const sentMessage = (axios.post as any).mock.calls[0][1];
      const blocks = sentMessage.blocks;

      // Find sections with repository headers
      const repoSections = blocks.filter(
        (block: any) => block.type === 'section' && block.text?.text?.includes('📦')
      );

      expect(repoSections.length).toBe(2); // Two different repositories
    });

    it('should include correct contributor count', async () => {
      const prs: MergedPR[] = [
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

      (axios.post as any).mockResolvedValue({ status: 200 });

      await slackNotifier.sendCelebration(prs);

      const sentMessage = (axios.post as any).mock.calls[0][1];
      const summaryBlock = sentMessage.blocks.find(
        (block: any) => block.type === 'section' && block.text?.text?.includes('contributor')
      );

      expect(summaryBlock.text.text).toContain('*3* awesome PRs');
      expect(summaryBlock.text.text).toContain('*2* contributors'); // alice and bob
    });

    it('should use singular form for single PR and contributor', async () => {
      const prs: MergedPR[] = [
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

      (axios.post as any).mockResolvedValue({ status: 200 });

      await slackNotifier.sendCelebration(prs);

      const sentMessage = (axios.post as any).mock.calls[0][1];
      const summaryBlock = sentMessage.blocks.find(
        (block: any) => block.type === 'section' && block.text?.text?.includes('contributor')
      );

      expect(summaryBlock.text.text).toContain('*1* awesome PR merged');
      expect(summaryBlock.text.text).toContain('*1* contributor!');
    });

    it('should include PR details in message', async () => {
      const prs: MergedPR[] = [
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

      (axios.post as any).mockResolvedValue({ status: 200 });

      await slackNotifier.sendCelebration(prs);

      const sentMessage = (axios.post as any).mock.calls[0][1];
      const prSections = sentMessage.blocks.filter(
        (block: any) => block.type === 'section' && block.text?.text?.includes('#123')
      );

      expect(prSections.length).toBeGreaterThan(0);
      const prBlock = prSections[0];
      expect(prBlock.text.text).toContain('Add amazing feature');
      expect(prBlock.text.text).toContain('@alice');
      expect(prBlock.text.text).toContain('https://github.com/octocat/hello-world/pull/123');
    });

    it('should include header with random emoji and message', async () => {
      const prs: MergedPR[] = [
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

      (axios.post as any).mockResolvedValue({ status: 200 });

      await slackNotifier.sendCelebration(prs);

      const sentMessage = (axios.post as any).mock.calls[0][1];
      const headerBlock = sentMessage.blocks.find((block: any) => block.type === 'header');

      expect(headerBlock).toBeDefined();
      expect(headerBlock.text.text).toBeTruthy();
    });

    it('should include footer with encouraging message', async () => {
      const prs: MergedPR[] = [
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

      (axios.post as any).mockResolvedValue({ status: 200 });

      await slackNotifier.sendCelebration(prs);

      const sentMessage = (axios.post as any).mock.calls[0][1];
      const contextBlock = sentMessage.blocks.find((block: any) => block.type === 'context');

      expect(contextBlock).toBeDefined();
      expect(contextBlock.elements[0].text).toContain('Amazing work everyone! Keep shipping!');
    });

    it('should throw error when Slack API fails', async () => {
      const prs: MergedPR[] = [
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
      (axios.post as any).mockRejectedValue(error);

      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      await expect(slackNotifier.sendCelebration(prs)).rejects.toThrow('Slack API Error');

      expect(consoleErrorSpy).toHaveBeenCalledWith('Error sending message to Slack:', error);

      consoleErrorSpy.mockRestore();
    });

    it('should log success message when celebration is sent', async () => {
      const prs: MergedPR[] = [
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

      (axios.post as any).mockResolvedValue({ status: 200 });

      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      await slackNotifier.sendCelebration(prs);

      expect(consoleLogSpy).toHaveBeenCalledWith('Successfully sent celebration for 1 PRs to Slack (incoming webhook)!');

      consoleLogSpy.mockRestore();
    });

    it('should use configured merge window hours in message', async () => {
      const customMergeWindow = 12;
      const customNotifier = new SlackNotifier(mockWebhookUrl, customMergeWindow);
      const prs: MergedPR[] = [
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

      (axios.post as any).mockResolvedValue({ status: 200 });

      await customNotifier.sendCelebration(prs);

      const sentMessage = (axios.post as any).mock.calls[0][1];
      const summaryBlock = sentMessage.blocks.find(
        (block: any) => block.type === 'section' && block.text?.text?.includes('merged in the last')
      );

      expect(summaryBlock.text.text).toContain('merged in the last 12 hours');
    });

    it('should use singular hour when merge window is 1', async () => {
      const singleHourNotifier = new SlackNotifier(mockWebhookUrl, 1);
      const prs: MergedPR[] = [
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

      (axios.post as any).mockResolvedValue({ status: 200 });

      await singleHourNotifier.sendCelebration(prs);

      const sentMessage = (axios.post as any).mock.calls[0][1];
      const summaryBlock = sentMessage.blocks.find(
        (block: any) => block.type === 'section' && block.text?.text?.includes('merged in the last')
      );

      expect(summaryBlock.text.text).toContain('merged in the last 1 hour by');
    });
  });

  describe('groupPRsByRepo (via integration)', () => {
    it('should correctly group multiple PRs from the same repository', async () => {
      const prs: MergedPR[] = [
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

      (axios.post as any).mockResolvedValue({ status: 200 });

      await slackNotifier.sendCelebration(prs);

      const sentMessage = (axios.post as any).mock.calls[0][1];
      const prSections = sentMessage.blocks.filter(
        (block: any) =>
          block.type === 'section' && (block.text?.text?.includes('#123') || block.text?.text?.includes('#124'))
      );

      expect(prSections.length).toBe(2);
    });
  });

  describe('Webhook type detection and formatting', () => {
    it('should detect incoming webhook from URL and send Block Kit format', async () => {
      const incomingWebhookUrl = 'https://hooks.slack.com/services/T00000000/B00000000/XXXX';
      const notifier = new SlackNotifier(incomingWebhookUrl);
      const prs: MergedPR[] = [
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

      (axios.post as any).mockResolvedValue({ status: 200 });
      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      await notifier.sendCelebration(prs);

      const sentMessage = (axios.post as any).mock.calls[0][1];
      expect(sentMessage).toHaveProperty('blocks');
      expect(Array.isArray(sentMessage.blocks)).toBe(true);
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('incoming webhook')
      );

      consoleLogSpy.mockRestore();
    });

    it('should detect workflow webhook from URL with /workflows/ and send simple text format', async () => {
      const workflowWebhookUrl = 'https://hooks.slack.com/workflows/T00000000/A00000000/XXXX';
      const notifier = new SlackNotifier(workflowWebhookUrl);
      const prs: MergedPR[] = [
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

      (axios.post as any).mockResolvedValue({ status: 200 });
      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      await notifier.sendCelebration(prs);

      const sentMessage = (axios.post as any).mock.calls[0][1];
      expect(sentMessage).toHaveProperty('message');
      expect(typeof sentMessage.message).toBe('string');
      expect(sentMessage.message).toContain('Test PR');
      expect(sentMessage.message).toContain('@alice');
      expect(sentMessage.message).toContain('https://github.com/octocat/hello-world/pull/123');
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('workflow webhook')
      );

      consoleLogSpy.mockRestore();
    });

    it('should detect workflow webhook from URL with /triggers/ and send simple text format', async () => {
      const triggerWebhookUrl = 'https://hooks.slack.com/triggers/T00000000/1234567890/XXXX';
      const notifier = new SlackNotifier(triggerWebhookUrl);
      const prs: MergedPR[] = [
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

      (axios.post as any).mockResolvedValue({ status: 200 });

      await notifier.sendCelebration(prs);

      const sentMessage = (axios.post as any).mock.calls[0][1];
      expect(sentMessage).toHaveProperty('message');
      expect(typeof sentMessage.message).toBe('string');
      expect(sentMessage.message).toContain('Fix bug');
      expect(sentMessage.message).toContain('@bob');
    });

    it('should include all PR details in workflow webhook text message', async () => {
      const workflowWebhookUrl = 'https://hooks.slack.com/workflows/T00000000/A00000000/XXXX';
      const notifier = new SlackNotifier(workflowWebhookUrl, 48);
      const prs: MergedPR[] = [
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

      (axios.post as any).mockResolvedValue({ status: 200 });

      await notifier.sendCelebration(prs);

      const sentMessage = (axios.post as any).mock.calls[0][1];

      // Check header is present
      expect(sentMessage.message).toMatch(/[🎉🚀✨🎊🎈🌟💫🔥]/);

      // Check summary with counts
      expect(sentMessage.message).toContain('*2* awesome PR');
      expect(sentMessage.message).toContain('48 hours');
      expect(sentMessage.message).toContain('*2* contributor');

      // Check repo grouping
      expect(sentMessage.message).toContain('📦 *org/repo1*');
      expect(sentMessage.message).toContain('📦 *org/repo2*');

      // Check PR details
      expect(sentMessage.message).toContain('#100: Add feature A');
      expect(sentMessage.message).toContain('https://github.com/org/repo1/pull/100');
      expect(sentMessage.message).toContain('_by @alice_');

      expect(sentMessage.message).toContain('#200: Fix bug B');
      expect(sentMessage.message).toContain('https://github.com/org/repo2/pull/200');
      expect(sentMessage.message).toContain('_by @bob_');

      // Check footer
      expect(sentMessage.message).toContain('🙌 Amazing work everyone! Keep shipping! 🙌');
    });
  });
});

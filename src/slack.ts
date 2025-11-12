import chalk from "chalk";
import axios from "axios";
import {
  MergedPR,
  SlackMessage,
  SlackBlock,
  WebhookType,
  SlackBlockMessage,
  SlackWorkflowMessage,
} from "./types";

export class SlackNotifier {
  private webhookUrl: string;
  private mergeWindowHours: number;

  constructor(webhookUrl: string, mergeWindowHours: number = 24) {
    this.webhookUrl = webhookUrl;
    this.mergeWindowHours = mergeWindowHours;
  }

  /**
   * Detect webhook type from URL pattern
   * Incoming Webhooks: https://hooks.slack.com/services/...
   * Workflow Webhooks: https://hooks.slack.com/workflows/... or https://hooks.slack.com/triggers/...
   */
  private detectWebhookType(): WebhookType {
    if (
      this.webhookUrl.includes("/workflows/") ||
      this.webhookUrl.includes("/triggers/")
    ) {
      return WebhookType.WORKFLOW;
    }
    return WebhookType.INCOMING;
  }

  async sendCelebration(prs: MergedPR[]): Promise<void> {
    if (prs.length === 0) {
      console.log(
        chalk.yellow("No merged PRs found - skipping Slack notification")
      );
      return;
    }

    const webhookType = this.detectWebhookType();
    const message =
      webhookType === WebhookType.WORKFLOW
        ? this.buildSimpleTextMessage(prs)
        : this.buildCelebrationMessage(prs);

    try {
      await axios.post(this.webhookUrl, message);
      const formatType =
        webhookType === WebhookType.WORKFLOW
          ? "workflow webhook"
          : "incoming webhook";
      console.log(
        chalk.green(
          `Successfully sent celebration for ${chalk.bold(
            prs.length.toString()
          )} PRs to Slack (${formatType})!`
        )
      );
    } catch (error) {
      console.error(chalk.red("Error sending message to Slack:"), error);
      throw error;
    }
  }

  /**
   * Get day-specific celebration header
   */
  private getDayHeader(): string {
    const dayOfWeek = new Date().getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
    const headers: Record<number, string> = {
      1: "Monday Merge Magic!",
      2: "Turbo Tuesday!",
      3: "Winning Wednesday!",
      4: "Throwdown Thursday!",
      5: "Fantastic Friday!",
    };
    // Default for weekends or if not Mon-Fri
    return headers[dayOfWeek] || "Time to Celebrate!";
  }

  /**
   * Build a simple text message for Slack Workflow Webhooks
   * Workflow webhooks only support plain text in the format: {"message": "text"}
   */
  private buildSimpleTextMessage(prs: MergedPR[]): SlackWorkflowMessage {
    const uniqueAuthors = new Set(prs.map((pr) => pr.author));
    const repoGroups = this.groupPRsByRepo(prs);

    const celebrationEmojis = ["🎉", "🚀", "✨", "🎊", "🎈", "🌟", "💫", "🔥"];
    const randomEmoji =
      celebrationEmojis[Math.floor(Math.random() * celebrationEmojis.length)];

    const headerText = this.getDayHeader();

    // Build the text message with nice formatting
    let message = `${randomEmoji} ${headerText} ${randomEmoji}\n\n`;

    message += `*${prs.length}* awesome PR${
      prs.length > 1 ? "s" : ""
    } merged in the last ${this.mergeWindowHours} hour${
      this.mergeWindowHours !== 1 ? "s" : ""
    } by *${uniqueAuthors.size}* contributor${
      uniqueAuthors.size > 1 ? "s" : ""
    }!\n\n`;

    message += "━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n";

    // Add PRs grouped by repository
    Object.entries(repoGroups).forEach(([repo, repoPRs]) => {
      message += `📦 ${repo}\n\n`;

      repoPRs.forEach((pr) => {
        message += `  • ${pr.title}\n`;
        message += `        - @${pr.author}\n`;
        message += `        - ${pr.url}\n\n`;
      });
    });

    message += "━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n";
    message += "🙌 Amazing work everyone! Keep shipping! 🙌";

    return { message };
  }

  /**
   * Build a rich Block Kit message for Slack Incoming Webhooks
   * Incoming webhooks support full Block Kit formatting
   */
  private buildCelebrationMessage(prs: MergedPR[]): SlackBlockMessage {
    const uniqueAuthors = new Set(prs.map((pr) => pr.author));
    const repoGroups = this.groupPRsByRepo(prs);

    const celebrationEmojis = ["🎉", "🚀", "✨", "🎊", "🎈", "🌟", "💫", "🔥"];
    const randomEmoji =
      celebrationEmojis[Math.floor(Math.random() * celebrationEmojis.length)];

    const headerText = this.getDayHeader();

    // Build the message blocks
    const blocks: SlackBlock[] = [
      {
        type: "header",
        text: {
          type: "plain_text",
          text: `${randomEmoji} ${headerText} ${randomEmoji}`,
          emoji: true,
        },
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*${prs.length}* awesome PR${
            prs.length > 1 ? "s" : ""
          } merged in the last ${this.mergeWindowHours} hour${
            this.mergeWindowHours !== 1 ? "s" : ""
          } by *${uniqueAuthors.size}* contributor${
            uniqueAuthors.size > 1 ? "s" : ""
          }!`,
        },
      },
      {
        type: "divider",
      },
    ];

    // Add PRs grouped by repository
    Object.entries(repoGroups).forEach(([repo, repoPRs]) => {
      blocks.push({
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*📦 ${repo}*`,
        },
      });

      repoPRs.forEach((pr) => {
        blocks.push({
          type: "section",
          text: {
            type: "mrkdwn",
            text: `• 🔀 <${pr.url}|#${pr.number}: ${pr.title}>\n  _👤 @${pr.author}_`,
          },
        });
      });
    });

    // Fun footer
    blocks.push(
      {
        type: "divider",
      },
      {
        type: "context",
        elements: [
          {
            type: "mrkdwn",
            text: "🙌 Amazing work everyone! Keep shipping! 🙌",
          },
        ],
      }
    );

    return { blocks };
  }

  private groupPRsByRepo(prs: MergedPR[]): Record<string, MergedPR[]> {
    return prs.reduce((acc, pr) => {
      if (!acc[pr.repository]) {
        acc[pr.repository] = [];
      }
      acc[pr.repository].push(pr);
      return acc;
    }, {} as Record<string, MergedPR[]>);
  }
}

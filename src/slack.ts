import chalk from "chalk";
import axios from "axios";
import { MergedPR, SlackMessage, SlackBlock } from "./types";

export class SlackNotifier {
  private webhookUrl: string;
  private mergeWindowHours: number;

  constructor(webhookUrl: string, mergeWindowHours: number = 24) {
    this.webhookUrl = webhookUrl;
    this.mergeWindowHours = mergeWindowHours;
  }

  async sendCelebration(prs: MergedPR[]): Promise<void> {
    if (prs.length === 0) {
      console.log(
        chalk.yellow("No merged PRs found - skipping Slack notification")
      );
      return;
    }

    const message = this.buildCelebrationMessage(prs);

    try {
      await axios.post(this.webhookUrl, message);
      console.log(
        chalk.green(
          `Successfully sent celebration for ${chalk.bold(prs.length.toString())} PRs to Slack!`
        )
      );
    } catch (error) {
      console.error(chalk.red("Error sending message to Slack:"), error);
      throw error;
    }
  }

  private buildCelebrationMessage(prs: MergedPR[]): SlackMessage {
    const uniqueAuthors = new Set(prs.map((pr) => pr.author));
    const repoGroups = this.groupPRsByRepo(prs);

    const celebrationEmojis = ["🎉", "🚀", "✨", "🎊", "🎈", "🌟", "💫", "🔥"];
    const randomEmoji =
      celebrationEmojis[Math.floor(Math.random() * celebrationEmojis.length)];

    // Fun header messages
    const headers = [
      "Time to Celebrate!",
      "Victory Lap Time!",
      "Code Champions Alert!",
      "Merge Party!",
      "Ship It Sandwich!",
      "PR Power Hour!",
    ];
    const headerText = headers[Math.floor(Math.random() * headers.length)];

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
            text: `• <${pr.url}|#${pr.number}: ${pr.title}>\n  _by @${pr.author}_`,
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

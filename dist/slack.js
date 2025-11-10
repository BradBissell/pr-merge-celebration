"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SlackNotifier = void 0;
const chalk_1 = __importDefault(require("chalk"));
const axios_1 = __importDefault(require("axios"));
const types_1 = require("./types");
class SlackNotifier {
    constructor(webhookUrl, mergeWindowHours = 24) {
        this.webhookUrl = webhookUrl;
        this.mergeWindowHours = mergeWindowHours;
    }
    /**
     * Detect webhook type from URL pattern
     * Incoming Webhooks: https://hooks.slack.com/services/...
     * Workflow Webhooks: https://hooks.slack.com/workflows/... or https://hooks.slack.com/triggers/...
     */
    detectWebhookType() {
        if (this.webhookUrl.includes("/workflows/") ||
            this.webhookUrl.includes("/triggers/")) {
            return types_1.WebhookType.WORKFLOW;
        }
        return types_1.WebhookType.INCOMING;
    }
    async sendCelebration(prs) {
        if (prs.length === 0) {
            console.log(chalk_1.default.yellow("No merged PRs found - skipping Slack notification"));
            return;
        }
        const webhookType = this.detectWebhookType();
        const message = webhookType === types_1.WebhookType.WORKFLOW
            ? this.buildSimpleTextMessage(prs)
            : this.buildCelebrationMessage(prs);
        try {
            await axios_1.default.post(this.webhookUrl, message);
            const formatType = webhookType === types_1.WebhookType.WORKFLOW
                ? "workflow webhook"
                : "incoming webhook";
            console.log(chalk_1.default.green(`Successfully sent celebration for ${chalk_1.default.bold(prs.length.toString())} PRs to Slack (${formatType})!`));
        }
        catch (error) {
            console.error(chalk_1.default.red("Error sending message to Slack:"), error);
            throw error;
        }
    }
    /**
     * Build a simple text message for Slack Workflow Webhooks
     * Workflow webhooks only support plain text in the format: {"message": "text"}
     */
    buildSimpleTextMessage(prs) {
        const uniqueAuthors = new Set(prs.map((pr) => pr.author));
        const repoGroups = this.groupPRsByRepo(prs);
        const celebrationEmojis = ["🎉", "🚀", "✨", "🎊", "🎈", "🌟", "💫", "🔥"];
        const randomEmoji = celebrationEmojis[Math.floor(Math.random() * celebrationEmojis.length)];
        const headers = [
            "Time to Celebrate!",
            "Victory Lap Time!",
            "Code Champions Alert!",
            "Merge Party!",
            "Ship It Sandwich!",
            "PR Power Hour!",
        ];
        const headerText = headers[Math.floor(Math.random() * headers.length)];
        // Build the text message with nice formatting
        let message = `${randomEmoji} ${headerText} ${randomEmoji}\n\n`;
        message += `*${prs.length}* awesome PR${prs.length > 1 ? "s" : ""} merged in the last ${this.mergeWindowHours} hour${this.mergeWindowHours !== 1 ? "s" : ""} by *${uniqueAuthors.size}* contributor${uniqueAuthors.size > 1 ? "s" : ""}!\n\n`;
        message += "━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n";
        // Add PRs grouped by repository
        Object.entries(repoGroups).forEach(([repo, repoPRs]) => {
            message += `📦 *${repo}*\n\n`;
            repoPRs.forEach((pr) => {
                message += `  • #${pr.number}: ${pr.title}\n`;
                message += `    ${pr.url}\n`;
                message += `    _by @${pr.author}_\n\n`;
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
    buildCelebrationMessage(prs) {
        const uniqueAuthors = new Set(prs.map((pr) => pr.author));
        const repoGroups = this.groupPRsByRepo(prs);
        const celebrationEmojis = ["🎉", "🚀", "✨", "🎊", "🎈", "🌟", "💫", "🔥"];
        const randomEmoji = celebrationEmojis[Math.floor(Math.random() * celebrationEmojis.length)];
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
        const blocks = [
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
                    text: `*${prs.length}* awesome PR${prs.length > 1 ? "s" : ""} merged in the last ${this.mergeWindowHours} hour${this.mergeWindowHours !== 1 ? "s" : ""} by *${uniqueAuthors.size}* contributor${uniqueAuthors.size > 1 ? "s" : ""}!`,
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
        blocks.push({
            type: "divider",
        }, {
            type: "context",
            elements: [
                {
                    type: "mrkdwn",
                    text: "🙌 Amazing work everyone! Keep shipping! 🙌",
                },
            ],
        });
        return { blocks };
    }
    groupPRsByRepo(prs) {
        return prs.reduce((acc, pr) => {
            if (!acc[pr.repository]) {
                acc[pr.repository] = [];
            }
            acc[pr.repository].push(pr);
            return acc;
        }, {});
    }
}
exports.SlackNotifier = SlackNotifier;

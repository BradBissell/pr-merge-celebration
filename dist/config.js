"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getConfig = getConfig;
const core = __importStar(require("@actions/core"));
const chalk_1 = __importDefault(require("chalk"));
function getConfig() {
    // Read GitHub Actions inputs if available, otherwise fall back to env vars
    const githubToken = core.getInput("github-token") || process.env.GITHUB_TOKEN;
    const slackWebhookUrl = core.getInput("slack-webhook-url") || process.env.SLACK_WEBHOOK_URL;
    const reposToCheck = core.getInput("repos-to-check") || process.env.REPOS_TO_CHECK;
    const mergeWindow = core.getInput("merge-window") || process.env.MERGE_WINDOW || "24";
    if (!githubToken) {
        throw new Error("GITHUB_TOKEN environment variable is required");
    }
    if (!slackWebhookUrl) {
        throw new Error("SLACK_WEBHOOK_URL environment variable is required");
    }
    if (!slackWebhookUrl.startsWith("https://hooks.slack.com/")) {
        throw new Error("SLACK_WEBHOOK_URL must be a valid Slack webhook URL (should start with https://hooks.slack.com/)");
    }
    if (!reposToCheck) {
        throw new Error("REPOS_TO_CHECK environment variable is required (format: owner/repo,owner/repo)");
    }
    const mergeWindowHours = parseInt(mergeWindow, 10);
    if (isNaN(mergeWindowHours) ||
        mergeWindowHours <= 0 ||
        mergeWindowHours > 720) {
        throw new Error("MERGE_WINDOW must be a positive number between 1 and 720 hours (30 days)");
    }
    const repos = parseRepos(reposToCheck);
    console.log(chalk_1.default.cyan(`Checking ${chalk_1.default.bold(repos.length.toString())} repository(ies):`));
    repos.forEach((repo) => console.log(chalk_1.default.gray(`  - ${repo.owner}/${repo.repo}`)));
    console.log("");
    return {
        githubToken,
        slackWebhookUrl,
        repos,
        mergeWindowHours,
    };
}
function parseRepos(reposString) {
    const repos = reposString
        .split(",")
        .map((repo) => repo.trim())
        .filter((repo) => repo.length > 0);
    return repos.map((repo) => {
        const [owner, name] = repo.split("/");
        if (!owner || !name) {
            throw new Error(`Invalid repo format: ${repo}. Expected format: owner/repo`);
        }
        return { owner, repo: name };
    });
}

# PR Merge Celebration Bot

A GitHub Action that celebrates merged pull requests by posting celebratory messages to Slack. Pair it with a github cron workflow (example included) to regularly celebrate your colleagues' work by checking your repositories daily and sending a  summary of all PRs merged in the past given window (defaults to 1 day).

## Features

- Automatically checks multiple repositories for merged PRs
- Runs on a daily cron schedule (configurable)
- Configurable time window for checking merged PRs (default: 24 hours)
- Posts fun, celebratory messages to Slack
- Groups PRs by repository
- Shows contributor statistics
- Manual trigger support for testing

## Setup Instructions

### 1. Create a Slack Webhook

1. Go to your Slack workspace's [Incoming Webhooks](https://api.slack.com/messaging/webhooks) page
2. Click "Create New App" → "From scratch"
3. Name your app (e.g., "PR Celebration Bot") and select your workspace
4. Click "Incoming Webhooks" from the left sidebar
5. Toggle "Activate Incoming Webhooks" to On
6. Click "Add New Webhook to Workspace"
7. Select the channel where you want celebrations posted
8. Copy the webhook URL (starts with `https://hooks.slack.com/services/...`)

### 2. Configure GitHub Repository Secrets

1. Go to your repository's Settings → Secrets and variables → Actions
2. Click "New repository secret" and add:

   - **Name**: `SLACK_WEBHOOK_URL`
   - **Value**: Your Slack webhook URL from step 1

3. Add another secret:
   - **Name**: `REPOS_TO_CHECK`
   - **Value**: Comma-separated list of repos to monitor (e.g., `owner/repo1,owner/repo2`)

4. (Optional) Configure the merge window:
   - **Name**: `MERGE_WINDOW`
   - **Value**: Number of hours to look back for merged PRs (default: 24)

The `GITHUB_TOKEN` is automatically provided by GitHub Actions, but if you need to check private repos or repos outside your organization, create a Personal Access Token with `repo` scope and add it as a secret.

### 3. Install Dependencies and Build

```bash
pnpm install
pnpm run build
```

### 4. Create the GitHub Actions Workflow

Create `.github/workflows/pr-celebration.yml` in your repository:

```yaml
name: PR Merge Celebration

on:
  schedule:
    # Default: 11 AM Eastern Time (EST)
    - cron: '0 16 * * *'  # 11 AM EST / 12 PM EDT (4 PM UTC)
  workflow_dispatch:  # Allow manual triggers
    inputs:
      merge-window:
        description: 'Hours to look back for merged PRs (optional, defaults to 24)'
        required: false
        type: string

jobs:
  celebrate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Celebrate Merged PRs
        uses: ./
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
          slack-webhook-url: ${{ secrets.SLACK_WEBHOOK_URL }}
          repos-to-check: ${{ secrets.REPOS_TO_CHECK }}
          merge-window: ${{ inputs.merge-window || '24' }}
```

### 5. Configure the Cron Schedule (Optional)

The action defaults to running at **11 AM Eastern Time** (EST). To change the schedule, edit `.github/workflows/pr-celebration.yml` and uncomment/modify one of the provided time options:

```yaml
on:
  schedule:
    # Default: 11 AM Eastern Time (EST)
    - cron: '0 16 * * *'  # 11 AM EST / 12 PM EDT (4 PM UTC)
    # - cron: '0 15 * * *'  # 10 AM EST / 11 AM EDT (3 PM UTC)
    # - cron: '0 13 * * *'  # 8 AM EST / 9 AM EDT (1 PM UTC)
    # - cron: '0 17 * * *'  # 12 PM EST / 1 PM EDT (5 PM UTC)
    # - cron: '0 21 * * *'  # 4 PM EST / 5 PM EDT (9 PM UTC)
```

Simply comment out the current line and uncomment your preferred time.

**Note**: GitHub Actions cron uses UTC time and doesn't adjust for Daylight Saving Time. Use [crontab.guru](https://crontab.guru/) for calculating custom times.

**Important**: Align your `merge-window` parameter with your cron schedule. For example:
- Daily cron (24 hours) → `merge-window: '24'` (default)
- Every 12 hours → `merge-window: '12'`
- Every 6 hours → `merge-window: '6'`

### 6. Enable GitHub Actions

1. Go to your repository's Actions tab
2. Enable workflows if prompted
3. The celebration will run automatically on schedule

## Manual Testing

You can manually trigger the workflow to test it:

1. Go to Actions tab in your repository
2. Select "PR Merge Celebration" workflow
3. Click "Run workflow"
4. Optionally specify the merge window in hours (e.g., 12, 48)
5. Click "Run workflow"

## Local Development

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Fill in your actual values in `.env`:
   ```
   GITHUB_TOKEN=ghp_your_token_here
   SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL
   REPOS_TO_CHECK=owner/repo1,owner/repo2
   MERGE_WINDOW=24
   ```

3. Run locally:
   ```bash
   pnpm run dev
   ```

## Example Slack Message

The bot sends messages that look like this:

```
🎉 Time to Celebrate! 🎉

3 awesome PRs merged in the last 24 hours by 2 contributors!

────────────────────────────────

📦 octocat/Hello-World

• #123: Add amazing new feature
  by @alice

• #124: Fix critical bug
  by @bob

────────────────────────────────

🙌 Amazing work everyone! Keep shipping! 🙌
```

## How It Works

1. The GitHub Action runs on a cron schedule (default: daily at 11 AM Eastern Time)
2. The TypeScript script fetches all PRs from specified repositories
3. Filters for PRs merged in the configured time window (default: 24 hours)
4. Formats a fun celebration message
5. Posts to Slack via webhook

## Customization

### Change Message Style

Edit `src/slack.ts` to customize:
- Header messages (line 30-37)
- Emojis (line 28)
- Message format (line 40-90)

### Check Different Time Ranges

Set the `MERGE_WINDOW` environment variable or use the `merge-window` action input:
```yaml
- name: Celebrate Merged PRs
  uses: ./
  with:
    merge-window: '12'  # Check last 12 hours instead of 24
```

## Troubleshooting

**No message is sent**
- Check that PRs were actually merged in the last 24 hours
- Verify your `REPOS_TO_CHECK` secret is correctly formatted
- Check the Actions logs for error messages

**Authentication errors**
- Ensure your `GITHUB_TOKEN` has appropriate permissions
- For private repos, use a Personal Access Token with `repo` scope

**Slack webhook errors**
- Verify your `SLACK_WEBHOOK_URL` is correct
- Check that the Slack app is still installed in your workspace

## License

MIT

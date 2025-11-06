import { GitHubClient } from './github';
import { SlackNotifier } from './slack';
import { getConfig } from './config';

async function main() {
  try {
    console.log('🎉 Starting PR Merge Celebration Bot...\n');

    // Load configuration
    const config = getConfig();
    console.log(`Checking ${config.repos.length} repository(ies):`);
    config.repos.forEach((repo) => console.log(`  - ${repo.owner}/${repo.repo}`));
    console.log('');

    // Initialize clients
    const githubClient = new GitHubClient(config.githubToken);
    const slackNotifier = new SlackNotifier(config.slackWebhookUrl);

    // Fetch merged PRs from the configured time window
    console.log(`Looking back ${config.mergeWindowHours} hours for merged PRs\n`);
    const mergedPRs = await githubClient.getMergedPRsInTimeWindow(config.repos, config.mergeWindowHours);

    console.log(`\nTotal merged PRs found: ${mergedPRs.length}\n`);

    if (mergedPRs.length > 0) {
      console.log('Merged PRs:');
      mergedPRs.forEach((pr) => {
        console.log(`  - ${pr.repository}#${pr.number}: ${pr.title} (by ${pr.author})`);
      });
      console.log('');
    }

    // Send celebration to Slack
    await slackNotifier.sendCelebration(mergedPRs);

    console.log('\n✅ PR Celebration complete!');
  } catch (error) {
    console.error('\n❌ Error running PR celebration:', error);
    process.exit(1);
  }
}

main();

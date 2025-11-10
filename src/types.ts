export interface MergedPR {
  title: string;
  number: number;
  author: string;
  authorAvatar: string;
  url: string;
  mergedAt: string;
  repository: string;
}

export interface RepoConfig {
  owner: string;
  repo: string;
}

// Slack Block Kit types
export interface SlackTextElement {
  type: 'plain_text' | 'mrkdwn';
  text: string;
  emoji?: boolean;
}

export interface SlackHeaderBlock {
  type: 'header';
  text: SlackTextElement;
}

export interface SlackSectionBlock {
  type: 'section';
  text: SlackTextElement;
}

export interface SlackDividerBlock {
  type: 'divider';
}

export interface SlackContextBlock {
  type: 'context';
  elements: SlackTextElement[];
}

export type SlackBlock =
  | SlackHeaderBlock
  | SlackSectionBlock
  | SlackDividerBlock
  | SlackContextBlock;

// Slack Incoming Webhook message format (supports Block Kit)
export interface SlackBlockMessage {
  blocks: SlackBlock[];
}

// Slack Workflow Webhook message format (simple text only)
export interface SlackWorkflowMessage {
  message: string;
}

// Union type for all Slack message formats
export type SlackMessage = SlackBlockMessage | SlackWorkflowMessage;

// Webhook type enum
export enum WebhookType {
  INCOMING = 'incoming',
  WORKFLOW = 'workflow',
}

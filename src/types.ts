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

export interface SlackMessage {
  blocks: SlackBlock[];
}

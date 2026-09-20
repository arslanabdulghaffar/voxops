export type TimelineEventType =
  | "incident"
  | "investigation"
  | "proposal"
  | "approval"
  | "execution"
  | "verification";

export type TimelineEvent = {
  id: string;
  type: TimelineEventType;
  title: string;
  detail: string;
  timestamp: number;
};
export type TimelineEventType =
  | "incident"
  | "investigation"
  | "proposal"
  | "safety"
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
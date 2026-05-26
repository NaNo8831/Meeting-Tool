import type { Dispatch, ReactNode, SetStateAction } from "react";
import type { RichTextValue } from "@/app/types/richText";
import type { ObjectiveColor } from "@/app/types/objective";

export interface OrganizationInfo {
  whyExist: string;
  rallyCry: string;
  howBehave: RichTextValue;
  whatDo: RichTextValue;
  howSucceed: RichTextValue;
}

export interface StandardOperatingObjective {
  id: number;
  title: string;
  description: RichTextValue;
  color?: ObjectiveColor;
}

export interface MeetingItem {
  id: number;
  text: string;
  capturedDate?: string;
  capturedMeetingId?: number;
  capturedMeetingIndex?: number;
  completed?: boolean;
  completedDate?: string;
  removedMeetingId?: number;
  removedMeetingIndex?: number;
  removedDate?: string;
}

export type MeetingSectionKey = "agenda" | "topic" | "decision" | "cascade";

export interface MeetingRecord {
  id: number;
  date: string;
  agendaItems: MeetingItem[];
  topicItems: MeetingItem[];
  decisionItems: MeetingItem[];
  cascadeItems: MeetingItem[];
}

export interface MeetingSectionConfig {
  id: MeetingSectionKey;
  title: string;
  description: string;
  items: MeetingItem[];
  newItem: string;
  setNewItem: Dispatch<SetStateAction<string>>;
  addItem: () => void;
  updateItem: (itemId: number, value: string) => void;
  deleteItem: (itemId: number) => void;
  updateCompleted?: (itemId: number, completed: boolean) => void;
  updateCompletedDate?: (itemId: number, completedDate: string) => void;
  placeholder: string;
  editPlaceholder: string;
  renderItemActions?: (item: MeetingItem) => ReactNode;
}

export interface TaskInput {
  title: string;
  assignedTo: string;
}

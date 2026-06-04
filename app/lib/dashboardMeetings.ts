import {
  supabaseMeetingClient,
  type SupabaseMeeting,
} from "@/app/lib/supabaseClient";

export type DashboardMeetingAccess = "owned" | "shared";
export type DashboardMeetingRole = "owner" | "editor" | "viewer";

// PR 2A keeps membership-role lookup minimal because meeting_members remains
// access-management data; shared meetings can be classified from visible RLS rows
// where the signed-in user is not the owner.
export type DashboardMeeting = SupabaseMeeting & {
  access: DashboardMeetingAccess;
  ownerDisplayName: string;
  currentUserRole: DashboardMeetingRole | null;
  isOwnedByCurrentUser: boolean;
  canManageMeetingLifecycle: boolean;
};

export const isOwnedByCurrentUser = (
  meeting: Pick<SupabaseMeeting, "owner_id">,
  currentUserId: string,
) => meeting.owner_id === currentUserId;

export const canManageMeetingLifecycle = (
  meeting: Pick<SupabaseMeeting, "owner_id">,
  currentUserId: string,
) => isOwnedByCurrentUser(meeting, currentUserId);

const stringMetadataValue = (
  metadata: Record<string, unknown> | null,
  keys: string[],
) => {
  if (!metadata) return null;

  for (const key of keys) {
    const value = metadata[key];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return null;
};

const emailDisplayValue = (email: string | null) => {
  const trimmedEmail = email?.trim();
  return trimmedEmail || null;
};

export const getDashboardMeetingOwnerDisplayName = ({
  meeting,
  currentUserId,
  currentUserEmail,
}: {
  meeting: Pick<SupabaseMeeting, "metadata_json" | "owner_id">;
  currentUserId: string;
  currentUserEmail?: string | null;
}) => {
  const metadataDisplayName = stringMetadataValue(meeting.metadata_json, [
    "owner_display_name",
    "ownerDisplayName",
    "owner_name",
    "ownerName",
    "display_name",
    "displayName",
  ]);
  if (metadataDisplayName) return metadataDisplayName;

  const metadataEmail = stringMetadataValue(meeting.metadata_json, [
    "owner_email",
    "ownerEmail",
    "email",
  ]);
  if (metadataEmail) return emailDisplayValue(metadataEmail) ?? metadataEmail;

  if (meeting.owner_id === currentUserId) {
    return emailDisplayValue(currentUserEmail ?? null) ?? "Owner";
  }

  return "Owner";
};

export const toDashboardMeeting = ({
  meeting,
  currentUserId,
  currentUserEmail,
}: {
  meeting: SupabaseMeeting;
  currentUserId: string;
  currentUserEmail?: string | null;
}): DashboardMeeting => {
  const ownedByCurrentUser = isOwnedByCurrentUser(meeting, currentUserId);

  return {
    ...meeting,
    access: ownedByCurrentUser ? "owned" : "shared",
    ownerDisplayName: getDashboardMeetingOwnerDisplayName({
      meeting,
      currentUserId,
      currentUserEmail,
    }),
    currentUserRole: ownedByCurrentUser ? "owner" : null,
    isOwnedByCurrentUser: ownedByCurrentUser,
    canManageMeetingLifecycle: canManageMeetingLifecycle(
      meeting,
      currentUserId,
    ),
  };
};

export const listDashboardMeetings = async ({
  accessToken,
  currentUserId,
  currentUserEmail,
}: {
  accessToken: string;
  currentUserId: string;
  currentUserEmail?: string | null;
}): Promise<DashboardMeeting[]> => {
  const meetings = await supabaseMeetingClient.listWorkspaces(accessToken);

  return meetings.map((meeting) =>
    toDashboardMeeting({
      meeting,
      currentUserId,
      currentUserEmail,
    }),
  );
};

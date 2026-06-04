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

export const toDashboardMeeting = ({
  meeting,
  currentUserId,
}: {
  meeting: SupabaseMeeting;
  currentUserId: string;
}): DashboardMeeting => {
  const ownedByCurrentUser = isOwnedByCurrentUser(meeting, currentUserId);

  return {
    ...meeting,
    access: ownedByCurrentUser ? "owned" : "shared",
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
}: {
  accessToken: string;
  currentUserId: string;
}): Promise<DashboardMeeting[]> => {
  const meetings = await supabaseMeetingClient.listWorkspaces(accessToken);

  return meetings.map((meeting) =>
    toDashboardMeeting({
      meeting,
      currentUserId,
    }),
  );
};

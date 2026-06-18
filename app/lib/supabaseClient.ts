const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const getPasswordResetRedirectUrl = () => {
  if (typeof window === "undefined") return undefined;

  return `${window.location.origin}/reset-password`;
};

export type SupabaseAuthUser = {
  id: string;
  email: string;
};

export type SupabaseAuthSession = {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  user: SupabaseAuthUser;
};

export type SupabaseProfile = {
  user_id: string;
  first_name: string | null;
  last_name: string | null;
  display_name: string | null;
  email: string;
  created_at: string;
  updated_at: string;
};

export type SupabaseMeetingOwnerProfile = Pick<
  SupabaseProfile,
  "user_id" | "display_name" | "email"
> & {
  meeting_id: string;
};

export type SupabaseProfileUpdate = Pick<
  SupabaseProfile,
  "first_name" | "last_name"
>;

export type SupabaseMeetingInvitation = {
  id: string;
  meeting_id: string;
  email: string;
  normalized_email: string;
  role: "editor" | "viewer";
  status: "pending" | "accepted" | "revoked";
  invited_by: string | null;
  accepted_by: string | null;
  created_at: string;
  updated_at: string;
  accepted_at: string | null;
  revoked_at: string | null;
};

export type SupabaseMeetingMember = {
  meeting_id: string;
  user_id: string;
  role: "owner" | "editor";
  display_name: string | null;
  email: string | null;
  created_at: string;
  updated_at: string;
};

export type SupabaseMeetingMemberCount = {
  meeting_id: string;
  member_count: number;
};

export type SupabaseRemovedMeetingMember = {
  meeting_id: string;
  user_id: string;
  role: "editor";
  removed_at: string;
};

export type SupabasePendingMeetingInvitation = Pick<
  SupabaseMeetingInvitation,
  | "id"
  | "meeting_id"
  | "email"
  | "normalized_email"
  | "role"
  | "status"
  | "invited_by"
  | "created_at"
> & {
  meeting_name: string;
  owner_display_name: string;
};

export type SupabaseMeeting = {
  id: string;
  created_at: string;
  updated_at: string;
  owner_id: string;
  name: string;
  metadata_json: Record<string, unknown> | null;
  meeting_data: Record<string, unknown> | null;
  archived_at: string | null;
  deleted_at: string | null;
};

export type SupabaseMeetingSettings = {
  id: string;
  meeting_id: string;
  dashboard_title: string | null;
  organization_info: Record<string, unknown> | null;
  meeting_section_order: string[] | null;
  setup_completed: boolean;
  created_at: string;
  updated_at: string;
};

export type SupabaseMeetingSettingsUpsert = Pick<
  SupabaseMeetingSettings,
  | "dashboard_title"
  | "organization_info"
  | "meeting_section_order"
  | "setup_completed"
>;

export type SupabaseObjective = {
  id: string;
  meeting_id: string;
  client_objective_id: number;
  title: string;
  description: string | null;
  description_json: Record<string, unknown> | null;
  status: "planning" | "in-progress" | "completed" | string | null;
  priority: "high" | "medium" | "low" | string | null;
  due_date: string | null;
  color: string | null;
  sort_order: number;
  metadata_json: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
};

export type SupabaseObjectiveUpsert = {
  meeting_id: string;
  client_objective_id: number;
  title: string;
  description: string | null;
  description_json: Record<string, unknown> | null;
  status: string;
  priority: string;
  due_date: string | null;
  color: string;
  sort_order: number;
  metadata_json: Record<string, unknown> | null;
};

export type SupabaseTask = {
  id: string;
  meeting_id: string;
  objective_id: string | null;
  client_objective_id: number | null;
  client_task_id: number;
  title: string;
  description: string | null;
  description_text: string | null;
  description_json: Record<string, unknown> | null;
  status: "planning" | "in-progress" | "completed" | string | null;
  assignee: string | null;
  assigned_to: string | null;
  due_date: string | null;
  sort_order: number;
  subtasks_json: Record<string, unknown>[];
  comments_json: Record<string, unknown>[];
  activity_history_json: Record<string, unknown>[];
  metadata_json: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
};

export type SupabaseTaskUpsert = {
  meeting_id: string;
  objective_id: string | null;
  client_objective_id: number;
  client_task_id: number;
  title: string;
  description: string | null;
  description_text: string | null;
  description_json: Record<string, unknown> | null;
  status: string;
  assignee: string | null;
  assigned_to: string | null;
  due_date: string | null;
  sort_order: number;
  subtasks_json: Record<string, unknown>[];
  comments_json: Record<string, unknown>[];
  activity_history_json: Record<string, unknown>[];
  metadata_json: Record<string, unknown> | null;
};

export type SupabaseStandardOperatingObjective = {
  id: string;
  meeting_id: string;
  client_soo_id: number;
  title: string;
  description: string | null;
  description_json: Record<string, unknown> | null;
  status: string | null;
  color: string | null;
  sort_order: number;
  metadata_json: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
};

export type SupabaseStandardOperatingObjectiveUpsert = {
  meeting_id: string;
  client_soo_id: number;
  title: string;
  description: string | null;
  description_json: Record<string, unknown> | null;
  color: string;
  sort_order: number;
  metadata_json: Record<string, unknown> | null;
};

export type SupabaseMeetingNote = {
  id: string;
  meeting_id: string;
  client_meeting_id: number;
  meeting_date: string;
  is_test_meeting: boolean;
  notes_json: Record<string, unknown> | null;
  cascade_items: Record<string, unknown>[];
  created_at: string;
  updated_at: string;
};

export type SupabaseMeetingNoteUpsert = {
  meeting_id: string;
  client_meeting_id: number;
  meeting_date: string;
  is_test_meeting: boolean;
  notes_json: Record<string, unknown> | null;
  cascade_items: Record<string, unknown>[];
};

export type SupabaseAgendaItem = {
  id: string;
  meeting_id: string;
  client_agenda_item_id: number;
  client_meeting_id: number;
  title: string;
  discussion_notes_json: Record<string, unknown> | null;
  discussion_notes_text: string | null;
  has_decision: boolean;
  decision_text: string | null;
  has_action: boolean;
  action_text: string | null;
  is_covered: boolean;
  cascade_needed: boolean;
  promoted_strategic_topic_id: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type SupabaseAgendaItemUpsert = {
  meeting_id: string;
  client_agenda_item_id: number;
  client_meeting_id: number;
  title: string;
  discussion_notes_json: Record<string, unknown> | null;
  discussion_notes_text: string | null;
  has_decision: boolean;
  decision_text: string | null;
  has_action: boolean;
  action_text: string | null;
  is_covered: boolean;
  cascade_needed: boolean;
  promoted_strategic_topic_id: string | null;
  sort_order: number;
};

export type SupabaseTacticalSession = {
  id: string;
  meeting_id: string;
  session_date: string;
  title: string | null;
  status: string;
  snapshot_json: Record<string, unknown> | null;
  created_at: string;
  ended_at: string | null;
};

export type SupabaseStrategicTopic = {
  id: string;
  meeting_id: string;
  client_item_id: number;
  title: string;
  notes: string | null;
  status: "active" | "completed" | "archived";
  archived_at: string | null;
  completed_at: string | null;
  completed_date: string | null;
  captured_date: string | null;
  captured_meeting_id: number | null;
  captured_meeting_index: number | null;
  removed_meeting_id: number | null;
  removed_meeting_index: number | null;
  removed_date: string | null;
  sort_order: number;
  metadata_json: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
};

export type SupabaseStrategicTopicUpsert = {
  id?: string;
  meeting_id: string;
  client_item_id: number;
  title: string;
  status: "active" | "completed" | "archived";
  archived_at: string | null;
  completed_at: string | null;
  completed_date: string | null;
  captured_date: string | null;
  captured_meeting_id: number | null;
  captured_meeting_index: number | null;
  removed_meeting_id: number | null;
  removed_meeting_index: number | null;
  removed_date: string | null;
  sort_order: number;
  metadata_json: Record<string, unknown> | null;
};

export type SupabaseStrategicTopicNote = {
  id: string;
  meeting_id: string;
  strategic_topic_id: string | null;
  strategic_topic_item_id: number;
  content_json: Record<string, unknown> | null;
  content_text: string | null;
  created_at: string;
  updated_at: string;
};

type SupabaseAuthUserResponse = {
  id?: string;
  email?: string;
};

type SupabaseAuthResponse = {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  expires_at?: number;
  user?: SupabaseAuthUserResponse | null;
  error?: string;
  error_description?: string;
  msg?: string;
};

const getRestUrl = (table: string) => {
  if (!supabaseUrl) {
    throw new Error("Supabase URL is not configured.");
  }

  return `${supabaseUrl}/rest/v1/${table}`;
};

const getAuthUrl = (path: string) => {
  if (!supabaseUrl) {
    throw new Error("Supabase URL is not configured.");
  }

  return `${supabaseUrl}/auth/v1${path}`;
};

const getSupabaseHeaders = (accessToken?: string) => {
  if (!supabaseAnonKey) {
    throw new Error("Supabase anon key is not configured.");
  }

  return {
    apikey: supabaseAnonKey,
    Authorization: `Bearer ${accessToken ?? supabaseAnonKey}`,
    "Content-Type": "application/json",
  };
};

const getAuthHeaders = (accessToken?: string) => {
  return getSupabaseHeaders(accessToken);
};

const getAuthErrorMessage = async (response: Response) => {
  try {
    const body = (await response.json()) as SupabaseAuthResponse;
    return (
      body.error_description ||
      body.msg ||
      body.error ||
      `Supabase Auth request failed with status ${response.status}.`
    );
  } catch {
    return `Supabase Auth request failed with status ${response.status}.`;
  }
};

const normalizeSession = (
  response: SupabaseAuthResponse,
): SupabaseAuthSession | null => {
  if (!response.access_token || !response.refresh_token || !response.user?.id) {
    return null;
  }

  return {
    accessToken: response.access_token,
    refreshToken: response.refresh_token,
    expiresAt:
      response.expires_at ??
      Math.floor(Date.now() / 1000) + (response.expires_in ?? 3600),
    user: {
      id: response.user.id,
      email: response.user.email ?? "Signed in user",
    },
  };
};

export const supabaseAuthClient = {
  async signUp(email: string, password: string) {
    const response = await fetch(getAuthUrl("/signup"), {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      throw new Error(await getAuthErrorMessage(response));
    }

    return normalizeSession((await response.json()) as SupabaseAuthResponse);
  },

  async requestPasswordReset(email: string, redirectTo?: string) {
    const path = redirectTo
      ? `/recover?redirect_to=${encodeURIComponent(redirectTo)}`
      : "/recover";
    const response = await fetch(getAuthUrl(path), {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify({ email }),
    });

    if (!response.ok) {
      throw new Error(await getAuthErrorMessage(response));
    }
  },

  async signIn(email: string, password: string) {
    const response = await fetch(getAuthUrl("/token?grant_type=password"), {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      throw new Error(await getAuthErrorMessage(response));
    }

    const session = normalizeSession(
      (await response.json()) as SupabaseAuthResponse,
    );
    if (!session) {
      throw new Error("Supabase did not return a sign-in session.");
    }

    return session;
  },

  async refreshSession(refreshToken: string) {
    const response = await fetch(
      getAuthUrl("/token?grant_type=refresh_token"),
      {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ refresh_token: refreshToken }),
      },
    );

    if (!response.ok) {
      throw new Error(await getAuthErrorMessage(response));
    }

    const session = normalizeSession(
      (await response.json()) as SupabaseAuthResponse,
    );
    if (!session) {
      throw new Error("Supabase did not return a refreshed session.");
    }

    return session;
  },

  async getUser(accessToken: string) {
    const response = await fetch(getAuthUrl("/user"), {
      method: "GET",
      headers: getAuthHeaders(accessToken),
    });

    if (!response.ok) {
      throw new Error(await getAuthErrorMessage(response));
    }

    const user = (await response.json()) as SupabaseAuthUserResponse;
    if (!user.id) {
      throw new Error("Supabase did not return the current user.");
    }

    return {
      id: user.id,
      email: user.email ?? "Signed in user",
    } satisfies SupabaseAuthUser;
  },

  async updatePassword(accessToken: string, password: string) {
    const response = await fetch(getAuthUrl("/user"), {
      method: "PUT",
      headers: getAuthHeaders(accessToken),
      body: JSON.stringify({ password }),
    });

    if (!response.ok) {
      throw new Error(await getAuthErrorMessage(response));
    }
  },

  async signOut(accessToken: string) {
    const response = await fetch(getAuthUrl("/logout"), {
      method: "POST",
      headers: getAuthHeaders(accessToken),
    });

    if (!response.ok) {
      throw new Error(await getAuthErrorMessage(response));
    }
  },
};

export type SupabaseFeedbackType =
  | "Bug"
  | "UX Friction"
  | "Suggestion"
  | "Confusing Workflow";

export type SupabaseFeedbackSeverity = "Minor" | "Blocking";

export type SupabaseFeedbackInsert = {
  user_id: string | null;
  user_email: string | null;
  type: SupabaseFeedbackType;
  severity: SupabaseFeedbackSeverity;
  note: string;
  intent: string | null;
  page: string;
  browser: string;
  app_version: string | null;
  workspace_snapshot: Record<string, unknown> | null;
  metadata_json: Record<string, unknown> | null;
};

const getFeedbackErrorMessage = async (response: Response) => {
  try {
    const body = (await response.json()) as {
      message?: string;
      error?: string;
      details?: string;
    };

    return (
      body.message ||
      body.error ||
      body.details ||
      `Feedback request failed with status ${response.status}.`
    );
  } catch {
    return `Feedback request failed with status ${response.status}.`;
  }
};

const getRestErrorMessage = async (response: Response, fallback: string) => {
  try {
    const body = (await response.json()) as {
      message?: string;
      error?: string;
      details?: string;
    };

    return (
      body.message ||
      body.error ||
      body.details ||
      `${fallback} Request failed with status ${response.status}.`
    );
  } catch {
    return `${fallback} Request failed with status ${response.status}.`;
  }
};

export const supabaseProfileClient = {
  async ensureOwnProfile(accessToken: string) {
    const response = await fetch(getRestUrl("rpc/ensure_own_profile"), {
      method: "POST",
      headers: getSupabaseHeaders(accessToken),
      body: JSON.stringify({}),
    });

    if (!response.ok) {
      throw new Error(await getRestErrorMessage(response, "Profile bootstrap"));
    }

    return (await response.json()) as SupabaseProfile;
  },

  async updateOwnProfile({
    accessToken,
    userId,
    profile,
  }: {
    accessToken: string;
    userId: string;
    profile: SupabaseProfileUpdate;
  }) {
    const response = await fetch(
      `${getRestUrl("profiles")}?user_id=eq.${encodeURIComponent(userId)}`,
      {
        method: "PATCH",
        headers: {
          ...getSupabaseHeaders(accessToken),
          Prefer: "return=representation",
        },
        body: JSON.stringify(profile),
      },
    );

    if (!response.ok) {
      throw new Error(await getRestErrorMessage(response, "Profile update"));
    }

    const profiles = (await response.json()) as SupabaseProfile[];
    const updatedProfile = profiles[0];
    if (!updatedProfile) {
      throw new Error("Supabase did not return the updated profile.");
    }

    return updatedProfile;
  },

  async listAccessibleMeetingOwnerProfiles(accessToken: string) {
    const response = await fetch(
      getRestUrl("rpc/get_accessible_meeting_owner_profiles"),
      {
        method: "POST",
        headers: getSupabaseHeaders(accessToken),
        body: JSON.stringify({}),
      },
    );

    if (!response.ok) {
      throw new Error(
        await getRestErrorMessage(response, "Meeting owner profile list"),
      );
    }

    return (await response.json()) as SupabaseMeetingOwnerProfile[];
  },
};

export const supabaseInvitationClient = {
  async createInvitation({
    accessToken,
    meetingId,
    email,
    role = "editor",
  }: {
    accessToken: string;
    meetingId: string;
    email: string;
    role?: "editor" | "viewer";
  }) {
    const response = await fetch(getRestUrl("rpc/create_meeting_invitation"), {
      method: "POST",
      headers: getSupabaseHeaders(accessToken),
      body: JSON.stringify({
        target_meeting_id: meetingId,
        invite_email: email,
        invite_role: role,
      }),
    });

    if (!response.ok) {
      throw new Error(await getRestErrorMessage(response, "Invitation create"));
    }

    return (await response.json()) as SupabaseMeetingInvitation;
  },

  async listMeetingPendingInvitations({
    accessToken,
    meetingId,
  }: {
    accessToken: string;
    meetingId: string;
  }) {
    const response = await fetch(
      getRestUrl("rpc/list_meeting_pending_invitations"),
      {
        method: "POST",
        headers: getSupabaseHeaders(accessToken),
        body: JSON.stringify({ target_meeting_id: meetingId }),
      },
    );

    if (!response.ok) {
      throw new Error(await getRestErrorMessage(response, "Invitation list"));
    }

    return (await response.json()) as SupabaseMeetingInvitation[];
  },

  async revokeInvitation({
    accessToken,
    invitationId,
  }: {
    accessToken: string;
    invitationId: string;
  }) {
    const response = await fetch(getRestUrl("rpc/revoke_meeting_invitation"), {
      method: "POST",
      headers: getSupabaseHeaders(accessToken),
      body: JSON.stringify({ target_invitation_id: invitationId }),
    });

    if (!response.ok) {
      throw new Error(await getRestErrorMessage(response, "Invitation revoke"));
    }

    return (await response.json()) as SupabaseMeetingInvitation;
  },

  async listMyPendingInvitations(accessToken: string) {
    const response = await fetch(
      getRestUrl("rpc/list_my_pending_meeting_invitations"),
      {
        method: "POST",
        headers: getSupabaseHeaders(accessToken),
        body: JSON.stringify({}),
      },
    );

    if (!response.ok) {
      throw new Error(
        await getRestErrorMessage(response, "Pending invitations list"),
      );
    }

    return (await response.json()) as SupabasePendingMeetingInvitation[];
  },

  async acceptInvitation({
    accessToken,
    invitationId,
  }: {
    accessToken: string;
    invitationId: string;
  }) {
    const response = await fetch(getRestUrl("rpc/accept_meeting_invitation"), {
      method: "POST",
      headers: getSupabaseHeaders(accessToken),
      body: JSON.stringify({ target_invitation_id: invitationId }),
    });

    if (!response.ok) {
      throw new Error(await getRestErrorMessage(response, "Invitation accept"));
    }

    return (await response.json()) as SupabaseMeetingInvitation;
  },
};

export const supabaseMemberClient = {
  async listMeetingMembers({
    accessToken,
    meetingId,
  }: {
    accessToken: string;
    meetingId: string;
  }) {
    const response = await fetch(getRestUrl("rpc/list_meeting_members"), {
      method: "POST",
      headers: getSupabaseHeaders(accessToken),
      body: JSON.stringify({ target_meeting_id: meetingId }),
    });

    if (!response.ok) {
      throw new Error(await getRestErrorMessage(response, "Member list"));
    }

    return (await response.json()) as SupabaseMeetingMember[];
  },

  async removeMeetingEditor({
    accessToken,
    meetingId,
    userId,
  }: {
    accessToken: string;
    meetingId: string;
    userId: string;
  }) {
    const response = await fetch(getRestUrl("rpc/remove_meeting_editor"), {
      method: "POST",
      headers: getSupabaseHeaders(accessToken),
      body: JSON.stringify({
        target_meeting_id: meetingId,
        target_user_id: userId,
      }),
    });

    if (!response.ok) {
      throw new Error(await getRestErrorMessage(response, "Member removal"));
    }

    const removedMembers =
      (await response.json()) as SupabaseRemovedMeetingMember[];
    const removedMember = removedMembers[0];
    if (!removedMember) {
      throw new Error("Supabase did not return the removed member.");
    }

    return removedMember;
  },

  async listAccessibleMeetingMemberCounts(accessToken: string) {
    const response = await fetch(
      getRestUrl("rpc/get_accessible_meeting_member_counts"),
      {
        method: "POST",
        headers: getSupabaseHeaders(accessToken),
        body: JSON.stringify({}),
      },
    );

    if (!response.ok) {
      throw new Error(
        await getRestErrorMessage(response, "Meeting member count list"),
      );
    }

    return (await response.json()) as SupabaseMeetingMemberCount[];
  },
};

export const supabaseFeedbackClient = {
  async submitFeedback({
    accessToken,
    feedback,
  }: {
    accessToken?: string;
    feedback: SupabaseFeedbackInsert;
  }) {
    const response = await fetch(getRestUrl("feedback"), {
      method: "POST",
      headers: {
        ...getSupabaseHeaders(accessToken),
        Prefer: "return=minimal",
      },
      body: JSON.stringify(feedback),
    });

    if (!response.ok) {
      throw new Error(await getFeedbackErrorMessage(response));
    }
  },
};

export const supabaseMeetingClient = {
  async listWorkspaces(accessToken: string) {
    const response = await fetch(
      `${getRestUrl("meetings")}?select=*&deleted_at=is.null&order=updated_at.desc`,
      {
        method: "GET",
        headers: getSupabaseHeaders(accessToken),
      },
    );

    if (!response.ok) {
      throw new Error(await getRestErrorMessage(response, "Workspace list"));
    }

    return (await response.json()) as SupabaseMeeting[];
  },

  async createWorkspace({
    accessToken,
    name,
  }: {
    accessToken: string;
    name: string;
  }) {
    const response = await fetch(getRestUrl("rpc/create_owned_meeting"), {
      method: "POST",
      headers: getSupabaseHeaders(accessToken),
      body: JSON.stringify({ meeting_name: name }),
    });

    if (!response.ok) {
      throw new Error(await getRestErrorMessage(response, "Workspace create"));
    }

    return (await response.json()) as SupabaseMeeting;
  },

  async getWorkspace({
    accessToken,
    workspaceId,
  }: {
    accessToken: string;
    workspaceId: string;
  }) {
    const response = await fetch(
      `${getRestUrl("meetings")}?id=eq.${encodeURIComponent(
        workspaceId,
      )}&select=id,name,owner_id,archived_at,deleted_at&deleted_at=is.null&limit=1`,
      {
        method: "GET",
        headers: getSupabaseHeaders(accessToken),
      },
    );

    if (!response.ok) {
      throw new Error(await getRestErrorMessage(response, "Workspace fetch"));
    }

    const meetings = (await response.json()) as Pick<
      SupabaseMeeting,
      "id" | "name" | "owner_id" | "archived_at" | "deleted_at"
    >[];
    return meetings[0] ?? null;
  },

  async duplicateWorkspace({
    accessToken,
    ownerId,
    sourceMeeting,
    duplicateName,
  }: {
    accessToken: string;
    ownerId: string;
    sourceMeeting: SupabaseMeeting;
    duplicateName?: string;
  }) {
    if (sourceMeeting.owner_id !== ownerId) {
      throw new Error(
        "Only owned meetings can be duplicated from the dashboard.",
      );
    }

    const response = await fetch(getRestUrl("rpc/duplicate_owned_meeting"), {
      method: "POST",
      headers: getSupabaseHeaders(accessToken),
      body: JSON.stringify({
        source_meeting_id: sourceMeeting.id,
        duplicate_name: duplicateName,
      }),
    });

    if (!response.ok) {
      throw new Error(
        await getRestErrorMessage(response, "Workspace duplicate"),
      );
    }

    return (await response.json()) as SupabaseMeeting;
  },

  async archiveWorkspace({
    accessToken,
    workspaceId,
  }: {
    accessToken: string;
    workspaceId: string;
  }) {
    const response = await fetch(getRestUrl("rpc/archive_owned_meeting"), {
      method: "POST",
      headers: getSupabaseHeaders(accessToken),
      body: JSON.stringify({ target_meeting_id: workspaceId }),
    });

    if (!response.ok) {
      throw new Error(await getRestErrorMessage(response, "Workspace archive"));
    }

    return (await response.json()) as SupabaseMeeting;
  },

  async restoreArchivedWorkspace({
    accessToken,
    workspaceId,
  }: {
    accessToken: string;
    workspaceId: string;
  }) {
    const response = await fetch(
      getRestUrl("rpc/restore_owned_archived_meeting"),
      {
        method: "POST",
        headers: getSupabaseHeaders(accessToken),
        body: JSON.stringify({ target_meeting_id: workspaceId }),
      },
    );

    if (!response.ok) {
      throw new Error(await getRestErrorMessage(response, "Workspace restore"));
    }

    return (await response.json()) as SupabaseMeeting;
  },

  async softDeleteArchivedWorkspace({
    accessToken,
    workspaceId,
  }: {
    accessToken: string;
    workspaceId: string;
  }) {
    const response = await fetch(
      getRestUrl("rpc/soft_delete_owned_archived_meeting"),
      {
        method: "POST",
        headers: getSupabaseHeaders(accessToken),
        body: JSON.stringify({ target_meeting_id: workspaceId }),
      },
    );

    if (!response.ok) {
      throw new Error(
        await getRestErrorMessage(response, "Archived meeting delete"),
      );
    }
  },

  async loadWorkspaceData({
    accessToken,
    workspaceId,
  }: {
    accessToken: string;
    workspaceId: string;
  }) {
    const response = await fetch(
      `${getRestUrl("meetings")}?id=eq.${encodeURIComponent(
        workspaceId,
      )}&select=id,meeting_data&deleted_at=is.null&limit=1`,
      {
        method: "GET",
        headers: getSupabaseHeaders(accessToken),
      },
    );

    if (!response.ok) {
      throw new Error(await getRestErrorMessage(response, "Workspace load"));
    }

    const meetings = (await response.json()) as Pick<
      SupabaseMeeting,
      "id" | "meeting_data"
    >[];
    const meeting = meetings[0];
    if (!meeting) {
      throw new Error("Cloud meeting was not found or is not accessible.");
    }

    return meeting.meeting_data;
  },

  async saveWorkspaceData({
    accessToken,
    workspaceId,
    data,
  }: {
    accessToken: string;
    workspaceId: string;
    data: Record<string, unknown>;
  }) {
    const response = await fetch(
      `${getRestUrl("meetings")}?id=eq.${encodeURIComponent(workspaceId)}&deleted_at=is.null`,
      {
        method: "PATCH",
        headers: {
          ...getSupabaseHeaders(accessToken),
          Prefer: "return=representation",
        },
        body: JSON.stringify({ meeting_data: data }),
      },
    );

    if (!response.ok) {
      throw new Error(await getRestErrorMessage(response, "Workspace save"));
    }

    const meetings = (await response.json()) as SupabaseMeeting[];
    const meeting = meetings[0];
    if (!meeting) {
      throw new Error("Cloud meeting was not found or is not accessible.");
    }

    return meeting;
  },

  async loadMeetingSettings({
    accessToken,
    workspaceId,
  }: {
    accessToken: string;
    workspaceId: string;
  }) {
    const response = await fetch(
      `${getRestUrl("meeting_settings")}?meeting_id=eq.${encodeURIComponent(
        workspaceId,
      )}&select=*&limit=1`,
      {
        method: "GET",
        headers: getSupabaseHeaders(accessToken),
      },
    );

    if (!response.ok) {
      throw new Error(
        await getRestErrorMessage(response, "Meeting settings load"),
      );
    }

    const settings = (await response.json()) as SupabaseMeetingSettings[];
    return settings[0] ?? null;
  },

  async saveMeetingSettings({
    accessToken,
    workspaceId,
    settings,
  }: {
    accessToken: string;
    workspaceId: string;
    settings: SupabaseMeetingSettingsUpsert;
  }) {
    const response = await fetch(
      `${getRestUrl("meeting_settings")}?on_conflict=meeting_id`,
      {
        method: "POST",
        headers: {
          ...getSupabaseHeaders(accessToken),
          Prefer: "resolution=merge-duplicates,return=representation",
        },
        body: JSON.stringify({
          meeting_id: workspaceId,
          ...settings,
        }),
      },
    );

    if (!response.ok) {
      throw new Error(
        await getRestErrorMessage(response, "Meeting settings autosave"),
      );
    }

    const savedSettings = (await response.json()) as SupabaseMeetingSettings[];
    const saved = savedSettings[0];
    if (!saved) {
      throw new Error("Meeting settings were not saved.");
    }

    return saved;
  },

  async loadAgendaItems({
    accessToken,
    workspaceId,
  }: {
    accessToken: string;
    workspaceId: string;
  }) {
    const response = await fetch(
      `${getRestUrl("agenda_items")}?meeting_id=eq.${encodeURIComponent(
        workspaceId,
      )}&select=*&order=client_meeting_id.asc,sort_order.asc,created_at.asc`,
      {
        method: "GET",
        headers: getSupabaseHeaders(accessToken),
      },
    );

    if (!response.ok) {
      throw new Error(await getRestErrorMessage(response, "Agenda items load"));
    }

    return (await response.json()) as SupabaseAgendaItem[];
  },

  async saveAgendaItems({
    accessToken,
    workspaceId,
    agendaItems,
  }: {
    accessToken: string;
    workspaceId: string;
    agendaItems: SupabaseAgendaItemUpsert[];
  }) {
    if (agendaItems.length === 0) return [];

    const response = await fetch(
      `${getRestUrl("agenda_items")}?on_conflict=meeting_id,client_agenda_item_id`,
      {
        method: "POST",
        headers: {
          ...getSupabaseHeaders(accessToken),
          Prefer: "resolution=merge-duplicates,return=representation",
        },
        body: JSON.stringify(
          agendaItems.map((item) => ({
            ...item,
            meeting_id: workspaceId,
          })),
        ),
      },
    );

    if (!response.ok) {
      throw new Error(
        await getRestErrorMessage(response, "Agenda items autosave"),
      );
    }

    return (await response.json()) as SupabaseAgendaItem[];
  },

  async deleteMissingAgendaItems({
    accessToken,
    workspaceId,
    retainedClientAgendaItemIds,
  }: {
    accessToken: string;
    workspaceId: string;
    retainedClientAgendaItemIds: number[];
  }) {
    const retainedFilter = retainedClientAgendaItemIds.length
      ? `&client_agenda_item_id=not.in.(${retainedClientAgendaItemIds.join(",")})`
      : "";
    const response = await fetch(
      `${getRestUrl("agenda_items")}?meeting_id=eq.${encodeURIComponent(
        workspaceId,
      )}${retainedFilter}`,
      {
        method: "DELETE",
        headers: getSupabaseHeaders(accessToken),
      },
    );

    if (!response.ok) {
      throw new Error(
        await getRestErrorMessage(response, "Agenda items cleanup"),
      );
    }
  },

  async loadMeetingNotes({
    accessToken,
    workspaceId,
  }: {
    accessToken: string;
    workspaceId: string;
  }) {
    const response = await fetch(
      `${getRestUrl("meeting_notes")}?meeting_id=eq.${encodeURIComponent(
        workspaceId,
      )}&select=*&order=meeting_date.asc,client_meeting_id.asc`,
      {
        method: "GET",
        headers: getSupabaseHeaders(accessToken),
      },
    );

    if (!response.ok) {
      throw new Error(
        await getRestErrorMessage(response, "Meeting notes load"),
      );
    }

    return (await response.json()) as SupabaseMeetingNote[];
  },

  async saveMeetingNotes({
    accessToken,
    workspaceId,
    notes,
  }: {
    accessToken: string;
    workspaceId: string;
    notes: SupabaseMeetingNoteUpsert[];
  }) {
    if (notes.length === 0) return [];

    const response = await fetch(
      `${getRestUrl("meeting_notes")}?on_conflict=meeting_id,client_meeting_id`,
      {
        method: "POST",
        headers: {
          ...getSupabaseHeaders(accessToken),
          Prefer: "resolution=merge-duplicates,return=representation",
        },
        body: JSON.stringify(
          notes.map((note) => ({
            ...note,
            meeting_id: workspaceId,
          })),
        ),
      },
    );

    if (!response.ok) {
      throw new Error(
        await getRestErrorMessage(response, "Meeting notes autosave"),
      );
    }

    return (await response.json()) as SupabaseMeetingNote[];
  },

  async deleteMissingMeetingNotes({
    accessToken,
    workspaceId,
    retainedClientMeetingIds,
  }: {
    accessToken: string;
    workspaceId: string;
    retainedClientMeetingIds: number[];
  }) {
    const retainedFilter = retainedClientMeetingIds.length
      ? `&client_meeting_id=not.in.(${retainedClientMeetingIds.join(",")})`
      : "";
    const response = await fetch(
      `${getRestUrl("meeting_notes")}?meeting_id=eq.${encodeURIComponent(
        workspaceId,
      )}${retainedFilter}`,
      {
        method: "DELETE",
        headers: getSupabaseHeaders(accessToken),
      },
    );

    if (!response.ok) {
      throw new Error(
        await getRestErrorMessage(response, "Meeting notes cleanup"),
      );
    }
  },

  async loadObjectives({
    accessToken,
    workspaceId,
  }: {
    accessToken: string;
    workspaceId: string;
  }) {
    const response = await fetch(
      `${getRestUrl("objectives")}?meeting_id=eq.${encodeURIComponent(
        workspaceId,
      )}&select=*&order=sort_order.asc,created_at.asc`,
      {
        method: "GET",
        headers: getSupabaseHeaders(accessToken),
      },
    );

    if (!response.ok) {
      throw new Error(await getRestErrorMessage(response, "Objectives load"));
    }

    return (await response.json()) as SupabaseObjective[];
  },

  async saveObjectives({
    accessToken,
    workspaceId,
    objectives,
  }: {
    accessToken: string;
    workspaceId: string;
    objectives: SupabaseObjectiveUpsert[];
  }) {
    if (objectives.length === 0) return [];

    const response = await fetch(
      `${getRestUrl("objectives")}?on_conflict=meeting_id,client_objective_id`,
      {
        method: "POST",
        headers: {
          ...getSupabaseHeaders(accessToken),
          Prefer: "resolution=merge-duplicates,return=representation",
        },
        body: JSON.stringify(
          objectives.map((objective) => ({
            ...objective,
            meeting_id: workspaceId,
          })),
        ),
      },
    );

    if (!response.ok) {
      throw new Error(
        await getRestErrorMessage(response, "Objectives autosave"),
      );
    }

    return (await response.json()) as SupabaseObjective[];
  },

  async deleteMissingObjectives({
    accessToken,
    workspaceId,
    retainedClientObjectiveIds,
  }: {
    accessToken: string;
    workspaceId: string;
    retainedClientObjectiveIds: number[];
  }) {
    const retainedFilter = retainedClientObjectiveIds.length
      ? `&client_objective_id=not.in.(${retainedClientObjectiveIds.join(",")})`
      : "";
    const response = await fetch(
      `${getRestUrl("objectives")}?meeting_id=eq.${encodeURIComponent(
        workspaceId,
      )}${retainedFilter}`,
      {
        method: "DELETE",
        headers: getSupabaseHeaders(accessToken),
      },
    );

    if (!response.ok) {
      throw new Error(
        await getRestErrorMessage(response, "Objectives cleanup"),
      );
    }
  },

  async loadTasks({
    accessToken,
    workspaceId,
  }: {
    accessToken: string;
    workspaceId: string;
  }) {
    const response = await fetch(
      `${getRestUrl("tasks")}?meeting_id=eq.${encodeURIComponent(
        workspaceId,
      )}&select=*&order=client_objective_id.asc,sort_order.asc,created_at.asc`,
      {
        method: "GET",
        headers: getSupabaseHeaders(accessToken),
      },
    );

    if (!response.ok) {
      throw new Error(await getRestErrorMessage(response, "Tasks load"));
    }

    return (await response.json()) as SupabaseTask[];
  },

  async saveTasks({
    accessToken,
    workspaceId,
    tasks,
  }: {
    accessToken: string;
    workspaceId: string;
    tasks: SupabaseTaskUpsert[];
  }) {
    if (tasks.length === 0) return [];

    const response = await fetch(
      `${getRestUrl("tasks")}?on_conflict=meeting_id,client_task_id`,
      {
        method: "POST",
        headers: {
          ...getSupabaseHeaders(accessToken),
          Prefer: "resolution=merge-duplicates,return=representation",
        },
        body: JSON.stringify(
          tasks.map((task) => ({
            ...task,
            meeting_id: workspaceId,
          })),
        ),
      },
    );

    if (!response.ok) {
      throw new Error(await getRestErrorMessage(response, "Tasks autosave"));
    }

    return (await response.json()) as SupabaseTask[];
  },

  async deleteMissingTasks({
    accessToken,
    workspaceId,
    retainedClientTaskIds,
  }: {
    accessToken: string;
    workspaceId: string;
    retainedClientTaskIds: number[];
  }) {
    const retainedFilter = retainedClientTaskIds.length
      ? `&client_task_id=not.in.(${retainedClientTaskIds.join(",")})`
      : "";
    const response = await fetch(
      `${getRestUrl("tasks")}?meeting_id=eq.${encodeURIComponent(
        workspaceId,
      )}${retainedFilter}`,
      {
        method: "DELETE",
        headers: getSupabaseHeaders(accessToken),
      },
    );

    if (!response.ok) {
      throw new Error(await getRestErrorMessage(response, "Tasks cleanup"));
    }
  },

  async loadStandardOperatingObjectives({
    accessToken,
    workspaceId,
  }: {
    accessToken: string;
    workspaceId: string;
  }) {
    const response = await fetch(
      `${getRestUrl("standard_operating_objectives")}?meeting_id=eq.${encodeURIComponent(
        workspaceId,
      )}&select=*&order=sort_order.asc,created_at.asc`,
      {
        method: "GET",
        headers: getSupabaseHeaders(accessToken),
      },
    );

    if (!response.ok) {
      throw new Error(
        await getRestErrorMessage(
          response,
          "Standard Operating Objectives load",
        ),
      );
    }

    return (await response.json()) as SupabaseStandardOperatingObjective[];
  },

  async saveStandardOperatingObjectives({
    accessToken,
    workspaceId,
    standardOperatingObjectives,
  }: {
    accessToken: string;
    workspaceId: string;
    standardOperatingObjectives: SupabaseStandardOperatingObjectiveUpsert[];
  }) {
    if (standardOperatingObjectives.length === 0) return [];

    const response = await fetch(
      `${getRestUrl("standard_operating_objectives")}?on_conflict=meeting_id,client_soo_id`,
      {
        method: "POST",
        headers: {
          ...getSupabaseHeaders(accessToken),
          Prefer: "resolution=merge-duplicates,return=representation",
        },
        body: JSON.stringify(
          standardOperatingObjectives.map((soo) => ({
            ...soo,
            meeting_id: workspaceId,
          })),
        ),
      },
    );

    if (!response.ok) {
      throw new Error(
        await getRestErrorMessage(
          response,
          "Standard Operating Objectives autosave",
        ),
      );
    }

    return (await response.json()) as SupabaseStandardOperatingObjective[];
  },

  async deleteMissingStandardOperatingObjectives({
    accessToken,
    workspaceId,
    retainedClientSooIds,
  }: {
    accessToken: string;
    workspaceId: string;
    retainedClientSooIds: number[];
  }) {
    const retainedFilter = retainedClientSooIds.length
      ? `&client_soo_id=not.in.(${retainedClientSooIds.join(",")})`
      : "";
    const response = await fetch(
      `${getRestUrl("standard_operating_objectives")}?meeting_id=eq.${encodeURIComponent(
        workspaceId,
      )}${retainedFilter}`,
      {
        method: "DELETE",
        headers: getSupabaseHeaders(accessToken),
      },
    );

    if (!response.ok) {
      throw new Error(
        await getRestErrorMessage(
          response,
          "Standard Operating Objectives cleanup",
        ),
      );
    }
  },

  async listTacticalSessions({
    accessToken,
    workspaceId,
  }: {
    accessToken: string;
    workspaceId: string;
  }) {
    const response = await fetch(
      `${getRestUrl("tactical_sessions")}?meeting_id=eq.${encodeURIComponent(
        workspaceId,
      )}&select=*&order=created_at.desc`,
      {
        method: "GET",
        headers: getSupabaseHeaders(accessToken),
      },
    );

    if (!response.ok) {
      throw new Error(
        await getRestErrorMessage(response, "Tactical sessions list"),
      );
    }

    return (await response.json()) as SupabaseTacticalSession[];
  },

  async endTacticalSession({
    accessToken,
    workspaceId,
    sessionDate,
    title,
    snapshotJson,
  }: {
    accessToken: string;
    workspaceId: string;
    sessionDate: string;
    title: string;
    snapshotJson: Record<string, unknown>;
  }) {
    const nowIso = new Date().toISOString();
    const response = await fetch(getRestUrl("tactical_sessions"), {
      method: "POST",
      headers: {
        ...getSupabaseHeaders(accessToken),
        Prefer: "return=representation",
      },
      body: JSON.stringify({
        meeting_id: workspaceId,
        session_date: sessionDate,
        title,
        status: "ended",
        snapshot_json: snapshotJson,
        ended_at: nowIso,
      }),
    });

    if (!response.ok) {
      throw new Error(await getRestErrorMessage(response, "End meeting"));
    }

    const sessions = (await response.json()) as SupabaseTacticalSession[];
    const session = sessions[0];
    if (!session) {
      throw new Error("Tactical session was not created.");
    }

    return session;
  },

  async loadStrategicTopics({
    accessToken,
    workspaceId,
  }: {
    accessToken: string;
    workspaceId: string;
  }) {
    const response = await fetch(
      `${getRestUrl("strategic_topics")}?meeting_id=eq.${encodeURIComponent(
        workspaceId,
      )}&select=*&order=sort_order.asc,created_at.asc`,
      {
        method: "GET",
        headers: getSupabaseHeaders(accessToken),
      },
    );

    if (!response.ok) {
      throw new Error(
        await getRestErrorMessage(response, "Strategic topics load"),
      );
    }

    return (await response.json()) as SupabaseStrategicTopic[];
  },

  async saveStrategicTopics({
    accessToken,
    workspaceId,
    topics,
  }: {
    accessToken: string;
    workspaceId: string;
    topics: SupabaseStrategicTopicUpsert[];
  }) {
    if (topics.length === 0) return [];

    const normalizedTopics = topics.map((topic) => ({
      ...topic,
      meeting_id: workspaceId,
    }));
    const endpoint = `${getRestUrl("strategic_topics")}?on_conflict=meeting_id,client_item_id`;
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        ...getSupabaseHeaders(accessToken),
        Prefer: "resolution=merge-duplicates,return=representation",
      },
      body: JSON.stringify(normalizedTopics),
    });

    if (!response.ok) {
      throw new Error(
        await getRestErrorMessage(response, "Strategic topics autosave"),
      );
    }

    return (await response.json()) as SupabaseStrategicTopic[];
  },

  async deleteMissingStrategicTopics({
    accessToken,
    workspaceId,
    retainedClientItemIds,
  }: {
    accessToken: string;
    workspaceId: string;
    retainedClientItemIds: number[];
  }) {
    const retainedFilter = retainedClientItemIds.length
      ? `&client_item_id=not.in.(${retainedClientItemIds.join(",")})`
      : "";
    const response = await fetch(
      `${getRestUrl("strategic_topics")}?meeting_id=eq.${encodeURIComponent(
        workspaceId,
      )}${retainedFilter}`,
      {
        method: "DELETE",
        headers: getSupabaseHeaders(accessToken),
      },
    );

    if (!response.ok) {
      throw new Error(
        await getRestErrorMessage(response, "Strategic topics cleanup"),
      );
    }
  },

  async listStrategicTopicNotes({
    accessToken,
    workspaceId,
  }: {
    accessToken: string;
    workspaceId: string;
  }) {
    const response = await fetch(
      `${getRestUrl("strategic_topic_notes")}?meeting_id=eq.${encodeURIComponent(
        workspaceId,
      )}&select=*`,
      {
        method: "GET",
        headers: getSupabaseHeaders(accessToken),
      },
    );

    if (!response.ok) {
      throw new Error(
        await getRestErrorMessage(response, "Strategic topic notes list"),
      );
    }

    return (await response.json()) as SupabaseStrategicTopicNote[];
  },

  async loadStrategicTopicNote({
    accessToken,
    workspaceId,
    strategicTopicItemId,
    strategicTopicId,
  }: {
    accessToken: string;
    workspaceId: string;
    strategicTopicItemId: number;
    strategicTopicId?: string | null;
  }) {
    const topicFilter = strategicTopicId
      ? `&or=(strategic_topic_id.eq.${encodeURIComponent(strategicTopicId)},strategic_topic_item_id.eq.${strategicTopicItemId})`
      : `&strategic_topic_item_id=eq.${strategicTopicItemId}`;
    const response = await fetch(
      `${getRestUrl("strategic_topic_notes")}?meeting_id=eq.${encodeURIComponent(
        workspaceId,
      )}${topicFilter}&select=*&limit=1`,
      {
        method: "GET",
        headers: getSupabaseHeaders(accessToken),
      },
    );

    if (!response.ok) {
      throw new Error(
        await getRestErrorMessage(response, "Strategic topic note load"),
      );
    }

    const notes = (await response.json()) as SupabaseStrategicTopicNote[];
    return notes[0] ?? null;
  },

  async saveStrategicTopicNote({
    accessToken,
    workspaceId,
    strategicTopicItemId,
    strategicTopicId = null,
    contentText,
    contentJson = null,
  }: {
    accessToken: string;
    workspaceId: string;
    strategicTopicItemId: number;
    strategicTopicId?: string | null;
    contentText: string;
    contentJson?: Record<string, unknown> | null;
  }) {
    const existingNote = await this.loadStrategicTopicNote({
      accessToken,
      workspaceId,
      strategicTopicItemId,
      strategicTopicId,
    });
    const updatedAtIso = new Date().toISOString();
    const endpoint = existingNote
      ? `${getRestUrl("strategic_topic_notes")}?id=eq.${encodeURIComponent(existingNote.id)}`
      : getRestUrl("strategic_topic_notes");
    const response = await fetch(endpoint, {
      method: existingNote ? "PATCH" : "POST",
      headers: {
        ...getSupabaseHeaders(accessToken),
        Prefer: "return=representation",
      },
      body: JSON.stringify(
        existingNote
          ? {
              strategic_topic_id:
                strategicTopicId ?? existingNote.strategic_topic_id,
              content_text: contentText,
              content_json: contentJson,
              updated_at: updatedAtIso,
            }
          : {
              meeting_id: workspaceId,
              strategic_topic_id: strategicTopicId,
              strategic_topic_item_id: strategicTopicItemId,
              content_text: contentText,
              content_json: contentJson,
              updated_at: updatedAtIso,
            },
      ),
    });

    if (!response.ok) {
      throw new Error(
        await getRestErrorMessage(response, "Strategic topic note save"),
      );
    }

    const notes = (await response.json()) as SupabaseStrategicTopicNote[];
    const note = notes[0];
    if (!note) {
      throw new Error("Strategic topic note was not saved.");
    }

    return note;
  },
};

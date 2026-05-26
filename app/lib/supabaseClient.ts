const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

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

export type SupabaseMeeting = {
  id: string;
  created_at: string;
  updated_at: string;
  owner_id: string;
  name: string;
  metadata_json: Record<string, unknown> | null;
  meeting_data: Record<string, unknown> | null;
  archived_at: string | null;
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

export type SupabaseStrategicTopicNote = {
  id: string;
  meeting_id: string;
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
      `${getRestUrl("meetings")}?select=*&order=updated_at.desc`,
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
    ownerId,
    name,
  }: {
    accessToken: string;
    ownerId: string;
    name: string;
  }) {
    const response = await fetch(getRestUrl("meetings"), {
      method: "POST",
      headers: {
        ...getSupabaseHeaders(accessToken),
        Prefer: "return=representation",
      },
      body: JSON.stringify({
        owner_id: ownerId,
        name,
        metadata_json: null,
        meeting_data: null,
      }),
    });

    if (!response.ok) {
      throw new Error(await getRestErrorMessage(response, "Workspace create"));
    }

    const meetings = (await response.json()) as SupabaseMeeting[];
    const meeting = meetings[0];
    if (!meeting) {
      throw new Error("Supabase did not return the created meeting.");
    }

    return meeting;
  },



  async duplicateWorkspace({
    accessToken,
    ownerId,
    sourceMeeting,
  }: {
    accessToken: string;
    ownerId: string;
    sourceMeeting: SupabaseMeeting;
  }) {
    const response = await fetch(getRestUrl("meetings"), {
      method: "POST",
      headers: {
        ...getSupabaseHeaders(accessToken),
        Prefer: "return=representation",
      },
      body: JSON.stringify({
        owner_id: ownerId,
        name: sourceMeeting.name.trim().endsWith("Copy")
          ? `${sourceMeeting.name.trim()} 2`
          : `${sourceMeeting.name.trim()} Copy`,
        metadata_json: sourceMeeting.metadata_json,
        meeting_data: sourceMeeting.meeting_data,
      }),
    });

    if (!response.ok) {
      throw new Error(await getRestErrorMessage(response, "Workspace duplicate"));
    }

    const meetings = (await response.json()) as SupabaseMeeting[];
    const meeting = meetings[0];
    if (!meeting) {
      throw new Error("Supabase did not return the duplicated meeting.");
    }

    return meeting;
  },

  async archiveWorkspace({
    accessToken,
    workspaceId,
  }: {
    accessToken: string;
    workspaceId: string;
  }) {
    const response = await fetch(
      `${getRestUrl("meetings")}?id=eq.${encodeURIComponent(workspaceId)}`,
      {
        method: "PATCH",
        headers: {
          ...getSupabaseHeaders(accessToken),
          Prefer: "return=representation",
        },
        body: JSON.stringify({ archived_at: new Date().toISOString() }),
      },
    );

    if (!response.ok) {
      throw new Error(await getRestErrorMessage(response, "Workspace archive"));
    }

    const meetings = (await response.json()) as SupabaseMeeting[];
    const meeting = meetings[0];
    if (!meeting) {
      throw new Error("Cloud meeting was not found or is not accessible.");
    }

    return meeting;
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
      )}&select=id,meeting_data&limit=1`,
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
      `${getRestUrl("meetings")}?id=eq.${encodeURIComponent(workspaceId)}`,
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

  async loadStrategicTopicNote({
    accessToken,
    workspaceId,
    strategicTopicItemId,
  }: {
    accessToken: string;
    workspaceId: string;
    strategicTopicItemId: number;
  }) {
    const response = await fetch(
      `${getRestUrl("strategic_topic_notes")}?meeting_id=eq.${encodeURIComponent(
        workspaceId,
      )}&strategic_topic_item_id=eq.${encodeURIComponent(
        String(strategicTopicItemId),
      )}&select=*&limit=1`,
      {
        method: "GET",
        headers: getSupabaseHeaders(accessToken),
      },
    );

    if (!response.ok) {
      throw new Error(await getRestErrorMessage(response, "Topic note load"));
    }

    const notes = (await response.json()) as SupabaseStrategicTopicNote[];
    return notes[0] ?? null;
  },

  async saveStrategicTopicNote({
    accessToken,
    workspaceId,
    strategicTopicItemId,
    contentText,
  }: {
    accessToken: string;
    workspaceId: string;
    strategicTopicItemId: number;
    contentText: string;
  }) {
    const response = await fetch(getRestUrl("strategic_topic_notes"), {
      method: "POST",
      headers: {
        ...getSupabaseHeaders(accessToken),
        Prefer: "resolution=merge-duplicates,return=representation",
      },
      body: JSON.stringify({
        meeting_id: workspaceId,
        strategic_topic_item_id: strategicTopicItemId,
        content_json: null,
        content_text: contentText,
      }),
    });

    if (!response.ok) {
      throw new Error(await getRestErrorMessage(response, "Topic note save"));
    }

    const notes = (await response.json()) as SupabaseStrategicTopicNote[];
    const note = notes[0];
    if (!note) {
      throw new Error("Strategic topic note was not saved.");
    }
    return note;
  },
};

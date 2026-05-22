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

const meetingTableCandidates = ["meetings", "workspaces"] as const;

const requestMeetingsRest = async (
  buildPath: (table: (typeof meetingTableCandidates)[number]) => string,
  init: RequestInit,
) => {
  let lastResponse: Response | null = null;

  for (const table of meetingTableCandidates) {
    const response = await fetch(buildPath(table), init);
    if (response.ok || response.status !== 404) {
      return { response, table };
    }

    lastResponse = response;
  }

  if (!lastResponse) {
    throw new Error("Supabase request did not return a response.");
  }

  return { response: lastResponse, table: "meetings" as const };
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
    const { response } = await requestMeetingsRest(
      (table) => `${getRestUrl(table)}?select=*&order=updated_at.desc`,
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
    const createInit = (table: "meetings" | "workspaces"): RequestInit => ({
      method: "POST",
      headers: {
        ...getSupabaseHeaders(accessToken),
        Prefer: "return=representation",
      },
      body: JSON.stringify({
        owner_id: ownerId,
        name,
        metadata_json: null,
        ...(table === "meetings"
          ? { meeting_data: null }
          : { workspace_data: null }),
      }),
    });
    const meetingsAttempt = await fetch(getRestUrl("meetings"), createInit("meetings"));
    const response =
      meetingsAttempt.status === 404
        ? await fetch(getRestUrl("workspaces"), createInit("workspaces"))
        : meetingsAttempt;

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

  async loadWorkspaceData({
    accessToken,
    workspaceId,
  }: {
    accessToken: string;
    workspaceId: string;
  }) {
    const { response, table } = await requestMeetingsRest(
      (tableName) =>
        `${getRestUrl(tableName)}?id=eq.${encodeURIComponent(
          workspaceId,
        )}&select=id,${
          tableName === "meetings" ? "meeting_data" : "workspace_data"
        }&limit=1`,
      {
        method: "GET",
        headers: getSupabaseHeaders(accessToken),
      },
    );

    if (!response.ok) {
      throw new Error(await getRestErrorMessage(response, "Workspace load"));
    }

    const meetings = (await response.json()) as Array<
      Pick<SupabaseMeeting, "id"> & {
        meeting_data?: Record<string, unknown> | null;
        workspace_data?: Record<string, unknown> | null;
      }
    >;
    const meeting = meetings[0];
    if (!meeting) {
      throw new Error("Cloud meeting was not found or is not accessible.");
    }

    return table === "meetings"
      ? meeting.meeting_data ?? null
      : meeting.workspace_data ?? null;
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
    const saveInit = (table: "meetings" | "workspaces"): RequestInit => ({
      method: "PATCH",
      headers: {
        ...getSupabaseHeaders(accessToken),
        Prefer: "return=representation",
      },
      body: JSON.stringify(
        table === "meetings" ? { meeting_data: data } : { workspace_data: data },
      ),
    });
    const meetingsAttempt = await fetch(
      `${getRestUrl("meetings")}?id=eq.${encodeURIComponent(workspaceId)}`,
      saveInit("meetings"),
    );
    const response =
      meetingsAttempt.status === 404
        ? await fetch(
            `${getRestUrl("workspaces")}?id=eq.${encodeURIComponent(workspaceId)}`,
            saveInit("workspaces"),
          )
        : meetingsAttempt;

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
};

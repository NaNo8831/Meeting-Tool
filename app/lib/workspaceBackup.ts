import { objectivesData } from "@/data/objectives";
import {
  defaultDashboardTitle,
  defaultMeetingSectionOrder,
  defaultOrganizationInfo,
  defaultStandardOperatingObjectives,
} from "@/app/lib/objectiveOptions";

export const workspaceBackupAppId = "meeting-tool-workspace-backup";
export const workspaceBackupVersion = 1;
export const workspaceStorageKeyPrefix = "leadership-";

export type WorkspaceBackupFeedback = {
  type: "success" | "error";
  message: string;
};

export type WorkspaceBackupFile = {
  app: typeof workspaceBackupAppId;
  backupVersion: number;
  exportedAt: string;
  localStorage: Record<string, unknown>;
};

export const defaultWorkspaceStorageEntries: Record<string, unknown> = {
  "leadership-objectives": objectivesData,
  "leadership-meetings": [],
  "leadership-active-meeting-id": null,
  "leadership-dashboard-title": defaultDashboardTitle,
  "leadership-organization-info": defaultOrganizationInfo,
  "leadership-meeting-setup-completed": false,
  "leadership-meeting-section-order": defaultMeetingSectionOrder,
  "leadership-strategic-topic-items": [],
  "leadership-strategic-topic-notes": {},
  "leadership-standard-operating-objectives":
    defaultStandardOperatingObjectives,
};

const supportedBackupVersions = [workspaceBackupVersion];

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const stableStringify = (value: unknown): string => {
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }

  if (isPlainObject(value)) {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
      .join(",")}}`;
  }

  return JSON.stringify(value);
};

const hasMeetingContent = (value: unknown) =>
  Array.isArray(value) &&
  value.some(
    (meeting) =>
      isPlainObject(meeting) &&
      ["agendaItems", "topicItems", "decisionItems", "cascadeItems"].some(
        (key) => Array.isArray(meeting[key]) && meeting[key].length > 0,
      ),
  );

const isMeaningfulWorkspaceValue = (key: string, value: unknown) => {
  if (key === "leadership-active-meeting-id") return false;
  if (key === "leadership-meetings") return hasMeetingContent(value);

  const defaultValue = defaultWorkspaceStorageEntries[key];
  if (defaultValue === undefined) return true;

  return stableStringify(value) !== stableStringify(defaultValue);
};

const parseStoredValue = (value: string) => {
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return value;
  }
};

const validateStorageEntries = (entries: unknown): Record<string, unknown> => {
  if (!isPlainObject(entries)) {
    throw new Error("Backup data is missing local workspace data.");
  }

  const restoredEntries = Object.entries(entries).reduce<
    Record<string, unknown>
  >((validEntries, [key, value]) => {
    if (!key.startsWith(workspaceStorageKeyPrefix)) return validEntries;

    JSON.stringify(value);
    validEntries[key] = value;
    return validEntries;
  }, {});

  if (Object.keys(restoredEntries).length === 0) {
    throw new Error("Backup does not contain Meeting Tool workspace data.");
  }

  return restoredEntries;
};

export const createWorkspaceBackup = (
  currentEntries: Record<string, unknown>,
): WorkspaceBackupFile => ({
  app: workspaceBackupAppId,
  backupVersion: workspaceBackupVersion,
  exportedAt: new Date().toISOString(),
  localStorage: currentEntries,
});

export const collectWorkspaceStorage = (
  currentEntries: Record<string, unknown>,
): Record<string, unknown> => {
  if (typeof window === "undefined") return currentEntries;

  const storedEntries: Record<string, unknown> = {};
  for (let index = 0; index < window.localStorage.length; index += 1) {
    const key = window.localStorage.key(index);
    if (!key?.startsWith(workspaceStorageKeyPrefix)) continue;

    const storedValue = window.localStorage.getItem(key);
    if (storedValue !== null) {
      storedEntries[key] = parseStoredValue(storedValue);
    }
  }

  return {
    ...storedEntries,
    ...currentEntries,
  };
};

export const validateWorkspaceBackup = (
  backup: unknown,
): WorkspaceBackupFile => {
  if (!isPlainObject(backup)) {
    throw new Error("Backup file must contain a JSON object.");
  }

  if (backup.app !== workspaceBackupAppId) {
    throw new Error("This does not appear to be a Meeting Tool backup file.");
  }

  if (
    typeof backup.backupVersion !== "number" ||
    !supportedBackupVersions.includes(backup.backupVersion)
  ) {
    throw new Error("This backup version is not supported by this app.");
  }

  if (typeof backup.exportedAt !== "string") {
    throw new Error("Backup is missing an export timestamp.");
  }

  return {
    app: workspaceBackupAppId,
    backupVersion: backup.backupVersion,
    exportedAt: backup.exportedAt,
    localStorage: validateStorageEntries(backup.localStorage),
  };
};

export const restoreWorkspaceBackup = (backup: WorkspaceBackupFile) => {
  if (typeof window === "undefined") return;

  const nextEntries = Object.entries(
    validateStorageEntries(backup.localStorage),
  );

  for (let index = 0; index < window.localStorage.length; index += 1) {
    const key = window.localStorage.key(index);
    if (key?.startsWith(workspaceStorageKeyPrefix)) {
      window.localStorage.removeItem(key);
      index -= 1;
    }
  }

  nextEntries.forEach(([key, value]) => {
    window.localStorage.setItem(key, JSON.stringify(value));
  });
};

export const hasMeaningfulWorkspaceStorage = (
  entries: Record<string, unknown>,
) =>
  Object.entries(entries).some(([key, value]) =>
    isMeaningfulWorkspaceValue(key, value),
  );

export const getWorkspaceStorageSignature = (
  entries: Record<string, unknown>,
) => stableStringify(validateStorageEntries(entries));

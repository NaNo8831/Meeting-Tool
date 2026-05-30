'use client';

import { useBodyScrollLock } from '@/app/hooks/useBodyScrollLock';
import type { WorkspaceBackupFeedback } from '@/app/lib/workspaceBackup';

interface BackupRestoreModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExportWorkspaceBackup: () => void;
  onImportWorkspaceBackup: (file: File) => void;
  backupFeedback: WorkspaceBackupFeedback | null;
}

export function BackupRestoreModal({
  isOpen,
  onClose,
  onExportWorkspaceBackup,
  onImportWorkspaceBackup,
  backupFeedback,
}: BackupRestoreModalProps) {
  useBodyScrollLock(isOpen);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 px-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="backup-restore-title"
    >
      <div
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white p-8 shadow-2xl md:p-10"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="mb-8 space-y-3">
          <h2 id="backup-restore-title" className="text-4xl font-bold text-slate-950 md:text-5xl">
            Backup / Restore
          </h2>
          <p className="text-xl text-slate-600">
            Export a JSON backup of this browser workspace or import a previous backup to restore local Meeting Tool data.
          </p>
        </div>

        <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
          <div className="mb-4">
            <h3 className="text-2xl font-semibold text-slate-950">
              Workspace Backup Controls
            </h3>
            <p className="mt-2 text-lg text-slate-600">
              Export before clearing browser storage, switching devices, or restoring a previous workspace.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <button
              type="button"
              onClick={onExportWorkspaceBackup}
              className="rounded-xl bg-blue-600 px-5 py-3 text-lg font-semibold text-white hover:bg-blue-700"
            >
              Export Workspace Backup
            </button>

            <label className="inline-flex cursor-pointer items-center justify-center rounded-xl border border-slate-300 bg-white px-5 py-3 text-lg font-semibold text-slate-800 hover:bg-slate-50">
              Import Workspace Backup
              <input
                type="file"
                accept="application/json,.json"
                className="sr-only"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) onImportWorkspaceBackup(file);
                  event.target.value = '';
                }}
              />
            </label>
          </div>

          {backupFeedback ? (
            <p
              className={`mt-4 rounded-xl px-4 py-3 text-base font-medium ${
                backupFeedback.type === 'success'
                  ? 'bg-green-100 text-green-800'
                  : 'bg-red-100 text-red-800'
              }`}
              role="status"
            >
              {backupFeedback.message}
            </p>
          ) : null}
        </section>

        <button
          type="button"
          onClick={onClose}
          className="mt-8 rounded-xl bg-blue-600 px-8 py-3 text-xl font-semibold text-white hover:bg-blue-700"
        >
          Close
        </button>
      </div>
    </div>
  );
}

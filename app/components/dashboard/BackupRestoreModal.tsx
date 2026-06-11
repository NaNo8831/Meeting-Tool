'use client';

import { useState } from 'react';
import { useBodyScrollLock } from '@/app/hooks/useBodyScrollLock';
import type { WorkspaceBackupFeedback } from '@/app/lib/workspaceBackup';

interface BackupRestoreModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExportWorkspaceBackup?: () => void;
  onImportWorkspaceBackup?: (file: File, meetingName: string) => void;
  backupFeedback: WorkspaceBackupFeedback | null;
  /** Controls which actions are visible. Defaults to 'both'. */
  mode?: 'both' | 'export-only' | 'import-only';
}

export function BackupRestoreModal({
  isOpen,
  onClose,
  onExportWorkspaceBackup,
  onImportWorkspaceBackup,
  backupFeedback,
  mode = 'both',
}: BackupRestoreModalProps) {
  const [importMeetingName, setImportMeetingName] = useState('Restored Meeting');
  const [showNameError, setShowNameError] = useState(false);
  const trimmedName = importMeetingName.trim();
  useBodyScrollLock(isOpen);

  if (!isOpen) return null;

  const title =
    mode === 'import-only'
      ? 'Restore from Backup'
      : mode === 'export-only'
      ? 'Export Backup'
      : 'Backup / Restore';

  const description =
    mode === 'import-only'
      ? 'Create a new meeting from a saved backup file. Your existing meetings are not affected.'
      : mode === 'export-only'
      ? 'Save a copy of this meeting to your device.'
      : 'Save a copy of your workspace or restore from a previous backup.';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 px-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="backup-restore-title"
    >
      <div
        className="w-full max-w-lg rounded-3xl bg-white p-8 shadow-2xl"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="mb-6 space-y-2">
          <h2 id="backup-restore-title" className="text-3xl font-bold text-slate-950">
            {title}
          </h2>
          <p className="text-base text-slate-600">{description}</p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          {mode !== 'import-only' && onExportWorkspaceBackup ? (
            <button
              type="button"
              onClick={onExportWorkspaceBackup}
              className="rounded-xl bg-blue-600 px-5 py-3 text-base font-semibold text-white hover:bg-blue-700"
            >
              Download Backup File
            </button>
          ) : null}

          {mode !== 'export-only' && onImportWorkspaceBackup ? (
            <div className="flex flex-col gap-3">
              <div>
                <label className="mb-1 block text-sm font-semibold text-slate-700">
                  Meeting name
                </label>
                <input
                  type="text"
                  value={importMeetingName}
                  onChange={(e) => {
                    setImportMeetingName(e.target.value);
                    if (showNameError && e.target.value.trim()) setShowNameError(false);
                  }}
                  maxLength={80}
                  className={`w-full rounded-xl border px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-300 ${showNameError ? 'border-red-400 bg-red-50' : 'border-slate-300 bg-white'}`}
                  placeholder="Restored Meeting"
                />
                {showNameError ? (
                  <p className="mt-1 text-xs text-red-600">Please enter a meeting name.</p>
                ) : null}
              </div>
              <label
                className={`inline-flex items-center justify-center self-start rounded-xl border px-5 py-3 text-base font-semibold ${trimmedName ? 'cursor-pointer border-slate-300 bg-white text-slate-800 hover:bg-slate-50' : 'cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400'}`}
                onClick={(e) => { if (!trimmedName) { e.preventDefault(); setShowNameError(true); } }}
              >
                Choose Backup File
                <input
                  type="file"
                  accept="application/json,.json"
                  className="sr-only"
                  disabled={!trimmedName}
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) onImportWorkspaceBackup(file, trimmedName);
                    event.target.value = '';
                  }}
                />
              </label>
            </div>
          ) : null}
        </div>

        {backupFeedback ? (
          <p
            className={`mt-4 rounded-xl px-4 py-3 text-sm font-medium ${
              backupFeedback.type === 'success'
                ? 'bg-green-100 text-green-800'
                : 'bg-red-100 text-red-800'
            }`}
            role="status"
          >
            {backupFeedback.message}
          </p>
        ) : null}

        <button
          type="button"
          onClick={onClose}
          className="mt-6 rounded-xl border border-slate-300 px-6 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          Close
        </button>
      </div>
    </div>
  );
}

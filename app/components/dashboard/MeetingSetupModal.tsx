"use client";

import { useState } from "react";
import { useBodyScrollLock } from "@/app/hooks/useBodyScrollLock";
import { RichTextEditor } from "@/app/components/ui/RichTextEditor";
import type { OrganizationInfo } from "@/app/types/dashboard";
import type { RichTextDocument } from "@/app/types/richText";

interface MeetingSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  organizationInfo: OrganizationInfo;
  onSave: (info: OrganizationInfo) => void;
  dashboardTitle: string;
  onDashboardTitleChange: (value: string) => void;
  onComplete: () => void;
  requireCompletion?: boolean;
}

export function MeetingSetupModal({
  isOpen,
  onClose,
  organizationInfo,
  onSave,
  dashboardTitle,
  onDashboardTitleChange,
  onComplete,
  requireCompletion = false,
}: MeetingSetupModalProps) {
  useBodyScrollLock(isOpen);
  const [draftTitle, setDraftTitle] = useState(dashboardTitle);
  const [draftInfo, setDraftInfo] = useState(organizationInfo);

  if (!isOpen) return null;

  const updateDraftInfo = <Field extends keyof OrganizationInfo>(
    field: Field,
    value: OrganizationInfo[Field],
  ) => {
    setDraftInfo((currentInfo) => ({ ...currentInfo, [field]: value }));
  };

  const saveSetup = () => {
    onDashboardTitleChange(draftTitle.trim());
    onSave(draftInfo);
    onComplete();
    onClose();
  };

  const fieldClasses =
    "bg-blue-50/70 p-4 rounded-2xl text-base leading-relaxed text-slate-800 min-h-24";
  const editorClasses = "text-base leading-relaxed";

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto overscroll-contain bg-black bg-opacity-50">
      <div className="min-h-full px-4 py-4 sm:py-6">
        <div className="mx-auto w-full max-w-5xl rounded-3xl bg-white p-6 shadow-2xl md:p-8">
          <div className="mb-8 grid gap-6 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
            <div className="rounded-3xl bg-slate-950 p-6 text-white">
              <p className="text-sm font-semibold uppercase tracking-wide text-blue-200">
                First-time setup
              </p>
              <h2 className="mt-3 text-3xl font-bold md:text-4xl">
                Build your meeting playbook
              </h2>
              <p className="mt-4 text-lg leading-relaxed text-slate-200">
                Add your team context once, then update it whenever needed.
              </p>
            </div>

            <div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <label
                  className="block text-xl font-semibold text-slate-950"
                  htmlFor="meeting-setup-title"
                >
                  Team or Meeting Name
                </label>
                <input
                  id="meeting-setup-title"
                  type="text"
                  value={draftTitle}
                  onChange={(event) => setDraftTitle(event.target.value)}
                  className="mt-3 w-full rounded-xl border border-slate-300 px-4 py-3 text-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-300"
                  placeholder=""
                />
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <section className="rounded-3xl border border-blue-100 bg-blue-50/80 p-5 shadow-sm">
              <label
                className="block text-2xl font-bold text-slate-950"
                htmlFor="meeting-setup-why"
              >
                Why Do We Exist?
              </label>
              <textarea
                id="meeting-setup-why"
                value={draftInfo.whyExist}
                onChange={(event) =>
                  updateDraftInfo("whyExist", event.target.value)
                }
                className="mt-3 min-h-32 w-full rounded-2xl border border-blue-100 bg-white/90 p-4 text-xl leading-relaxed text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-300"
                placeholder=""
              />
            </section>

            <div className="grid gap-5 lg:grid-cols-3">
              <div className="rounded-2xl border border-slate-200 p-5">
                <label className="mb-3 block text-xl font-semibold text-slate-950">
                  How Do We Behave?
                </label>
                <RichTextEditor
                  value={draftInfo.howBehave}
                  onChange={(value: RichTextDocument) =>
                    updateDraftInfo("howBehave", value)
                  }
                  placeholder=""
                  className={fieldClasses}
                  editorClassName={editorClasses}
                  minHeightClassName="min-h-[130px]"
                  ariaLabel="Setup how do we behave"
                  editingMode="always"
                />
              </div>

              <div className="rounded-2xl border border-slate-200 p-5">
                <label className="mb-3 block text-xl font-semibold text-slate-950">
                  What Do We Do?
                </label>
                <RichTextEditor
                  value={draftInfo.whatDo}
                  onChange={(value: RichTextDocument) =>
                    updateDraftInfo("whatDo", value)
                  }
                  placeholder=""
                  className={fieldClasses}
                  editorClassName={editorClasses}
                  minHeightClassName="min-h-[130px]"
                  ariaLabel="Setup what do we do"
                  editingMode="always"
                />
              </div>

              <div className="rounded-2xl border border-slate-200 p-5">
                <label className="mb-3 block text-xl font-semibold text-slate-950">
                  How Will We Succeed?
                </label>
                <RichTextEditor
                  value={draftInfo.howSucceed}
                  onChange={(value: RichTextDocument) =>
                    updateDraftInfo("howSucceed", value)
                  }
                  placeholder=""
                  className={fieldClasses}
                  editorClassName={editorClasses}
                  minHeightClassName="min-h-[130px]"
                  ariaLabel="Setup how will we succeed"
                  editingMode="always"
                />
              </div>
            </div>

            <section className="rounded-3xl border border-blue-100 bg-blue-50/80 p-5 shadow-sm">
              <label
                className="block text-2xl font-bold text-slate-950"
                htmlFor="meeting-setup-priority"
              >
                Top Priority
              </label>
              <textarea
                id="meeting-setup-priority"
                value={draftInfo.rallyCry}
                onChange={(event) =>
                  updateDraftInfo("rallyCry", event.target.value)
                }
                className="mt-3 min-h-28 w-full rounded-2xl border border-blue-100 bg-white/90 p-4 text-2xl font-bold leading-snug text-slate-950 focus:outline-none focus:ring-2 focus:ring-blue-300"
                placeholder=""
              />
            </section>
          </div>

          <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
            <button
              type="button"
              onClick={onClose}
              className={`rounded-xl px-5 py-3 font-semibold text-slate-700 hover:bg-slate-100 ${requireCompletion ? "invisible pointer-events-none" : ""}`}
              aria-hidden={requireCompletion}
              tabIndex={requireCompletion ? -1 : 0}
            >
              Cancel
            </button>
            <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={saveSetup}
                className="rounded-xl bg-blue-600 px-6 py-3 text-lg font-semibold text-white hover:bg-blue-700"
              >
                {requireCompletion ? "Finish setup" : "Save setup"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

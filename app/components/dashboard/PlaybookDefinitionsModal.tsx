'use client';

import { EditableField } from '@/app/components/ui/EditableField';
import { useBodyScrollLock } from '@/app/hooks/useBodyScrollLock';
import { RichTextEditor } from '@/app/components/ui/RichTextEditor';
import type { OrganizationInfo } from '@/app/types/dashboard';
import type { RichTextDocument } from '@/app/types/richText';

interface PlaybookDefinitionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  organizationInfo: OrganizationInfo;
  onSave: (info: OrganizationInfo) => void;
  dashboardTitle: string;
  onDashboardTitleChange: (value: string) => void;
}

export function PlaybookDefinitionsModal({
  isOpen,
  onClose,
  organizationInfo,
  onSave,
  dashboardTitle,
  onDashboardTitleChange,
}: PlaybookDefinitionsModalProps) {
  useBodyScrollLock(isOpen);

  if (!isOpen) return null;

  const handleSave = (field: keyof OrganizationInfo, value: OrganizationInfo[keyof OrganizationInfo]) => {
    onSave({ ...organizationInfo, [field]: value });
  };

  const fieldClasses = 'bg-blue-50 p-5 rounded-2xl text-xl leading-relaxed text-slate-800 min-h-24';
  const editorClasses = 'text-xl leading-relaxed';
  const actionClasses = 'px-5 py-2 text-lg';

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 px-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="playbook-definitions-title"
      onMouseDown={onClose}
    >
      <div
        className="bg-white rounded-3xl p-8 md:p-10 max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="mb-8 space-y-3">
          <h2 id="playbook-definitions-title" className="text-4xl md:text-5xl font-bold text-slate-950">Edit Playbook</h2>
          <p className="text-xl text-slate-600">
            Name your team or meeting here, then edit the shared playbook language for the dashboard.
          </p>
        </div>

        <div className="space-y-8 text-xl">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
            <label className="block text-2xl font-semibold mb-3 text-slate-950">Team or Meeting Name</label>
            <input
              type="text"
              value={dashboardTitle}
              onChange={(e) => onDashboardTitleChange(e.target.value)}
              className="w-full px-5 py-4 border border-slate-300 rounded-xl text-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-300"
              placeholder="Name your team or meeting"
            />
            <p className="text-lg text-slate-500 mt-3">
              This name appears in the dashboard header so everyone knows which team or meeting this space supports.
            </p>
          </div>

          <section className="rounded-3xl border border-blue-100 bg-blue-50/80 p-6 shadow-sm">
            <label className="block text-3xl font-bold mb-4 text-slate-950">Why Do We Exist?</label>
            <EditableField
              value={organizationInfo.whyExist}
              onSave={(value) => handleSave('whyExist', value)}
              placeholder="Enter your mission..."
              ariaLabel="Why do we exist?"
              multiline
              className="bg-white/80 p-5 rounded-2xl text-2xl leading-relaxed text-slate-900 min-h-28"
              editorClassName="text-2xl leading-relaxed min-h-[160px]"
              actionClassName={actionClasses}
            />
          </section>

          <div className="space-y-6">
            <div className="rounded-2xl border border-slate-200 p-5">
              <label className="block text-2xl font-semibold mb-3 text-slate-950">How Do We Behave?</label>
              <RichTextEditor
                value={organizationInfo.howBehave}
                onChange={(value: RichTextDocument) => handleSave('howBehave', value)}
                placeholder="Enter your values..."
                className={fieldClasses}
                editorClassName={editorClasses}
                minHeightClassName="min-h-[120px]"
                ariaLabel="How do we behave?"
                editingMode="always"
              />
            </div>

            <div className="rounded-2xl border border-slate-200 p-5">
              <label className="block text-2xl font-semibold mb-3 text-slate-950">What Do We Do?</label>
              <RichTextEditor
                value={organizationInfo.whatDo}
                onChange={(value: RichTextDocument) => handleSave('whatDo', value)}
                placeholder="Enter what you do..."
                className={fieldClasses}
                editorClassName={editorClasses}
                minHeightClassName="min-h-[120px]"
                ariaLabel="What do we do?"
                editingMode="always"
              />
            </div>

            <div className="rounded-2xl border border-slate-200 p-5">
              <label className="block text-2xl font-semibold mb-3 text-slate-950">How Will We Succeed?</label>
              <RichTextEditor
                value={organizationInfo.howSucceed}
                onChange={(value: RichTextDocument) => handleSave('howSucceed', value)}
                placeholder="Enter success metrics..."
                className={fieldClasses}
                editorClassName={editorClasses}
                minHeightClassName="min-h-[120px]"
                ariaLabel="How will we succeed?"
                editingMode="always"
              />
            </div>
          </div>

          <section className="rounded-3xl border border-blue-100 bg-blue-50/80 p-6 shadow-sm">
            <label className="block text-3xl font-bold mb-4 text-slate-950">Top Priority</label>
            <EditableField
              value={organizationInfo.rallyCry}
              onSave={(value) => handleSave('rallyCry', value)}
              placeholder="Top Priority"
              ariaLabel="Top priority"
              multiline
              className="bg-white/80 p-5 rounded-2xl text-3xl font-bold leading-snug text-slate-950 min-h-24"
              editorClassName="text-3xl font-bold leading-snug min-h-[140px]"
              actionClassName={actionClasses}
            />
          </section>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="mt-8 px-8 py-3 bg-blue-600 text-white rounded-xl text-xl font-semibold hover:bg-blue-700"
        >
          Close
        </button>
      </div>
    </div>
  );
}

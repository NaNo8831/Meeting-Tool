'use client';

import { useEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import { RichTextEditor } from '@/app/components/ui/RichTextEditor';
import { taskStatusOptions } from '@/app/lib/objectiveOptions';
import type { Subtask, Task, TaskActivity, TaskComment, TaskStatus } from '@/app/types/objective';

interface TaskDetailsModalProps {
  task: Task;
  objectiveTitle: string;
  onClose: () => void;
  onDelete: () => void;
  onUpdate: (updates: Partial<Task>) => void;
}

type SaveStatus = 'saving' | 'saved';
type TaskActivityInput = Pick<
  TaskActivity,
  'message' | 'type' | 'subtaskId' | 'subtaskTitle' | 'subtaskCompleted'
>;

const statusLabels: Record<TaskStatus, string> = {
  planning: 'Planning',
  'in-progress': 'In Progress',
  completed: 'Completed'
};

export function TaskDetailsModal({ task, objectiveTitle, onClose, onDelete, onUpdate }: TaskDetailsModalProps) {
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [newCommentText, setNewCommentText] = useState('');
  const [draftTitle, setDraftTitle] = useState(task.title);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [draftAssignedTo, setDraftAssignedTo] = useState(task.assignedTo ?? '');
  const [draftDueDate, setDraftDueDate] = useState(task.dueDate ?? '');
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('saved');
  const subtasks = useMemo(() => task.subtasks ?? [], [task.subtasks]);
  const comments = useMemo(() => task.comments ?? [], [task.comments]);
  const activityHistory = useMemo(() => task.activityHistory ?? [], [task.activityHistory]);
  const saveStatusTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const nextSubtaskIdRef = useRef(Math.max(0, ...subtasks.map((subtask) => subtask.id)) + 1);
  const nextCommentIdRef = useRef(Math.max(0, ...comments.map((comment) => comment.id)) + 1);
  const nextActivityIdRef = useRef(Math.max(0, ...activityHistory.map((activity) => activity.id)) + 1);
  const lastActivityValuesRef = useRef({
    taskId: task.id,
    title: task.title,
    assignedTo: task.assignedTo ?? '',
    dueDate: task.dueDate ?? ''
  });

  useEffect(() => {
    if (lastActivityValuesRef.current.taskId !== task.id) {
      setDraftTitle(task.title);
      setIsEditingTitle(false);
      setDraftAssignedTo(task.assignedTo ?? '');
      setDraftDueDate(task.dueDate ?? '');
      lastActivityValuesRef.current = {
        taskId: task.id,
        title: task.title,
        assignedTo: task.assignedTo ?? '',
        dueDate: task.dueDate ?? ''
      };
    }
  }, [task.id, task.title, task.assignedTo, task.dueDate]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  useEffect(() => {
    nextSubtaskIdRef.current = Math.max(
      nextSubtaskIdRef.current,
      Math.max(0, ...subtasks.map((subtask) => subtask.id)) + 1
    );
  }, [subtasks]);

  useEffect(() => {
    nextCommentIdRef.current = Math.max(
      nextCommentIdRef.current,
      Math.max(0, ...comments.map((comment) => comment.id)) + 1
    );
  }, [comments]);

  useEffect(() => {
    nextActivityIdRef.current = Math.max(
      nextActivityIdRef.current,
      Math.max(0, ...activityHistory.map((activity) => activity.id)) + 1
    );
  }, [activityHistory]);

  useEffect(() => () => {
    if (saveStatusTimeoutRef.current) {
      clearTimeout(saveStatusTimeoutRef.current);
    }
  }, []);

  const createActivity = ({
    message,
    type,
    subtaskId,
    subtaskTitle,
    subtaskCompleted
  }: TaskActivityInput): TaskActivity => ({
    id: nextActivityIdRef.current++,
    message,
    createdAt: new Date().toISOString(),
    type,
    subtaskId,
    subtaskTitle,
    subtaskCompleted
  });

  const markSaving = () => {
    setSaveStatus('saving');

    if (saveStatusTimeoutRef.current) {
      clearTimeout(saveStatusTimeoutRef.current);
    }

    saveStatusTimeoutRef.current = setTimeout(() => {
      setSaveStatus('saved');
    }, 500);
  };

  const handleUpdate = (updates: Partial<Task>, activity?: TaskActivityInput) => {
    onUpdate({
      ...updates,
      ...(activity
        ? { activityHistory: [createActivity(activity), ...activityHistory] }
        : {})
    });
    markSaving();
  };

  const updateSubtasks = (updatedSubtasks: Subtask[], activity?: TaskActivityInput) => {
    handleUpdate({ subtasks: updatedSubtasks }, activity);
  };

  const updateComments = (updatedComments: TaskComment[]) => {
    handleUpdate({ comments: updatedComments });
  };

  const addSubtask = () => {
    const title = newSubtaskTitle.trim();
    if (!title) return;

    updateSubtasks([
      ...subtasks,
      {
        id: nextSubtaskIdRef.current++,
        title,
        completed: false
      }
    ], { message: `Subtask added: ${title}` });
    setNewSubtaskTitle('');
  };

  const updateSubtask = (subtaskId: number, updates: Partial<Subtask>) => {
    const currentSubtask = subtasks.find((subtask) => subtask.id === subtaskId);
    const updatedSubtasks = subtasks.map((subtask) => (
      subtask.id === subtaskId ? { ...subtask, ...updates } : subtask
    ));

    if (updates.completed === true && currentSubtask?.completed === false) {
      updateSubtasks(updatedSubtasks, {
        message: `Subtask completed: ${currentSubtask.title || 'Untitled subtask'}`,
        type: 'subtask-completed',
        subtaskId
      });
      return;
    }

    if (updates.completed === false && currentSubtask?.completed === true) {
      handleUpdate({
        subtasks: updatedSubtasks,
        activityHistory: activityHistory.filter((activity) => (
          activity.type === 'subtask-completed'
            ? activity.subtaskId !== subtaskId
            : activity.message !== `Subtask completed: ${currentSubtask.title || 'Untitled subtask'}`
        ))
      });
      return;
    }

    updateSubtasks(updatedSubtasks);
  };

  const deleteSubtask = (subtaskId: number) => {
    const deletedSubtask = subtasks.find((subtask) => subtask.id === subtaskId);
    updateSubtasks(
      subtasks.filter((subtask) => subtask.id !== subtaskId),
      {
        message: `Subtask deleted: ${deletedSubtask?.title || 'Untitled subtask'}`,
        type: 'subtask-deleted',
        subtaskId,
        subtaskTitle: deletedSubtask?.title || 'Untitled subtask',
        subtaskCompleted: deletedSubtask?.completed ?? false
      }
    );
  };

  const restoreDeletedSubtask = (activity: TaskActivity) => {
    if (activity.type !== 'subtask-deleted' || activity.subtaskId === undefined) return;
    if (activity.subtaskCompleted || subtasks.some((subtask) => subtask.id === activity.subtaskId)) return;

    handleUpdate({
      subtasks: [
        ...subtasks,
        {
          id: activity.subtaskId,
          title: activity.subtaskTitle || 'Untitled subtask',
          completed: false
        }
      ],
      activityHistory: activityHistory.filter((activityEntry) => activityEntry.id !== activity.id)
    });
  };

  const canRestoreDeletedSubtask = (activity: TaskActivity) => activity.type === 'subtask-deleted'
    && activity.subtaskCompleted === false
    && activity.subtaskId !== undefined
    && !subtasks.some((subtask) => subtask.id === activity.subtaskId);

  const addComment = () => {
    const text = newCommentText.trim();
    if (!text) return;

    updateComments([
      ...comments,
      {
        id: nextCommentIdRef.current++,
        text,
        createdAt: new Date().toISOString()
      }
    ]);
    setNewCommentText('');
  };

  const deleteComment = (commentId: number) => {
    updateComments(comments.filter((comment) => comment.id !== commentId));
  };

  const commitTitleActivity = () => {
    setIsEditingTitle(false);
    if (draftTitle === lastActivityValuesRef.current.title) return;

    lastActivityValuesRef.current.title = draftTitle;
    handleUpdate({ title: draftTitle }, { message: `Title changed to ${draftTitle || 'Untitled task'}` });
  };

  const startTitleEditing = () => {
    setIsEditingTitle(true);
  };

  const handleTitleViewerKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'Enter' && event.key !== 'F2') return;

    event.preventDefault();
    startTitleEditing();
  };

  const commitAssignedToActivity = () => {
    if (draftAssignedTo === lastActivityValuesRef.current.assignedTo) return;

    lastActivityValuesRef.current.assignedTo = draftAssignedTo;
    handleUpdate({ assignedTo: draftAssignedTo }, { message: `Assignee changed to ${draftAssignedTo || 'Unassigned'}` });
  };

  const updateDueDateDraft = (dueDate: string) => {
    setDraftDueDate(dueDate);
    handleUpdate({ dueDate });
  };

  const commitDueDateActivity = () => {
    if (draftDueDate === lastActivityValuesRef.current.dueDate) return;

    const activityMessage = `Due date changed to ${draftDueDate || 'No due date'}`;
    lastActivityValuesRef.current.dueDate = draftDueDate;
    onUpdate({
      dueDate: draftDueDate,
      activityHistory: [
        createActivity({
          message: activityMessage,
          type: 'due-date-changed'
        }),
        ...activityHistory.filter((activity) => activity.message !== activityMessage)
      ]
    });
    markSaving();
  };

  const updateStatus = (status: TaskStatus) => {
    if (status === task.status) return;

    handleUpdate({ status }, { message: `Status changed to ${statusLabels[status]}` });
  };

  const formatTimestamp = (createdAt: string) => {
    const timestamp = new Date(createdAt);
    if (Number.isNaN(timestamp.getTime())) return 'Unknown time';

    return timestamp.toLocaleString([], {
      dateStyle: 'medium',
      timeStyle: 'short'
    });
  };

  const formatCommentTimestamp = (createdAt: string) => {
    return formatTimestamp(createdAt);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="task-details-title"
      onMouseDown={onClose}
    >
      <div
        className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-3xl bg-white shadow-2xl"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white/95 px-6 py-4 backdrop-blur">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Task details</p>
            <p className="text-sm text-slate-500">{objectiveTitle}</p>
          </div>
          <div className="flex items-center gap-3">
            <span
              className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600"
              role="status"
              aria-live="polite"
            >
              {saveStatus === 'saving' ? 'Saving...' : 'Saved'}
            </span>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-200"
              aria-label="Close task details"
            >
              Close
            </button>
          </div>
        </div>

        <div className="grid gap-6 p-6 lg:grid-cols-[1fr_280px]">
          <section className="space-y-6">
            <div id="task-details-title">
              {isEditingTitle ? (
                <label className="block">
                  <span className="sr-only">Task title</span>
                  <input
                    value={draftTitle}
                    autoFocus
                    onChange={(event) => {
                      setDraftTitle(event.target.value);
                      handleUpdate({ title: event.target.value });
                    }}
                    onBlur={commitTitleActivity}
                    onKeyDown={(event) => {
                      if (event.key === 'Escape') {
                        event.preventDefault();
                        commitTitleActivity();
                      }
                    }}
                    placeholder="Task title"
                    className="w-full rounded-2xl border border-transparent px-1 py-2 text-3xl font-bold text-slate-950 outline-none hover:border-slate-200 focus:border-blue-400 focus:bg-blue-50/40"
                  />
                </label>
              ) : (
                <div
                  className="group rounded-2xl px-1 py-2 text-3xl font-bold text-slate-950 focus:outline-none focus:ring-2 focus:ring-blue-200"
                  onDoubleClick={startTitleEditing}
                  onKeyDown={handleTitleViewerKeyDown}
                  tabIndex={0}
                  role="button"
                  aria-label="Task title. Double-click to edit."
                  title="Double-click to edit"
                >
                  {draftTitle || <span className="text-slate-400 italic">Task title</span>}
                  <p className="mt-1 text-xs font-medium text-slate-400 opacity-0 transition group-hover:opacity-100 group-focus:opacity-100">
                    Double-click to edit
                  </p>
                </div>
              )}
            </div>

            <section className="block" aria-labelledby="task-description-heading">
              <h3 id="task-description-heading" className="mb-2 text-sm font-semibold text-slate-700">
                Description
              </h3>
              <RichTextEditor
                value={task.description ?? ''}
                onChange={(value) => handleUpdate({ description: value })}
                placeholder="Add context, goals, links, or acceptance criteria for this task."
                minHeightClassName="min-h-[220px]"
                ariaLabel="Task description"
                activationMode="doubleClick"
              />
            </section>

            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-slate-900">Comments</h3>
                  <p className="text-sm text-slate-500">Add timestamped notes without changing the task description.</p>
                </div>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                  {comments.length} {comments.length === 1 ? 'comment' : 'comments'}
                </span>
              </div>

              <div className="space-y-3">
                <textarea
                  value={newCommentText}
                  onChange={(event) => setNewCommentText(event.target.value)}
                  placeholder="Write a new comment for this task."
                  rows={3}
                  className="w-full resize-y rounded-2xl border border-slate-300 px-4 py-3 text-slate-900 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                />
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={addComment}
                    disabled={!newCommentText.trim()}
                    className="rounded-xl bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                  >
                    Add Comment
                  </button>
                </div>
              </div>

              <div className="mt-4 space-y-3">
                {comments.length > 0 ? comments.map((comment) => (
                  <article key={comment.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="mb-2 flex items-start justify-between gap-3">
                      <time className="text-xs font-medium text-slate-500" dateTime={comment.createdAt}>
                        {formatCommentTimestamp(comment.createdAt)}
                      </time>
                      <button
                        type="button"
                        onClick={() => deleteComment(comment.id)}
                        className="rounded-full px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
                        aria-label={`Delete comment from ${formatCommentTimestamp(comment.createdAt)}`}
                      >
                        Delete
                      </button>
                    </div>
                    <p className="whitespace-pre-line text-sm leading-relaxed text-slate-700">{comment.text}</p>
                  </article>
                )) : (
                  <p className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">
                    No comments yet. Add the first task comment above.
                  </p>
                )}
              </div>
            </div>

            <div>
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-slate-900">Subtasks</h3>
                  <p className="text-sm text-slate-500">Break this work into trackable next steps.</p>
                </div>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                  {subtasks.filter((subtask) => subtask.completed).length}/{subtasks.length} done
                </span>
              </div>

              <div className="space-y-2">
                {subtasks.map((subtask) => (
                  <div key={subtask.id} className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3">
                    <input
                      type="checkbox"
                      checked={subtask.completed}
                      onChange={(event) => updateSubtask(subtask.id, { completed: event.target.checked })}
                      className="h-5 w-5 rounded border-slate-300"
                      aria-label={`Mark ${subtask.title} complete`}
                    />
                    <input
                      value={subtask.title}
                      onChange={(event) => updateSubtask(subtask.id, { title: event.target.value })}
                      className={`min-w-0 flex-1 bg-transparent text-slate-900 outline-none ${subtask.completed ? 'line-through text-slate-500' : ''}`}
                      aria-label="Subtask title"
                    />
                    <button
                      type="button"
                      onClick={() => deleteSubtask(subtask.id)}
                      className="rounded-full px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
                    >
                      Delete
                    </button>
                  </div>
                ))}
              </div>

              <div className="mt-3 flex gap-2">
                <input
                  value={newSubtaskTitle}
                  onChange={(event) => setNewSubtaskTitle(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault();
                      addSubtask();
                    }
                  }}
                  placeholder="Add a subtask"
                  className="min-w-0 flex-1 rounded-xl border border-slate-300 px-3 py-2 text-slate-900"
                />
                <button
                  type="button"
                  onClick={addSubtask}
                  className="rounded-xl bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700"
                >
                  Add
                </button>
              </div>
            </div>
          </section>

          <aside className="space-y-4 rounded-3xl bg-slate-50 p-5">
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-slate-700">Status</span>
              <select
                value={task.status}
                onChange={(event) => updateStatus(event.target.value as TaskStatus)}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-900"
              >
                {taskStatusOptions.map((status) => (
                  <option key={status} value={status}>{statusLabels[status]}</option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-slate-700">Assigned person</span>
              <input
                value={draftAssignedTo}
                onChange={(event) => {
                  setDraftAssignedTo(event.target.value);
                  handleUpdate({ assignedTo: event.target.value });
                }}
                onBlur={commitAssignedToActivity}
                placeholder="Unassigned"
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-900"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-slate-700">Due date</span>
              <input
                type="date"
                value={draftDueDate}
                onChange={(event) => updateDueDateDraft(event.target.value)}
                onBlur={commitDueDateActivity}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    commitDueDateActivity();
                  }
                }}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-900"
              />
            </label>

            <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
              <p className="font-semibold text-slate-900">Card preview</p>
              <p className="mt-2 line-clamp-2">{task.title || 'Untitled task'}</p>
              <p className="mt-3 text-xs uppercase tracking-wide text-slate-400">Details auto-save to this objective.</p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-slate-900">Recent activity</h3>
                  <p className="text-sm text-slate-500">Recent tracked task changes.</p>
                </div>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                  {activityHistory.length}
                </span>
              </div>

              {activityHistory.length > 0 ? (
                <ol className="max-h-72 space-y-3 overflow-y-auto pr-1">
                  {activityHistory.map((activity) => (
                    <li key={activity.id} className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                      <div className="flex items-start justify-between gap-3">
                        <p className="text-sm font-medium text-slate-800">{activity.message}</p>
                        {canRestoreDeletedSubtask(activity) ? (
                          <button
                            type="button"
                            onClick={() => restoreDeletedSubtask(activity)}
                            className="rounded-full bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-100"
                            aria-label={`Restore ${activity.subtaskTitle || 'deleted subtask'}`}
                          >
                            Restore
                          </button>
                        ) : null}
                      </div>
                      <time className="mt-1 block text-xs text-slate-500" dateTime={activity.createdAt}>
                        {formatTimestamp(activity.createdAt)}
                      </time>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-3 text-sm text-slate-500">
                  No tracked activity yet.
                </p>
              )}
            </div>

            <button
              type="button"
              onClick={onDelete}
              className="w-full rounded-xl border border-red-200 bg-white px-4 py-2 font-medium text-red-600 hover:bg-red-50"
            >
              Delete task
            </button>
          </aside>
        </div>
      </div>
    </div>
  );
}

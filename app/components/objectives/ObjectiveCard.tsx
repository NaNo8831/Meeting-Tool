'use client';

import { useState, type DragEvent } from 'react';
import { EditableField } from '@/app/components/ui/EditableField';
import { ColorSquareSelect } from '@/app/components/ui/ColorSquareSelect';
import { RichTextEditor } from '@/app/components/ui/RichTextEditor';
import { TaskList } from '@/app/components/objectives/TaskList';
import { useBodyScrollLock } from '@/app/hooks/useBodyScrollLock';
import { objectiveColorClasses } from '@/app/lib/objectiveOptions';
import type { Objective, TaskStatus } from '@/app/types/objective';
import type { TaskInput } from '@/app/types/dashboard';
import type { RichTextDocument } from '@/app/types/richText';

interface ObjectiveCardProps {
  objective: Objective;
  className?: string;
  initiallyOpenDetails?: boolean;
  taskInput: TaskInput | undefined;
  onDragStart: (id: number) => void;
  onDragOver: (event: DragEvent<HTMLDivElement>) => void;
  onDrop: (id: number) => void;
  onUpdateTitle: (id: number, title: string) => void;
  onUpdateDescription: (id: number, description: RichTextDocument) => void;
  onUpdateColor: (id: number, color: Objective['color']) => void;
  onDelete: (id: number) => void;
  onTaskInputChange: (objectiveId: number, input: TaskInput) => void;
  onAddTask: (objectiveId: number, taskTitle: string, assignedTo: string) => void;
  onOpenTask: (objectiveId: number, taskId: number) => void;
  onTaskStatusChange: (objectiveId: number, taskId: number, status: TaskStatus) => void;
}

export function ObjectiveCard({
  objective,
  className = '',
  initiallyOpenDetails = false,
  taskInput,
  onDragStart,
  onDragOver,
  onDrop,
  onUpdateTitle,
  onUpdateDescription,
  onUpdateColor,
  onDelete,
  onTaskInputChange,
  onAddTask,
  onOpenTask,
  onTaskStatusChange
}: ObjectiveCardProps) {
  const [isDetailOpen, setIsDetailOpen] = useState(initiallyOpenDetails);
  const [isTasksExpanded, setIsTasksExpanded] = useState(false);
  const planningTaskCount = objective.tasks.filter((task) => task.status === 'planning').length;
  const inProgressTaskCount = objective.tasks.filter((task) => task.status === 'in-progress').length;
  const completedTaskCount = objective.tasks.filter((task) => task.status === 'completed').length;

  useBodyScrollLock(isDetailOpen);

  const preventObjectiveDragFromEditRegion = (event: DragEvent<HTMLElement>) => {
    event.preventDefault();
    event.stopPropagation();
  };

  return (
    <>
      <div
        draggable
        onDragStart={() => onDragStart(objective.id)}
        onDragOver={onDragOver}
        onDrop={() => onDrop(objective.id)}
        className={`relative rounded-2xl border-t-[8px] bg-white p-3 shadow-sm ring-1 ring-slate-100 transition hover:shadow-md ${objectiveColorClasses[objective.color]} ${className}`}
      >
        <div className="absolute right-3 top-3">
          <ColorSquareSelect
            value={objective.color}
            onChange={(color) => onUpdateColor(objective.id, color)}
            ariaLabel="Objective card color"
          />
        </div>
        <button
          type="button"
          onClick={() => setIsDetailOpen(true)}
          className="block w-full rounded-xl text-left focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-4"
          aria-label={`Open review details for ${objective.title || 'untitled defining objective'}`}
        >
          <h3 className={`line-clamp-3 min-h-[3.5rem] pr-11 text-lg font-semibold leading-snug ${objective.title ? 'text-slate-900' : 'text-slate-400'}`}>
            {objective.title || 'New Defining Objective'}
          </h3>

          <span className="mt-3 flex items-center justify-between gap-2">
            <span className="inline-flex rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
              Task: P {planningTaskCount}, IP {inProgressTaskCount}, C {completedTaskCount}
            </span>
            <span className="shrink-0 text-right text-xs font-medium text-blue-700">
              Open details
            </span>
          </span>
        </button>
      </div>

      {isDetailOpen ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/50 p-4">
          <div className="max-h-[92vh] w-full max-w-6xl overflow-y-auto rounded-3xl bg-white p-5 shadow-2xl md:p-7">
            <div className="relative z-[80] mb-6 flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">
                  Defining Objective Review
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <ColorSquareSelect
                  value={objective.color}
                  onChange={(color) => onUpdateColor(objective.id, color)}
                  ariaLabel="Objective color"
                />
                <button
                  type="button"
                  onClick={() => setIsDetailOpen(false)}
                  className="rounded-full px-3 py-1 text-2xl leading-none text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                  aria-label="Close defining objective review details"
                >
                  ×
                </button>
              </div>
            </div>

            <div className="mb-6 space-y-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div
                onMouseDown={(event) => event.stopPropagation()}
                onDragStart={preventObjectiveDragFromEditRegion}
              >
                <p className="mb-1.5 text-sm font-semibold text-slate-700">Title</p>
                <EditableField
                  value={objective.title}
                  onSave={(value) => onUpdateTitle(objective.id, value)}
                  placeholder="New Defining Objective"
                  ariaLabel="Objective title"
                  className="text-xl font-semibold text-slate-900"
                />
              </div>
              <div
                onMouseDown={(event) => event.stopPropagation()}
                onDragStart={preventObjectiveDragFromEditRegion}
              >
                <p className="mb-1.5 text-sm font-semibold text-slate-700">Description</p>
                <RichTextEditor
                  value={objective.description}
                  onChange={(value) => onUpdateDescription(objective.id, value)}
                  placeholder="Add Defining Objective details..."
                  className="text-slate-700"
                  minHeightClassName="min-h-[96px]"
                  ariaLabel="Objective description"
                  editingMode="always"
                />
              </div>
            </div>

            <div className="mb-4">
              <button
                type="button"
                onClick={() => setIsTasksExpanded((open) => !open)}
                className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100"
              >
                <span>
                  Tasks — P {planningTaskCount}, IP {inProgressTaskCount}, C {completedTaskCount}
                </span>
                <span className="text-xs text-slate-400">{isTasksExpanded ? "▲ Collapse" : "▼ Expand"}</span>
              </button>
              {isTasksExpanded ? (
                <div className="mt-3">
                  <TaskList
                    objective={objective}
                    taskInput={taskInput}
                    onTaskInputChange={onTaskInputChange}
                    onAddTask={onAddTask}
                    onOpenTask={onOpenTask}
                    onTaskStatusChange={onTaskStatusChange}
                  />
                </div>
              ) : null}
            </div>

            <div className="mt-6 flex flex-col-reverse gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:items-center sm:justify-between">
              <button
                type="button"
                onClick={() => onDelete(objective.id)}
                className="rounded-xl border border-red-200 bg-red-50 px-5 py-2 font-semibold text-red-700 hover:bg-red-100"
              >
                Delete Objective
              </button>
              <button
                type="button"
                onClick={() => setIsDetailOpen(false)}
                className="rounded-xl bg-blue-600 px-5 py-2 font-semibold text-white hover:bg-blue-700"
              >
                Close Details
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

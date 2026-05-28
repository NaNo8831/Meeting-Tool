'use client';

import { useState, type DragEvent } from 'react';
import { EditableField } from '@/app/components/ui/EditableField';
import { ColorSquareSelect } from '@/app/components/ui/ColorSquareSelect';
import { RichTextEditor } from '@/app/components/ui/RichTextEditor';
import { TaskList } from '@/app/components/objectives/TaskList';
import { objectiveColorClasses } from '@/app/lib/objectiveOptions';
import type { Objective, TaskStatus } from '@/app/types/objective';
import type { TaskInput } from '@/app/types/dashboard';
import type { RichTextDocument } from '@/app/types/richText';

interface ObjectiveCardProps {
  objective: Objective;
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
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const isEditingObjective = isEditingTitle || isEditingDescription;

  const preventObjectiveDragFromEditRegion = (event: DragEvent<HTMLElement>) => {
    event.preventDefault();
    event.stopPropagation();
  };

  return (
    <div
      draggable={!isEditingObjective}
      onDragStart={(event) => {
        if (isEditingObjective) {
          event.preventDefault();
          return;
        }
        onDragStart(objective.id);
      }}
      onDragOver={onDragOver}
      onDrop={() => onDrop(objective.id)}
      className={`relative rounded-2xl border-t-[12px] bg-white p-4 shadow-sm ring-1 ring-slate-100 transition hover:shadow-md ${objectiveColorClasses[objective.color]} ${isEditingObjective ? 'cursor-default' : 'cursor-grab'}`}
    >
      <div className="mb-4 space-y-3">
        <div
          className="pr-24"
          onMouseDown={(event) => event.stopPropagation()}
          onDragStart={preventObjectiveDragFromEditRegion}
        >
          <EditableField
            value={objective.title}
            onSave={(value) => onUpdateTitle(objective.id, value)}
            placeholder="Objective title"
            ariaLabel="Objective title"
            className="text-xl font-semibold text-slate-900"
            onEditingChange={setIsEditingTitle}
            activationMode="doubleClick"
          />
        </div>
        <div
          onMouseDown={(event) => event.stopPropagation()}
          onDragStart={preventObjectiveDragFromEditRegion}
        >
          <RichTextEditor
            value={objective.description}
            onChange={(value) => onUpdateDescription(objective.id, value)}
            placeholder="Objective description"
            className="text-slate-700"
            minHeightClassName="min-h-[96px]"
            ariaLabel="Objective description"
            onEditingChange={setIsEditingDescription}
            activationMode="doubleClick"
          />
        </div>
      </div>

      <div className="absolute right-4 top-4 flex items-center gap-2">
        <ColorSquareSelect
          value={objective.color}
          onChange={(color) => onUpdateColor(objective.id, color)}
          ariaLabel="Objective color"
        />
        <button
          type="button"
          onClick={() => onDelete(objective.id)}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100 text-red-700 hover:bg-red-200"
          aria-label="Delete objective"
        >
          ×
        </button>
      </div>

      <div className="mb-4 flex justify-end text-sm text-slate-500">
        Drag the section to reorder
      </div>

      <TaskList
        objective={objective}
        taskInput={taskInput}
        onTaskInputChange={onTaskInputChange}
        onAddTask={onAddTask}
        onOpenTask={onOpenTask}
        onTaskStatusChange={onTaskStatusChange}
      />
    </div>
  );
}

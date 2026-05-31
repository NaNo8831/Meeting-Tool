'use client';

import { useEffect, useMemo, useState } from 'react';
import { useLocalStorage } from '@/app/hooks/useLocalStorage';
import type { TaskInput } from '@/app/types/dashboard';
import type { Objective, Subtask, Task, TaskActivity, TaskComment, TaskStatus } from '@/app/types/objective';
import type { RichTextDocument } from '@/app/types/richText';
import { objectivesData } from '@/data/objectives';

const statusLabels: Record<TaskStatus, string> = {
  planning: 'Planning',
  'in-progress': 'In Progress',
  completed: 'Completed'
};

type LegacyTaskStatus = TaskStatus | 'waiting';

const normalizeTaskStatus = (status: LegacyTaskStatus | undefined): TaskStatus => {
  if (status === 'waiting') return 'in-progress';
  return status ?? 'planning';
};

type StoredSubtask = Partial<Subtask>;
type StoredTaskComment = Partial<TaskComment>;
type StoredTaskActivity = Partial<TaskActivity>;
type StoredTask = Partial<Omit<Task, 'subtasks' | 'comments' | 'activityHistory' | 'status'>> & {
  id: number;
  title: string;
  status?: LegacyTaskStatus;
  subtasks?: StoredSubtask[];
  comments?: StoredTaskComment[];
  activityHistory?: StoredTaskActivity[];
};

const createTaskActivity = (message: string): TaskActivity => ({
  id: Date.now(),
  message,
  createdAt: new Date().toISOString()
});

const normalizeTask = (task: StoredTask): { task: Task; changed: boolean } => {
  const subtasks = Array.isArray(task.subtasks)
    ? task.subtasks.map((subtask, subtaskIndex) => ({
        id: subtask.id ?? task.id + subtaskIndex + 1,
        title: subtask.title ?? '',
        completed: subtask.completed ?? false
      }))
    : [];
  const comments = Array.isArray(task.comments)
    ? task.comments.map((comment, commentIndex) => ({
        id: comment.id ?? task.id + commentIndex + 1,
        text: comment.text ?? '',
        createdAt: comment.createdAt ?? new Date().toISOString()
      }))
    : [];

  const activityHistory = Array.isArray(task.activityHistory)
    ? task.activityHistory.map((activity, activityIndex) => ({
        id: activity.id ?? task.id + activityIndex + 1,
        message: activity.message ?? '',
        createdAt: activity.createdAt ?? new Date().toISOString(),
        type: activity.type,
        subtaskId: activity.subtaskId,
        subtaskTitle: activity.subtaskTitle,
        subtaskCompleted: activity.subtaskCompleted
      }))
    : [];

  const normalizedTask: Task = {
    id: task.id,
    title: task.title,
    description: task.description ?? '',
    dueDate: task.dueDate ?? '',
    subtasks,
    comments,
    activityHistory,
    assignedTo: task.assignedTo ?? '',
    status: normalizeTaskStatus(task.status)
  };

  const changed = task.description === undefined
    || task.dueDate === undefined
    || task.assignedTo === undefined
    || task.status === undefined
    || task.status === 'waiting'
    || !Array.isArray(task.subtasks)
    || !Array.isArray(task.comments)
    || !Array.isArray(task.activityHistory)
    || subtasks.some((subtask, subtaskIndex) => {
      const storedSubtask = task.subtasks?.[subtaskIndex];
      return storedSubtask?.id === undefined
        || storedSubtask.title === undefined
        || storedSubtask.completed === undefined;
    })
    || comments.some((comment, commentIndex) => {
      const storedComment = task.comments?.[commentIndex];
      return storedComment?.id === undefined
        || storedComment.text === undefined
        || storedComment.createdAt === undefined;
    })
    || activityHistory.some((activity, activityIndex) => {
      const storedActivity = task.activityHistory?.[activityIndex];
      return storedActivity?.id === undefined
        || storedActivity.message === undefined
        || storedActivity.createdAt === undefined;
    });

  return { task: normalizedTask, changed };
};

const normalizeObjectives = (storedObjectives: Objective[]): { objectives: Objective[]; changed: boolean } => {
  let changed = false;

  const objectives = storedObjectives.map((objective) => {
    const storedTasks = Array.isArray(objective.tasks) ? objective.tasks : [];
    if (!Array.isArray(objective.tasks)) changed = true;

    const tasks = storedTasks.map((task) => {
      const normalized = normalizeTask(task as StoredTask);
      if (normalized.changed) changed = true;
      return normalized.task;
    });

    return {
      ...objective,
      tasks
    };
  });

  return { objectives, changed };
};

export const useObjectives = (storageKey = 'leadership-objectives') => {
  const [objectives, setObjectives, hasLoadedObjectives] = useLocalStorage<Objective[]>(storageKey, objectivesData);
  const [taskInputs, setTaskInputs] = useState<Record<number, TaskInput>>({});
  const [selectedTask, setSelectedTask] = useState<{ objectiveId: number; taskId: number } | null>(null);
  const [draggingObjectiveId, setDraggingObjectiveId] = useState<number | null>(null);

  const normalizedObjectivesResult = useMemo(() => normalizeObjectives(objectives), [objectives]);
  const normalizedObjectives = normalizedObjectivesResult.objectives;
  const selectedObjective = selectedTask
    ? normalizedObjectives.find((objective) => objective.id === selectedTask.objectiveId) ?? null
    : null;
  const selectedTaskDetails = selectedObjective && selectedTask
    ? selectedObjective.tasks.find((task) => task.id === selectedTask.taskId) ?? null
    : null;

  useEffect(() => {
    if (!hasLoadedObjectives || !normalizedObjectivesResult.changed) return;
    setObjectives(normalizedObjectivesResult.objectives);
  }, [hasLoadedObjectives, normalizedObjectivesResult, setObjectives]);

  const updateObjectiveTitle = (id: number, newTitle: string) => {
    setObjectives(objectives.map((obj) =>
      obj.id === id ? { ...obj, title: newTitle } : obj
    ));
  };

  const updateObjectiveDescription = (id: number, newDescription: RichTextDocument) => {
    setObjectives(objectives.map((obj) =>
      obj.id === id ? { ...obj, description: newDescription } : obj
    ));
  };

  const updateObjectiveColor = (id: number, color: Objective['color']) => {
    setObjectives(objectives.map((obj) =>
      obj.id === id ? { ...obj, color } : obj
    ));
  };

  const handleObjectiveDragStart = (id: number) => {
    setDraggingObjectiveId(id);
  };

  const handleObjectiveDrop = (id: number) => {
    if (draggingObjectiveId === null || draggingObjectiveId === id) return;
    const draggedIndex = objectives.findIndex((obj) => obj.id === draggingObjectiveId);
    const droppedIndex = objectives.findIndex((obj) => obj.id === id);
    if (draggedIndex === -1 || droppedIndex === -1) return;

    const reordered = [...objectives];
    const [dragged] = reordered.splice(draggedIndex, 1);
    reordered.splice(droppedIndex, 0, dragged);
    setObjectives(reordered);
    setDraggingObjectiveId(null);
  };

  const addObjective = () => {
    const nextId = Date.now();
    setObjectives([
      {
        id: nextId,
        title: 'New Objective',
        description: 'Enter a detailed objective summary here.',
        status: 'planning',
        priority: 'medium',
        dueDate: '',
        color: 'green',
        tasks: []
      },
      ...objectives
    ]);
    return nextId;
  };

  const deleteObjective = (id: number) => {
    if (objectives.length <= 1) return;
    if (!window.confirm('Delete this objective section? This cannot be undone.')) return;
    setObjectives(objectives.filter((obj) => obj.id !== id));
  };

  const addTask = (objectiveId: number, taskTitle: string, assignedTo: string) => {
    const title = taskTitle.trim();
    const assignee = assignedTo.trim();
    if (!title) return;
    const newTask: Task = {
      id: Date.now(),
      title,
      description: '',
      dueDate: '',
      subtasks: [],
      comments: [],
      activityHistory: [],
      status: 'planning',
      assignedTo: assignee || ''
    };

    setObjectives(objectives.map((obj) =>
      obj.id === objectiveId ? { ...obj, tasks: [...obj.tasks, newTask] } : obj
    ));
    setTaskInputs({
      ...taskInputs,
      [objectiveId]: { title: '', assignedTo: '' }
    });
  };

  const openTaskDetails = (objectiveId: number, taskId: number) => {
    setSelectedTask({ objectiveId, taskId });
  };

  const closeTaskDetails = () => {
    setSelectedTask(null);
  };

  const updateTask = (objectiveId: number, taskId: number, updates: Partial<Task>) => {
    setObjectives(objectives.map((obj) =>
      obj.id === objectiveId
        ? {
            ...obj,
            tasks: obj.tasks.map((task) => (
              task.id === taskId ? { ...task, ...updates } : task
            ))
          }
        : obj
    ));
  };

  const deleteTask = (objectiveId: number, taskId: number) => {
    if (!window.confirm('Delete this task? This cannot be undone.')) return;
    setObjectives(objectives.map((obj) =>
      obj.id === objectiveId
        ? { ...obj, tasks: obj.tasks.filter((task) => task.id !== taskId) }
        : obj
    ));
    setSelectedTask((current) => (
      current?.objectiveId === objectiveId && current.taskId === taskId ? null : current
    ));
  };

  const updateTaskStatus = (objectiveId: number, taskId: number, status: TaskStatus) => {
    setObjectives(objectives.map((obj) =>
      obj.id === objectiveId
        ? {
            ...obj,
            tasks: obj.tasks.map((task) => {
              if (task.id !== taskId || task.status === status) return task;

              return {
                ...task,
                status,
                activityHistory: [
                  createTaskActivity(`Status changed to ${statusLabels[status]}`),
                  ...(task.activityHistory ?? [])
                ]
              };
            })
          }
        : obj
    ));
  };

  const updateTaskInput = (objectiveId: number, input: TaskInput) => {
    setTaskInputs({
      ...taskInputs,
      [objectiveId]: input
    });
  };

  return {
    objectives: normalizedObjectives,
    taskInputs,
    selectedObjective,
    selectedTaskDetails,
    addObjective,
    deleteObjective,
    updateObjectiveTitle,
    updateObjectiveDescription,
    updateObjectiveColor,
    handleObjectiveDragStart,
    handleObjectiveDrop,
    addTask,
    deleteTask,
    updateTask,
    updateTaskStatus,
    updateTaskInput,
    openTaskDetails,
    closeTaskDetails,
    replaceObjectives: setObjectives,
    hasLoadedObjectives
  };
};

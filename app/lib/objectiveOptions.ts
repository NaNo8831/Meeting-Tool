import type { Objective, ObjectiveColor, TaskStatus } from '@/app/types/objective';
import type { MeetingSectionKey, OrganizationInfo, StandardOperatingObjective } from '@/app/types/dashboard';

export const defaultOrganizationInfo: OrganizationInfo = {
  whyExist: '',
  rallyCry: '',
  howBehave: '',
  whatDo: '',
  howSucceed: ''
};

export const defaultDashboardTitle = '';

export const defaultMeetingSectionOrder: MeetingSectionKey[] = ['agenda', 'topic', 'decision', 'cascade'];

export const defaultStandardOperatingObjectives: StandardOperatingObjective[] = [
  {
    id: 1,
    title: '',
    description: '',
    color: 'green'
  }
];

export const taskStatusOptions: TaskStatus[] = ['planning', 'in-progress', 'completed'];

export const objectiveColorOptions: Array<{
  value: ObjectiveColor;
  label: string;
  borderClass: string;
  swatchClass: string;
}> = [
  { value: 'dark-green', label: 'Dark Green', borderClass: 'border-emerald-900', swatchClass: 'bg-emerald-900' },
  { value: 'green', label: 'Green', borderClass: 'border-green-600', swatchClass: 'bg-green-600' },
  { value: 'yellow', label: 'Yellow', borderClass: 'border-yellow-400', swatchClass: 'bg-yellow-400' },
  { value: 'orange', label: 'Orange', borderClass: 'border-orange-500', swatchClass: 'bg-orange-500' },
  { value: 'red', label: 'Red', borderClass: 'border-red-500', swatchClass: 'bg-red-500' }
];

export const defaultObjectiveColor: ObjectiveColor = 'green';

export const objectiveColorClasses: Record<Objective['color'], string> = objectiveColorOptions.reduce(
  (classes, option) => ({ ...classes, [option.value]: option.borderClass }),
  {} as Record<Objective['color'], string>
);

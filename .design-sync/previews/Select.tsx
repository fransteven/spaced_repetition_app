import * as React from 'react';
import {
  Label,
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from 'spaced_repetition_app';

const SUBJECTS = ['english', 'science', 'math', 'history', 'custom'];

/** The app's subject picker, closed — how it sits in a form. */
export function SubjectField(): React.JSX.Element {
  return (
    <div className="max-w-sm space-y-2">
      <Label htmlFor="pv-subject">Subject</Label>
      <Select defaultValue="science">
        <SelectTrigger id="pv-subject" className="w-full">
          <SelectValue placeholder="Select a subject" />
        </SelectTrigger>
        <SelectContent>
          {SUBJECTS.map((s) => (
            <SelectItem key={s} value={s}>
              {s}
            </SelectItem>
          ))}
          <SelectSeparator />
          <SelectItem value="__new__" className="text-primary font-medium">
            + Create custom subject…
          </SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}

/** Nothing chosen yet — the placeholder treatment. */
export function Placeholder(): React.JSX.Element {
  return (
    <div className="max-w-sm space-y-2">
      <Label htmlFor="pv-subject-empty">Subject</Label>
      <Select>
        <SelectTrigger id="pv-subject-empty" className="w-full">
          <SelectValue placeholder="Select a subject" />
        </SelectTrigger>
        <SelectContent>
          {SUBJECTS.map((s) => (
            <SelectItem key={s} value={s}>
              {s}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

/** Open list with a group heading and the check indicator on the selected item.
 *  `alignItemWithTrigger={false}` drops the popup below the trigger instead of
 *  overlaying the selected item on it — the readable state for a static card. */
export function OpenList(): React.JSX.Element {
  return (
    <div className="max-w-sm space-y-2 pb-56">
      <Label htmlFor="pv-subject-open">Subject</Label>
      <Select defaultOpen defaultValue="math" modal={false}>
        <SelectTrigger id="pv-subject-open" className="w-full">
          <SelectValue placeholder="Select a subject" />
        </SelectTrigger>
        <SelectContent side="bottom" align="start" alignItemWithTrigger={false}>
          <SelectGroup>
            <SelectLabel>Existing subjects</SelectLabel>
            {SUBJECTS.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectGroup>
          <SelectSeparator />
          <SelectItem value="__new__" className="text-primary font-medium">
            + Create custom subject…
          </SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}

/** Compact trigger for toolbars and inline filters. */
export function SmallAndDisabled(): React.JSX.Element {
  return (
    <div className="flex items-end gap-4">
      <Select defaultValue="due">
        <SelectTrigger size="sm">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="due">Due first</SelectItem>
          <SelectItem value="name">Name</SelectItem>
          <SelectItem value="created">Recently created</SelectItem>
        </SelectContent>
      </Select>
      <Select defaultValue="science" disabled>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="science">science</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}

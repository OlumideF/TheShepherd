import { RRule, rrulestr } from 'rrule';

import type { ChurchEvent } from '@/lib/supabase/types';

export const EVENT_TIMEZONE = 'America/Chicago';

export type EventOccurrence = {
  event: ChurchEvent;
  occurrenceStart: Date;
  occurrenceEnd: Date | null;
};

/** Start of local calendar day. */
export function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function endOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
}

export function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function endOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
}

export function addMonths(date: Date, delta: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + delta, 1);
}

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function formatMonthYear(date: Date): string {
  return date.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
}

export function formatEventWhen(start: Date, end: Date | null, timezone: string): string {
  const datePart = start.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
  const timeOpts: Intl.DateTimeFormatOptions = {
    hour: 'numeric',
    minute: '2-digit',
    timeZone: timezone,
  };
  const startTime = start.toLocaleTimeString(undefined, timeOpts);
  if (!end) return `${datePart} · ${startTime}`;
  const endTime = end.toLocaleTimeString(undefined, timeOpts);
  return `${datePart} · ${startTime} – ${endTime}`;
}

export function toIso(date: Date): string {
  return date.toISOString();
}

/**
 * Build a month grid (Sun–Sat weeks) covering the visible calendar month.
 * Leading/trailing days from adjacent months are included.
 */
export function buildMonthGrid(month: Date): Date[] {
  const first = startOfMonth(month);
  const startPad = first.getDay(); // 0 = Sunday
  const gridStart = new Date(first);
  gridStart.setDate(first.getDate() - startPad);

  const cells: Date[] = [];
  for (let i = 0; i < 42; i += 1) {
    const d = new Date(gridStart);
    d.setDate(gridStart.getDate() + i);
    cells.push(d);
  }
  return cells;
}

function occurrenceDurationMs(event: ChurchEvent): number | null {
  if (!event.ends_at) return null;
  return new Date(event.ends_at).getTime() - new Date(event.starts_at).getTime();
}

function parseRrule(event: ChurchEvent): RRule | null {
  if (!event.rrule?.trim()) return null;
  const dtstart = new Date(event.starts_at);
  const body = event.rrule.trim().replace(/^RRULE:/i, '');
  try {
    return rrulestr(`DTSTART:${formatDtStart(dtstart)}\nRRULE:${body}`, {
      forceset: false,
    }) as RRule;
  } catch {
    try {
      return RRule.fromString(`DTSTART:${formatDtStart(dtstart)}\nRRULE:${body}`);
    } catch {
      return null;
    }
  }
}

function formatDtStart(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  const hh = String(date.getUTCHours()).padStart(2, '0');
  const mm = String(date.getUTCMinutes()).padStart(2, '0');
  const ss = String(date.getUTCSeconds()).padStart(2, '0');
  return `${y}${m}${d}T${hh}${mm}${ss}Z`;
}

/**
 * Expand events (including RRULE series) into occurrences overlapping [rangeStart, rangeEnd].
 */
export function expandOccurrences(
  events: ChurchEvent[],
  rangeStart: Date,
  rangeEnd: Date,
): EventOccurrence[] {
  const out: EventOccurrence[] = [];
  const duration = (event: ChurchEvent) => occurrenceDurationMs(event);

  for (const event of events) {
    const rule = parseRrule(event);
    const dur = duration(event);

    if (!rule) {
      const start = new Date(event.starts_at);
      const end = event.ends_at ? new Date(event.ends_at) : null;
      if (start <= rangeEnd && (end ?? start) >= rangeStart) {
        out.push({ event, occurrenceStart: start, occurrenceEnd: end });
      }
      continue;
    }

    const dates = rule.between(rangeStart, rangeEnd, true);
    for (const start of dates) {
      const end = dur != null ? new Date(start.getTime() + dur) : null;
      out.push({ event, occurrenceStart: start, occurrenceEnd: end });
    }
  }

  out.sort((a, b) => a.occurrenceStart.getTime() - b.occurrenceStart.getTime());
  return out;
}

export function validateRrule(rrule: string): string | null {
  const body = rrule.trim().replace(/^RRULE:/i, '');
  if (!body) return 'RRULE is empty';
  try {
    RRule.fromString(`RRULE:${body}`);
    return null;
  } catch {
    return 'Invalid RRULE (use iCal form, e.g. FREQ=WEEKLY;BYDAY=SU)';
  }
}

export const KIND_LABELS: Record<ChurchEvent['kind'], string> = {
  service: 'Service',
  group: 'Group',
  special: 'Special',
  other: 'Other',
};

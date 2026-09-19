import { brand } from '@/constants/brand';

type LiveParts = {
  weekday: number;
  hour: number;
  minute: number;
};

function getZonedParts(date: Date, timeZone: string): LiveParts {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(date);

  const weekdayLabel = parts.find((p) => p.type === 'weekday')?.value ?? '';
  const hour = Number(parts.find((p) => p.type === 'hour')?.value ?? '0');
  const minute = Number(parts.find((p) => p.type === 'minute')?.value ?? '0');

  const weekdayMap: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };

  return {
    weekday: weekdayMap[weekdayLabel] ?? -1,
    hour: hour === 24 ? 0 : hour,
    minute,
  };
}

/** True during the configured Sunday live window (church local time). */
export function isWithinSundayLiveWindow(now: Date = new Date()): boolean {
  const { timeZone, weekday, startHour, startMinute, endHour, endMinute } =
    brand.liveSchedule;
  const parts = getZonedParts(now, timeZone);
  if (parts.weekday !== weekday) return false;

  const current = parts.hour * 60 + parts.minute;
  const start = startHour * 60 + startMinute;
  const end = endHour * 60 + endMinute;
  return current >= start && current < end;
}

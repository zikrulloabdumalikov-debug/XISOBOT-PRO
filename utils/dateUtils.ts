
import { 
  format, 
  isWithinInterval, 
  isBefore, 
  endOfDay, 
  endOfMonth, 
  endOfYear, 
  endOfQuarter,
  startOfWeek,
  endOfWeek,
  parseISO,
  startOfDay,
  subDays,
  startOfMonth,
  subMonths,
  startOfYear,
  subYears,
  startOfQuarter,
  setMonth
} from 'date-fns';

import { uz } from 'date-fns/locale/uz';

// Excel logic: Week starts on Monday
export const getWeekRange = (date: Date): { start: Date, end: Date } => {
  return {
    start: startOfWeek(date, { weekStartsOn: 1 }),
    end: endOfWeek(date, { weekStartsOn: 1 })
  };
};

export const formatDateISO = (date: Date): string => {
  return format(date, 'yyyy-MM-dd');
};

export const formatDisplayDate = (isoString: string | null): string => {
  if (!isoString) return '-';
  try {
    return format(parseISO(isoString), 'dd.MM.yyyy');
  } catch (e) {
    return isoString;
  }
};

export const isDateInWeek = (dateStr: string, weekStart: Date, weekEnd: Date): boolean => {
  if (!dateStr) return false;
  const d = parseISO(dateStr);
  return isWithinInterval(d, { start: weekStart, end: weekEnd });
};

export const checkOverdue = (dedlayn: string | null, status: string): "Ha" | "Yo'q" => {
  if (!dedlayn || status === "Bajarildi") return "Yo'q";
  const today = startOfDay(new Date());
  const deadlineDate = parseISO(dedlayn);
  
  // Strict comparison: overdue if deadline is strictly before today
  return isBefore(deadlineDate, today) ? "Ha" : "Yo'q";
};

export const formatRangeDisplay = (start: Date, end: Date): string => {
    // If same year
    if (start.getFullYear() === end.getFullYear()) {
        return `${format(start, 'dd MMM', { locale: uz })} - ${format(end, 'dd MMM yyyy', { locale: uz })}`;
    }
    return `${format(start, 'dd MMM yyyy', { locale: uz })} - ${format(end, 'dd MMM yyyy', { locale: uz })}`;
};

export type PresetType = 'all' | 'today' | 'yesterday' | 'thisWeek' | 'prevWeek' | 'thisMonth' | 'prevMonth' | 'q1' | 'q2' | 'q3' | 'q4' | 'half1' | 'half2' | 'thisYear' | 'prevYear' | 'custom';

export const getPresetRange = (type: PresetType): { start: Date, end: Date } => {
  const now = new Date();
  switch (type) {
    case 'all': 
        return { start: new Date(2020, 0, 1), end: new Date(2030, 11, 31) };
    case 'today':
        return { start: startOfDay(now), end: endOfDay(now) };
    case 'yesterday':
        const yesterday = subDays(now, 1);
        return { start: startOfDay(yesterday), end: endOfDay(yesterday) };
    case 'thisWeek':
        return getWeekRange(now);
    case 'prevWeek':
        return getWeekRange(subDays(startOfWeek(now, { weekStartsOn: 1 }), 1));
    case 'thisMonth':
        return { start: startOfMonth(now), end: endOfMonth(now) };
    case 'prevMonth':
        const prevMonth = subMonths(now, 1);
        return { start: startOfMonth(prevMonth), end: endOfMonth(prevMonth) };
    case 'q1': // Jan-Mar
        return { start: startOfQuarter(setMonth(now, 0)), end: endOfQuarter(setMonth(now, 2)) };
    case 'q2': // Apr-Jun
        return { start: startOfQuarter(setMonth(now, 3)), end: endOfQuarter(setMonth(now, 5)) };
    case 'q3': // Jul-Sep
        return { start: startOfQuarter(setMonth(now, 6)), end: endOfQuarter(setMonth(now, 8)) };
    case 'q4': // Oct-Dec
        return { start: startOfQuarter(setMonth(now, 9)), end: endOfQuarter(setMonth(now, 11)) };
    case 'half1':
        return { start: startOfYear(now), end: endOfMonth(setMonth(now, 5)) };
    case 'half2':
        return { start: startOfMonth(setMonth(now, 6)), end: endOfYear(now) };
    case 'thisYear':
        return { start: startOfYear(now), end: endOfYear(now) };
    case 'prevYear':
        const prevYear = subYears(now, 1);
        return { start: startOfYear(prevYear), end: endOfYear(prevYear) };
    default:
        return getWeekRange(now);
  }
};

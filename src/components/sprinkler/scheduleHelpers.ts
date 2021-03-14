import { IProgramSchedule, WeekDays } from "./models"

export const formatStartTime = (startTime: number) => [
  Math.trunc(startTime / 100),
  startTime % 100,
]
  .map(i => `${i}`.padStart(2, '0'))
  .join(':')

export const formatWeekDay = (weekDay: WeekDays, short?: boolean) => {
  switch (weekDay) {
    case WeekDays.Mon:
      return short ? 'Mon' : 'Monday';
    case WeekDays.Tue:
      return short ? 'Tue' : 'Tuesday';
    case WeekDays.Wed:
      return short ? 'Wed' : 'Wendesday';
    case WeekDays.Thu:
      return short ? 'Thu' : 'Thursday';
    case WeekDays.Fri:
      return short ? 'Fri' : 'Friday';
    case WeekDays.Sat:
      return short ? 'Sat' : 'Saturday';
    case WeekDays.Sun:
      return short ? 'Sun' : 'Sunday';
  }
}

export const scheduleSummary = (schedule: IProgramSchedule) => {
  return [
    !schedule.even_days && !!schedule.odd_days && 'Odd Days',
    !!schedule.even_days && !schedule.odd_days && 'Even Days',
    schedule.week_days?.map(d => formatWeekDay(d, true))?.join(', '),
    !!schedule.even_days && !!schedule.odd_days && !schedule.week_days?.length && 'Daily',
    formatStartTime(schedule.start_time),
  ].filter(i => !!i).join(' ');
}

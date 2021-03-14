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
      return short ? 'Mo' : 'Monday';
    case WeekDays.Tue:
      return short ? 'Tu' : 'Tuesday';
    case WeekDays.Wed:
      return short ? 'We' : 'Wendesday';
    case WeekDays.Thu:
      return short ? 'Th' : 'Thursday';
    case WeekDays.Fri:
      return short ? 'Fr' : 'Friday';
    case WeekDays.Sat:
      return short ? 'Sa' : 'Saturday';
    case WeekDays.Sun:
      return short ? 'Sun' : 'Sunday';
  }
}

export const scheduleSummary = (schedule: IProgramSchedule) => {
  return [
    formatStartTime(schedule.start_time),
    !schedule.even_days && !!schedule.odd_days && 'Odd Days',
    !!schedule.even_days && !schedule.odd_days && 'Even Days',
    schedule.week_days?.map(d => formatWeekDay(d, true))?.join(', '),
    !!schedule.even_days && !!schedule.odd_days && !schedule.week_days?.length && 'Daily',
  ].filter(i => !!i).join(' ');
}

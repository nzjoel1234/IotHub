import { Duration } from "luxon";

export function required(value: any) {
  return !value ? 'Required' : undefined;
}

function renderDuration(value: Duration) {
  return value < Duration.fromObject({ minutes: 1 })
    ? `${value.as('seconds')} secs`
    : value < Duration.fromObject({ hours: 1 })
      ? `${value.as('minutes')} mins`
      : `${value.as('hours')} hours`;
}

export function getDurationValidator(min: Duration, max: Duration) {
  return (value: Duration) => {
    if (!!value && value < min) {
      return `Value must be larger than ${renderDuration(min)}`
    }
    if (!!value && value > max) {
      return `Value must be less than ${renderDuration(max)}`
    }
    return undefined;
  }
}

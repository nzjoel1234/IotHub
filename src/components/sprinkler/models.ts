export interface IQueuedZone {
  zoneId: number;
  secondsRemaining: number;
}

export interface IStatus {
  pending: IQueuedZone[];
  active: IQueuedZone[];
}

export interface IReceivedStatus {
  pending: Array<[number, number]>;
  active: Array<[number, number]>;
}

export interface ISprinklerProps {
  sprinklerId: string;
}

enum WeekDays {
  Mon = 0,
  Tue = 1,
  Wed = 2,
  Thu = 3,
  Fri = 4,
  Sat = 5,
  Sun = 6,
}

export interface IZoneConfiguration {
  name: string;
  group?: string;
}

export interface IProgramConfiguration {
  name: string;
  zones: Array<{
    id: number;
    duration: number;
  }>;
  schedules: Array<{
    start_time: number;
    odd_days?: boolean;
    even_days?: boolean;
    week_days?: WeekDays[];
  }>;
}

export interface ISprinklerConfiguration {
  zones: IZoneConfiguration[],
  programs: IProgramConfiguration[];
  utcOffsetMins: number;
}

export interface IReceivedShadow {
  state: {
    desired: ISprinklerConfiguration;
    reported?: ISprinklerConfiguration;
  }
}

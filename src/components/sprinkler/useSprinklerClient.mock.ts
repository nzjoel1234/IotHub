import { Duration } from 'luxon';
import * as React from 'react';
import { Subject } from 'rxjs';
import { delay } from 'rxjs/operators';

import { IReceivedShadow, ISprinklerConfiguration, IStatus } from './models';
import { ISprinklerClient } from './useSprinklerClient';

const delayMs = 10;

const printArgsAndResolve = (name: string) => (...args: any[]) => {
  console.log(`${name} called with args:`, ...args);
  return Promise.reject('An error');
}

export function useSprinklerClient(_deviceId: string) {
  return React.useMemo<ISprinklerClient>(() => {
    const status$ = new Subject<IStatus>();
    const shadow$ = new Subject<IReceivedShadow>();
    return ({
      requestStatus: () => {
        status$.next({
          active: [
            { zoneId: 0, duration: Duration.fromObject({ minutes: 3 }) },
            { zoneId: 1, duration: Duration.fromObject({ seconds: 12 }) },
            { zoneId: 2, duration: Duration.fromObject({ seconds: 12 }) },
          ],
          pending: [
            { zoneId: 3, duration: Duration.fromObject({ seconds: 110 }) },
            { zoneId: 4, duration: Duration.fromObject({ seconds: 110 }) },
            { zoneId: 3, duration: Duration.fromObject({ seconds: 110 }) },
          ],
        });
        return Promise.resolve();
      },
      requestShadow: () => {
        const desired: ISprinklerConfiguration = {
          programs: [
            {
              name: 'Lawns',
              zones: [
                { id: 0, duration: 1200 },
                { id: 1, duration: 2400 },
              ],
              schedules: [],
            },
            {
              name: 'Veges',
              zones: [
                { id: 2, duration: 600 },
                { id: 3, duration: 600 },
              ],
              schedules: [],
            }
          ],
          zones: [
            { name: 'Front Lawn', group: 'lawns' },
            { name: 'Back Lawn', group: 'lawns' },
            { name: 'Greenhouse', group: 'veges' },
            { name: 'Raised Beds', group: 'veges' },
            { name: 'Trees', group: '' },
          ],
          utcOffsetMins: 780,
        };
        shadow$.next({
          state: {
            desired,
            reported: desired,
          },
        });
        return Promise.resolve();
      },
      updateConfig: printArgsAndResolve('updateConfig'),
      queueZones: printArgsAndResolve('queueZones'),
      queueProgram: printArgsAndResolve('queueProgram'),
      stopZones: printArgsAndResolve('stopZones'),
      status$: status$.pipe(delay(delayMs)),
      shadow$: shadow$.pipe(delay(delayMs)),
    });
  }, []);
}

export default useSprinklerClient;

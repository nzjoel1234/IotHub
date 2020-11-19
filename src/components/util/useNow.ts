import * as React from 'react';
import { DateTime, Duration } from 'luxon';

export function useNow(updateInterval: Duration = Duration.fromObject({ seconds: 1 })) {
  const [now, setNow] = React.useState(DateTime.local());
  const intervalMs = updateInterval.as('milliseconds');
  React.useEffect(() => {
    if (intervalMs <= 0) {
      return;
    }
    const id = setInterval(() => setNow(DateTime.local()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

export default useNow;

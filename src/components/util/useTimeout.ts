import * as React from 'react';
import { Duration } from 'luxon';

export function useTimeout() {

  const timeout = React.useRef<any>(null);

  const stop = React.useCallback(
    () => window.clearTimeout(timeout.current),
    []);

  const start = React.useCallback(
    (handler: () => void, duration: Duration) => {
      stop();
      timeout.current = window.setTimeout(handler, duration.as('milliseconds'));
    },
    [stop]);

  React.useEffect(
    () => stop,
    [start, stop]);

  return React.useMemo(
    () => ({ start, stop }),
    [start, stop]);
}

export default useTimeout;

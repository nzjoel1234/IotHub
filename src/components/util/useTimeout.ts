import * as React from 'react';

export function useTimeout() {

  const timeout = React.useRef<any>(null);

  const stop = React.useCallback(
    () => clearTimeout(timeout.current),
    []);

  const start = React.useCallback(
    (handler: () => void, timeoutMs: number) => {
      stop();
      timeout.current = setTimeout(handler, timeoutMs);
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

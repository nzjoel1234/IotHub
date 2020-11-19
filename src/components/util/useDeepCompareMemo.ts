import * as React from 'react';
import { isEqual } from 'lodash';

export function useDeepCompareMemo<T>(value: T) {
  const lastValueRef = React.useRef<T>();
  return React.useMemo(() => lastValueRef.current =
    (isEqual(lastValueRef.current, value) ? lastValueRef.current : value) || value,
    [value]);
}

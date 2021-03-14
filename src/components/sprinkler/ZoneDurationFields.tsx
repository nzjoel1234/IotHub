import * as React from 'react';
import { Duration } from 'luxon';
import classNames from 'classnames';

interface IProps {
  id?: string;
  value: Duration | null;
  onChange: (value: Duration | null) => void;
  onBlur?: () => void;
  onFocus?: () => void;
  max?: Duration;
  min?: Duration;
  disabled?: boolean;
  error?: boolean;
}

interface DurationParts {
  unit: 'minutes' | 'seconds';
  value: number;
}

const toParts = (duration: Duration | null): DurationParts => {
  if (!duration) {
    return { value: 0, unit: 'minutes' };
  }
  const secs = duration.as('seconds');
  const mins = Math.floor(duration.as('minutes'));
  const unit = mins * 60 === secs ? 'minutes' : 'seconds';
  return {
    unit,
    value: unit === 'minutes' ? mins : secs,
  }
}

export const ZoneDurationField = ({
  id,
  value: duration,
  onChange,
  onBlur,
  onFocus,
  max,
  min,
  disabled,
  error,
}: IProps) => {

  const onChangeRef = React.useRef(onChange);
  React.useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  const [parts, setParts] = React.useState<DurationParts>();
  const { unit, value } = parts || { unit: 'minutes', value: undefined };
  const maxValue = max?.as(unit);
  const minValue = min?.as(unit);
  const milliseconds = (duration || Duration.fromMillis(0)).as('milliseconds');

  React.useEffect(() => {
    setParts(toParts(Duration.fromMillis(milliseconds)));
  }, [milliseconds]);

  React.useEffect(() => {
    const newDuration = Duration.fromObject({ [unit]: value || 0 });
    if (value === undefined || newDuration.as('milliseconds') === milliseconds) {
      return;
    }
    onChange && onChange(newDuration);
  }, [onChange, value, unit, milliseconds]);

  const onChangeValue = React.useCallback((e: any) => {
    const value = +(e.target.value ?? 0);
    setParts(v => ({ unit: 'minutes', ...v, value }));
  }, []);

  const onChangeUnit = React.useCallback((e: any) => {
    const unit = e.target.value || 'minutes';
    setParts(v => ({ value: 0, ...v, unit }));
  }, []);

  return (
    <div className="field has-addons">
      <div className="control is-expanded">
        <input
          id={id}
          className={classNames("input", { "is-danger": error })}
          type="number"
          value={value || 0}
          disabled={disabled}
          max={maxValue}
          min={minValue}
          onChange={onChangeValue}
          onBlur={onBlur}
          onFocus={onFocus}
        />
      </div>
      <div className="control">
        <span className={classNames("select", { "is-danger": error })}>
          <select
            value={unit}
            disabled={disabled}
            onChange={onChangeUnit}
            onBlur={onBlur}
            onFocus={onFocus}
          >
            <option value="minutes">Mins</option>
            <option value="seconds">Secs</option>
          </select>
        </span>
      </div>
    </div>
  );
}

export default ZoneDurationField;

import { Duration } from 'luxon';
import * as React from 'react';
import { Field, FormSpy, useField } from 'react-final-form';
import propertiesOf from 'util/propertiesOf';

export interface IZoneDuration {
  unit: 'mins' | 'secs';
  value: number;
}

interface IProps {
  name: string;
}

const stringToNumber = (value: string) => value == null ? value : +value;
const fieldNames = propertiesOf<IZoneDuration>();
const maxDuration = Duration.fromObject({ hours: 2 });
const maxValidationMessage = 'Must be less than 2 hours';

export const ZoneDurationField = ({ name }: IProps) => (
  <FormSpy subscription={{ submitting: true }}>
    {({ submitting }) => {
      const unit = useField(`${name}.${fieldNames.unit}`)?.input.value || 'secs';
      const maxValue = maxDuration.as(unit === 'mins' ? 'minutes' : 'seconds');
      return (
        <div className="field has-addons">
          <div className="control is-expanded">
            <Field<number>
              name={`${name}.${fieldNames.value}`}
              parse={stringToNumber}
              component="input"
              className="input"
              type="number"
              disabled={submitting}
              max={maxValue}
            />
          </div>
          <div className="control">
            <span className="select">
              <Field<number>
                name={`${name}.${fieldNames.unit}`}
                component="select"
                disabled={submitting}
              >
                <option value="mins">Mins</option>
                <option value="secs">Secs</option>
              </Field>
            </span>
          </div>
        </div>
      );
    }}
  </FormSpy>
);

export default ZoneDurationField;

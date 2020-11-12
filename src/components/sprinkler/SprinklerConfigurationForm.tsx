import * as React from 'react';
import { Field, Form } from 'react-final-form';
import arrayMutators from 'final-form-arrays'
import { FieldArray } from 'react-final-form-arrays';
import classNames from 'classnames';

import { propertiesOf } from 'util/propertiesOf';

import { ISprinklerConfiguration, IZoneConfiguration, IProgramConfiguration } from './models';

const summaryStyle: React.CSSProperties = {
  fontWeight: 'bold',
}

const inputStyle: React.CSSProperties = {
  marginBottom: 0,
  height: 'auto',
}

const formProperties = propertiesOf<ISprinklerConfiguration>();

interface ISprinklerConfigurationProps {
  config: ISprinklerConfiguration;
  onSubmit: (config: ISprinklerConfiguration) => void;
}

const stringToNumber = (v: any) => +v;

export function SprinklerConfigurationForm({
  config,
  onSubmit,
}: ISprinklerConfigurationProps) {

  return (
    <Form<ISprinklerConfiguration>
      onSubmit={onSubmit}
      initialValues={config}
      mutators={{
        ...arrayMutators,
      }}
    >
      {({ handleSubmit, submitting, submitError }) => (
        <form onSubmit={handleSubmit}>
          <details>
            <summary style={summaryStyle}>Zones</summary>
            <fieldset>
              <table>
                <thead>
                  <tr>
                    <th />
                    <th>Name</th>
                    <th>Group</th>
                  </tr>
                </thead>
                <tbody>
                  <FieldArray name={formProperties.zones}>
                    {({ fields }) => fields.map((name, index) => {
                      const zoneProperties = propertiesOf<IZoneConfiguration>();
                      return (
                        <tr key={index}>
                          <td style={{ textAlign: 'center' }}>{index}</td>
                          <td>
                            <Field<string> name={`${name}.${zoneProperties.name}`}>
                              {({ input }) => (
                                <input style={inputStyle} disabled={submitting} {...input} />
                              )}
                            </Field>
                          </td>
                          <td>
                            <Field<string> name={`${name}.${zoneProperties.group}`}>
                              {({ input }) => (
                                <input style={inputStyle} disabled={submitting} {...input} />
                              )}
                            </Field>
                          </td>
                        </tr>
                      );
                    })}
                  </FieldArray>
                </tbody>
              </table>
            </fieldset>
          </details>
          <details>
            <summary style={summaryStyle}>Programs</summary>
            <fieldset>
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                  </tr>
                </thead>
                <tbody>
                  <FieldArray name={formProperties.programs}>
                    {({ fields }) => fields.map((name, index) => {
                      const programProperties = propertiesOf<IProgramConfiguration>();
                      return (
                        <tr key={index}>
                          <td>
                            <Field<string> name={`${name}.${programProperties.name}`}>
                              {({ input }) => (
                                <input style={inputStyle} disabled={submitting} {...input} />
                              )}
                            </Field>
                          </td>
                        </tr>
                      );
                    })}
                  </FieldArray>
                </tbody>
              </table>
            </fieldset>
          </details>
          <details>
            <summary style={summaryStyle}>Other</summary>
            <fieldset>
              <label htmlFor={formProperties.utcOffsetMins}>UTC Offset Mins</label>
              <Field<number>
                name={formProperties.utcOffsetMins}
                parse={stringToNumber}
              >
                {({ input }) => (
                  <input
                    style={inputStyle}
                    type="number"
                    id={formProperties.utcOffsetMins}
                    disabled={submitting}
                    {...input}
                  />
                )}
              </Field>
            </fieldset>
          </details>
          {submitError && <p className="has-text-right has-text-danger">{submitError}</p>}
          <input
            type="submit"
            className={classNames("button is-success", { "is-loading": submitting })}
            value="Save"
          />
        </form>
      )}
    </Form>
  )
}

export default SprinklerConfigurationForm;

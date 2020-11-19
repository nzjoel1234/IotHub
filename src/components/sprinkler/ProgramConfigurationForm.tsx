import * as React from 'react';
import { Field, Form } from 'react-final-form';
import { FieldArray } from 'react-final-form-arrays';
import arrayMutators from 'final-form-arrays'
import classNames from 'classnames';
import { flow, map } from 'lodash';

import { propertiesOf } from 'util/propertiesOf';
import { useDeepCompareMemo } from 'components/util';

import { ISprinklerConfiguration, IProgramConfiguration, IProgramSchedule } from './models';

const inputStyle: React.CSSProperties = {
  marginBottom: 0,
  height: 'auto',
}

const zoneIdToKey = (id: number) => 'z' + id;
const zoneKeyToId = (key: string) => +key.replace('z', '');

interface IZoneDuration {
  unit: 'mins' | 'secs';
  value: number;
}

interface IFormData {
  name: string;
  durationByZoneKey: {
    [zoneKey: string]: IZoneDuration;
  }
  schedules: IProgramSchedule[];
}

const newSchedule: IProgramSchedule = {
  start_time: 0,
  odd_days: true,
  even_days: true,
  week_days: [],
};

const formProperties = propertiesOf<IFormData>();
const zoneProperties = propertiesOf<IZoneDuration>();

const stringToNumber = (value: string) => +value;

interface ISprinklerConfigurationProps {
  config: ISprinklerConfiguration;
  programId: number | null;
  updateConfig: (config: ISprinklerConfiguration) => void;
}

const withUpdatedProgram = (
  config: ISprinklerConfiguration,
  programId: number | null,
  program: IProgramConfiguration,
): ISprinklerConfiguration => ({
  ...config,
  programs: programId == null
    ? [
      ...config.programs,
      program,
    ] : [
      ...config.programs.slice(0, programId),
      program,
      ...config.programs.slice(programId + 1),
    ],
});

export function ProgramConfigurationForm({
  programId,
  updateConfig,
  config: rawConfig,
}: ISprinklerConfigurationProps) {

  const config = useDeepCompareMemo(rawConfig);
  const program = useDeepCompareMemo(React.useMemo(
    () => programId == null ? null : config.programs[programId],
    [programId, config.programs]));

  const initialValues = useDeepCompareMemo(React.useMemo<IFormData>(() => ({
    name: program?.name || '',
    schedules: program?.schedules || [],
    durationByZoneKey: config.zones.reduce((s, _, id) => {
      const existing = program?.zones.find(z => z.id === id);
      const unit = (!existing || existing.duration % 60 === 0) ? 'mins' : 'secs';
      const value = existing && unit === 'mins' ? existing.duration / 60 : (existing?.duration || 0);
      return {
        ...s,
        [zoneIdToKey(id)]: { unit, value },
      };
    }, {}),
  }), [config, program]));

  const mapToConfig = React.useCallback(({ name, durationByZoneKey, schedules }: IFormData) =>
    withUpdatedProgram(config, programId, {
      name: name,
      schedules,
      zones: map(durationByZoneKey, (duration, key) => ({
        id: zoneKeyToId(key),
        duration: duration.value * (duration.unit === 'mins' ? 60 : 1),
      })).filter(i => i.duration),
    }), [config, programId]);

  const onSubmit = React.useMemo(
    () => flow(mapToConfig, updateConfig),
    [mapToConfig, updateConfig]);

  return (
    <div className="modal is-active">
      <div className="modal-background" />
      <div className="modal-content">
        <div className="box">
          <h1 className="title">
            {program ? 'Edit Program' : 'New Program'}
          </h1>
          <Form<IFormData>
            onSubmit={onSubmit}
            initialValues={initialValues}
            mutators={{
              ...arrayMutators,
            }}
          >
            {({ values, handleSubmit, submitting, submitError }) => (
              <form onSubmit={handleSubmit}>
                <div className="field">
                  <label className="label">Name</label>
                  <div className="control">
                    <Field
                      name={formProperties.name}
                      component="input"
                      type="text"
                      style={inputStyle}
                      className="input"
                      disabled={submitting}
                      required
                    />
                  </div>
                </div>
                <div className="field">
                  <label className="label">Zone Durations</label>
                  <div className="control" style={{ paddingLeft: '1rem' }}>
                    {map(values.durationByZoneKey, (_, zoneKey) => {
                      const zoneId = zoneKeyToId(zoneKey);
                      const fieldPrefix = `${formProperties.durationByZoneKey}.${zoneKey}`;
                      return (
                        <div key={zoneKey} className="field">
                          <label htmlFor={zoneKey} className="label">
                            {config.zones[zoneId]?.name || `Zone ${zoneId}`}
                          </label>
                          <div className="field has-addons">
                            <div className="control is-expanded">
                              <Field<number>
                                name={`${fieldPrefix}.${zoneProperties.value}`}
                                parse={stringToNumber}
                                component="input"
                                className="input"
                                id={zoneKey}
                                type="number"
                                disabled={submitting}
                                max={120}
                              />
                            </div>
                            <div className="control">
                              <span className="select">
                                <Field<number>
                                  name={`${fieldPrefix}.${zoneProperties.unit}`}
                                  component="select"
                                  disabled={submitting}
                                >
                                  <option value="mins">Mins</option>
                                  <option value="secs">Secs</option>
                                </Field>
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div className="field">
                  <label className="label">Schedules</label>
                  <div className="control">
                    <FieldArray<IProgramSchedule> name={formProperties.schedules}>
                      {({ fields }) => (
                        <div>
                          {fields.map(field => (
                            <div key={field} className="box">
                              <div className="field">
                                <label className="label">Time</label>
                                <div className="control">
                                  <Field
                                    name={formProperties.name}
                                    component="input"
                                    type="time"
                                    style={inputStyle}
                                    className="input"
                                    disabled={submitting}
                                    required
                                  />
                                </div>
                              </div>
                            </div>
                          ))}
                          <div>
                            <button
                              className="button is-primary"
                              type="button"
                              onClick={() => fields.push(newSchedule)}
                            >
                              Add Schedule
                      </button>
                          </div>
                        </div>
                      )}
                    </FieldArray>
                  </div>
                </div>
                {submitError && <p className="has-text-right has-text-danger">{submitError}</p>}
                <input
                  type="submit"
                  className={classNames("button is-success", { "is-loading": submitting })}
                  value="Save"
                />
              </form>
            )}
          </Form >
        </div>
      </div>
    </div>
  );
}

export default ProgramConfigurationForm;

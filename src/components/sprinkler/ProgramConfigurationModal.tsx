import * as React from 'react';
import { Field, Form } from 'react-final-form';
import { FieldArray } from 'react-final-form-arrays';
import arrayMutators from 'final-form-arrays'
import classNames from 'classnames';
import { map, uniq, includes } from 'lodash';

import { propertiesOf } from 'util/propertiesOf';
import { Modal, useDeepCompareMemo } from 'components/util';

import { ISprinklerConfiguration, IProgramConfiguration, WeekDays } from './models';
import UnsavedChangesGuard from 'components/util/UnsavedChangesGuard';

import { formatWeekDay } from './scheduleHelpers';

const inputStyle: React.CSSProperties = {
  marginBottom: 0,
  height: 'auto',
}

const checkBoxLabelStyle: React.CSSProperties = {
  ...inputStyle,
  marginRight: 10,
}

const checkBoxStyle: React.CSSProperties = {
  ...inputStyle,
  marginRight: 5,
}

const zoneIdToKey = (id: number) => 'z' + id;
const zoneKeyToId = (key: string) => +key.replace('z', '');

interface IZoneDuration {
  unit: 'mins' | 'secs';
  value: number;
}

interface IScheduleFormData {
  startTime?: string;
  oddDays: boolean;
  evenDays: boolean;
  anyWeekDay: boolean;
  monday: boolean;
  tuesday: boolean;
  wednesday: boolean;
  thursday: boolean;
  friday: boolean;
  saturday: boolean;
  sunday: boolean;
}

interface IFormData {
  name: string;
  durationByZoneKey: {
    [zoneKey: string]: IZoneDuration;
  }
  schedules: IScheduleFormData[];
}

const formProperties = propertiesOf<IFormData>();
const zoneProperties = propertiesOf<IZoneDuration>();
const scheduleProperties = propertiesOf<IScheduleFormData>();

interface WeekDayDefinition {
  weekDay: WeekDays;
  property: keyof IScheduleFormData;
}

const weekDays: WeekDayDefinition[] = [
  {
    weekDay: WeekDays.Mon,
    property: 'monday',
  },
  {
    weekDay: WeekDays.Tue,
    property: 'tuesday',
  },
  {
    weekDay: WeekDays.Wed,
    property: 'wednesday',
  },
  {
    weekDay: WeekDays.Thu,
    property: 'thursday',
  },
  {
    weekDay: WeekDays.Fri,
    property: 'friday',
  },
  {
    weekDay: WeekDays.Sat,
    property: 'saturday',
  },
  {
    weekDay: WeekDays.Sun,
    property: 'sunday',
  },
]

const getNewSchedule = (): IScheduleFormData => ({
  oddDays: true,
  evenDays: true,
  anyWeekDay: true,
  monday: false,
  tuesday: false,
  wednesday: false,
  thursday: false,
  friday: false,
  saturday: false,
  sunday: false,
});

const stringToNumber = (value: string) => +value;

interface ISprinklerConfigurationProps {
  config: ISprinklerConfiguration;
  programId: number | null;
  onClose: () => void;
  updateConfig: (config: ISprinklerConfiguration) => Promise<undefined>;
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

const normaliseWeekdays = (weekDays: Array<WeekDays | undefined> | undefined) => {
  const values = uniq((weekDays || [])
    .filter(i => i != null)
    .map(i => i || WeekDays.Mon)
    .filter(i => 0 <= i && i <= 6));
  return (values.length === 0 || values.length === 7) ? undefined : values;
}

export function ProgramConfigurationModal({
  programId,
  config: rawConfig,
  updateConfig,
  onClose,
}: ISprinklerConfigurationProps) {

  const config = useDeepCompareMemo(rawConfig);
  const program = useDeepCompareMemo(React.useMemo(
    () => programId == null ? null : config.programs[programId],
    [programId, config.programs]));

  const initialValues = useDeepCompareMemo(React.useMemo<IFormData>(() => ({
    name: program?.name || '',
    schedules: (program?.schedules || []).map(s => ({
      ...s,
      week_days: normaliseWeekdays(s.week_days) || [],
    })).map(s => ({
      ...getNewSchedule(),
      startTime: [
        Math.trunc(s.start_time / 100),
        s.start_time % 100,
      ]
        .map(i => `${i}`.padStart(2, '0'))
        .join(':'),
      evenDays: s.even_days == null ? true : !!s.even_days,
      oddDays: s.odd_days == null ? true : !!s.odd_days,
      anyWeekDay: !s.week_days.length,
      ...weekDays.reduce((acc, d) => ({ ...acc, [d.property]: includes(s.week_days, d.weekDay) }), {}),
    })),
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
      schedules: (schedules || []).map(s => ({
        start_time: +(s.startTime ?? '00:00').replace(':', ''),
        even_days: !!s.evenDays,
        odd_days: !!s.oddDays,
        week_days: s.anyWeekDay ? undefined : normaliseWeekdays(weekDays.map(d => s[d.property] ? d.weekDay : undefined)),
      })),
      zones: map(durationByZoneKey, (duration, key) => ({
        id: zoneKeyToId(key),
        duration: duration.value * (duration.unit === 'mins' ? 60 : 1),
      })).filter(i => i.duration),
    }), [config, programId]);

  const onSubmit = React.useCallback((formData: IFormData) =>
    Promise.resolve(mapToConfig(formData))
      .then(updateConfig)
      .then(() => onClose()),
    [mapToConfig, updateConfig, onClose]);

  return (
    <Form<IFormData>
      onSubmit={onSubmit}
      initialValues={initialValues}
      mutators={{
        ...arrayMutators,
      }}
    >
      {({ values, handleSubmit, submitting, submitError, dirty }) => (
        <UnsavedChangesGuard unsavedChanges={dirty}>
          {({ confirmClose }) => {
            const close = () => confirmClose(confirmed => confirmed && onClose());
            return (
              <Modal onCloseClicked={close}>
                <h1 className="title">
                  {program ? 'Edit Program' : 'New Program'}
                </h1>
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
                    <div className="control">
                      <div className="box">
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
                  </div>
                  <div className="field">
                    <label className="label">Schedules</label>
                    <div className="control">
                      <FieldArray<IScheduleFormData> name={formProperties.schedules}>
                        {({ fields }) => (
                          <div>
                            {!fields.length && (
                              <div style={{ textAlign: 'center' }}>
                                <em>No Schedules</em>
                              </div>
                            )}
                            {fields.map((fieldPrefix, fieldIndex) => {
                              const { anyWeekDay } = fields.value[fieldIndex];
                              return (
                                <div key={fieldPrefix} className="box">
                                  <div className="is-clearfix">
                                    <a
                                      role="button"
                                      className="is-pulled-right has-text-danger"
                                      onClick={() => fields.remove(fieldIndex)}
                                    >
                                      Remove <i className="fas fa-times" />
                                    </a>
                                  </div>
                                  <div className="field">
                                    <label className="label">Time</label>
                                    <div className="control">
                                      <Field
                                        name={`${fieldPrefix}.${scheduleProperties.startTime}`}
                                        component="input"
                                        type="time"
                                        style={inputStyle}
                                        className="input"
                                        disabled={submitting}
                                        required
                                      />
                                    </div>
                                  </div>
                                  <div className="field">
                                    <div className="control">
                                      <label className="checkbox" style={checkBoxLabelStyle}>
                                        <Field
                                          name={`${fieldPrefix}.${scheduleProperties.evenDays}`}
                                          component="input"
                                          type="checkbox"
                                          style={checkBoxStyle}
                                          disabled={submitting}
                                        />
                                      Even Days
                                    </label>
                                    &nbsp;
                                    <label className="checkbox" style={checkBoxLabelStyle}>
                                        <Field
                                          name={`${fieldPrefix}.${scheduleProperties.oddDays}`}
                                          component="input"
                                          type="checkbox"
                                          style={checkBoxStyle}
                                          disabled={submitting}
                                        />
                                      Odd Days
                                    </label>
                                    </div>
                                  </div>
                                  <div className="field">
                                    <div className="control">
                                      <label className="checkbox" style={checkBoxLabelStyle}>
                                        <Field
                                          name={`${fieldPrefix}.${scheduleProperties.anyWeekDay}`}
                                          component="input"
                                          type="checkbox"
                                          style={checkBoxStyle}
                                          disabled={submitting}
                                        />
                                      Any Weekday
                                    </label>
                                    </div>
                                    <div style={{ marginLeft: 5 }}>
                                      {anyWeekDay ? null : weekDays.map(({ weekDay, property }) => (
                                        <div className="control">
                                          <label className="checkbox" style={checkBoxLabelStyle}>
                                            <Field
                                              name={`${fieldPrefix}.${property}`}
                                              component="input"
                                              type="checkbox"
                                              style={checkBoxStyle}
                                              disabled={submitting}
                                            />
                                            {formatWeekDay(weekDay)}
                                          </label>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                            <div>
                              <button
                                className="button is-primary"
                                type="button"
                                onClick={() => fields.push(getNewSchedule())}
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
                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <button
                      type="button"
                      className={classNames("button is-danger", { "is-loading": submitting })}
                      style={{ marginRight: 5 }}
                      onClick={close}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className={classNames("button is-success", { "is-loading": submitting })}
                    >
                      Save
                    </button>
                  </div>
                </form>
              </Modal>
            );
          }}
        </UnsavedChangesGuard>
      )
      }
    </Form >
  );
}

export default ProgramConfigurationModal;

import * as React from 'react';
import { Field, Form } from 'react-final-form';
import { FieldArray } from 'react-final-form-arrays';
import { FORM_ERROR } from 'final-form';
import arrayMutators from 'final-form-arrays'
import classNames from 'classnames';
import { map, uniq, includes } from 'lodash';
import { Duration } from 'luxon';

import { propertiesOf } from 'util/propertiesOf';
import { getDurationValidator, required } from 'util/validators';
import { Modal, useDeepCompareMemo } from 'components/util';
import UnsavedChangesGuard from 'components/util/UnsavedChangesGuard';
import FieldError, { FormError, getErrorFromMeta, getInputClassFromMeta } from 'components/util/formErrors';

import { ISprinklerConfiguration, IProgramConfiguration, WeekDays } from './models';
import { formatWeekDay } from './scheduleHelpers';
import ZoneDurationField from './ZoneDurationFields';

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

interface FormData {
  name: string;
  durationByZoneKey: {
    [zoneKey: string]: Duration;
  }
  schedules: IScheduleFormData[];
}

const formProperties = propertiesOf<FormData>();
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

const minDuration = Duration.fromMillis(0);
const maxDuration = Duration.fromObject({ hours: 2 });
const validateDuration = getDurationValidator(minDuration, maxDuration);

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

  const initialValues = useDeepCompareMemo(React.useMemo<FormData>(() => ({
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
    durationByZoneKey: config.zones.reduce((s, _, id) => ({
      ...s,
      [zoneIdToKey(id)]: Duration.fromObject({
        seconds: program?.zones.find(z => z.id === id)?.duration || 0,
      }),
    }), {}),
  }), [config, program]));

  const mapToConfig = React.useCallback(({ name, durationByZoneKey, schedules }: FormData) =>
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
        duration: duration?.as('seconds') || 0,
      })).filter(i => i.duration),
    }), [config, programId]);

  const onSubmit = React.useCallback((formData: FormData) =>
    Promise.resolve(mapToConfig(formData))
      .then(updateConfig)
      .then(() => onClose())
      .then(() => undefined)
      .catch(e => {
        console.error(e);
        return { [FORM_ERROR]: 'Failed to save.' };
      }),
    [mapToConfig, updateConfig, onClose]);

  return (
    <Form<FormData>
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
                  <Field
                    name={formProperties.name}
                    validate={required}
                  >
                    {({ input, meta }) => (
                      <div className="field">
                        <label className="label">Name</label>
                        <div className="control">
                          <input
                            {...input}
                            type="text"
                            className={classNames("input", getInputClassFromMeta(meta))}
                            style={inputStyle}
                            disabled={submitting}
                            required
                          />
                          <FieldError {...{ meta }} />
                        </div>
                      </div>
                    )}
                  </Field>
                  <div className="field">
                    <label className="label">Zone Durations</label>
                    <div className="control">
                      <div className="box">
                        {map(values.durationByZoneKey, (_, zoneKey) => {
                          const zoneId = zoneKeyToId(zoneKey);
                          return (
                            <Field
                              key={zoneKey}
                              name={`${formProperties.durationByZoneKey}.${zoneKey}`}
                              validate={validateDuration}
                            >
                              {({ input, meta }) => (
                                <div className="field">
                                  <label htmlFor={zoneKey} className="label">
                                    {config.zones[zoneId]?.name || `Zone ${zoneId}`}
                                  </label>
                                  <ZoneDurationField
                                    {...input}
                                    id={`zoneDuration[${zoneKey}]`}
                                    min={minDuration}
                                    max={maxDuration}
                                    disabled={meta.submitting}
                                    error={!!getErrorFromMeta(meta)}
                                  />
                                  <FieldError {...{ meta }} />
                                </div>
                              )}
                            </Field>
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
                                  <Field
                                    name={`${fieldPrefix}.${scheduleProperties.startTime}`}
                                    validate={required}
                                  >
                                    {({ input, meta }) => (
                                      <div className="field">
                                        <label className="label">Time</label>
                                        <div className="control">
                                          <input
                                            {...input}
                                            type="time"
                                            style={inputStyle}
                                            className={classNames("input", getInputClassFromMeta(meta))}
                                            disabled={submitting}
                                            required
                                          />
                                        </div>
                                        <FieldError {...{ meta }} />
                                      </div>
                                    )}
                                  </Field>
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
                  <FormError />
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
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

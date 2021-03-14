import * as React from 'react';
import { Field, Form } from 'react-final-form';
import { Duration } from 'luxon';
import { reduce } from 'lodash';
import { FORM_ERROR } from 'final-form';
import classNames from 'classnames';

import { getDurationValidator } from 'util/validators';
import { Modal } from 'components/util';
import FieldError, { FormError, getErrorFromMeta } from 'components/util/formErrors';

import { IProgramConfiguration, ISprinklerConfiguration } from './models';
import { ISprinklerClient } from './useSprinklerClient';
import ZoneDurationField from './ZoneDurationFields';

interface IProps {
  client: ISprinklerClient;
  stop?: boolean;
  program?: IProgramConfiguration;
  zoneIds?: number[];
  configuration: ISprinklerConfiguration | undefined;
  onDone: () => void;
}

interface FormData {
  [zoneKey: string]: Duration | null;
}

const zoneIdToKey = (id: number) => 'z' + id;
const zoneKeyToId = (key: string) => +key.replace('z', '');

const minDuration = Duration.fromMillis(0);
const maxDuration = Duration.fromObject({ hours: 2 });
const validateDuration = getDurationValidator(minDuration, maxDuration);

export const ConfirmStartModal = ({
  client,
  stop,
  program,
  zoneIds,
  configuration,
  onDone,
}: IProps) => {

  const initialValues = React.useMemo(
    () => (zoneIds || []).reduce<FormData>(
      (curr, next) => ({
        ...curr,
        ['' + next]: null,
      }), {}),
    [zoneIds]);

  const onSubmit = React.useCallback(
    (formValues: FormData) => (
      stop ? client.stopZones() :
        program ? client.queueProgram(program) :
          client.queueZones(reduce(
            formValues,
            (curr, duration, key) => ({
              ...curr,
              [zoneKeyToId(key)]: duration || Duration.fromMillis(0),
            }),
            {})))
      .then(onDone)
      .then(() => undefined)
      .catch(e => {
        console.error(e);
        return { [FORM_ERROR]: 'Failed to start.'};
      }),
    [client, stop, program, onDone]);
  
  return configuration && client && (stop || program || zoneIds?.length) ? (
    <Modal onCloseClicked={onDone}>
      <Form<FormData>
        onSubmit={onSubmit}
        initialValues={initialValues}
      >
        {({ handleSubmit, submitting }) => (
          <form onSubmit={handleSubmit}>
            <h1 className="title">
              {stop ? 'Confirm Stop' : program ? 'Confirm Start' : 'Start Custom Program'}
            </h1>
            {stop
              ? (<p>Stop all zones?</p>)
              : program
              ? (<p>Start program '{program.name}'?</p>)
              : (
                  zoneIds?.map(zoneId => (
                    <Field
                      key={zoneId}
                      name={zoneIdToKey(zoneId)}
                      validate={validateDuration}
                    >
                      {({ input, meta }) => (
                        <div className="field is-horizontal">
                          <div className="field-label is-normal">
                            <label htmlFor={'' + zoneId} className="label">
                              {(configuration.zones || [])[zoneId]?.name || `Zone ${zoneId}`}
                            </label>
                          </div>
                          <div className="field-body">
                            <div className="field">
                              <div className="control">
                                <ZoneDurationField
                                  {...input}
                                  min={minDuration}
                                  max={maxDuration}
                                  disabled={submitting}
                                  error={!!getErrorFromMeta(meta)}
                                />
                              </div>
                              <FieldError {...{meta}} />
                            </div>
                          </div>
                        </div>
                      )}
                    </Field>
                ))
            )}
            <FormError />
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
              <button
                type="submit"
                className={classNames("button is-success", { "is-loading": submitting })}
                style={{ marginRight: '0.5rem' }}
              >
                <i className="fas fa-check" />
              </button>
              <button
                className={classNames("button is-danger", { "is-loading": submitting })}
                onClick={onDone}
              >
                <i className="fas fa-times" />
              </button>
            </div>
          </form>
        )}
      </Form>
    </Modal>
  ) : null;
}

export default ConfirmStartModal;

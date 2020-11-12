import * as React from 'react';
import { Form, Field } from 'react-final-form';
import { Duration } from 'luxon';
import { reduce } from 'lodash';
import { FORM_ERROR } from 'final-form';
import classNames from 'classnames';

import { IProgramConfiguration, ISprinklerConfiguration } from './models';
import { ISprinklerClient } from './useSprinklerClient';

interface IProps {
  client: ISprinklerClient;
  stop?: boolean;
  program?: IProgramConfiguration;
  zoneIds?: number[];
  configuration: ISprinklerConfiguration | undefined;
  onDone: () => void;
}

interface IFormValues {
  [zoneKey: string]: number | null;
}

const zoneIdToKey = (id: number) => 'z' + id;
const zoneKeyToId = (key: string) => +key.replace('z', '');

const stringToNumber = (v: any) => +v;

export const ConfirmStartModal = ({
  client,
  stop,
  program,
  zoneIds,
  configuration,
  onDone,
}: IProps) => {

  const initialValues = React.useMemo(
    () => (zoneIds || []).reduce<IFormValues>((curr, next) => ({ ...curr, ['' + next]: null }), {}),
    [zoneIds]);

  const onSubmit = React.useCallback(
    (formValues: IFormValues) => (
      stop ? client.stopZones() :
        program ? client.queueProgram(program) :
          client.queueZones(reduce(formValues,
          (curr, minutes, zoneKey) => !minutes ? curr : ({
            ...curr,
            [zoneKeyToId(zoneKey)]: Duration.fromObject({ minutes }),
          }),
          {}))
      )
      .then(onDone)
      .catch(e => {
        console.error(e);
        return { [FORM_ERROR]: 'Failed to start.'};
      }),
    [client, stop, program, onDone]);

  return configuration && client && (stop || program || zoneIds?.length) ? (
    <div className="modal is-active">
      <div className="modal-background"/>
      <div className="modal-content">
        <div className="box">
          <Form<IFormValues>
            onSubmit={onSubmit}
            initialValues={initialValues}
          >
            {({ handleSubmit, submitting, submitError }) => (
              <form onSubmit={handleSubmit}>
                <h1 className="title">
                  {program ? 'Confirm' : (zoneIds || []).length > 1 ? 'Start Zones' : 'Start Zone'}
                </h1>
                {stop
                  ? (<p>Stop all zones?</p>)
                  : program
                  ? (<p>Start program '{program.name}'?</p>)
                  : (
                    zoneIds?.map(zoneId => (
                      <Field<number>
                        key={zoneId}
                        name={zoneIdToKey(zoneId)}
                        parse={stringToNumber}
                      >
                        {({ input }) => (
                          <div className="field is-horizontal">
                            <div className="field-label is-normal">
                              <label htmlFor={'' + zoneId} className="label">
                                {(configuration.zones || [])[zoneId]?.name || `Zone ${zoneId}`}
                              </label>
                            </div>
                            <div className="field-body">
                              <div className="field">
                                <p className="control has-icons-right">
                                  <input
                                    className="input"
                                    key={zoneId}
                                    id={'' + zoneId}
                                    type="number"
                                    disabled={submitting}
                                    max={120}
                                    {...input}
                                  />
                                  <span className="icon is-right">
                                    mins
                                  </span>
                                </p>
                              </div>
                            </div>
                          </div>
                        )}
                      </Field>
                    ))
                )}
                {submitError && <p className="has-text-right has-text-danger">{submitError}</p>}
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                  <button
                    type="submit"
                    className={classNames("button is-success", { "is-loading": submitting })}
                    style={{ marginRight: '0.5rem' }}
                  >
                    <i className="fa fa-check" />
                  </button>
                  <button
                    className={classNames("button is-danger", { "is-loading": submitting })}
                    onClick={onDone}
                  >
                    <i className="fa fa-times" />
                  </button>
                </div>
              </form>
            )}
          </Form>
        </div>
      </div>
      <button
        className="modal-close is-large"
        aria-label="close"
        onClick={onDone}
      />
    </div>
  ) : null;
}

export default ConfirmStartModal;

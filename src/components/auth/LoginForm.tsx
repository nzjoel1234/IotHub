import React from 'react';
import { Form, Field } from 'react-final-form';
import { FORM_ERROR } from 'final-form';
import classNames from 'classnames';

import { propertiesOf } from 'util/propertiesOf';

export interface ILoginFormData {
  username: string;
  password: string;
}

interface IProps {
  login: (p: ILoginFormData) => Promise<{} | null>;
}

const formProperties = propertiesOf<ILoginFormData>();

export function LoginForm({ login }: IProps) {

  const onSubmit = React.useCallback(
    (credentials: ILoginFormData) =>
      login(credentials)
        .then(e => {
          console.log(e);
          return e;
        })
        .then(e => e ? { [FORM_ERROR]: e } : null)
        .then(e => {
          console.log(e);
          return e;
        }), [login]);

  return (
    <div className="container">
      <div className="columns">
        <div className="column is-half is-offset-one-quarter">
          <div className="box">
            <Form<ILoginFormData> onSubmit={onSubmit}>
              {({ handleSubmit, submitting, submitError }) => (
                <form onSubmit={handleSubmit}>
                  <div className="field">
                    <label className="label" htmlFor="emailField">Email</label>
                    <Field<string> name={formProperties.username}>
                      {({ input }) => (
                        <div className="control">
                          <input className="input" type="email" placeholder="Email" id="emailField" disabled={submitting} {...input} />
                        </div>
                      )}
                    </Field>
                  </div>
                  <div className="field">
                    <label className="label" htmlFor="passwordField">Password</label>
                    <Field<string> name={formProperties.password}>
                      {({ input }) => (
                        <div className="control">
                          <input className="input" type="password" placeholder="Password" id="passwordField" disabled={submitting} {...input} />
                        </div>
                      )}
                    </Field>
                  </div>
                  {submitError && <p className="has-text-danger">{submitError}</p>}
                  <div className="field is-grouped">
                    <div className="control">
                      <button
                        className={classNames('button is-primary', { 'is-loading': submitting })}
                        type="submit"
                        disabled={submitting}
                      >
                        Login
                      </button>
                    </div>
                  </div>
                </form>
              )}
            </Form>
          </div>
        </div>
      </div>
    </div>
  );
}

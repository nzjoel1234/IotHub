import * as React from 'react';
import { FormRenderProps, FieldMetaState, FormSpy } from 'react-final-form';

type ErrorStatus = Pick<FormRenderProps | FieldMetaState<any>, 'dirtySinceLastSubmit' | 'submitError' | 'touched' | 'error'>;

export const getErrorFromMeta = (meta: ErrorStatus) =>
  !meta.dirtySinceLastSubmit && meta.submitError ? meta.submitError : meta.touched ? meta.error : null;

export const getInputClassFromMeta = (meta: ErrorStatus) =>
  !!getErrorFromMeta(meta) ? 'is-danger' : undefined;

export const ErrorText = ({ error, className }: { error?: string, className: string }) =>
  !error ? null : (
    <p className={className}>{error}</p>
  );

export const FieldError = ({ meta }: { meta: ErrorStatus }) => (
  <ErrorText className="help is-danger" error={getErrorFromMeta(meta)} />
);

export const FormError = () => (
  <FormSpy>
    {formStatus => (
      <ErrorText
        className="has-text-right has-text-danger"
        error={getErrorFromMeta(formStatus)}
      />
    )}
  </FormSpy>
);

export default FieldError;

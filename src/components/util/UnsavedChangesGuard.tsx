import * as React from 'react';

type ConfirmCallback = (confirmed: boolean) => void;

const message = 'Changes you made may not be saved if you leave this page';

export const confirmUnsavedChanges = () => {
  return window.confirm(message);
};

export const useUnsavedChangesGuard = (unsavedChanges: boolean) => {
  React.useEffect(() => {
    if (!unsavedChanges) {
      return;
    }
    const beforeUnload = (e: BeforeUnloadEvent) => {
      e.returnValue = message;
      return e.returnValue;
    }
    window.addEventListener('beforeunload', beforeUnload);
    return () => window.removeEventListener('beforeunload', beforeUnload);
  }, [unsavedChanges]);

  const confirmClose = React.useCallback((cb: ConfirmCallback) => {
    cb(!unsavedChanges || confirmUnsavedChanges());
  }, [unsavedChanges]);

  return ({ confirmClose });
}

interface IRenderProps {
  confirmClose: (cb: ConfirmCallback) => void;
}

interface IProps {
  unsavedChanges: boolean;
  children: (renderProps: IRenderProps) => React.ReactNode;
}

export const UnsavedChangesGuard = ({
  unsavedChanges,
  children,
}: IProps) => {
  const renderProps = useUnsavedChangesGuard(unsavedChanges);
  return <>{children(renderProps)}</>
}

export default UnsavedChangesGuard;

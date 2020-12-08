import * as React from 'react';

interface IProps {
  onCloseClicked: () => void;
}

export const Modal = ({
  onCloseClicked,
  children,
}: React.PropsWithChildren<IProps>) => (
  <div className="modal is-active">
      <div className="modal-background" onClick={onCloseClicked}/>
      <div className="modal-content">
        <div className="box">
          {children}
        </div>
      </div>
      <button
        className="modal-close is-large"
        aria-label="close"
        onClick={onCloseClicked}
      />
    </div>
);

export default Modal;

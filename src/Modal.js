import React from 'react';

const css = {
  modal: {
    position: 'fixed',
    top: '0',
    left: '0',
    width: '100%',
    height: '100%',
    background: 'rgba(0, 0, 0, 0.6)',
    zIndex: '99',
  },
  modalMain: {
    position: 'fixed',
    background: 'white',
    width: '80%',
    height: 'auto',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%,-50%)',
  },
  displayBlock: {display: 'block'},
  displayNone: {display: 'none'},
};

const Modal = ({show, children}) => {
  return (
    <div style={{...css.modal, ...(show ? css.displayBlock : css.displayNone)}}>
      <section style={css.modalMain}>{children}</section>
    </div>
  );
};

export default Modal;

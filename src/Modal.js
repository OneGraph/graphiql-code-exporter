import React from 'react';

const css = {
  modal: {
    position: 'absolute',
    top: '56px',
    left: '0',
    width: '100%',
    background: 'rgba(0, 0, 0, 0.6)',
    zIndex: '99',
  },
  modalMain: {
    position: 'absolute',
    background: 'white',
    width: '100%',
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

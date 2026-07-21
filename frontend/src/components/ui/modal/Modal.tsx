import { useEffect, useState } from 'react';
import type { AnimationEvent } from 'react';
import type { ModalProps } from './Modal.types';
import {
  overlayStyles,
  overlayEnterStyles,
  overlayExitStyles,
  panelStyles,
  panelEnterStyles,
  panelExitStyles,
} from './Modal.styles';

export default function Modal({
  open,
  onClose,
  children,
  closeOnOverlayClick = true,
  closeOnEscape = true,
  role = 'dialog',
  ariaLabelledBy,
  ariaDescribedBy,
}: ModalProps) {
  const [isRendered, setIsRendered] = useState(open);

  if (open && !isRendered) {
    setIsRendered(true);
  }

  useEffect(() => {
    if (!open || !closeOnEscape) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, closeOnEscape, onClose]);

  if (!isRendered) return null;

  const handleOverlayClick = () => {
    if (closeOnOverlayClick) {
      onClose();
    }
  };

  const handleAnimationEnd = (event: AnimationEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget) return;

    if (!open) {
      setIsRendered(false);
    }
  };

  return (
    <div
      className={`${overlayStyles} ${open ? overlayEnterStyles : overlayExitStyles}`}
      role="presentation"
      onClick={handleOverlayClick}
    >
      <div
        role={role}
        aria-modal="true"
        aria-labelledby={ariaLabelledBy}
        aria-describedby={ariaDescribedBy}
        className={`${panelStyles} ${open ? panelEnterStyles : panelExitStyles}`}
        onClick={(event) => event.stopPropagation()}
        onAnimationEnd={handleAnimationEnd}
      >
        {children}
      </div>
    </div>
  );
}

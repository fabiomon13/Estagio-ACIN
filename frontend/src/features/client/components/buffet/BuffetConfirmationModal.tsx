import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

export type BuffetConfirmationAction = 'select' | 'cancel';

type BuffetConfirmationModalProps = {
  action: BuffetConfirmationAction;
  isSubmitting: boolean;
  onClose: () => void;
  onConfirm: () => void;
};

const modalContent = {
  select: {
    title: 'Confirmar a seleção do buffet?',
    description: 'Pode cancelar a seleção do buffet até enviar o primeiro pedido para a cozinha.',
    confirmLabel: 'Confirmar',
  },
  cancel: {
    title: 'Cancelar a seleção do buffet?',
    description: 'O buffet deixará de estar associado ao seu pedido.',
    confirmLabel: 'Cancelar buffet',
  },
} as const;

export function BuffetConfirmationModal({
  action,
  isSubmitting,
  onClose,
  onConfirm,
}: BuffetConfirmationModalProps) {
  const dialogRef = useRef<HTMLElement>(null);
  const content = modalContent[action];

  useEffect(() => {
    const previouslyFocusedElement =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;

    const previousOverflow = document.body.style.overflow;
    const previousOverscroll = document.body.style.overscrollBehavior;

    document.body.style.overflow = 'hidden';
    document.body.style.overscrollBehavior = 'none';

    dialogRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && !isSubmitting) {
        onClose();
      }
    }

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.body.style.overscrollBehavior = previousOverscroll;

      window.removeEventListener('keydown', handleKeyDown);
      previouslyFocusedElement?.focus();
    };
  }, [isSubmitting, onClose]);

  return createPortal(
    <div
      className="client-buffet-modal-backdrop"
      role="presentation"
      onClick={(event) => {
        if (event.target === event.currentTarget && !isSubmitting) {
          onClose();
        }
      }}
    >
      <section
        ref={dialogRef}
        tabIndex={-1}
        className="client-buffet-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="buffet-confirmation-title"
        aria-describedby="buffet-confirmation-description"
      >
        <h2 id="buffet-confirmation-title">{content.title}</h2>

        <p id="buffet-confirmation-description">{content.description}</p>

        <div className="client-buffet-modal-actions">
          <button type="button" className="is-secondary" disabled={isSubmitting} onClick={onClose}>
            Manter seleção atual
          </button>

          <button type="button" disabled={isSubmitting} onClick={onConfirm}>
            {isSubmitting ? 'A confirmar…' : content.confirmLabel}
          </button>
        </div>
      </section>
    </div>,
    document.body,
  );
}

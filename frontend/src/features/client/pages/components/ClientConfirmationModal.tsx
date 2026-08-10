import { createPortal } from 'react-dom';

type ClientConfirmationModalProps = {
  title: string;
  description: string;
  cancelLabel?: string;
  confirmLabel: string;
  isOpen: boolean;
  isBusy?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

export function ClientConfirmationModal({
  title,
  description,
  cancelLabel = 'Cancelar',
  confirmLabel,
  isOpen,
  isBusy = false,
  onCancel,
  onConfirm,
}: ClientConfirmationModalProps) {
  return createPortal(
    <div
      className={`client-buffet-modal-backdrop ${isOpen ? '' : 'is-closing'}`}
      role="presentation"
      onClick={() => {
        if (!isBusy) onCancel();
      }}
    >
      <section
        className="client-buffet-modal"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="client-confirmation-title"
        aria-describedby="client-confirmation-description"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="client-confirmation-title">{title}</h2>
        <p id="client-confirmation-description">{description}</p>

        <div className="client-buffet-modal-actions">
          <button type="button" className="is-secondary" disabled={isBusy} onClick={onCancel}>
            {cancelLabel}
          </button>
          <button type="button" disabled={isBusy} onClick={onConfirm}>
            {isBusy ? 'A enviar…' : confirmLabel}
          </button>
        </div>
      </section>
    </div>,
    document.body,
  );
}

import { useId } from 'react';
import type { ConfirmDialogProps } from './ConfirmDialog.types';
import { titleStyles, descriptionStyles, actionsStyles } from './ConfirmDialog.styles';
import Modal from '../modal/Modal';
import Button from '../button/Button';

export default function ConfirmDialog({
  open,
  title,
  description,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'default',
  isLoading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const titleId = useId();
  const descriptionId = useId();

  return (
    <Modal
      open={open}
      onClose={onCancel}
      closeOnOverlayClick={!isLoading}
      closeOnEscape={!isLoading}
      role="alertdialog"
      ariaLabelledBy={titleId}
      ariaDescribedBy={description ? descriptionId : undefined}
    >
      <h2 id={titleId} className={titleStyles}>
        {title}
      </h2>

      {description && (
        <p id={descriptionId} className={descriptionStyles}>
          {description}
        </p>
      )}

      <div className={actionsStyles}>
        <Button variant="ghost" onClick={onCancel} disabled={isLoading} autoFocus>
          {cancelText}
        </Button>

        <Button
          variant={variant === 'danger' ? 'danger' : 'primary'}
          onClick={onConfirm}
          isLoading={isLoading}
        >
          {confirmText}
        </Button>
      </div>
    </Modal>
  );
}

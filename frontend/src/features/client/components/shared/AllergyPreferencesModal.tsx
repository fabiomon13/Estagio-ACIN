import { useEffect, useRef, useState } from 'react';

import type { MenuTag } from '../../services/menuApi';

type AllergyPreferencesModalProps = {
  tags: readonly MenuTag[];
  selectedTagIds: readonly number[];
  isInitialSetup: boolean;
  isSaving: boolean;
  isClosing: boolean;
  onClose: () => void;
  onSave: (tagIds: readonly number[]) => void;
};

export function AllergyPreferencesModal({
  tags,
  selectedTagIds,
  isInitialSetup,
  isSaving,
  isClosing,
  onClose,
  onSave,
}: AllergyPreferencesModalProps) {
  const [selection, setSelection] = useState(() => new Set(selectedTagIds));

  const dialogRef = useRef<HTMLElement>(null);

  const canClose = !isInitialSetup && !isSaving;

  useEffect(() => {
    const previouslyFocusedElement =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;

    const previousOverflow = document.body.style.overflow;
    const previousOverscroll = document.body.style.overscrollBehavior;

    document.body.style.overflow = 'hidden';
    document.body.style.overscrollBehavior = 'none';

    dialogRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && canClose) {
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
  }, [canClose, onClose]);

  function toggleTag(tagId: number): void {
    if (isSaving) {
      return;
    }

    setSelection((current) => {
      const next = new Set(current);

      if (next.has(tagId)) {
        next.delete(tagId);
      } else {
        next.add(tagId);
      }

      return next;
    });
  }

  function saveSelection(): void {
    const selectedIds = [...selection].toSorted((first, second) => first - second);

    onSave(selectedIds);
  }

  return (
    <div
      className={['client-allergy-modal-backdrop', isClosing ? 'is-closing' : '']
        .filter(Boolean)
        .join(' ')}
      role="presentation"
      onClick={(event) => {
        if (event.target === event.currentTarget && canClose) {
          onClose();
        }
      }}
    >
      <section
        ref={dialogRef}
        tabIndex={-1}
        className="client-allergy-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="allergy-preferences-title"
        aria-describedby="allergy-preferences-description"
      >
        <p className="client-allergy-eyebrow">Antes de pedir</p>

        <h2 id="allergy-preferences-title">Tem alguma alergia ou intolerância?</h2>

        <p id="allergy-preferences-description" className="client-allergy-description">
          Selecione todos os alergénios que precisa de evitar. Os pratos correspondentes continuam
          visíveis com um aviso amarelo. Confirme sempre alergias graves com um funcionário, pois
          pode ocorrer contaminação cruzada.
        </p>

        <div className="client-allergy-options">
          {tags.map((tag) => {
            const isSelected = selection.has(tag.id);

            return (
              <button
                key={tag.id}
                type="button"
                className={isSelected ? 'is-selected' : ''}
                disabled={isSaving}
                aria-pressed={isSelected}
                onClick={() => toggleTag(tag.id)}
              >
                <span>{tag.name.replace(/^Alergénio:\s*/i, '')}</span>
              </button>
            );
          })}
        </div>

        <p className="client-allergy-disclaimer">
          Este filtro é informativo e não substitui a confirmação junto do restaurante.
        </p>

        <div className="client-allergy-actions">
          {!isInitialSetup && (
            <button type="button" className="is-secondary" disabled={isSaving} onClick={onClose}>
              Cancelar
            </button>
          )}

          <button type="button" disabled={isSaving} onClick={saveSelection}>
            {isSaving
              ? 'A guardar…'
              : selection.size === 0
                ? 'Não tenho alergias'
                : 'Guardar escolhas'}
          </button>
        </div>
      </section>
    </div>
  );
}

import { useState } from 'react';

import type { MenuTag } from '../services/menuApi';

type AllergyPreferencesModalProps = {
  tags: MenuTag[];
  selectedTagIds: number[];
  isInitialSetup: boolean;
  isSaving: boolean;
  isClosing: boolean;
  onClose: () => void;
  onSave: (tagIds: number[]) => void;
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

  function toggle(tagId: number) {
    setSelection((current) => {
      const next = new Set(current);
      if (next.has(tagId)) next.delete(tagId);
      else next.add(tagId);
      return next;
    });
  }

  return (
    <div
      className={`client-allergy-modal-backdrop ${isClosing ? 'is-closing' : ''}`}
      role="presentation"
      onClick={onClose}
    >
      <section
        className="client-allergy-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="allergy-preferences-title"
        onClick={(event) => event.stopPropagation()}
      >
        <p className="client-allergy-eyebrow">Antes de pedir</p>
        <h2 id="allergy-preferences-title">Tem alguma alergia ou intolerância?</h2>
        <p className="client-allergy-description">
          Selecione todos os alergénios que precisa de evitar. Os pratos correspondentes continuam
          visíveis com um aviso amarelo. Confirme sempre alergias graves com um funcionário, pois
          pode ocorrer contaminação cruzada.
        </p>
        <div className="client-allergy-options">
          {tags.map((tag) => (
            <label key={tag.id} className={selection.has(tag.id) ? 'is-selected' : ''}>
              <input
                type="checkbox"
                checked={selection.has(tag.id)}
                onChange={() => toggle(tag.id)}
              />
              <span>{tag.name.replace(/^Alergénio:\s*/i, '')}</span>
            </label>
          ))}
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
          <button
            type="button"
            disabled={isSaving}
            onClick={() => onSave(Array.from(selection).sort((a, b) => a - b))}
          >
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

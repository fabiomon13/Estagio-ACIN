import { useState } from 'react';

import type { MenuTag } from '../services/menuApi';

type AllergyPreferencesModalProps = {
  tags: MenuTag[];
  selectedTagIds: number[];
  isInitialSetup: boolean;
  isSaving: boolean;
  onClose: () => void;
  onSave: (tagIds: number[]) => void;
};

export function AllergyPreferencesModal({
  tags,
  selectedTagIds,
  isInitialSetup,
  isSaving,
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
    <div className="client-allergy-modal-backdrop" role="presentation" onClick={onClose}>
      <section
        className="client-allergy-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="allergy-preferences-title"
        onClick={(event) => event.stopPropagation()}
      >
        <p className="client-allergy-eyebrow">Before you order</p>
        <h2 id="allergy-preferences-title">Do you have any allergies or intolerances?</h2>
        <p className="client-allergy-description">
          Select every allergen you need to avoid. Matching dishes will remain visible with a yellow
          warning. Always confirm severe allergies with a member of staff because
          cross-contamination may occur.
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
          This filter is informational and does not replace confirmation with the restaurant.
        </p>
        <div className="client-allergy-actions">
          {!isInitialSetup && (
            <button type="button" className="is-secondary" disabled={isSaving} onClick={onClose}>
              Cancel
            </button>
          )}
          <button
            type="button"
            disabled={isSaving}
            onClick={() => onSave(Array.from(selection).sort((a, b) => a - b))}
          >
            {isSaving ? 'Saving…' : selection.size === 0 ? 'I have no allergies' : 'Save choices'}
          </button>
        </div>
      </section>
    </div>
  );
}

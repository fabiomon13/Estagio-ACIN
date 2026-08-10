// frontend/src/features/client/components/shared/AllergyPreferencesModal.test.tsx

import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AllergyPreferencesModal } from './AllergyPreferencesModal';

// example allergen tags used in the tests
const tags = [
  { id: 2, name: 'Alergénio: Leite', alias: 'alergenio-leite' },
  { id: 1, name: 'Alergénio: Ovo', alias: 'alergenio-ovo' },
];

// describe the test suite for the allergy preferences modal
describe('AllergyPreferencesModal', () => {
  // test case to check if selected allergens are saved in a stable order
  it('seleciona e guarda alergénios ordenados', () => {
    const onSave = vi.fn();
    render(
      <AllergyPreferencesModal
        tags={tags}
        selectedTagIds={[2]}
        isInitialSetup={false}
        isSaving={false}
        isClosing={false}
        onClose={vi.fn()}
        onSave={onSave}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Ovo' }));
    fireEvent.click(screen.getByRole('button', { name: 'Guardar escolhas' }));
    expect(onSave).toHaveBeenCalledWith([1, 2]);
  });
  it('só fecha com Escape quando não é configuração inicial', () => {
    const onClose = vi.fn();
    const { rerender } = render(
      <AllergyPreferencesModal
        tags={tags}
        selectedTagIds={[]}
        isInitialSetup
        isSaving={false}
        isClosing={false}
        onClose={onClose}
        onSave={vi.fn()}
      />,
    );
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).not.toHaveBeenCalled();
    rerender(
      <AllergyPreferencesModal
        tags={tags}
        selectedTagIds={[]}
        isInitialSetup={false}
        isSaving={false}
        isClosing={false}
        onClose={onClose}
        onSave={vi.fn()}
      />,
    );
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledOnce();
  });
});
// frontend/src/features/client/components/shared/AllergyPreferencesModal.test.tsx

// test case to check the Escape behavior during initial and optional setup

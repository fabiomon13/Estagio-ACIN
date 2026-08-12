// frontend/src/features/client/components/menu/ProductDetailsModal.test.tsx

import { fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { MenuItem } from '../../services/menuApi';
import { ProductDetailsModal } from './ProductDetailsModal';

// example menu item used in the tests
const menuItem: MenuItem = {
  id: 1,
  category_id: 10,
  name: 'Sopa de tomate',
  alias: 'sopa-de-tomate',
  description: 'Sopa preparada com tomate.',
  photo_url: null,
  base_price: '4.50',
  base_preparation_time: 10,
  is_available: true,
  category: {
    id: 10,
    default_station_id: 1,
    name: 'Entradas',
    alias: 'entradas',
  },
  tags: [
    {
      id: 100,
      name: 'Alergénio: Leite',
      alias: 'alergenio-leite',
    },
  ],
};

// describe the test suite for the ProductDetailsModal component
describe('ProductDetailsModal', () => {
  afterEach(() => {
    document.body.style.overflow = '';
    document.body.style.overscrollBehavior = '';
  });

  // test case to check if the product details are displayed correctly
  it('apresenta os detalhes do artigo', () => {
    render(
      <ProductDetailsModal
        item={menuItem}
        matchingAllergenTagIds={new Set()}
        showActions
        onClose={vi.fn()}
        onAdd={vi.fn()}
      />,
    );

    expect(screen.getByRole('dialog')).toBeTruthy();
    expect(screen.getByText('Sopa de tomate')).toBeTruthy();
    expect(screen.getByText('Sopa preparada com tomate.')).toBeTruthy();
  });

  // test case to check if the allergy warning is displayed when there are matching allergens
  it('apresenta o aviso de alergia', () => {
    render(
      <ProductDetailsModal
        item={menuItem}
        matchingAllergenTagIds={new Set([100])}
        showActions
        onClose={vi.fn()}
        onAdd={vi.fn()}
      />,
    );

    const alert = screen.getByRole('alert');
    expect(alert).toBeTruthy();
    expect(screen.getByText('Aviso de alergia')).toBeTruthy();
    expect(within(alert).getByText(/Leite/i)).toBeTruthy();
  });

  // test case to check if the quantity can be increased and the notes are normalized before sending
  it('aumenta a quantidade e envia as notas normalizadas', () => {
    const onAdd = vi.fn();
    const onClose = vi.fn();

    render(
      <ProductDetailsModal
        item={menuItem}
        matchingAllergenTagIds={new Set()}
        showActions
        onClose={onClose}
        onAdd={onAdd}
      />,
    );

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Aumentar quantidade',
      }),
    );

    fireEvent.change(screen.getByRole('textbox', { name: 'Notas especiais' }), {
      target: {
        value: '  Sem sal  ',
      },
    });

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Adicionar ao pedido',
      }),
    );

    expect(onAdd).toHaveBeenCalledWith(2, 'Sem sal');
    expect(onClose).toHaveBeenCalledOnce();
  });

  // test case to check if the quantity cannot be decreased below one
  it('não permite diminuir a quantidade abaixo de um', () => {
    render(
      <ProductDetailsModal
        item={menuItem}
        matchingAllergenTagIds={new Set()}
        showActions
        onClose={vi.fn()}
        onAdd={vi.fn()}
      />,
    );

    const decreaseButton = screen.getByRole('button', {
      name: 'Diminuir quantidade',
    }) as HTMLButtonElement;

    expect(decreaseButton.disabled).toBe(true);
    expect(screen.getByLabelText('1 unidades').textContent).toBe('1');
  });

  // test case to check if the modal closes when the Escape key is pressed
  it('fecha quando Escape é pressionado', () => {
    const onClose = vi.fn();

    render(
      <ProductDetailsModal
        item={menuItem}
        matchingAllergenTagIds={new Set()}
        showActions
        onClose={onClose}
        onAdd={vi.fn()}
      />,
    );

    fireEvent.keyDown(window, {
      key: 'Escape',
    });

    expect(onClose).toHaveBeenCalledOnce();
  });

  // test case to check if the actions are hidden when in read-only mode
  it('esconde as ações quando está em modo de leitura', () => {
    render(
      <ProductDetailsModal
        item={menuItem}
        matchingAllergenTagIds={new Set()}
        showActions={false}
        onClose={vi.fn()}
        onAdd={vi.fn()}
      />,
    );

    expect(
      screen.queryByRole('button', {
        name: 'Adicionar ao pedido',
      }),
    ).toBeNull();

    expect(screen.queryByRole('textbox')).toBeNull();
  });
});

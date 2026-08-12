// frontend/src/features/client/components/selection/SelectionSheet.test.tsx

import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { MenuItem } from '../../services/menuApi';
import { SelectionSheet } from './SelectionSheet';

const soup: MenuItem = {
  id: 1,
  category_id: 10,
  name: 'Sopa',
  alias: 'sopa',
  description: 'Sopa do dia',
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
  tags: [],
};

const dessert: MenuItem = {
  ...soup,
  id: 2,
  name: 'Sobremesa',
  alias: 'sobremesa',
  base_price: '3.00',
};

function renderSheet(overrides: Partial<React.ComponentProps<typeof SelectionSheet>> = {}) {
  const properties: React.ComponentProps<typeof SelectionSheet> = {
    items: [soup, dessert],
    cart: {
      1: 2,
      2: 1,
    },
    buffetItemIds: new Set(),
    selectedAllergenTagIds: new Set(),
    isSubmitting: false,
    hasActiveOrder: false,
    onAdd: vi.fn(),
    onRemove: vi.fn(),
    onDelete: vi.fn(),
    onClose: vi.fn(),
    onSubmit: vi.fn(),
    ...overrides,
  };

  return {
    properties,
    ...render(<SelectionSheet {...properties} />),
  };
}

describe('SelectionSheet', () => {
  afterEach(() => {
    document.body.style.overflow = '';
    document.body.style.overscrollBehavior = '';
  });

  it('apresenta os artigos selecionados', () => {
    renderSheet();

    expect(screen.getByText('Sopa')).toBeTruthy();
    expect(screen.getByText('Sobremesa')).toBeTruthy();
    expect(screen.getByLabelText('2 unidades')).toBeTruthy();
  });

  it('calcula o total considerando as quantidades', () => {
    renderSheet();

    // 4,50 × 2 + 3,00 × 1 = 12,00
    expect(screen.getByText(/12[,.]00/)).toBeTruthy();
  });

  it('não inclui artigos do buffet no total', () => {
    renderSheet({
      buffetItemIds: new Set([1]),
    });

    expect(screen.getByText(/3[,.]00/)).toBeTruthy();
  });

  it('chama as operações do carrinho', () => {
    const { properties } = renderSheet();

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Adicionar mais uma unidade de Sopa',
      }),
    );

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Remover uma unidade de Sopa',
      }),
    );

    expect(properties.onAdd).toHaveBeenCalledWith(1);
    expect(properties.onRemove).toHaveBeenCalledWith(1);
  });

  it('submete o pedido', () => {
    const { properties } = renderSheet();

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Enviar ronda',
      }),
    );

    expect(properties.onSubmit).toHaveBeenCalledOnce();
  });

  it('desativa a submissão quando existe um pedido ativo', () => {
    renderSheet({
      hasActiveOrder: true,
    });

    const button = screen.getByRole('button', {
      name: 'Pedido em curso',
    }) as HTMLButtonElement;

    expect(button.disabled).toBe(true);
    expect(
      screen.getByText('Aguarde que o pedido atual seja servido antes de enviar outra ronda.'),
    ).toBeTruthy();
  });

  it('desativa a submissão enquanto envia', () => {
    renderSheet({
      isSubmitting: true,
    });

    const button = screen.getByRole('button', {
      name: /A enviar/i,
    }) as HTMLButtonElement;

    expect(button.disabled).toBe(true);
  });

  it('fecha quando Escape é pressionado', () => {
    const { properties } = renderSheet();

    fireEvent.keyDown(window, {
      key: 'Escape',
    });

    expect(properties.onClose).toHaveBeenCalledOnce();
  });

  it('não fecha com Escape durante a submissão', () => {
    const { properties } = renderSheet({
      isSubmitting: true,
    });

    fireEvent.keyDown(window, {
      key: 'Escape',
    });

    expect(properties.onClose).not.toHaveBeenCalled();
  });
});

// frontend/src/features/client/components/menu/ProductCard.test.tsx

import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { MenuItem } from '../../services/menuApi';
import { ProductCard } from './ProductCard';

// example menu item used in the tests
const item: MenuItem = {
  id: 1,
  category_id: 1,
  name: 'Sopa',
  alias: 'sopa',
  description: 'Quente',
  photo_url: null,
  base_price: '4.50',
  base_preparation_time: 10,
  is_available: true,
  category: { id: 1, default_station_id: 1, name: 'Entradas', alias: 'entradas' },
  tags: [],
};
// describe the test suite for the menu product card
describe('ProductCard', () => {
  // test case to check the product details and detailed add flow
  it('abre os detalhes e adiciona com quantidade/notas', () => {
    const onAddDetails = vi.fn();
    render(
      <ProductCard
        item={item}
        quantity={0}
        onAdd={vi.fn()}
        onAddDetails={onAddDetails}
        onRemove={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Adicionar Sopa' }));
    expect(screen.getByRole('dialog')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Adicionar ao pedido' }));
    expect(onAddDetails).toHaveBeenCalledWith(1, '');
  });
  it('mostra quantidade e permite adicionar/remover', () => {
    const onAdd = vi.fn();
    const onRemove = vi.fn();
    render(
      <ProductCard
        item={item}
        quantity={2}
        onAdd={onAdd}
        onRemove={onRemove}
        priceMode="included"
      />,
    );
    expect(screen.getByText('Incluído')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /Adicionar mais/i }));
    fireEvent.click(screen.getByRole('button', { name: /Remover uma/i }));
    expect(onAdd).toHaveBeenCalledOnce();
    expect(onRemove).toHaveBeenCalledOnce();
  });
});
// frontend/src/features/client/components/menu/ProductCard.test.tsx

// test case to check quantity controls and included buffet pricing

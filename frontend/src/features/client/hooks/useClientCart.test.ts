// frontend/src/features/client/hooks/useClientCart.test.ts

// frontend/src/features/client/hooks/useClientCart.test.ts

import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { useClientCart } from './useClientCart';

// describe the test suite for client cart state and notes
describe('useClientCart', () => {
  it('começa com o carrinho vazio', () => {
    const { result } = renderHook(() => useClientCart());

    expect(result.current.cart).toEqual({});
    expect(result.current.notes).toEqual({});
    expect(result.current.cartCount).toBe(0);
  });

  it('adiciona artigos e calcula a quantidade total', () => {
    const { result } = renderHook(() => useClientCart());

    act(() => {
      result.current.addToCart(10);
      result.current.addToCart(10);
      result.current.addToCart(20);
    });

    expect(result.current.cart).toEqual({
      10: 2,
      20: 1,
    });
    expect(result.current.cartCount).toBe(3);
  });

  it('adiciona várias unidades de uma vez', () => {
    const { result } = renderHook(() => useClientCart());

    act(() => {
      result.current.addQuantity(10, 3);
    });

    expect(result.current.cart[10]).toBe(3);
    expect(result.current.cartCount).toBe(3);
  });

  it('remove uma unidade', () => {
    const { result } = renderHook(() => useClientCart());

    act(() => {
      result.current.addQuantity(10, 2);
    });

    act(() => {
      result.current.removeFromCart(10);
    });

    expect(result.current.cart[10]).toBe(1);
  });

  it('remove o artigo e as notas quando chega a zero', () => {
    const { result } = renderHook(() => useClientCart());

    act(() => {
      result.current.addToCart(10);
      result.current.setItemNotes(10, 'Sem sal');
    });

    act(() => {
      result.current.removeFromCart(10);
    });

    expect(result.current.cart[10]).toBeUndefined();
    expect(result.current.notes[10]).toBeUndefined();
  });

  it('normaliza as notas', () => {
    const { result } = renderHook(() => useClientCart());

    act(() => {
      result.current.setItemNotes(10, '  Sem cebola  ');
    });

    expect(result.current.notes[10]).toBe('Sem cebola');

    act(() => {
      result.current.setItemNotes(10, '   ');
    });

    expect(result.current.notes[10]).toBeUndefined();
  });

  it('remove vários artigos indicados', () => {
    const { result } = renderHook(() => useClientCart());

    act(() => {
      result.current.addToCart(10);
      result.current.addToCart(20);
      result.current.addToCart(30);
      result.current.setItemNotes(20, 'Nota');
    });

    act(() => {
      result.current.removeItems(new Set([10, 20]));
    });

    expect(result.current.cart).toEqual({ 30: 1 });
    expect(result.current.notes[20]).toBeUndefined();
  });

  it('limpa completamente o carrinho', () => {
    const { result } = renderHook(() => useClientCart());

    act(() => {
      result.current.addToCart(10);
      result.current.setItemNotes(10, 'Sem sal');
      result.current.clearCart();
    });

    expect(result.current.cart).toEqual({});
    expect(result.current.notes).toEqual({});
    expect(result.current.cartCount).toBe(0);
  });
});

import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ClientViewStage } from './ClientViewStage';

vi.mock('../../components/menu/MenuView', () => ({
  MenuView: () => <div data-testid="menu-view" />,
}));

vi.mock('../../components/buffet/BuffetView', () => ({
  BuffetView: () => <div data-testid="buffet-view" />,
}));

vi.mock('../../components/orders/OrdersView', () => ({
  OrdersView: () => <div data-testid="orders-view" />,
}));

const resizeObserver = {
  observe: vi.fn(),
  disconnect: vi.fn(),
};

class MockResizeObserver {
  observe = resizeObserver.observe;
  disconnect = resizeObserver.disconnect;
  unobserve = vi.fn();
}

function renderStage(swipeOverrides: Record<string, unknown> = {}) {
  return render(
    <ClientViewStage
      swipe={
        {
          activeView: 'menu',
          pendingView: null,
          swipeTargetView: null,
          isDraggingView: false,
          viewDragOffset: 0,
          targetViewTopOffset: 0,
          handleViewTransitionEnd: vi.fn(),
          ...swipeOverrides,
        } as never
      }
      data={
        {
          menuStations: [],
          buffetStations: [],
          selectedAllergenTagIds: new Set(),
          selectedBuffetId: null,
        } as never
      }
      cart={
        {
          cart: {},
          addToCart: vi.fn(),
          addQuantity: vi.fn(),
          setItemNotes: vi.fn(),
          removeFromCart: vi.fn(),
        } as never
      }
      orders={[]}
      selectedBuffet={null}
      isBuffetSelectionLocked={false}
      refreshError={null}
      onChooseBuffet={vi.fn()}
      onCancelOrderItem={vi.fn()}
    />,
  );
}

describe('ClientViewStage', () => {
  beforeEach(() => {
    resizeObserver.observe.mockClear();
    resizeObserver.disconnect.mockClear();
    vi.stubGlobal('ResizeObserver', MockResizeObserver);
  });

  it('mantém as vistas pré-montadas para evitar bloqueios no início do swipe', () => {
    renderStage();

    expect(screen.getByTestId('menu-view')).toBeTruthy();
    expect(screen.getByTestId('buffet-view')).toBeTruthy();
    expect(screen.getByTestId('orders-view')).toBeTruthy();
  });

  it('monta temporariamente a vista alvo durante o arrastamento', () => {
    renderStage({
      swipeTargetView: 'buffet',
      isDraggingView: true,
      viewDragOffset: -80,
    });

    expect(screen.getByTestId('menu-view')).toBeTruthy();
    expect(screen.getByTestId('buffet-view')).toBeTruthy();
    expect(screen.getByTestId('orders-view')).toBeTruthy();
  });

  it('monta o caminho completo durante uma transição entre vistas afastadas', () => {
    renderStage({ pendingView: 'orders' });

    expect(screen.getByTestId('menu-view')).toBeTruthy();
    expect(screen.getByTestId('buffet-view')).toBeTruthy();
    expect(screen.getByTestId('orders-view')).toBeTruthy();
  });
});

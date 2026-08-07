import { useMemo, useState } from 'react';

import type { ClientOrder } from '../../services/orderApi';
import { OrderProgressCard } from './OrderProgressCard';

type OrdersTab = 'active' | 'history';

type OrdersViewProps = {
  orders: readonly ClientOrder[];
  onCancel: (orderId: number, itemId: number) => Promise<void>;
  refreshMessage?: string | null;
};

const FINISHED_STATUS_ALIASES = new Set(['served', 'cancelled', 'returned']);

const orderTimeFormatter = new Intl.DateTimeFormat('pt-PT', {
  hour: '2-digit',
  minute: '2-digit',
});

export function OrdersView({ orders, onCancel, refreshMessage }: OrdersViewProps) {
  const [ordersTab, setOrdersTab] = useState<OrdersTab>('active');

  const [pendingCancellationId, setPendingCancellationId] = useState<number | null>(null);

  const visibleOrders = useMemo(
    () =>
      orders.filter((order) => {
        const isFinished =
          order.items.length > 0 &&
          order.items.every((item) => FINISHED_STATUS_ALIASES.has(item.status.alias));

        return ordersTab === 'history' ? isFinished : !isFinished;
      }),
    [orders, ordersTab],
  );

  async function cancelItem(orderId: number, itemId: number): Promise<void> {
    if (pendingCancellationId !== null) {
      return;
    }

    setPendingCancellationId(itemId);

    try {
      await onCancel(orderId, itemId);
    } finally {
      setPendingCancellationId(null);
    }
  }

  return (
    <div className="client-orders mx-auto max-w-lg px-4 pb-10">
      <div className="client-orders-tabs" role="tablist" aria-label="Estado dos pedidos">
        <button
          type="button"
          role="tab"
          className={ordersTab === 'active' ? 'is-active' : ''}
          aria-selected={ordersTab === 'active'}
          onClick={() => setOrdersTab('active')}
        >
          Em curso
        </button>

        <button
          type="button"
          role="tab"
          className={ordersTab === 'history' ? 'is-active' : ''}
          aria-selected={ordersTab === 'history'}
          onClick={() => setOrdersTab('history')}
        >
          Histórico
        </button>
      </div>

      {refreshMessage && (
        <p className="client-orders-refresh-message" role="status">
          {refreshMessage}
        </p>
      )}

      {visibleOrders.length === 0 ? (
        <p className="client-orders-empty">
          {ordersTab === 'active' ? 'Não existem pedidos em curso.' : 'Ainda não existe histórico.'}
        </p>
      ) : (
        visibleOrders.map((order) => (
          <section
            key={order.id}
            className="client-order-round"
            aria-labelledby={`order-round-${order.id}`}
          >
            <header className="client-order-round-heading">
              <h1 id={`order-round-${order.id}`}>Ronda {order.round_number}</h1>

              <time dateTime={order.created_at}>{formatOrderTime(order.created_at)}</time>
            </header>

            <div className="client-order-items">
              {order.items.map((item) => (
                <OrderProgressCard
                  key={item.id}
                  item={item}
                  isCancelling={pendingCancellationId === item.id}
                  onCancel={() => cancelItem(order.id, item.id)}
                />
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  );
}

function formatOrderTime(createdAt: string): string {
  const date = new Date(createdAt);

  return Number.isNaN(date.getTime()) ? '' : orderTimeFormatter.format(date);
}

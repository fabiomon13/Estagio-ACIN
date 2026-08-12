import { useEffect, useRef, useState, type PointerEvent } from 'react';

import Button from '../../../components/ui/button/Button';
import type {
  StaffPreparingItem,
  StaffPreparingTable,
  StaffReadyTable,
} from '../types/staff.types';

type KitchenTab = 'ready' | 'preparing';

type StaffReadyPanelProps = {
  groups: StaffReadyTable[];
  preparingGroups: StaffPreparingTable[];
  kitchenOpen: boolean;
  sidebarWidth: number;
  minSidebarWidth: number;
  maxSidebarWidth: number;
  onToggle: () => void;
  onSidebarDragStart: () => void;
  onSidebarDrag: (width: number) => void;
  onSidebarDragEnd: (width: number) => void;
  onDeliver: (group: StaffReadyTable) => void;
};

function formatCountdown(milliseconds: number) {
  const totalSeconds = Math.max(0, Math.ceil(milliseconds / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

function getPreparationInfo(item: StaffPreparingItem, now: number) {
  const startedAt = new Date(item.preparation_started_at).getTime();
  const readyAt = new Date(item.estimated_ready_at).getTime();

  if (!Number.isFinite(startedAt) || !Number.isFinite(readyAt)) {
    return { progress: 0, remainingMs: 0 };
  }

  const totalDuration = readyAt - startedAt;
  const elapsed = now - startedAt;
  const remainingMs = Math.max(0, readyAt - now);

  const progress =
    totalDuration > 0 ? Math.min(100, Math.max(0, (elapsed / totalDuration) * 100)) : 0;

  return { progress, remainingMs };
}

function PreparingOrderCard({
  tableNumber,
  item,
  now,
}: {
  tableNumber: number;
  item: StaffPreparingItem;
  now: number;
}) {
  const { progress, remainingMs } = getPreparationInfo(item, now);
  const isReady = remainingMs === 0;

  return (
    <article className="rounded-xl bg-surface-raised p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold">
            {item.quantity}x {item.name}
          </p>

          <p className="mt-1 text-xs text-content-muted">
            Mesa {String(tableNumber).padStart(2, '0')} /{' '}
            {isReady ? 'pronto' : `pronto em ~${formatCountdown(remainingMs)}`}
          </p>
        </div>

        <span className="rounded-full bg-border px-2 py-0.5 text-xs text-content-muted">
          {Math.round(progress)}%
        </span>
      </div>

      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-border">
        <div
          className="h-full rounded-full bg-gradient-to-r from-warning to-success transition-[width] duration-1000 ease-linear"
          style={{ width: `${progress}%` }}
        />
      </div>
    </article>
  );
}

export function StaffReadyPanel({
  groups,
  preparingGroups,
  kitchenOpen,
  sidebarWidth,
  minSidebarWidth,
  maxSidebarWidth,
  onToggle,
  onSidebarDragStart,
  onSidebarDrag,
  onSidebarDragEnd,
  onDeliver,
}: StaffReadyPanelProps) {
  const [activeTab, setActiveTab] = useState<KitchenTab>('ready');
  const [now, setNow] = useState(() => Date.now());

  const dragStartX = useRef<number | null>(null);
  const dragStartWidth = useRef(sidebarWidth);
  const draggedWidth = useRef(sidebarWidth);

  const sidebarProgress = (sidebarWidth - minSidebarWidth) / (maxSidebarWidth - minSidebarWidth);

  const onSidebarPointerDown = (event: PointerEvent<HTMLElement>) => {
    if (event.pointerType === 'mouse' && event.button !== 0) {
      return;
    }

    dragStartX.current = event.clientX;
    dragStartWidth.current = sidebarWidth;
    draggedWidth.current = sidebarWidth;

    event.currentTarget.setPointerCapture(event.pointerId);
    onSidebarDragStart();
  };

  const onSidebarPointerMove = (event: PointerEvent<HTMLElement>) => {
    if (dragStartX.current === null) {
      return;
    }

    const movedLeftBy = dragStartX.current - event.clientX;

    const nextWidth = Math.min(
      maxSidebarWidth,
      Math.max(minSidebarWidth, dragStartWidth.current + movedLeftBy),
    );

    draggedWidth.current = nextWidth;
    onSidebarDrag(nextWidth);
  };

  const onSidebarPointerEnd = (event: PointerEvent<HTMLElement>) => {
    if (dragStartX.current === null) {
      return;
    }

    dragStartX.current = null;

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    onSidebarDragEnd(draggedWidth.current);
  };

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, []);

  const readyCount = groups.reduce((total, group) => total + group.items.length, 0);

  const preparingCount = preparingGroups.reduce((total, group) => total + group.items.length, 0);

  return (
    <aside
      onPointerDown={onSidebarPointerDown}
      onPointerMove={onSidebarPointerMove}
      onPointerUp={onSidebarPointerEnd}
      onPointerCancel={onSidebarPointerEnd}
      className="relative min-w-0 overflow-visible touch-pan-y"
    >
      <button
        type="button"
        onClick={onToggle}
        className="absolute left-0 top-26 z-50 hidden h-12 w-6 -translate-x-1/2 flex-col items-center justify-center rounded-full border border-border bg-surface text-content-muted shadow-lg transition-all duration-300 hover:border-content-muted hover:bg-surface-raised hover:text-content xl:flex"
        aria-label={kitchenOpen ? 'Fechar cozinha' : 'Abrir cozinha'}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className="h-5 w-5"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d={kitchenOpen ? 'm9 18 6-6-6-6' : 'm15 18-6-6 6-6'}
          />
        </svg>

        <span className="mt-1 h-1 w-1 rounded-full bg-current opacity-50" />
        <span className="mt-1 h-1 w-1 rounded-full bg-current opacity-50" />
      </button>

      <div
        className="h-full"
        style={{
          opacity: sidebarProgress,
          transform: `translateX(${(1 - sidebarProgress) * 16}px)`,
          pointerEvents: sidebarProgress > 0.95 ? 'auto' : 'none',
        }}
      >
        <div className="rounded-2xl border border-border bg-surface p-4 xl:sticky xl:top-4">
          <div className="mb-4">
            <h3 className="text-lg font-semibold">Cozinha</h3>
            <p className="text-xs text-content-muted">Acompanhamento dos pedidos</p>
          </div>

          <div className="mb-4 flex gap-2 border-b border-border">
            <button
              type="button"
              onClick={() => setActiveTab('ready')}
              className={`flex flex-1 items-center justify-center gap-2 border-b-2 px-2 py-3 text-sm font-semibold transition-colors ${
                activeTab === 'ready'
                  ? 'border-danger text-content'
                  : 'border-transparent text-content-muted hover:text-content'
              }`}
            >
              Pronto para Entrega
              <span className="rounded-full bg-border px-2 py-0.5 text-xs">{readyCount}</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('preparing')}
              className={`flex flex-1 items-center justify-center gap-2 border-b-2 px-2 py-3 text-sm font-semibold transition-colors ${
                activeTab === 'preparing'
                  ? 'border-danger text-content'
                  : 'border-transparent text-content-muted hover:text-content'
              }`}
            >
              Em Preparação
              <span className="rounded-full bg-border px-2 py-0.5 text-xs text-content-muted">
                {preparingCount}
              </span>
            </button>
          </div>

          <div className="staff-scrollbar-hidden max-h-[65vh] space-y-3 overflow-y-auto pr-1">
            {activeTab === 'ready' &&
              (groups.length === 0 ? (
                <div className="rounded-xl border border-border bg-surface-raised p-3 text-sm text-content-muted">
                  Sem itens prontos no momento.
                </div>
              ) : (
                groups.map((group) => (
                  <article
                    key={group.table_number}
                    className="rounded-xl border border-danger bg-danger/10 p-3"
                  >
                    <p className="text-xs text-content-muted">Entregar</p>

                    <p className="mb-3 text-xl font-bold">
                      Mesa {String(group.table_number).padStart(2, '0')}
                    </p>

                    <div className="mb-3 space-y-1">
                      {group.items.map((item) => (
                        <p key={item.id} className="text-sm">
                          {item.quantity}x {item.name}
                        </p>
                      ))}
                    </div>

                    <Button className="w-full" variant="danger" onClick={() => onDeliver(group)}>
                      Entregue
                    </Button>
                  </article>
                ))
              ))}

            {activeTab === 'preparing' &&
              (preparingGroups.length === 0 ? (
                <div className="rounded-xl border border-border bg-surface-raised p-3 text-sm text-content-muted">
                  Nenhum pedido em preparação.
                </div>
              ) : (
                preparingGroups.flatMap((group) =>
                  group.items.map((item) => (
                    <PreparingOrderCard
                      key={item.id}
                      tableNumber={group.table_number}
                      item={item}
                      now={now}
                    />
                  )),
                )
              ))}
          </div>
        </div>
      </div>
    </aside>
  );
}

import { useEffect, useState } from 'react';

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
  onToggle: () => void;
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
  onToggle,
  onDeliver,
}: StaffReadyPanelProps) {
  const [activeTab, setActiveTab] = useState<KitchenTab>('ready');
  const [now, setNow] = useState(() => Date.now());

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
      className={`relative justify-self-end overflow-hidden transition-all duration-300 ${
        kitchenOpen ? 'xl:w-full' : 'xl:w-10'
      }`}
    >
      <button
        type="button"
        onClick={onToggle}
        className="fixed right-2 top-1/2 z-50 hidden h-60 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/10 bg-[#1b2430] text-white/80 shadow-[0_4px_16px_rgba(0,0,0,0.35)] hover:text-white xl:flex"
        aria-label={kitchenOpen ? 'Fechar cozinha' : 'Abrir cozinha'}
      >
        {kitchenOpen ? '›' : '‹'}
      </button>

      <div
        className={`h-full transition-all duration-300 ${
          kitchenOpen ? 'translate-x-0 opacity-100' : 'pointer-events-none translate-x-4 opacity-0'
        }`}
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

      {!kitchenOpen && (
        <div className="hidden h-[70vh] w-10 items-center justify-center rounded-2xl border border-border bg-surface text-content-muted xl:flex">
          Coz.
        </div>
      )}
    </aside>
  );
}

import Badge from '../../../components/ui/badge/Badge';
import Button from '../../../components/ui/button/Button';
import type { StaffReadyTable } from '../types/staff.types';

type StaffReadyPanelProps = {
  groups: StaffReadyTable[];
  kitchenOpen: boolean;
  onToggle: () => void;
  onDeliver: (group: StaffReadyTable) => void;
};

export function StaffReadyPanel({
  groups,
  kitchenOpen,
  onToggle,
  onDeliver,
}: StaffReadyPanelProps) {
  return (
    <aside
      className={`relative justify-self-end overflow-hidden transition-all duration-300 ${
        kitchenOpen ? 'xl:w-full' : 'xl:w-10'
      }`}
    >
      <button
        type="button"
        onClick={onToggle}
        className="fixed right-2 top-1/2 z-50 hidden h-60 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-white/10 bg-[#1b2430] text-white/80 shadow-[0_4px_16px_rgba(0,0,0,0.35)] hover:text-white xl:flex"
        aria-label={kitchenOpen ? 'Fechar painel da cozinha' : 'Abrir painel da cozinha'}
      >
        {kitchenOpen ? '›' : '‹'}
      </button>

      <div
        className={`h-full transition-all duration-300 ${
          kitchenOpen ? 'translate-x-0 opacity-100' : 'pointer-events-none translate-x-4 opacity-0'
        }`}
      >
        <div className="h-fit rounded-2xl border border-border bg-surface p-4 xl:sticky xl:top-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-lg font-semibold">Cozinha</h3>
            <Badge variant="danger">{groups.length}</Badge>
          </div>

          <p className="mb-3 text-xs text-content-muted">Pronto para Entrega</p>

          <div className="max-h-[70vh] space-y-3 overflow-auto pr-1">
            {groups.length === 0 ? (
              <div className="rounded-xl border border-border bg-surface-raised p-3 text-sm text-content-muted">
                Sem itens prontos no momento.
              </div>
            ) : (
              groups.map((group) => (
                <div
                  key={group.table_number}
                  className="rounded-2xl border border-danger bg-danger/10 p-3"
                >
                  <p className="text-xs text-content-muted">Entregar</p>
                  <p className="mb-2 text-2xl font-bold leading-none">
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
                    Entregue →
                  </Button>
                </div>
              ))
            )}
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

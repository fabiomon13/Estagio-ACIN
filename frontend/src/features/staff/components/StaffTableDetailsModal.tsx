import Modal from '../../../components/ui/modal/Modal';
import Button from '../../../components/ui/button/Button';
import type { StaffDashboardTable, StaffSessionBill } from '../types/staff.types';
import { formatTimeSince, translateState } from '../utils/staffDashboard.utils';
import { formatPrice } from '../../client/utils/formatPrice';

type StaffTableDetailsModalProps = {
  table: StaffDashboardTable;
  bill: StaffSessionBill;
  canManage: boolean;
  onClose: () => void;
  onCloseAccount: () => void;
};

export function StaffTableDetailsModal({
  table,
  bill,
  canManage,
  onClose,
  onCloseAccount,
}: StaffTableDetailsModalProps) {
  return (
    <Modal open onClose={onClose} ariaLabelledBy="table-details-title">
      <div className="w-full p-0">
        <div className="flex items-start justify-between border-b border-border pb-4">
          <div>
            <h2 id="table-details-title" className="text-2xl font-semibold">
              Mesa {String(table.table_number).padStart(2, '0')}
            </h2>

            <p className="mt-1 text-sm text-content-muted">
              {translateState(table.state)} · {formatTimeSince(table.started_at) ?? 'Sem sessão'} ·{' '}
              {table.guest_count} clientes
            </p>
          </div>

          <Button size="sm" variant="ghost" onClick={onClose}>
            ×
          </Button>
        </div>

        {!canManage && (
          <div className="mt-4 rounded-xl border border-info bg-info/10 p-3 text-sm text-info">
            Vista apenas de leitura. Esta mesa está atribuída a outro empregado.
          </div>
        )}

        <div className="mt-4 max-h-64 space-y-3 overflow-y-auto pr-1">
          {bill.guests.map((guest) => (
            <article
              key={guest.guest_id}
              className="rounded-xl border border-border bg-surface-raised p-3"
            >
              <div className="flex items-center justify-between">
                <p className="font-semibold">{guest.label}</p>
                <p className="font-semibold">{formatPrice(guest.total)}</p>
              </div>

              <div className="mt-2 flex justify-between text-sm text-content-muted">
                <span>Buffet</span>
                <span>{formatPrice(guest.buffet_total)}</span>
              </div>

              <div className="mt-1 flex justify-between text-sm text-content-muted">
                <span>Extras</span>
                <span>{formatPrice(guest.extras_total)}</span>
              </div>
            </article>
          ))}
        </div>

        <div className="mt-4 rounded-xl bg-surface-raised p-4">
          <div className="flex justify-between text-sm text-content-muted">
            <span>Subtotal dos clientes</span>
            <span>{formatPrice(bill.subtotal)}</span>
          </div>

          <div className="mt-2 flex justify-between border-t border-border pt-3 text-lg font-semibold">
            <span>Total da mesa</span>
            <span>{formatPrice(bill.total)}</span>
          </div>
        </div>

        {canManage && table.session_id !== null && (
          <div className="mt-4">
            <Button className="w-full" variant="danger" onClick={onCloseAccount}>
              Fechar conta
            </Button>
          </div>
        )}
      </div>
    </Modal>
  );
}

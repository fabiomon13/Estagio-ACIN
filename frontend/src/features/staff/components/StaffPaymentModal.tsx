import { useMemo, useState } from 'react';

import Modal from '../../../components/ui/modal/Modal';
import Button from '../../../components/ui/button/Button';
import type { StaffPaymentMethod, StaffSessionBill } from '../types/staff.types';
import { formatPrice } from '../../client/utils/formatPrice';

type StaffPaymentModalProps = {
  bill: StaffSessionBill;
  tableNumber: number;
  onClose: () => void;
  onConfirm: (
    method: StaffPaymentMethod,
    tipAmount: number,
    wasteBoxCount: number,
  ) => Promise<void>;
};

const WASTE_BOX_PRICE = 6;

export function StaffPaymentModal({
  bill,
  tableNumber,
  onClose,
  onConfirm,
}: StaffPaymentModalProps) {
  const [method, setMethod] = useState<StaffPaymentMethod>('cash');
  const [tipAmount, setTipAmount] = useState('0');
  const [wasteBoxCount, setWasteBoxCount] = useState('0');
  const [isSaving, setIsSaving] = useState(false);

  const tip = Math.max(0, Number(tipAmount) || 0);
  const wasteBoxes = Math.max(0, Number.parseInt(wasteBoxCount, 10) || 0);
  const wasteTotal = wasteBoxes * WASTE_BOX_PRICE;

  const finalTotal = useMemo(
    () => Number(bill.subtotal) + wasteTotal + tip,
    [bill.subtotal, tip, wasteTotal],
  );

  const handleConfirm = async () => {
    setIsSaving(true);

    try {
      await onConfirm(method, tip, wasteBoxes);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal open onClose={onClose} ariaLabelledBy="payment-modal-title">
      <div className="w-full p-0">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <p className="text-sm text-content-muted">Mesa</p>
            <h2 id="payment-modal-title" className="text-2xl font-semibold">
              Pagamento — Mesa {String(tableNumber).padStart(2, '0')}
            </h2>
          </div>

          <Button variant="ghost" size="sm" onClick={onClose}>
            Fechar
          </Button>
        </div>

        <div className="max-h-64 space-y-3 overflow-y-auto pr-1">
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

        <div className="mt-5 space-y-4 border-t border-border pt-4">
          <div>
            <label className="mb-1 block text-sm text-content-muted">Método de pagamento</label>

            <select
              value={method}
              onChange={(event) => setMethod(event.target.value as StaffPaymentMethod)}
              className="w-full rounded-xl border border-border bg-surface-raised px-3 py-2 text-content"
            >
              <option value="cash">Dinheiro</option>
              <option value="card">Cartão</option>
              <option value="mb_way">MB Way</option>
            </select>
          </div>

          <div className="grid grid-cols-1 gap-3">
            <label>
              <span className="mb-1 block text-sm text-content-muted">
                Caixas de desperdício (6,00 € cada)
              </span>

              <input
                type="number"
                min="0"
                step="1"
                value={wasteBoxCount}
                onChange={(event) => setWasteBoxCount(event.target.value)}
                className="w-full rounded-xl border border-border bg-surface-raised px-3 py-2 text-content"
              />
            </label>

            <label>
              <span className="mb-1 block text-sm text-content-muted">Gorjeta</span>

              <input
                type="number"
                min="0"
                step="0.01"
                value={tipAmount}
                onChange={(event) => setTipAmount(event.target.value)}
                className="w-full rounded-xl border border-border bg-surface-raised px-3 py-2 text-content"
              />
            </label>
          </div>

          <div className="space-y-2 rounded-xl bg-surface-raised p-4">
            <div className="flex justify-between text-sm text-content-muted">
              <span>Subtotal dos clientes</span>
              <span>{formatPrice(bill.subtotal)}</span>
            </div>

            <div className="flex justify-between text-sm text-content-muted">
              <span>Desperdício ({wasteBoxes} caixas)</span>
              <span>{formatPrice(wasteTotal)}</span>
            </div>

            <div className="flex justify-between text-sm text-content-muted">
              <span>Gorjeta</span>
              <span>{formatPrice(tip)}</span>
            </div>

            <div className="flex justify-between border-t border-border pt-3 text-lg font-semibold">
              <span>Total da mesa</span>
              <span>{formatPrice(finalTotal)}</span>
            </div>
          </div>

          <Button
            className="w-full"
            variant="danger"
            disabled={isSaving}
            onClick={() => void handleConfirm()}
          >
            {isSaving ? 'A guardar pagamento...' : 'Confirmar pagamento e fechar mesa'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

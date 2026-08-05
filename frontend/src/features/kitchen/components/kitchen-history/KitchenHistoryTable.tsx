import type { KitchenHistoryItem } from '../../types/kitchenHistory.types';
import { HistoryItemRow } from './HistoryItemRow';

type KitchenHistoryTableProps = {
  items: KitchenHistoryItem[];
};

export function KitchenHistoryTable({ items }: KitchenHistoryTableProps) {
  return (
    <div className=" bg-surface-raised py-4 px-6 rounded-xl">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-border-strong">
            <th className="p-2 pb-3">Prato</th>
            <th className="p-2 pb-3">Mesa</th>
            <th className="p-2 pb-3">Ronda</th>
            <th className="p-2 pb-3">Qtd</th>
            <th className="p-2 pb-3">Estação</th>
            <th className="p-2 pb-3">Estado</th>
            <th className="p-2 pb-3">Atualizado</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <HistoryItemRow key={item.order_item_id} item={item} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

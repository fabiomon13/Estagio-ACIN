import type { KitchenHistoryItem } from '../../types/kitchenHistory.types';

type HistoryItemRowProps = {
  item: KitchenHistoryItem;
};

export function HistoryItemRow({ item }: HistoryItemRowProps) {
  return (
    <tr className="border-b border-border">
      <td className="p-2">{item.menu_item_name}</td>
      <td className="p-2">{item.table_number}</td>
      <td className="p-2">{item.round_number}</td>
      <td className="p-2">{item.quantity}</td>
      <td className="p-2">{item.station}</td>
      <td className="p-2">{item.status}</td>
      <td className="p-2">{new Date(item.updated_at).toLocaleString('pt-PT')}</td>
    </tr>
  );
}

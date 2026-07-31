import { groupTicketsByColumn } from '../utils/getTicketColumn';
import { useKitchenTickets } from '../hooks/useKitchenTickets';
import KitchenColumn from '../components/kitchen-column/KitchenColumn';

export function KitchenPage() {
  const { tickets, updateStatus } = useKitchenTickets();
  const columns = groupTicketsByColumn(tickets);

  return (
    <div className="bg-background">
      <section className="p-5 flex items-start gap-4 w-full">
        <KitchenColumn title="Novos" fragments={columns.new} onAdvanceStatus={updateStatus} />
        <KitchenColumn
          title="Em preparação"
          fragments={columns.preparing}
          onAdvanceStatus={updateStatus}
        />
        <KitchenColumn title="Prontos" fragments={columns.ready} onAdvanceStatus={updateStatus} />
      </section>
    </div>
  );
}

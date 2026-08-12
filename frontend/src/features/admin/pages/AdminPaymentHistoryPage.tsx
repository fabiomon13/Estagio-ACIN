import Dropdown from '../../../components/ui/dropdown/Dropdown';
import Input from '../../../components/ui/input/Input';
import Pagination from '../../../components/ui/pagination/Pagination';
import { formatPrice } from '../../client/utils/formatPrice';
import { useAdminPaymentHistory } from '../hooks/useAdminPaymentHistory';

const METHOD_LABELS: Record<string, string> = {
  cash: 'Dinheiro',
  card: 'Cartão',
  mb_way: 'MB Way',
};

function formatMethod(method: string): string {
  return METHOD_LABELS[method] ?? method;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('pt-PT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function AdminPaymentHistoryPage() {
  const { items, totalCount, filters, setFilters, page, setPage, pageSize, isLoading, error } =
    useAdminPaymentHistory();

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  return (
    <div className="flex flex-col gap-6 p-5">
      <div>
        <h1 className="text-content text-2xl">Histórico de pagamentos</h1>
        <p className="mt-1 text-content-subtle">
          Todas as contas fechadas com pagamento registado, mais recentes primeiro.
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <Input
          type="number"
          min={1}
          label="Mesa"
          fullWidth={false}
          className="w-24"
          value={filters.tableNumber ?? ''}
          onChange={(event) =>
            setFilters((current) => ({
              ...current,
              tableNumber: event.target.value ? Number(event.target.value) : undefined,
            }))
          }
        />

        <div className="min-w-48">
          <Dropdown
            label="Método"
            placeholder="Todos"
            value={filters.method ?? null}
            onChange={(value) =>
              setFilters((current) => ({ ...current, method: value || undefined }))
            }
            options={[
              { value: '', label: 'Todos' },
              { value: 'cash', label: 'Dinheiro' },
              { value: 'card', label: 'Cartão' },
              { value: 'mb_way', label: 'MB Way' },
            ]}
          />
        </div>
      </div>

      {error && <p className="text-danger">Não foi possível carregar o histórico.</p>}

      {isLoading ? (
        <p className="text-content-muted">A carregar...</p>
      ) : items.length === 0 ? (
        <p className="text-content-muted">Sem pagamentos para estes filtros.</p>
      ) : (
        <>
          <div className="overflow-x-auto rounded-2xl border border-border bg-surface-raised">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border text-content-muted">
                  <th className="px-4 py-3 font-medium">Mesa</th>
                  <th className="px-4 py-3 font-medium">Total</th>
                  <th className="px-4 py-3 font-medium">Gorjeta</th>
                  <th className="px-4 py-3 font-medium">Método</th>
                  <th className="px-4 py-3 font-medium">Empregado</th>
                  <th className="px-4 py-3 font-medium">Data</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.payment_id} className="border-b border-border last:border-0">
                    <td className="px-4 py-3 text-content">
                      Mesa {String(item.table_number).padStart(2, '0')}
                    </td>
                    <td className="px-4 py-3 font-semibold text-content">
                      {formatPrice(item.amount_paid)}
                    </td>
                    <td className="px-4 py-3 text-content-muted">{formatPrice(item.tip_amount)}</td>
                    <td className="px-4 py-3 text-content-muted">{formatMethod(item.method)}</td>
                    <td className="px-4 py-3 text-content-muted">{item.waiter_name ?? '—'}</td>
                    <td className="px-4 py-3 text-content-muted">{formatDate(item.paid_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
        </>
      )}
    </div>
  );
}

import Dropdown from '../../../components/ui/dropdown/Dropdown';
import Pagination from '../../../components/ui/pagination/Pagination';
import { formatPrice } from '../../client/utils/formatPrice';
import { useAdminSessionHistory } from '../hooks/useAdminSessionHistory';

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('pt-PT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function AdminSessionHistoryPage() {
  const { items, totalCount, filters, setFilters, page, setPage, pageSize, isLoading, error } =
    useAdminSessionHistory();

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  return (
    <div className="flex flex-col gap-6 p-5">
      <div>
        <h1 className="text-content text-2xl">Histórico de mesas</h1>
        <p className="mt-1 text-content-subtle">
          Todas as sessões de mesa, abertas e fechadas, mais recentes primeiro.
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-48">
          <Dropdown
            label="Estado"
            placeholder="Todas"
            value={filters.onlyActive ? 'active' : null}
            onChange={(value) =>
              setFilters((current) => ({ ...current, onlyActive: value === 'active' }))
            }
            options={[
              { value: '', label: 'Todas' },
              { value: 'active', label: 'Abertas' },
            ]}
          />
        </div>
      </div>

      {error && <p className="text-danger">Não foi possível carregar o histórico.</p>}

      {isLoading ? (
        <p className="text-content-muted">A carregar...</p>
      ) : items.length === 0 ? (
        <p className="text-content-muted">Sem mesas para estes filtros.</p>
      ) : (
        <>
          <div className="overflow-x-auto rounded-2xl border border-border bg-surface-raised">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border text-content-muted">
                  <th className="px-4 py-3 font-medium">Mesa</th>
                  <th className="px-4 py-3 font-medium">Estado</th>
                  <th className="px-4 py-3 font-medium">Convidados</th>
                  <th className="px-4 py-3 font-medium">Empregado</th>
                  <th className="px-4 py-3 font-medium">Início</th>
                  <th className="px-4 py-3 font-medium">Fim</th>
                  <th className="px-4 py-3 font-medium">Pagamento</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-3 text-content">
                      {item.table_number !== null
                        ? `Mesa ${String(item.table_number).padStart(2, '0')}`
                        : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={
                          item.is_active
                            ? 'rounded-full bg-success/10 px-2 py-1 text-xs font-medium text-success'
                            : 'rounded-full bg-content-muted/10 px-2 py-1 text-xs font-medium text-content-muted'
                        }
                      >
                        {item.is_active ? 'Aberta' : 'Fechada'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-content-muted">{item.guests_count}</td>
                    <td className="px-4 py-3 text-content-muted">{item.waiter_name ?? '—'}</td>
                    <td className="px-4 py-3 text-content-muted">{formatDate(item.start_time)}</td>
                    <td className="px-4 py-3 text-content-muted">{formatDate(item.end_time)}</td>
                    <td className="px-4 py-3 text-content-muted">
                      {item.has_payment && item.payment_total !== null ? (
                        formatPrice(item.payment_total)
                      ) : (
                        <span>
                          Sem pagamento
                          {item.owed_total !== null && Number(item.owed_total) > 0 && (
                            <span className="ml-1 text-warning">
                              ({formatPrice(item.owed_total)})
                            </span>
                          )}
                        </span>
                      )}
                    </td>
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

import {
  BillFilledIcon,
  HistoryFilledIcon,
  SettingsFilledIcon,
  WarningFilledIcon,
} from '../../../components/icons';
import Dropdown from '../../../components/ui/dropdown/Dropdown';
import Input from '../../../components/ui/input/Input';
import Pagination from '../../../components/ui/pagination/Pagination';
import { KitchenHistoryTable } from '../components/kitchen-history/KitchenHistoryTable';
import { useKitchenHistory } from '../hooks/useKitchenHistory';

const STATUS_OPTIONS = ['Pending', 'Preparing', 'Ready', 'Served', 'Cancelled', 'Returned'];

export function KitchenHistoryPage() {
  const {
    items,
    totalCount,
    summary,
    filterOptions,
    filters,
    setFilters,
    page,
    setPage,
    pageSize,
    isLoading,
    error,
  } = useKitchenHistory();

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  const totalGeral = Object.values(summary.counts).reduce((sum, count) => sum + count, 0);
  const cancelledPercentage =
    totalGeral > 0 ? Math.round(((summary.counts.Cancelled ?? 0) / totalGeral) * 100) : 0;

  const summaryCards = [
    {
      icon: <BillFilledIcon size={32} />,
      color: 'text-success',
      label: 'Total geral',
      value: totalGeral,
      bgColor: 'bg-success-soft',
    },
    {
      icon: <WarningFilledIcon size={32} />,
      color: 'text-danger',
      label: '% Cancelados',
      value: `${cancelledPercentage}%`,
      bgColor: 'bg-danger-soft',
    },
    {
      icon: <SettingsFilledIcon size={32} />,
      color: 'text-info',
      label: 'Estação com mais carga',
      value: summary.busiest_station ?? '—',
      bgColor: 'bg-info-soft',
    },
    {
      icon: <HistoryFilledIcon size={32} />,
      color: 'text-warning',
      label: 'Hora de pico',
      value: summary.peak_hour !== null ? `${summary.peak_hour}h` : '—',
      bgColor: 'bg-warning-soft',
    },
  ];

  return (
    <div className="flex flex-col p-5">
      <h1 className="text-content text-2xl pb-5">Historial</h1>

      <div className="flex flex-wrap gap-3 pb-7">
        {summaryCards.map((card) => (
          <div
            key={card.label}
            className="flex items-center gap-6 rounded-xl  bg-surface-raised p-4"
          >
            <div className={`rounded-lg p-2 ${card.bgColor}`}>
              <span className={card.color}>{card.icon}</span>
            </div>
            <div>
              <p className="text-content-muted text-sm">{card.label}</p>
              <p className="text-2xl font-bold">{card.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-end gap-3 pb-4">
        <Input
          type="date"
          label="Data (de)"
          fullWidth={false}
          value={filters.dateFrom}
          onChange={(event) =>
            setFilters((current) => ({ ...current, dateFrom: event.target.value }))
          }
        />

        <Input
          type="date"
          label="Data (até)"
          fullWidth={false}
          value={filters.dateTo ?? ''}
          onChange={(event) =>
            setFilters((current) => ({ ...current, dateTo: event.target.value || undefined }))
          }
        />

        <div className="min-w-48">
          <Dropdown
            label="Estado"
            placeholder="Todos"
            value={filters.status ?? null}
            onChange={(value) =>
              setFilters((current) => ({ ...current, status: value || undefined }))
            }
            options={[
              { value: '', label: 'Todos' },
              ...STATUS_OPTIONS.map((status) => ({ value: status, label: status })),
            ]}
          />
        </div>

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
            label="Prato"
            placeholder="Todos"
            value={filters.itemId !== undefined ? String(filters.itemId) : null}
            onChange={(value) =>
              setFilters((current) => ({ ...current, itemId: value ? Number(value) : undefined }))
            }
            options={[
              { value: '', label: 'Todos' },
              ...filterOptions.items.map((item) => ({ value: String(item.id), label: item.name })),
            ]}
          />
        </div>

        <div className="min-w-48">
          <Dropdown
            label="Estação"
            placeholder="Todas"
            value={filters.stationId !== undefined ? String(filters.stationId) : null}
            onChange={(value) =>
              setFilters((current) => ({
                ...current,
                stationId: value ? Number(value) : undefined,
              }))
            }
            options={[
              { value: '', label: 'Todas' },
              ...filterOptions.stations.map((station) => ({
                value: String(station.id),
                label: station.name,
              })),
            ]}
          />
        </div>
      </div>

      {error && <p className="text-danger">Não foi possível carregar o histórico.</p>}

      {isLoading ? (
        <p className="text-content-muted">A carregar...</p>
      ) : items.length === 0 ? (
        <p className="text-content-muted">Sem resultados para estes filtros.</p>
      ) : (
        <>
          <KitchenHistoryTable items={items} />
          <div className="pt-4">
            <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
          </div>
        </>
      )}
    </div>
  );
}

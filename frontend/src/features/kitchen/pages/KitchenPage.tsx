import { useState } from 'react';
import { groupTicketsByColumn } from '../utils/getTicketColumn';
import { filterFragments } from '../utils/filterFragments';
import { useKitchenTickets } from '../hooks/useKitchenTickets';
import KitchenColumn from '../components/kitchen-column/KitchenColumn';
import Loader from '../../../components/ui/loader/Loader';
import SearchInput from '../../../components/ui/search-input/SearchInput';
import Dropdown from '../../../components/ui/dropdown/Dropdown';
import { getStationColor, STATION_NAMES } from '../../../utils/getStationColor';
import { useNow } from '../../../hooks/useNow';
import KitchenNotification from '../components/kitchen-notification/KitchenNotification';
import Button from '../../../components/ui/button/Button';
import { PlusIcon } from '../../../components/icons';

const dateFormatter = new Intl.DateTimeFormat('pt-PT', {
  weekday: 'long',
  day: '2-digit',
  month: 'long',
});

const timeFormatter = new Intl.DateTimeFormat('pt-PT', {
  hour: '2-digit',
  minute: '2-digit',
});

const ALL_STATIONS_VALUE = '';

const stationOptions = [
  { value: ALL_STATIONS_VALUE, label: 'Todas as estações' },
  ...STATION_NAMES.map((station) => ({
    value: station,
    label: station,
    leftContent: <span className={`size-2.5 rounded-full ${getStationColor(station)}`} />,
  })),
];

export function KitchenPage() {
  const { tickets, isLoading, updateStatus } = useKitchenTickets();
  const [search, setSearch] = useState('');
  const [stationFilter, setStationFilter] = useState(ALL_STATIONS_VALUE);
  const [showTestNotification, setShowTestNotification] = useState(false);
  const columns = groupTicketsByColumn(tickets);
  const now = useNow();

  if (isLoading) {
    return (
      <div className="bg-background flex h-full items-center justify-center">
        <Loader label="A carregar pedidos..." />
      </div>
    );
  }

  return (
    <div className="bg-background p-5 gap-8">
      <header className="flex justify-between pb-10 items-center">
        <div className="flex gap-4 w-[70%]">
          <div className="w-[40%]">
            <SearchInput
              placeholder="Procurar por messa ou item"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              onClear={() => setSearch('')}
            />
          </div>
          <div className="w-[25%]">
            <Dropdown
              value={stationFilter}
              onChange={setStationFilter}
              options={stationOptions}
              placeholder="Todas as estações"
            />
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setShowTestNotification((prev) => !prev)}
          >
            Testar notificação
          </Button>
        </div>
        <div className="text-right">
          <h1 className="text-content text-2xl">{timeFormatter.format(now)}</h1>
          <span className="text-md text-content-subtle capitalize">
            {dateFormatter.format(now)}
          </span>
        </div>
      </header>
      {showTestNotification && (
        <div className="fixed right-5 top-5 z-50 w-96 animate-toast-in">
          <KitchenNotification
            variant="info"
            message="Nova ronda na mesa 5"
            icon={<PlusIcon size={16} />}
            onDismiss={() => setShowTestNotification(false)}
          />
        </div>
      )}
      <section className=" flex items-start gap-4 w-full">
        <KitchenColumn
          title="Novos"
          fragments={filterFragments(columns.new, search, stationFilter)}
          onAdvanceStatus={updateStatus}
        />
        <KitchenColumn
          title="Em preparação"
          fragments={filterFragments(columns.preparing, search, stationFilter)}
          onAdvanceStatus={updateStatus}
        />
        <KitchenColumn
          title="Prontos"
          fragments={filterFragments(columns.ready, search, stationFilter)}
          onAdvanceStatus={updateStatus}
        />
      </section>
    </div>
  );
}

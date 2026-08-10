import { useState } from 'react';
import { groupTicketsByColumn } from '../utils/getTicketColumn';
import { filterFragments } from '../utils/filterFragments';
import { useKitchenTickets } from '../hooks/useKitchenTickets';
import KitchenColumn from '../components/kitchen-column/KitchenColumn';
import KitchenClock from '../components/kitchen-clock/KitchenClock';
import Loader from '../../../components/ui/loader/Loader';
import SearchInput from '../../../components/ui/search-input/SearchInput';
import Dropdown from '../../../components/ui/dropdown/Dropdown';
import { getStationColor, STATION_NAMES } from '../../../utils/getStationColor';

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
  const columns = groupTicketsByColumn(tickets);

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
        </div>
        <KitchenClock />
      </header>
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

import { useState } from 'react';
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { groupTicketsByColumn } from '../utils/getTicketColumn';
import { filterFragments } from '../utils/filterFragments';
import { useKitchenTickets } from '../hooks/useKitchenTickets';
import { useKitchenDragAndDrop } from '../hooks/useKitchenDragAndDrop';
import { loadInteractionMode } from '../utils/interactionModePreferences';
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
  const { tickets, isLoading, updateStatus, updateStatusAsync } = useKitchenTickets();
  const [search, setSearch] = useState('');
  const [stationFilter, setStationFilter] = useState(ALL_STATIONS_VALUE);
  // Read once per mount -- KitchenSettingsPage is a separate route/page, so
  // there's no live cross-tab sync need; revisiting Configuração and coming
  // back remounts this page anyway.
  const [interactionMode] = useState(() => loadInteractionMode());

  const { handleDragEnd } = useKitchenDragAndDrop({ updateStatus, updateStatusAsync });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor),
  );

  const columns = groupTicketsByColumn(tickets);

  if (isLoading) {
    return (
      <div className="bg-background flex h-full items-center justify-center">
        <Loader label="A carregar pedidos..." />
      </div>
    );
  }

  const board = (
    <section className=" flex items-start gap-4 w-full">
      <KitchenColumn
        title="Novos"
        column="new"
        fragments={filterFragments(columns.new, search, stationFilter)}
        interactionMode={interactionMode}
        onAdvanceStatus={updateStatus}
      />
      <KitchenColumn
        title="Em preparação"
        column="preparing"
        fragments={filterFragments(columns.preparing, search, stationFilter)}
        interactionMode={interactionMode}
        onAdvanceStatus={updateStatus}
      />
      <KitchenColumn
        title="Prontos"
        column="ready"
        fragments={filterFragments(columns.ready, search, stationFilter)}
        interactionMode={interactionMode}
        onAdvanceStatus={updateStatus}
      />
    </section>
  );

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

      {interactionMode === 'drag' ? (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          {board}
        </DndContext>
      ) : (
        board
      )}
    </div>
  );
}

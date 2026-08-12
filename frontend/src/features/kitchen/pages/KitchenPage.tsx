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
import { StationFilter } from '../components/station-filter/StationFilter';
import Loader from '../../../components/ui/loader/Loader';
import SearchInput from '../../../components/ui/search-input/SearchInput';

export function KitchenPage() {
  const { tickets, isLoading, updateStatus, updateStatusAsync } = useKitchenTickets();
  const [search, setSearch] = useState('');
  const [stationFilter, setStationFilter] = useState<string[]>([]);
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
      <header className="flex flex-col gap-4 pb-10">
        <div className="flex justify-between items-center">
          <div className="w-[40%]">
            <SearchInput
              placeholder="Procurar por messa ou item"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              onClear={() => setSearch('')}
            />
          </div>
          <KitchenClock />
        </div>
        <StationFilter selectedStations={stationFilter} onChange={setStationFilter} />
      </header>

      {interactionMode === 'drag' ? (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
          autoScroll={false}
        >
          {board}
        </DndContext>
      ) : (
        board
      )}
    </div>
  );
}

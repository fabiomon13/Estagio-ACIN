import { getStationColor, STATION_NAMES } from '../../../../utils/getStationColor';

type StationFilterProps = {
  selectedStations: string[];
  onChange: (stations: string[]) => void;
};

export function StationFilter({ selectedStations, onChange }: StationFilterProps) {
  function toggleStation(station: string) {
    if (selectedStations.includes(station)) {
      onChange(selectedStations.filter((selected) => selected !== station));
    } else {
      onChange([...selectedStations, station]);
    }
  }

  return (
    <div
      className="flex flex-wrap items-center gap-2"
      role="group"
      aria-label="Filtrar por estação"
    >
      <button
        type="button"
        onClick={() => onChange([])}
        aria-pressed={selectedStations.length === 0}
        className={`rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
          selectedStations.length === 0
            ? 'border-primary/40 bg-primary/10 text-content'
            : 'border-border bg-surface text-content-muted hover:text-content'
        }`}
      >
        Todas as estações
      </button>

      {STATION_NAMES.map((station) => {
        const isSelected = selectedStations.includes(station);
        return (
          <button
            key={station}
            type="button"
            onClick={() => toggleStation(station)}
            aria-pressed={isSelected}
            className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
              isSelected
                ? 'border-primary/40 bg-primary/10 text-content'
                : 'border-border bg-surface text-content-muted hover:text-content'
            }`}
          >
            <span className={`size-2.5 rounded-full ${getStationColor(station)}`} />
            {station}
          </button>
        );
      })}
    </div>
  );
}

const STATION_COLORS: Record<string, string> = {
  'Sushi Bar': 'bg-station-aqua',
  'Hot / Wok': 'bg-station-orange',
  Fryer: 'bg-station-yellow',
  'Cold / Pantry': 'bg-station-blue',
  Bar: 'bg-station-magenta',
};

const DEFAULT_STATION_COLOR = 'bg-content-subtle';

export const STATION_NAMES = Object.keys(STATION_COLORS);

export function getStationColor(station: string): string {
  return STATION_COLORS[station] ?? DEFAULT_STATION_COLOR;
}

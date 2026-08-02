import type { TicketFragment } from './getTicketColumn';

// Filters one fragment's items by station and search text. Returns null if none match
function filterFragment(
  fragment: TicketFragment,
  query: string,
  station: string,
): TicketFragment | null {
  const tableMatches = query !== '' && String(fragment.table_number).includes(query);

  const items = fragment.items.filter((item) => {
    if (station && item.station !== station) return false;
    if (query === '') return true;
    return tableMatches || item.menu_item_name.toLowerCase().includes(query);
  });

  return items.length > 0 ? { ...fragment, items } : null;
}

// Filters a column's fragments by station and search text, dropping empty results.
export function filterFragments(
  fragments: TicketFragment[],
  search: string,
  station: string,
): TicketFragment[] {
  const query = search.trim().toLowerCase();

  return fragments.reduce<TicketFragment[]>((acc, fragment) => {
    const filtered = filterFragment(fragment, query, station);
    if (filtered) acc.push(filtered);
    return acc;
  }, []);
}

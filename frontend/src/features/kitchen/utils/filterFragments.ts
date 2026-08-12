import type { TicketFragment } from './getTicketColumn';

// Filters one fragment's items by station(s) and search text. Returns null if none match
function filterFragment(
  fragment: TicketFragment,
  query: string,
  stations: string[],
): TicketFragment | null {
  const tableMatches = query !== '' && String(fragment.table_number).includes(query);

  const items = fragment.items.filter((item) => {
    if (stations.length > 0 && !stations.includes(item.station)) return false;
    if (query === '') return true;
    return tableMatches || item.menu_item_name.toLowerCase().includes(query);
  });

  return items.length > 0 ? { ...fragment, items } : null;
}

// Filters a column's fragments by stations and search text, dropping empty results.
export function filterFragments(
  fragments: TicketFragment[],
  search: string,
  stations: string[],
): TicketFragment[] {
  const query = search.trim().toLowerCase();

  return fragments.reduce<TicketFragment[]>((acc, fragment) => {
    const filtered = filterFragment(fragment, query, stations);
    if (filtered) acc.push(filtered);
    return acc;
  }, []);
}

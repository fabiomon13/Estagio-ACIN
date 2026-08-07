import { useNow } from '../../../../hooks/useNow';

const dateFormatter = new Intl.DateTimeFormat('pt-PT', {
  weekday: 'long',
  day: '2-digit',
  month: 'long',
});

const timeFormatter = new Intl.DateTimeFormat('pt-PT', {
  hour: '2-digit',
  minute: '2-digit',
});

// Owns the 1s tick so it re-renders alone. KitchenPage and the ticket
// board below it never re-render just because the clock changed.
export default function KitchenClock() {
  const now = useNow();

  return (
    <div className="text-right">
      <h1 className="text-content text-2xl">{timeFormatter.format(now)}</h1>
      <span className="text-md text-content-subtle capitalize">{dateFormatter.format(now)}</span>
    </div>
  );
}

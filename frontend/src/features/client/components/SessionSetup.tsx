import LogoIcon from '../../../components/icons/Logo';
import type { Table } from '../services/menuApi';

type SessionSetupProps = {
  table: Table;
  guestCount: number;
  isSubmitting: boolean;
  onDecrease: () => void;
  onIncrease: () => void;
  onSubmit: () => void;
};

export function SessionSetup({
  table,
  guestCount,
  isSubmitting,
  onDecrease,
  onIncrease,
  onSubmit,
}: SessionSetupProps) {
  return (
    <main className="session-setup">
      <LogoIcon className="session-setup-logo" />
      <form
        className="session-setup-content"
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit();
        }}
      >
        <div>
          <h1>Welcome to your table</h1>
          <p>
            You are at table {table.table_number}. Indicate how many people will be sitting at this
            table.
          </p>
        </div>
        <div className="session-setup-actions">
          <div className="guest-counter">
            <span className="guest-counter-label">
              <span aria-hidden="true">♧</span> Guests
            </span>
            <div className="guest-counter-controls">
              <button
                type="button"
                onClick={onDecrease}
                disabled={guestCount <= 1}
                aria-label="Decrease guests"
              >
                −
              </button>
              <output aria-label={`${guestCount} guests`}>{guestCount}</output>
              <button
                type="button"
                onClick={onIncrease}
                disabled={guestCount >= table.max_capacity}
                aria-label="Increase guests"
              >
                +
              </button>
            </div>
          </div>
          <button type="submit" className="session-submit" disabled={isSubmitting}>
            {isSubmitting ? 'Creating session…' : 'View menu'} <span aria-hidden="true">→</span>
          </button>
        </div>
      </form>
    </main>
  );
}

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
          <h1>Bem-vindo à sua mesa</h1>
          <p>
            Está na mesa {table.table_number}. Indique quantas pessoas se vão sentar nesta mesa.
          </p>
        </div>
        <div className="session-setup-actions">
          <div className="guest-counter">
            <span className="guest-counter-label">
              <span aria-hidden="true">♧</span> Pessoas
            </span>
            <div className="guest-counter-controls">
              <button
                type="button"
                onClick={onDecrease}
                disabled={guestCount <= 1}
                aria-label="Diminuir o número de pessoas"
              >
                −
              </button>
              <output aria-label={`${guestCount} pessoas`}>{guestCount}</output>
              <button
                type="button"
                onClick={onIncrease}
                disabled={guestCount >= table.max_capacity}
                aria-label="Aumentar o número de pessoas"
              >
                +
              </button>
            </div>
          </div>
          <button type="submit" className="session-submit" disabled={isSubmitting}>
            {isSubmitting ? 'A criar sessão…' : 'Ver menu'} <span aria-hidden="true">→</span>
          </button>
        </div>
      </form>
    </main>
  );
}

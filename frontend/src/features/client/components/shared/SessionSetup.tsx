import LogoIcon from '../../../../components/icons/Logo';
import type { Table } from '../../services/menuApi';

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
  const canDecrease = guestCount > 1;

  const canIncrease = guestCount < table.max_capacity;

  return (
    <main className="session-setup">
      <LogoIcon className="session-setup-logo" />

      <form
        className="session-setup-content"
        onSubmit={(event) => {
          event.preventDefault();

          if (!isSubmitting) {
            onSubmit();
          }
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
                disabled={!canDecrease || isSubmitting}
                aria-label="Diminuir o número de pessoas"
                onClick={onDecrease}
              >
                −
              </button>

              <output aria-label={`${guestCount} pessoas`}>{guestCount}</output>

              <button
                type="button"
                disabled={!canIncrease || isSubmitting}
                aria-label="Aumentar o número de pessoas"
                onClick={onIncrease}
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

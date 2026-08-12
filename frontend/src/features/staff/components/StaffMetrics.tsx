type StaffMetricsProps = {
  assistanceCount: number;
  approvalRequests: number;
  paymentRequestCount: number;
  occupiedTables: number;
  guestCount: number;
};

export function StaffMetrics({
  assistanceCount,
  approvalRequests,
  paymentRequestCount,
  occupiedTables,
  guestCount,
}: StaffMetricsProps) {
  return (
    <section className="grid grid-cols-2 gap-2 mb-5 sm:grid-cols-3 md:gap-3 xl:grid-cols-5">
      <div className="rounded-2xl border border-danger bg-surface-raised p-3">
        <p className="truncate text-xs text-content-muted md:text-sm">Assistência</p>
        <p className="text-2xl font-bold text-danger">{assistanceCount}</p>
      </div>

      <div className="rounded-2xl border border-warning bg-surface-raised p-3">
        <p className="truncate text-xs text-content-muted md:text-sm">Aprovação</p>
        <p className="text-2xl font-bold text-warning">{approvalRequests}</p>
      </div>

      <div className="rounded-2xl border border-info bg-surface-raised p-3">
        <p className="truncate text-xs text-content-muted md:text-sm">Pagamento</p>
        <p className="text-2xl font-bold text-info">{paymentRequestCount}</p>
      </div>

      <div className="rounded-2xl border border-success bg-surface-raised p-3">
        <p className="truncate text-xs text-content-muted md:text-sm">Em curso</p>
        <p className="text-2xl font-bold text-success">{occupiedTables}</p>
      </div>

      <div className="rounded-2xl border border-pink-500 bg-surface-raised p-3">
        <p className="truncate text-xs text-content-muted md:text-sm">Clientes</p>
        <p className="text-2xl font-bold text-pink-500">{guestCount}</p>
      </div>
    </section>
  );
}

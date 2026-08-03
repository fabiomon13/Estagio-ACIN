import { useEffect, useMemo, useState } from 'react';
import Button from '../../../components/ui/button/Button';
import Badge from '../../../components/ui/badge/Badge';
import { useToast } from '../../../components/ui/toast/useToast';
import { useAuth } from '../../auth/hooks/useAuth';
import {
  approveSession,
  deactivateSession,
  getStaffDashboard,
  resolveRequest,
  type StaffDashboard,
} from '../api/staffApi';

const POLL_MS = 10000;

function minsSince(date: string | null) {
  if (!date) return null;
  const ms = Date.now() - new Date(date).getTime();
  return Math.max(0, Math.floor(ms / 60000));
}

function tableBorder(state: string) {
  if (state === 'active') return 'border-success';
  if (state === 'awaiting_approval' || state === 'payment_requested') return 'border-warning';
  if (state === 'inactive') return 'border-border-strong';
  return 'border-border';
}

function isAssistanceType(type: string) {
  const t = String(type ?? '')
    .trim()
    .toLowerCase();
  return t === 'assistance';
}

function isUrgentPriority(priority: string) {
  const p = String(priority ?? '')
    .trim()
    .toLowerCase();
  return p === 'urgent' || p === 'high' || p === 'alta';
}

export function StaffPage() {
  const { staff, logout } = useAuth();
  const { showToast } = useToast();
  const [data, setData] = useState<StaffDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [tablesView, setTablesView] = useState<StaffDashboard['tables']>([]);
  const [confirmingDeactivate, setConfirmingDeactivate] = useState<{
    sessionId: number;
    tableNumber: number;
  } | null>(null);
  const [approvalActionFor, setApprovalActionFor] = useState<number | null>(null); // session_id
  const [confirmSolveForTable, setConfirmSolveForTable] = useState<number | null>(null);

  const load = async () => {
    try {
      const d = await getStaffDashboard();
      setData(d);

      setTablesView((prev) => {
        const incoming = d.tables ?? [];
        const byNumber = new Map<number, StaffDashboard['tables'][number]>();

        // keep previous snapshot
        for (const t of prev) byNumber.set(t.table_number, t);

        // update with incoming fresh data
        for (const t of incoming) byNumber.set(t.table_number, t);

        // if a known table disappeared from backend list, keep it as inactive
        const incomingNumbers = new Set(incoming.map((t) => t.table_number));
        for (const [num, t] of byNumber) {
          if (!incomingNumbers.has(num)) {
            byNumber.set(num, { ...t, state: 'inactive' });
          }
        }

        return Array.from(byNumber.values()).sort((a, b) => a.table_number - b.table_number);
      });
    } catch {
      showToast({ variant: 'danger', title: 'Erro ao carregar dashboard' });
    } finally {
      setLoading(false);
    }
  };

  const onSolveAssistance = async (requestId: number, tableNumber: number) => {
    try {
      await resolveRequest(requestId);
      showToast({ variant: 'success', title: `Assistência da mesa ${tableNumber} resolvida` });
      setConfirmSolveForTable(null);
      await load();
    } catch {
      showToast({ variant: 'danger', title: 'Não foi possível resolver assistência' });
    }
  };

  useEffect(() => {
    void load();
    const id = setInterval(() => void load(), POLL_MS);
    return () => clearInterval(id);
  }, []);

  const assistanceTables = useMemo(() => {
    const set = new Set<number>();
    for (const r of data?.requests ?? []) {
      const t = String(r.type ?? '')
        .trim()
        .toLowerCase();
      if (t === 'assistance' || t === 'assitance' || t.includes('assist')) {
        set.add(Number(r.table_number));
      }
    }
    return set;
  }, [data]);

  const assistanceCount = useMemo(
    () =>
      (data?.requests ?? []).filter((r) => {
        const t = String(r.type ?? '')
          .trim()
          .toLowerCase();
        return t === 'assistance' || t === 'assitance' || t.includes('assist');
      }).length,
    [data],
  );

  const approvalRequests = useMemo(
    () => (data?.tables ?? []).filter((t) => t.state === 'awaiting_approval').length,
    [data],
  );

  const assistanceRequestByTable = useMemo(() => {
    const map = new Map<number, { id: number; created_at: string }>();

    for (const r of data?.requests ?? []) {
      const t = String(r.type ?? '')
        .trim()
        .toLowerCase();
      const isAssistance = t === 'assistance' || t === 'assitance' || t.includes('assist');
      if (!isAssistance) continue;

      const tableNumber = Number(r.table_number);
      const current = map.get(tableNumber);

      if (!current || new Date(r.created_at).getTime() > new Date(current.created_at).getTime()) {
        map.set(tableNumber, { id: r.id, created_at: r.created_at });
      }
    }

    return map;
  }, [data]);

  const onApprove = async (sessionId: number, tableNumber: number) => {
    try {
      await approveSession(sessionId);
      showToast({ variant: 'success', title: `Mesa ${tableNumber} aprovada` });
      await load();
    } catch {
      showToast({ variant: 'danger', title: 'Não foi possível aprovar' });
    }
  };

  const onDeactivate = async (sessionId: number, tableNumber: number) => {
    try {
      await deactivateSession(sessionId);
      showToast({ variant: 'warning', title: `Mesa ${tableNumber} desativada` });
      await load();
    } catch {
      showToast({ variant: 'danger', title: 'Não foi possível desativar' });
    }
  };

  const onRejectApproval = async (sessionId: number, tableNumber: number) => {
    try {
      await deactivateSession(sessionId); // reject => inactive
      showToast({ variant: 'warning', title: `Mesa ${tableNumber} recusada` });
      await load();
    } catch {
      showToast({ variant: 'danger', title: 'Não foi possível recusar' });
    } finally {
      setApprovalActionFor(null);
    }
  };

  if (loading) return <div className="p-6 text-content-muted">A carregar...</div>;

  return (
    <div className="min-h-screen bg-background text-content p-5">
      <header className="mb-5 flex items-center justify-between">
        <h1 className="text-3xl font-bold text-primary">Scan&Serve</h1>
        <div className="flex items-center gap-3">
          <span className="text-content-muted">{staff?.name}</span>
          <Button variant="outline" onClick={() => logout()}>
            Sair
          </Button>
        </div>
      </header>

      <section className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4 mb-5">
        <div className="rounded-2xl border border-danger bg-surface-raised p-4">
          <p className="text-content-muted">Necessitam de Assistência</p>
          <p className="text-3xl font-bold text-danger">{assistanceCount}</p>
        </div>
        <div className="rounded-2xl border border-warning bg-surface-raised p-4">
          <p className="text-content-muted">Pedidos de Aprovação</p>
          <p className="text-3xl font-bold text-warning">{approvalRequests}</p>
        </div>
        <div className="rounded-2xl border border-success bg-surface-raised p-4">
          <p className="text-content-muted">Pedidos em curso</p>
          <p className="text-3xl font-bold text-success">{data?.summary.occupied_tables ?? 0}</p>
        </div>
        <div className="rounded-2xl border border-info bg-surface-raised p-4">
          <p className="text-content-muted">Clientes na Sala</p>
          <p className="text-3xl font-bold text-info">{data?.summary.guest_count ?? 0}</p>
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-surface p-4">
        <h2 className="text-3xl font-semibold">Planta da Sala</h2>
        <p className="text-content-muted mb-4">Toque numa mesa para ver os detalhes ou atender</p>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {tablesView.map((table) => {
            const hasUrgentAssistance = assistanceTables.has(table.table_number);
            const assistanceReq = assistanceRequestByTable.get(table.table_number);
            const hasAssistance = Boolean(assistanceReq);

            return (
              <article
                key={table.session_id}
                className={`rounded-3xl border-2 p-4 ${
                  hasUrgentAssistance
                    ? 'border-danger bg-danger/10 shadow-[0_0_0_1px_var(--color-danger)]'
                    : `${tableBorder(table.state)} bg-surface-raised`
                }`}
              >
                <p className="text-content-muted">Mesa</p>
                <p className="text-5xl font-bold leading-none">
                  {String(table.table_number).padStart(2, '0')}
                </p>

                <div className="mt-3 flex items-center justify-between text-content-muted text-sm">
                  <span>{minsSince(table.started_at) ?? 0} min</span>
                  <span>{table.guest_count} pax</span>
                </div>

                <div className="mt-3 flex items-center justify-between">
                  <Badge
                    variant={
                      table.state === 'active'
                        ? 'success'
                        : table.state === 'awaiting_approval'
                          ? 'warning'
                          : 'default'
                    }
                  >
                    {table.state}
                  </Badge>
                  <span className="text-content-muted text-sm">{table.total}</span>
                </div>

                {table.state === 'awaiting_approval' && (
                  <div className="mt-4 rounded-2xl border-2 border-warning bg-warning/10 p-3">
                    <p className="text-sm font-semibold text-warning mb-2">Pedido de Aprovação</p>

                    {/* Big noticeable button, but local to the table card */}
                    <Button
                      className="w-full"
                      size="sm"
                      onClick={() => setApprovalActionFor(table.session_id!)}
                    >
                      Aprovar mesa {String(table.table_number).padStart(2, '0')}
                    </Button>

                    {/* Inline confirm/reject panel for this table only */}
                    {approvalActionFor === table.session_id && (
                      <div className="mt-3 rounded-xl border border-border-strong bg-surface p-3">
                        <p className="text-sm text-content-muted mb-3">
                          O cliente está à espera de aprovação.
                        </p>
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              void onRejectApproval(table.session_id!, table.table_number)
                            }
                          >
                            Recusar
                          </Button>
                          <Button
                            size="sm"
                            onClick={async () => {
                              await onApprove(table.session_id!, table.table_number);
                              setApprovalActionFor(null);
                            }}
                          >
                            Aprovar
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div className="mt-4 flex gap-2">
                  {table.state === 'active' && (
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() =>
                        setConfirmingDeactivate({
                          sessionId: table.session_id!,
                          tableNumber: table.table_number,
                        })
                      }
                    >
                      Desativar
                    </Button>
                  )}
                </div>

                {table.state !== 'inactive' &&
                  confirmingDeactivate?.sessionId === table.session_id && (
                    <div className="mt-4 rounded-2xl border border-border-strong bg-surface p-4">
                      <h3 className="text-lg font-semibold text-content">
                        Confirmar desativação da mesa?
                      </h3>
                      <p className="mt-1 text-sm text-content-muted">
                        Podes cancelar se foi um clique acidental. Depois de desativar, a mesa fica
                        inativa.
                      </p>

                      <div className="mt-4 flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setConfirmingDeactivate(null)}
                        >
                          Cancelar
                        </Button>

                        <Button
                          size="sm"
                          variant="danger"
                          onClick={async () => {
                            await onDeactivate(table.session_id!, table.table_number);
                            setConfirmingDeactivate(null);
                          }}
                        >
                          Confirmar
                        </Button>
                      </div>
                    </div>
                  )}

                {hasAssistance && (
                  <div className="mt-4 rounded-2xl border border-danger bg-danger/10 p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold text-danger">Assistência urgente</p>
                        <p className="text-xs text-content-muted">Toque para confirmar resolução</p>
                      </div>

                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => setConfirmSolveForTable(table.table_number)}
                      >
                        Resolver
                      </Button>
                    </div>

                    {confirmSolveForTable === table.table_number && (
                      <div className="mt-3 rounded-xl border border-border-strong bg-surface p-3">
                        <p className="text-sm text-content-muted mb-3">
                          Confirmar estado da assistência?
                        </p>
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setConfirmSolveForTable(null)}
                          >
                            Não resolvido
                          </Button>
                          <Button
                            size="sm"
                            className="bg-success text-white hover:opacity-90"
                            onClick={() =>
                              void onSolveAssistance(assistanceReq!.id, table.table_number)
                            }
                          >
                            Resolvido
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}

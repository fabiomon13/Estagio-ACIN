import { useEffect, useMemo, useState } from 'react';
import Button from '../../../components/ui/button/Button';
import Badge from '../../../components/ui/badge/Badge';
import { useToast } from '../../../components/ui/toast/useToast';
import { useAuth } from '../../auth/hooks/useAuth';
import {
  approveSession,
  deactivateSession,
  getStaffDashboard,
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

export function StaffPage() {
  const { staff, logout } = useAuth();
  const { showToast } = useToast();
  const [data, setData] = useState<StaffDashboard | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const d = await getStaffDashboard();
      setData(d);
    } catch {
      showToast({ variant: 'danger', title: 'Erro ao carregar dashboard' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    const id = setInterval(() => void load(), POLL_MS);
    return () => clearInterval(id);
  }, []);

  const urgentAssistance = useMemo(
    () =>
      (data?.requests ?? []).filter(
        (r) => r.type === 'assistance' && String(r.priority).toLowerCase() === 'urgent',
      ).length,
    [data],
  );

  const paymentApproval = useMemo(
    () => (data?.requests ?? []).filter((r) => r.type === 'payment_request').length,
    [data],
  );

  const onApprove = async (sessionId: number) => {
    try {
      await approveSession(sessionId);
      showToast({ variant: 'success', title: `Mesa ${sessionId} aprovada` });
      await load();
    } catch {
      showToast({ variant: 'danger', title: 'Não foi possível aprovar' });
    }
  };

  const onDeactivate = async (sessionId: number) => {
    try {
      await deactivateSession(sessionId);
      showToast({ variant: 'warning', title: `Mesa ${sessionId} desativada` });
      await load();
    } catch {
      showToast({ variant: 'danger', title: 'Não foi possível desativar' });
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
          <p className="text-3xl font-bold text-danger">{urgentAssistance}</p>
        </div>
        <div className="rounded-2xl border border-warning bg-surface-raised p-4">
          <p className="text-content-muted">Pedidos de Conta/Aprovação</p>
          <p className="text-3xl font-bold text-warning">{paymentApproval}</p>
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
          {(data?.tables ?? []).map((table) => (
            <article
              key={table.session_id}
              className={`rounded-3xl border-2 ${tableBorder(table.state)} bg-surface-raised p-4`}
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

              <div className="mt-4 flex gap-2">
                {table.state === 'awaiting_approval' && (
                  <Button size="sm" onClick={() => void onApprove(table.session_id)}>
                    Aprovar
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="danger"
                  onClick={() => void onDeactivate(table.session_id)}
                >
                  Desativar
                </Button>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

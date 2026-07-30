import { useEffect, useMemo, useState } from 'react';
import Badge from '../../../components/ui/badge/Badge';
import Button from '../../../components/ui/button/Button';
import ConfirmDialog from '../../../components/ui/confirm-dialog/ConfirmDialog';
import { useToast } from '../../../components/ui/toast/useToast';
import { useAuth } from '../../auth/hooks/useAuth';
import {
  approveSession,
  deactivateSession,
  getStaffDashboard,
  resolveRequest,
  type StaffDashboard,
  type StaffDashboardTable,
} from '../api/staffApi';

const REFRESH_MS = 10000;

function stateColor(state: StaffDashboardTable['state']) {
  if (state === 'active') return 'border-success';
  if (state === 'awaiting_approval') return 'border-warning';
  if (state === 'payment_requested') return 'border-info';
  return 'border-border';
}

export function StaffPage() {
  const { staff, logout } = useAuth();
  const { showToast } = useToast();
  const [data, setData] = useState<StaffDashboard | null>(null);
  const [selectedSessionId, setSelectedSessionId] = useState<number | null>(null);
  const [deactivateOpen, setDeactivateOpen] = useState(false);

  const load = async () => {
    try {
      const dashboard = await getStaffDashboard();
      setData(dashboard);
    } catch {
      showToast({ variant: 'danger', title: 'Erro ao carregar dashboard.' });
    }
  };

  useEffect(() => {
    void load();
    const id = setInterval(() => void load(), REFRESH_MS);
    return () => clearInterval(id);
  }, []);

  const urgentCount = useMemo(
    () =>
      (data?.requests ?? []).filter((r) => String(r.priority).toLowerCase() === 'urgent').length,
    [data],
  );

  const paymentCount = useMemo(
    () =>
      (data?.requests ?? []).filter((r) => String(r.type).toLowerCase().includes('payment')).length,
    [data],
  );

  const onApprove = async (sessionId: number) => {
    await approveSession(sessionId);
    showToast({ variant: 'success', title: `Mesa ${sessionId} aprovada.` });
    await load();
  };

  const onDeactivate = async () => {
    if (!selectedSessionId) return;
    await deactivateSession(selectedSessionId);
    setDeactivateOpen(false);
    showToast({ variant: 'warning', title: `Sessão ${selectedSessionId} desativada.` });
    await load();
  };

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
        <div className="rounded-2xl border border-danger p-4 bg-surface-raised">
          <p className="text-content-muted">Necessitam de Assistência</p>
          <p className="text-3xl font-bold text-danger">{urgentCount}</p>
        </div>
        <div className="rounded-2xl border border-warning p-4 bg-surface-raised">
          <p className="text-content-muted">Pedidos de Conta/Aprovação</p>
          <p className="text-3xl font-bold text-warning">{paymentCount}</p>
        </div>
        <div className="rounded-2xl border border-success p-4 bg-surface-raised">
          <p className="text-content-muted">Pedidos em curso</p>
          <p className="text-3xl font-bold text-success">{data?.summary.occupied_tables ?? 0}</p>
        </div>
        <div className="rounded-2xl border border-info p-4 bg-surface-raised">
          <p className="text-content-muted">Clientes na Sala</p>
          <p className="text-3xl font-bold text-info">{data?.summary.guest_count ?? 0}</p>
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-surface p-4">
        <h2 className="text-3xl font-semibold mb-1">Planta da Sala</h2>
        <p className="text-content-muted mb-4">Toque numa mesa para ver detalhes ou atender</p>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {(data?.tables ?? []).map((table) => (
            <article
              key={table.session_id}
              className={`rounded-3xl border-2 ${stateColor(table.state)} bg-surface-raised p-4`}
            >
              <p className="text-content-muted">Mesa</p>
              <p className="text-5xl font-bold leading-none">
                {String(table.table_number).padStart(2, '0')}
              </p>
              <div className="mt-4 flex items-center justify-between">
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
                <span className="text-content-muted">{table.guest_count} pessoas</span>
              </div>
              <div className="mt-4 flex gap-2">
                {table.state === 'awaiting_approval' && (
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={() => void onApprove(table.session_id)}
                  >
                    Aprovar
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="danger"
                  onClick={() => {
                    setSelectedSessionId(table.session_id);
                    setDeactivateOpen(true);
                  }}
                >
                  Desativar
                </Button>
              </div>
            </article>
          ))}
        </div>
      </section>

      <ConfirmDialog
        open={deactivateOpen}
        variant="danger"
        title="Desativar sessão?"
        description="Esta ação encerra a sessão da mesa."
        confirmText="Desativar"
        onConfirm={() => void onDeactivate()}
        onCancel={() => setDeactivateOpen(false)}
      />
    </div>
  );
}

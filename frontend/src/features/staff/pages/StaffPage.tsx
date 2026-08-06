import { useState, type CSSProperties } from 'react';
import { useToast } from '../../../components/ui/toast/useToast';
import { useAuth } from '../../auth/hooks/useAuth';
import { useStaffDashboard } from '../hooks/useStaffDashboard';
import { StaffMetrics } from '../components/StaffMetrics';
import { StaffHeader } from '../components/StaffHeader';
import { StaffReadyPanel } from '../components/StaffReadyPanel';
import { StaffTableCard } from '../components/StaffTableCard';
import { useStaffDashboardDerivedData } from '../hooks/useStaffDashboardDerivedData';
import { useStaffReadyToServe } from '../hooks/useStaffReadyToServe';
import { useStaffPreparingOrders } from '../hooks/useStaffPreparingOrders';
import '../styles/staff-page.css';
import {
  approveSession,
  deactivateSession,
  resolveRequest,
  markItemAsServed,
} from '../api/staffApi';

export function StaffPage() {
  const { staff, logout } = useAuth();

  const { showToast } = useToast();
  const { data, loading, tablesView, load } = useStaffDashboard();

  const waiterReadyToServe = useStaffReadyToServe(data, tablesView, staff?.id);

  const staffPreparingOrders = useStaffPreparingOrders(data, tablesView, staff?.id);

  const {
    assistanceTables,
    assistanceCount,
    approvalRequests,
    assistanceRequestByTable,
    paymentRequestByTable,
    paymentRequestCount,
  } = useStaffDashboardDerivedData(data);
  const [confirmingDeactivate, setConfirmingDeactivate] = useState<{
    sessionId: number;
    tableNumber: number;
  } | null>(null);

  const [approvalActionFor, setApprovalActionFor] = useState<number | null>(null);

  const [confirmSolveForTable, setConfirmSolveForTable] = useState<number | null>(null);

  const [confirmingPaymentForTable, setConfirmingPaymentForTable] = useState<number | null>(null);

  const CLOSED_SIDEBAR_WIDTH = 40;
  const OPEN_SIDEBAR_WIDTH = 360;
  const [kitchenOpen, setKitchenOpen] = useState(true);
  const [sidebarWidth, setSidebarWidth] = useState(OPEN_SIDEBAR_WIDTH);
  const [isSidebarDragging, setIsSidebarDragging] = useState(false);

  const setKitchenOpenState = (isOpen: boolean) => {
    setKitchenOpen(isOpen);
    setSidebarWidth(isOpen ? OPEN_SIDEBAR_WIDTH : CLOSED_SIDEBAR_WIDTH);
  };

  const toggleKitchen = () => {
    setKitchenOpenState(!kitchenOpen);
  };

  const onSidebarDrag = (nextWidth: number) => {
    const clampedWidth = Math.min(OPEN_SIDEBAR_WIDTH, Math.max(CLOSED_SIDEBAR_WIDTH, nextWidth));

    setSidebarWidth(clampedWidth);
  };

  const onSidebarDragEnd = (finalWidth: number) => {
    const halfwayPoint = (CLOSED_SIDEBAR_WIDTH + OPEN_SIDEBAR_WIDTH) / 2;

    setIsSidebarDragging(false);
    setKitchenOpenState(finalWidth >= halfwayPoint);
  };

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

  const onResolvePayment = async (requestId: number, tableNumber: number, sessionId: number) => {
    try {
      await resolveRequest(requestId);

      await deactivateSession(sessionId);

      showToast({
        variant: 'success',
        title: `Pagamento concluído e mesa ${tableNumber} desativada`,
      });
      setConfirmingPaymentForTable(null);
      await load();
    } catch {
      showToast({ variant: 'danger', title: 'Não foi possível concluir o pagamento' });
    }
  };

  const onMarkDelivered = async (group: {
    table_number: number;
    items: Array<{ id: number; status?: string; state?: string }>;
  }) => {
    const readyItems = group.items ?? [];

    if (readyItems.length === 0) {
      showToast({
        variant: 'warning',
        title: `Mesa ${group.table_number} não tem itens para entrega`,
      });
      return;
    }

    try {
      await Promise.all(readyItems.map((item) => markItemAsServed(item.id)));
      showToast({ variant: 'success', title: `Mesa ${group.table_number} entregue` });
      await load();
    } catch {
      showToast({ variant: 'danger', title: 'Não foi possível marcar como entregue' });
    }
  };

  if (loading) return <div className="p-6 text-content-muted">A carregar...</div>;

  return (
    <div className="staff-page min-h-screen bg-background p-5 text-content xl:grid xl:h-dvh xl:min-h-0 xl:grid-rows-[auto_minmax(0,1fr)] xl:overflow-hidden">
      <StaffHeader staffName={staff?.name} onLogout={logout} />

      <div
        className={`staff-page__dashboard-grid grid min-h-0 grid-cols-1 gap-4 xl:overflow-hidden ${
          isSidebarDragging ? '' : 'transition-[grid-template-columns] duration-300 ease-out'
        }`}
        style={
          {
            '--staff-sidebar-width': `${sidebarWidth}px`,
          } as CSSProperties
        }
      >
        <div className="staff-page__tables-scroll staff-scrollbar-hidden">
          <StaffMetrics
            assistanceCount={assistanceCount}
            approvalRequests={approvalRequests}
            paymentRequestCount={paymentRequestCount}
            occupiedTables={data?.summary.occupied_tables ?? 0}
            guestCount={data?.summary.guest_count ?? 0}
          />

          <section className="rounded-2xl border border-border bg-surface p-4">
            <h2 className="text-3xl font-semibold">Planta da Sala</h2>
            <p className="text-content-muted mb-4">
              Toque numa mesa para ver os detalhes ou atender
            </p>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {tablesView.map((table) => {
                const hasUrgentAssistance = assistanceTables.has(table.table_number);
                const assistanceRequest = assistanceRequestByTable.get(table.table_number);
                const paymentRequest = paymentRequestByTable.get(table.table_number);

                return (
                  <StaffTableCard
                    key={table.table_number}
                    table={table}
                    hasUrgentAssistance={hasUrgentAssistance}
                    assistanceRequest={assistanceRequest}
                    paymentRequest={paymentRequest}
                    approvalActionFor={approvalActionFor}
                    confirmingDeactivate={confirmingDeactivate}
                    confirmSolveForTable={confirmSolveForTable}
                    confirmingPaymentForTable={confirmingPaymentForTable}
                    onStartApproval={setApprovalActionFor}
                    onApprove={async (sessionId, tableNumber) => {
                      await onApprove(sessionId, tableNumber);
                      setApprovalActionFor(null);
                    }}
                    onRejectApproval={(sessionId, tableNumber) => {
                      void onRejectApproval(sessionId, tableNumber);
                    }}
                    onStartDeactivate={(sessionId, tableNumber) => {
                      setConfirmingDeactivate({
                        sessionId,
                        tableNumber,
                      });
                    }}
                    onCancelDeactivate={() => setConfirmingDeactivate(null)}
                    onDeactivate={async (sessionId, tableNumber) => {
                      await onDeactivate(sessionId, tableNumber);
                      setConfirmingDeactivate(null);
                    }}
                    onStartSolveAssistance={setConfirmSolveForTable}
                    onCancelSolveAssistance={() => setConfirmSolveForTable(null)}
                    onSolveAssistance={(requestId, tableNumber) => {
                      void onSolveAssistance(requestId, tableNumber);
                    }}
                    onStartPayment={setConfirmingPaymentForTable}
                    onCancelPayment={() => setConfirmingPaymentForTable(null)}
                    onResolvePayment={(requestId, tableNumber, sessionId) => {
                      void onResolvePayment(requestId, tableNumber, sessionId);
                    }}
                  />
                );
              })}
            </div>
          </section>
        </div>

        <StaffReadyPanel
          groups={waiterReadyToServe}
          preparingGroups={staffPreparingOrders}
          kitchenOpen={kitchenOpen}
          sidebarWidth={sidebarWidth}
          minSidebarWidth={CLOSED_SIDEBAR_WIDTH}
          maxSidebarWidth={OPEN_SIDEBAR_WIDTH}
          onToggle={toggleKitchen}
          onSidebarDragStart={() => setIsSidebarDragging(true)}
          onSidebarDrag={onSidebarDrag}
          onSidebarDragEnd={onSidebarDragEnd}
          onDeliver={(group) => void onMarkDelivered(group)}
        />
      </div>
    </div>
  );
}

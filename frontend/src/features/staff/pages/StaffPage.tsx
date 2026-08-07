import { useEffect, useRef, useState, type CSSProperties } from 'react';
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
import { StaffProfileModal } from '../../auth/components/StaffProfileModal';
import type {
  StaffPaymentMethod,
  StaffSessionBill,
  StaffDashboardTable,
} from '../types/staff.types';

import {
  playStaffNotificationSound,
  prepareStaffNotificationSound,
} from '../utils/playStaffNotificationSound';

import { StaffPaymentModal } from '../components/StaffPaymentModal';
import { StaffTableDetailsModal } from '../components/StaffTableDetailsModal';

import Button from '../../../components/ui/button/Button';

import '../styles/staff-page.css';

import {
  approveSession,
  deactivateSession,
  resolveRequest,
  markItemAsServed,
  registerPayment,
  getStaffSessionBill,
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

  const [showOnlyMyTables, setShowOnlyMyTables] = useState(false);

  const [approvalActionFor, setApprovalActionFor] = useState<number | null>(null);

  const [confirmSolveForTable, setConfirmSolveForTable] = useState<number | null>(null);

  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const [paymentDialog, setPaymentDialog] = useState<{
    sessionId: number;
    tableNumber: number;
    bill: StaffSessionBill;
  } | null>(null);

  const [tableDetailsDialog, setTableDetailsDialog] = useState<{
    table: StaffDashboardTable;
    bill: StaffSessionBill;
  } | null>(null);

  const CLOSED_SIDEBAR_WIDTH = 40;
  const OPEN_SIDEBAR_WIDTH = 360;
  const [kitchenOpen, setKitchenOpen] = useState(true);
  const [sidebarWidth, setSidebarWidth] = useState(OPEN_SIDEBAR_WIDTH);
  const [isSidebarDragging, setIsSidebarDragging] = useState(false);

  const [notificationsEnabled, setNotificationsEnabled] = useState(() => {
    return localStorage.getItem('staff.soundNotificationsEnabled') !== 'false';
  });

  const previousNotificationSnapshotRef = useRef<{
    approvalSessionIds: Set<number>;
    paymentRequestIds: Set<number>;
    assistanceRequestIds: Set<number>;
    readyItemIds: Set<number>;
  } | null>(null);

  useEffect(() => {
    localStorage.setItem('staff.soundNotificationsEnabled', String(notificationsEnabled));
  }, [notificationsEnabled]);

  useEffect(() => {
    if (!data) return;

    const snapshot = {
      approvalSessionIds: new Set(
        data.tables
          .filter((table) => table.state === 'awaiting_approval' && table.session_id !== null)
          .map((table) => table.session_id as number),
      ),
      paymentRequestIds: new Set(
        data.requests
          .filter((request) => request.type === 'payment_request')
          .map((request) => request.id),
      ),
      assistanceRequestIds: new Set(
        data.requests
          .filter((request) => request.type === 'assistance')
          .map((request) => request.id),
      ),
      readyItemIds: new Set(
        waiterReadyToServe.flatMap((group) => group.items.map((item) => item.id)),
      ),
    };

    const previous = previousNotificationSnapshotRef.current;

    // The first dashboard snapshot establishes the baseline.
    // It must never make noise just because the page was opened.
    if (previous !== null && notificationsEnabled) {
      const hasNewApproval = [...snapshot.approvalSessionIds].some(
        (id) => !previous.approvalSessionIds.has(id),
      );

      const hasNewPaymentRequest = [...snapshot.paymentRequestIds].some(
        (id) => !previous.paymentRequestIds.has(id),
      );

      const hasNewAssistanceRequest = [...snapshot.assistanceRequestIds].some(
        (id) => !previous.assistanceRequestIds.has(id),
      );

      const hasNewReadyItem = [...snapshot.readyItemIds].some(
        (id) => !previous.readyItemIds.has(id),
      );

      if (hasNewApproval || hasNewPaymentRequest || hasNewAssistanceRequest || hasNewReadyItem) {
        playStaffNotificationSound();
      }
    }

    previousNotificationSnapshotRef.current = snapshot;
  }, [data, notificationsEnabled, waiterReadyToServe]);

  const visibleTables = showOnlyMyTables
    ? tablesView.filter((table) => table.waiter_id === staff?.id)
    : tablesView;

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

  const onOpenTableDetails = async (table: StaffDashboardTable) => {
    if (table.session_id === null) {
      return;
    }

    try {
      const bill = await getStaffSessionBill(table.session_id);

      setTableDetailsDialog({
        table,
        bill,
      });
    } catch {
      showToast({
        variant: 'danger',
        title: 'Unable to load table details',
      });
    }
  };

  const onOpenPayment = async (sessionId: number, tableNumber: number) => {
    try {
      const bill = await getStaffSessionBill(sessionId);

      setPaymentDialog({
        sessionId,
        tableNumber,
        bill,
      });
    } catch {
      showToast({
        variant: 'danger',
        title: 'Unable to load the table bill',
      });
    }
  };

  const onConfirmPayment = async (
    method: StaffPaymentMethod,
    tipAmount: number,
    wasteBoxCount: number,
  ) => {
    if (paymentDialog === null) {
      return;
    }

    try {
      const payment = await registerPayment(paymentDialog.sessionId, {
        method,
        tip_amount: tipAmount,
        waste_count: wasteBoxCount,
      });

      showToast({
        variant: 'success',
        title: `Pagamento de $${payment.amount_paid} registado`,
      });

      setPaymentDialog(null);
      await load();
    } catch {
      showToast({
        variant: 'danger',
        title: 'Não foi possível registar pagamento',
      });
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
      <div className="staff-page__portrait-message">
        <p>Rotate the tablet to landscape mode to use the staff dashboard.</p>
      </div>
      <StaffHeader
        staffName={staff?.name}
        photoUrl={staff?.photo_url}
        onOpenProfile={() => setIsProfileOpen(true)}
        onLogout={logout}
        notificationsEnabled={notificationsEnabled}
        onToggleNotifications={() => {
          if (!notificationsEnabled) {
            prepareStaffNotificationSound();
          }

          setNotificationsEnabled((current) => !current);
        }}
      />

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
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="text-3xl font-semibold">Planta da Sala</h2>

                <p className="text-content-muted">
                  {showOnlyMyTables
                    ? 'A mostrar apenas as mesas atribuídas a si'
                    : 'Toque numa mesa para ver os detalhes ou atender'}
                </p>
              </div>

              <Button
                size="sm"
                variant={showOnlyMyTables ? 'danger' : 'outline'}
                onClick={() => setShowOnlyMyTables((current) => !current)}
              >
                {showOnlyMyTables ? 'Mostrar todas' : 'As minhas mesas'}
              </Button>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {visibleTables.map((table) => {
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
                    onStartPayment={onOpenPayment}
                    onOpenDetails={onOpenTableDetails}
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

      {paymentDialog !== null && (
        <StaffPaymentModal
          bill={paymentDialog.bill}
          tableNumber={paymentDialog.tableNumber}
          onClose={() => setPaymentDialog(null)}
          onConfirm={onConfirmPayment}
        />
      )}

      {tableDetailsDialog !== null && (
        <StaffTableDetailsModal
          table={tableDetailsDialog.table}
          bill={tableDetailsDialog.bill}
          canManage={tableDetailsDialog.table.waiter_id === staff?.id || staff?.role === 'admin'}
          onClose={() => setTableDetailsDialog(null)}
          onCloseAccount={() => {
            const { table } = tableDetailsDialog;

            if (table.session_id === null) {
              return;
            }

            setTableDetailsDialog(null);
            void onOpenPayment(table.session_id, table.table_number);
          }}
        />
      )}

      <StaffProfileModal isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} />
    </div>
  );
}

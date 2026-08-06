import { useState } from 'react';

import Badge from '../../../components/ui/badge/Badge';
import Button from '../../../components/ui/button/Button';
import type { StaffDashboardTable } from '../types/staff.types';
import { formatTimeSince, tableBorder, translateState } from '../utils/staffDashboard.utils';

type TableRequest = {
  id: number;
};

type DeactivateConfirmation = {
  sessionId: number;
  tableNumber: number;
};

type StaffTableCardProps = {
  table: StaffDashboardTable;
  hasUrgentAssistance: boolean;
  assistanceRequest?: TableRequest;
  paymentRequest?: TableRequest;

  approvalActionFor: number | null;
  confirmingDeactivate: DeactivateConfirmation | null;
  confirmSolveForTable: number | null;

  onStartApproval: (sessionId: number) => void;
  onApprove: (sessionId: number, tableNumber: number) => void;
  onRejectApproval: (sessionId: number, tableNumber: number) => void;

  onStartDeactivate: (sessionId: number, tableNumber: number) => void;
  onCancelDeactivate: () => void;
  onDeactivate: (sessionId: number, tableNumber: number) => void;

  onStartSolveAssistance: (tableNumber: number) => void;
  onCancelSolveAssistance: () => void;
  onSolveAssistance: (requestId: number, tableNumber: number) => void;

  onStartPayment: (sessionId: number, tableNumber: number) => void;

  onOpenDetails: (table: StaffDashboardTable) => void;
};

export function StaffTableCard({
  table,
  hasUrgentAssistance,
  assistanceRequest,
  paymentRequest,
  approvalActionFor,
  confirmingDeactivate,
  confirmSolveForTable,
  onStartApproval,
  onApprove,
  onRejectApproval,
  onStartDeactivate,
  onCancelDeactivate,
  onDeactivate,
  onStartSolveAssistance,
  onCancelSolveAssistance,
  onSolveAssistance,
  onStartPayment,
  onOpenDetails,
}: StaffTableCardProps) {
  const sessionId = table.session_id;
  const hasAssistance = Boolean(assistanceRequest);
  const hasPaymentRequest = Boolean(paymentRequest);

  return (
    <article
      id={`table-${table.table_number}`}
      onClick={(event) => {
        const target = event.target as HTMLElement;

        if (target.closest('button')) {
          return;
        }

        onOpenDetails(table);
      }}
      className={`cursor-pointer rounded-3xl border-2 p-4 transition-opacity hover:opacity-90 ${
        hasUrgentAssistance
          ? 'border-danger bg-danger/10 shadow-[0_0_0_1px_var(--color-danger)]'
          : hasPaymentRequest
            ? 'border-info bg-info/10 shadow-[0_0_0_1px_var(--color-info)]'
            : `${tableBorder(table.state)} bg-surface-raised`
      }`}
    >
      <p className="text-content-muted">Mesa</p>

      <p className="text-5xl font-bold leading-none">
        {String(table.table_number).padStart(2, '0')}
      </p>

      <p className="mt-1 text-sm text-content-muted">
        Garçom: {table.waiter_name ?? 'Não atribuído'}
      </p>

      <div className="mt-3 flex items-center justify-between text-sm text-content-muted">
        <span>{formatTimeSince(table.started_at) ?? 0}</span>
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
          {translateState(table.state)}
        </Badge>

        <span className="text-sm text-content-muted">{table.total}</span>
      </div>

      {table.state === 'awaiting_approval' && sessionId !== null && (
        <div className="mt-4 rounded-2xl border-2 border-warning bg-warning/10 p-3">
          <p className="mb-2 text-sm font-semibold text-warning">Pedido de Aprovação</p>

          <Button className="w-full" size="sm" onClick={() => onStartApproval(sessionId)}>
            Aprovar mesa {String(table.table_number).padStart(2, '0')}
          </Button>

          {approvalActionFor === sessionId && (
            <div className="mt-3 rounded-xl border border-border-strong bg-surface p-3">
              <p className="mb-3 text-sm text-content-muted">
                O cliente está à espera de aprovação.
              </p>

              <div className="flex justify-end gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onRejectApproval(sessionId, table.table_number)}
                >
                  Recusar
                </Button>

                <Button size="sm" onClick={() => onApprove(sessionId, table.table_number)}>
                  Aprovar
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="mt-4 flex gap-2">
        {table.state === 'active' && sessionId !== null && (
          <Button
            size="sm"
            variant="danger"
            onClick={() => onStartDeactivate(sessionId, table.table_number)}
          >
            Desativar
          </Button>
        )}
      </div>

      {table.state !== 'inactive' &&
        sessionId !== null &&
        confirmingDeactivate?.sessionId === sessionId && (
          <div className="mt-4 rounded-2xl border border-border-strong bg-surface p-4">
            <h3 className="text-lg font-semibold text-content">Confirmar desativação da mesa?</h3>

            <p className="mt-1 text-sm text-content-muted">
              Podes cancelar se foi um clique acidental. Depois de desativar, a mesa fica inativa.
            </p>

            <div className="mt-4 flex justify-end gap-2">
              <Button size="sm" variant="ghost" onClick={onCancelDeactivate}>
                Cancelar
              </Button>

              <Button
                size="sm"
                variant="danger"
                onClick={() => onDeactivate(sessionId, table.table_number)}
              >
                Confirmar
              </Button>
            </div>
          </div>
        )}

      {hasAssistance && assistanceRequest && (
        <div className="mt-4 rounded-2xl border border-danger bg-danger/10 p-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-danger">Assistência urgente</p>
              <p className="text-xs text-content-muted">Toque para confirmar resolução</p>
            </div>

            <Button
              size="sm"
              variant="danger"
              onClick={() => onStartSolveAssistance(table.table_number)}
            >
              Resolver
            </Button>
          </div>

          {confirmSolveForTable === table.table_number && (
            <div className="mt-3 rounded-xl border border-border-strong bg-surface p-3">
              <p className="mb-3 text-sm text-content-muted">Confirmar estado da assistência?</p>

              <div className="flex justify-end gap-2">
                <Button size="sm" variant="ghost" onClick={onCancelSolveAssistance}>
                  Não resolvido
                </Button>

                <Button
                  size="sm"
                  className="bg-success text-white hover:opacity-90"
                  onClick={() => onSolveAssistance(assistanceRequest.id, table.table_number)}
                >
                  Resolvido
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {hasPaymentRequest && !hasAssistance && paymentRequest && sessionId !== null && (
        <div className="mt-4 rounded-2xl border border-info bg-info/10 p-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-info">Pagamento solicitado</p>
              <p className="text-xs text-info/70">Toque para confirmar o recebimento</p>
            </div>

            <Button
              size="sm"
              className="border-0 bg-info text-white hover:opacity-90"
              onClick={() => onStartPayment(sessionId, table.table_number)}
            >
              Conta
            </Button>
          </div>
        </div>
      )}
    </article>
  );
}

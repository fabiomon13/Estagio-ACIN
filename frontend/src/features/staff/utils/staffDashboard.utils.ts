export function formatTimeSince(date: string | number | Date | null) {
  if (!date) return null;

  const ms = Date.now() - new Date(date).getTime();
  const totalMins = Math.max(0, Math.floor(ms / 60000));

  const hours = Math.floor(totalMins / 60);
  const minutes = totalMins % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }

  return `${minutes} min`;
}

export function translateState(state: string) {
  switch (state) {
    case 'active':
      return 'Ativa';
    case 'awaiting_approval':
      return 'Aprovação Pendente';
    case 'inactive':
      return 'Inativa';
    case 'payment_requested':
      return 'Pagamento Solicitado';
    default:
      return state;
  }
}

export function tableBorder(state: string) {
  if (state === 'active') return 'border-success';
  if (state === 'awaiting_approval' || state === 'payment_requested') {
    return 'border-warning';
  }
  if (state === 'inactive') return 'border-border-strong';

  return 'border-border';
}

export function isAssistanceType(type: string) {
  const normalizedType = String(type ?? '')
    .trim()
    .toLowerCase();

  return (
    normalizedType === 'assistance' ||
    normalizedType === 'assitance' ||
    normalizedType.includes('assist')
  );
}

export function isUrgentPriority(priority: string) {
  const normalizedPriority = String(priority ?? '')
    .trim()
    .toLowerCase();

  return (
    normalizedPriority === 'urgent' ||
    normalizedPriority === 'high' ||
    normalizedPriority === 'alta'
  );
}

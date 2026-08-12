import Badge from '../../../components/ui/badge/Badge';
import { useAdminStaffList } from '../hooks/useAdminStaffList';

const ROLE_LABELS: Record<string, string> = {
  chef: 'Cozinheiro',
  admin: 'Administrador',
  waiter: 'Garçom',
};

export function StaffListTable() {
  const { staff, isLoading, error } = useAdminStaffList();

  if (error) {
    return <p className="text-danger">Não foi possível carregar a lista de staff.</p>;
  }

  if (isLoading) {
    return <p className="text-content-muted">A carregar...</p>;
  }

  if (staff.length === 0) {
    return <p className="text-content-muted">Sem contas de staff.</p>;
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-border bg-surface-raised">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-border text-content-muted">
            <th className="px-4 py-3 font-medium">Nome</th>
            <th className="px-4 py-3 font-medium">Email</th>
            <th className="px-4 py-3 font-medium">Função</th>
            <th className="px-4 py-3 font-medium">Estado</th>
          </tr>
        </thead>
        <tbody>
          {staff.map((member) => (
            <tr key={member.id} className="border-b border-border last:border-0">
              <td className="px-4 py-3 text-content">{member.name}</td>
              <td className="px-4 py-3 text-content-muted">{member.email}</td>
              <td className="px-4 py-3 text-content-muted">
                {ROLE_LABELS[member.role] ?? member.role}
              </td>
              <td className="px-4 py-3">
                <Badge variant={member.is_active ? 'success' : 'default'} size="sm">
                  {member.is_active ? 'Ativo' : 'Inativo'}
                </Badge>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

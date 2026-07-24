# Autenticação de Staff — Explicação Simples

Versão simplificada, em português. A versão técnica completa está em [`docs/auth.md`](./auth.md) (em inglês).

**Isto é só sobre o Staff** (Admin, Waiter, Chef) — pessoas que fazem login com email e password. Os clientes usam outro sistema, sem password, que ainda não existe.

## O que é, resumido

Cada pessoa da equipa faz login e só vê as páginas do seu papel:

- **Admin** → acede a tudo (`/admin`, `/staff`, `/kitchen`)
- **Waiter** → só `/staff`
- **Chef** → só `/kitchen`

## Como funciona, passo a passo

1. Fazes login com email + password.
2. O backend confirma a password e devolve um "crachá digital" (um cookie), guardado automaticamente pelo navegador.
3. Esse crachá acompanha, sozinho, todos os pedidos seguintes que o navegador faz ao backend.
4. **A parte importante:** em cada pedido, o backend não confia só no crachá — vai sempre confirmar na base de dados: "esta conta ainda existe? ainda está ativa? qual é o papel dela *agora*?"

## Porque é feito assim

Se um Admin desativar alguém, ou mudar o papel de alguém, isso aplica-se **imediatamente** — mesmo que essa pessoa já tenha um crachá válido nas próximas horas. Não precisa de fazer logout/login outra vez para o sistema "perceber" a mudança. Isto foi decidido de propósito: a segurança está sempre atualizada, nunca desatualizada.

## O que precisas de saber para desenvolveres a tua parte

### Se estás a criar um endpoint novo no backend

Para o proteger por papel:

```python
from fastapi import Depends
from app.api.deps import require_role
from app.core.roles import StaffRoleEnum

@router.post("/algo", dependencies=[Depends(require_role(StaffRoleEnum.WAITER))])
def criar_algo(...):
    ...
```

Não precisas de adicionar "Admin" à lista de papéis — o Admin já passa sempre, automaticamente, em qualquer rota.

Se precisares de saber **quem** está a fazer o pedido (por exemplo, "mostrar só os pedidos deste waiter"):

```python
from app.api.deps import get_current_staff
from app.models.staff import Staff

@router.get("/algo")
def ver_algo(staff: Staff = Depends(get_current_staff)):
    # staff.id, staff.name, staff.email já estão disponíveis aqui
    ...
```

### Se estás a criar uma página nova no frontend

Para a proteger por papel:

```tsx
<Route
  path="/minha-pagina"
  element={
    <ProtectedRoute roles={['waiter']}>
      <MinhaPagina />
    </ProtectedRoute>
  }
/>
```

Para saberes quem está logado dentro de um componente qualquer:

```tsx
import { useAuth } from '../features/auth/hooks/useAuth';

const { staff, logout } = useAuth(); // staff?.name, staff?.role, ...
```

Para chamares a API, usa sempre `apiFetch` (nunca um `fetch` direto) — senão perdes o envio automático do cookie e o tratamento de erros já preparado:

```tsx
import { apiFetch, ApiError } from '../../../services/api/client';

try {
  const dados = await apiFetch<TipoDeResposta>('/algo', { method: 'POST', body: JSON.stringify(payload) });
} catch (err) {
  if (err instanceof ApiError) {
    // err.status, err.detail (a mensagem real do backend)
  }
}
```

## Coisas práticas para conseguires testar

- **O backend precisa de estar a correr** (`uvicorn app.main:app --reload --port 8000`, dentro do venv). Se não estiver, o login dá um erro genérico ("Erro ao iniciar sessão") em vez do erro real.
- Precisas de um `JWT_SECRET_KEY` no teu `.env` local — cada pessoa gera o seu próprio, uma vez só:
  ```bash
  echo "JWT_SECRET_KEY=$(python3 -c 'import secrets; print(secrets.token_hex(32))')" >> .env
  ```

**Conta de teste** (só para desenvolvimento local, não é uma conta real):
```
email:    admin@scanandserve.dev
password: ChangeMe123!
```

## O que ainda NÃO existe

- Criar contas de staff novas — só existe esta conta de teste (Admin).
- Permissões mais específicas do que o papel — por exemplo, "cada waiter só vê as suas próprias mesas" ainda não está feito, só se verifica o papel geral.
- Proteção contra várias tentativas de login erradas seguidas (rate limiting).
- Login dos clientes (via QR code na mesa) — sistema completamente diferente, ainda por construir.

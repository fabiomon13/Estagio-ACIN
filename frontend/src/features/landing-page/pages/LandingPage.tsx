import heroImage from '../assets/hero.png';
import clientImage from '../assets/cliente.png';
import waiterImage from '../assets/empregado.png';
import kitchenImage from '../assets/cozinha.png';
import Button from '../../../components/ui/button/Button';
import { useNavigate } from 'react-router-dom';
export default function LandingPage() {
  const navigate = useNavigate();
  return (
    <div className="bg-background min-h-screen text-content font-sans selection:bg-primary selection:text-white">
      {/* 1. CABEÇALHO */}
      <header className="flex justify-between items-center px-8 lg:px-16 py-5 border-b border-border bg-surface sticky top-0 z-50 backdrop-blur-md bg-opacity-90">
        <div className="font-bold text-2xl flex items-center gap-2">
          <span className="text-primary">㗊</span>
          <div>
            <span className="text-primary">Scan</span>
            <span className="text-content">&</span>
            <span className="text-primary">Serve</span>
          </div>
        </div>

        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-content-muted">
          <a href="#roles" className="hover:text-content transition-colors">
            Plataforma
          </a>
          <a href="#features" className="hover:text-content transition-colors">
            Funcionalidades
          </a>
          <a href="#process" className="hover:text-content transition-colors">
            Como Funciona
          </a>
          <a href="#testimonials" className="hover:text-content transition-colors">
            Testemunhos
          </a>
        </nav>

        <Button
          onClick={() => navigate('/login')}
          size="lg"
          variant="secondary"
          className="border-2 border-border-strong"
        >
          Staff login
        </Button>
      </header>

      <main>
        {/* 2. SECÇÃO PRINCIPAL (HERO COM MOCKUP EM DESTAQUE) */}
        <section className="flex flex-col lg:flex-row items-center justify-between px-8 lg:px-16 py-24 gap-12 max-w-7xl mx-auto">
          <div className="flex-1 max-w-2xl">
            <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 text-primary px-4 py-1.5 rounded-full text-xs font-bold mb-6">
              ✨ Nova Versão 2.0 Disponível
            </div>
            <h1 className="text-5xl lg:text-7xl font-extrabold text-content-muted leading-tight">
              Waiter.
              <br />
              Kitchen.
              <br />
              Manager.
            </h1>
            <p className="text-xl lg:text-2xl text-content font-normal mt-4 mb-6">
              One portal. Every role.
            </p>
            <p className="text-content-muted text-lg mb-8 leading-relaxed">
              Sincroniza a sala e a cozinha em tempo real. Aumenta a eficiência do teu restaurante
              com uma plataforma desenhada para a ação rápida e zero atritos.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Button className="border-2 border-primary-soft" size="lg" variant="primary">
                Agendar Demonstração
              </Button>
              <Button className="border-2 border-border-strong" size="lg" variant="secondary">
                Ver Vídeo
              </Button>
            </div>
          </div>

          <div className="flex-1 flex justify-center w-full">
            <div className="w-full max-w-xl bg-surface-raised border border-border rounded-3xl p-4 shadow-2xl relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-primary/30 to-transparent rounded-3xl blur opacity-30 group-hover:opacity-60 transition duration-1000"></div>
              <div className="relative bg-surface rounded-2xl overflow-hidden min-h-[380px] flex items-center justify-center border border-border p-4">
                <img
                  src={heroImage}
                  alt="Scan&Serve Interface Principal"
                  className="w-full h-full object-contain"
                />
              </div>
            </div>
          </div>
        </section>

        {/* 3. MULTI-ROLE PREVIEW (MOCKUPS POR FUNÇÃO) */}
        <section id="roles" className="py-24 px-8 lg:px-16 bg-surface border-t border-border">
          <div className="max-w-7xl mx-auto">
            <div className="text-center max-w-3xl mx-auto mb-16">
              <span className="bg-primary/20 text-primary px-4 py-1.5 rounded-lg font-bold text-sm inline-block mb-4">
                Ecossistema Completo
              </span>
              <h2 className="text-3xl lg:text-5xl font-extrabold mb-4">
                Uma interface dedicada para cada interveniente
              </h2>
              <p className="text-content-muted text-lg">
                Vê como o cliente, a sala e a cozinha operam interligados na mesma plataforma.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Role 1: Client / Mesa */}
              <div className="bg-surface-raised border border-border rounded-3xl p-6 flex flex-col justify-between hover:border-primary/50 transition-all group">
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-xs font-bold uppercase tracking-wider text-primary bg-primary/10 px-3 py-1 rounded-full">
                      Cliente
                    </span>
                    <span className="text-2xl">📱</span>
                  </div>
                  <h3 className="text-xl font-bold mb-2">Menu & Pedido à Mesa</h3>
                  <p className="text-content-muted text-sm mb-6">
                    O cliente lê o QR code na mesa, consulta o menu digital ilustrado e faz o pedido
                    autonomamente.
                  </p>
                </div>
                <div className="w-full h-48 bg-background rounded-2xl border border-border overflow-hidden group-hover:scale-[1.02] transition-transform p-3 flex items-center justify-center">
                  <img
                    src={clientImage}
                    alt="Ecrã do Cliente QR Menu"
                    className="w-full h-full object-contain"
                  />
                </div>
              </div>

              {/* Role 2: Waiter */}
              <div className="bg-surface-raised border border-border rounded-3xl p-6 flex flex-col justify-between hover:border-success/50 transition-all group">
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-xs font-bold uppercase tracking-wider text-success bg-success/10 px-3 py-1 rounded-full">
                      Sala
                    </span>
                    <span className="text-2xl">📋</span>
                  </div>
                  <h3 className="text-xl font-bold mb-2">Empregados de Mesa</h3>
                  <p className="text-content-muted text-sm mb-6">
                    Acompanhamento do estado das mesas, validação de pedidos e avisos instantâneos
                    de pratos prontos.
                  </p>
                </div>
                <div className="w-full h-48 bg-background rounded-2xl border border-border overflow-hidden group-hover:scale-[1.02] transition-transform p-3 flex items-center justify-center">
                  <img
                    src={waiterImage}
                    alt="Painel dos Empregados de Mesa"
                    className="w-full h-full object-contain"
                  />
                </div>
              </div>

              {/* Role 3: Kitchen */}
              <div className="bg-surface-raised border border-border rounded-3xl p-6 flex flex-col justify-between hover:border-warning/50 transition-all group">
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-xs font-bold uppercase tracking-wider text-warning bg-warning/10 px-3 py-1 rounded-full">
                      Cozinha
                    </span>
                    <span className="text-2xl">🍳</span>
                  </div>
                  <h3 className="text-xl font-bold mb-2">Monitores de Cozinha (KDS)</h3>
                  <p className="text-content-muted text-sm mb-6">
                    Linha de montagem digital organizada por tempos de preparação e prioridade de
                    mesas em tempo real.
                  </p>
                </div>
                <div className="w-full h-48 bg-background rounded-2xl border border-border overflow-hidden group-hover:scale-[1.02] transition-transform p-3 flex items-center justify-center">
                  <img
                    src={kitchenImage}
                    alt="Monitores de Cozinha KDS"
                    className="w-full h-full object-contain"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 4. SECÇÃO DE FUNCIONALIDADES */}
        <section id="features" className="py-24 px-8 lg:px-16 max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-end gap-6 mb-16">
            <div>
              <span className="bg-primary/20 text-primary px-4 py-1.5 rounded-lg font-bold text-sm inline-block mb-4">
                Recursos Chave
              </span>
              <h2 className="text-3xl lg:text-4xl font-extrabold">
                Controlo Total na Palma da Mão
              </h2>
            </div>
            <p className="text-content-muted max-w-xl text-lg">
              Tudo o que a tua equipa precisa para eliminar os papéis e acelerar o serviço de ponta
              a ponta.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-surface border border-border p-8 rounded-3xl flex flex-col justify-between">
              <div>
                <span className="bg-primary text-white text-xs font-bold px-3 py-1 rounded-full inline-block mb-4">
                  Tempo Real
                </span>
                <h3 className="text-2xl font-bold mb-3 text-content">Pedidos Instantâneos</h3>
                <p className="text-content-muted leading-relaxed mb-6">
                  Os clientes e empregados registam os pedidos e a cozinha recebe a notificação
                  instantaneamente, sem papéis perdidos ou erros de leitura.
                </p>
              </div>
              <div className="h-40 bg-background rounded-2xl border border-border flex items-center justify-center text-content-muted text-sm">
                <img
                  src={kitchenImage}
                  alt="Scan&Serve Interface Principal"
                  className="w-full h-full object-contain"
                />
              </div>
            </div>

            <div className="bg-surface border border-border p-8 rounded-3xl flex flex-col justify-between">
              <div>
                <span className="bg-success/20 text-success text-xs font-bold px-3 py-1 rounded-full inline-block mb-4">
                  Visual
                </span>
                <h3 className="text-2xl font-bold mb-3 text-content">Gestão de Mesas por Cores</h3>
                <p className="text-content-muted leading-relaxed mb-6">
                  Um mapa interativo com cores de semáforo para identificar de imediato que mesas
                  precisam de assistência, novos pedidos ou fecho de conta.
                </p>
              </div>
              <div className="h-40 bg-background rounded-2xl border border-border flex items-center justify-center text-content-muted text-sm">
                <img
                  src={waiterImage}
                  alt="Scan&Serve Interface Principal"
                  className="w-full h-full object-contain"
                />
              </div>{' '}
            </div>
          </div>
        </section>

        {/* 5. SECÇÃO DE PROCESSO (COMO FUNCIONA) */}
        <section id="process" className="py-24 px-8 lg:px-16 bg-surface border-t border-border">
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row md:items-end gap-6 mb-16">
              <div>
                <span className="bg-primary/20 text-primary px-4 py-1.5 rounded-lg font-bold text-sm inline-block mb-4">
                  Passo a Passo
                </span>
                <h2 className="text-3xl lg:text-4xl font-extrabold">Simples de Implementar</h2>
              </div>
              <p className="text-content-muted max-w-xl text-lg">
                Três passos simples para transformar a operação do teu estabelecimento.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="bg-surface-raised border border-border p-8 rounded-3xl">
                <span className="text-5xl font-black text-primary/40 block mb-4">01</span>
                <h3 className="text-xl font-bold mb-3">Configuração do Espaço</h3>
                <p className="text-content-muted leading-relaxed">
                  Define as mesas, gera os QR codes e insere as categorias de produtos no sistema.
                </p>
              </div>

              <div className="bg-surface-raised border border-border p-8 rounded-3xl">
                <span className="text-5xl font-black text-primary/40 block mb-4">02</span>
                <h3 className="text-xl font-bold mb-3">Ação na Sala e Cozinha</h3>
                <p className="text-content-muted leading-relaxed">
                  O cliente pede pelo telemóvel e a equipa gere a produção na cozinha e sala sem
                  fricção.
                </p>
              </div>

              <div className="bg-surface-raised border border-border p-8 rounded-3xl">
                <span className="text-5xl font-black text-primary/40 block mb-4">03</span>
                <h3 className="text-xl font-bold mb-3">Serviço Concluído</h3>
                <p className="text-content-muted leading-relaxed">
                  Entrega rápida de pratos e fecho de conta simplificado para uma rotação de mesas
                  otimizada.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 6. TESTEMUNHOS */}
        <section
          id="testimonials"
          className="py-24 px-8 lg:px-16 max-w-7xl mx-auto border-t border-border"
        >
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="bg-primary/20 text-primary px-4 py-1.5 rounded-lg font-bold text-sm inline-block mb-4">
              Testemunhos
            </span>
            <h2 className="text-3xl lg:text-4xl font-extrabold mb-4">
              O que dizem os profissionais
            </h2>
            <p className="text-content-muted text-lg">
              Restaurantes que já aceleraram o seu serviço com o Scan&Serve.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-surface border border-border p-8 rounded-3xl flex flex-col justify-between">
              <p className="text-content italic text-lg mb-8">
                &ldquo;A comunicação entre a sala e a cozinha melhorou a 100%. Os pratos saem muito
                mais rápido e os clientes adoram pedir diretamente pela mesa.&rdquo;
              </p>
              <div>
                <p className="font-bold text-content">Carlos Silva</p>
                <p className="text-content-muted text-sm">Gerente, O Pátio do Chef</p>
              </div>
            </div>

            <div className="bg-surface border border-border p-8 rounded-3xl flex flex-col justify-between">
              <p className="text-content italic text-lg mb-8">
                &ldquo;A interface é super intuitiva e qualquer empregado aprende a usar em 10
                minutos. Mudou por completo a dinâmica dos nossos turnos.&rdquo;
              </p>
              <div>
                <p className="font-bold text-content">Ana Rodrigues</p>
                <p className="text-content-muted text-sm">Chef Executiva, Sabores & Companhia</p>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* 7. RODAPÉ */}
      <footer className="bg-surface border-t border-border py-16 px-8 lg:px-16">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8 mb-12">
          <div className="font-bold text-2xl flex items-center gap-2">
            <span className="text-primary">㗊</span>
            <div>
              <span className="text-primary">Scan</span>
              <span className="text-content">&</span>
              <span className="text-primary">Serve</span>
            </div>
          </div>

          <div className="flex flex-wrap gap-8 text-sm font-medium text-content-muted">
            <a href="#roles" className="hover:text-content transition-colors">
              Plataforma
            </a>
            <a href="#features" className="hover:text-content transition-colors">
              Funcionalidades
            </a>
            <a href="#process" className="hover:text-content transition-colors">
              Como Funciona
            </a>
            <a href="#testimonials" className="hover:text-content transition-colors">
              Testemunhos
            </a>
          </div>

          <Button className="border-2 border-primary-soft" size="md" variant="primary">
            Contactar Equipa
          </Button>
        </div>

        <div className="max-w-7xl mx-auto pt-8 border-t border-border/50 flex flex-col md:flex-row justify-between items-center text-sm text-content-muted">
          <p>&copy; 2026 Scan&Serve. Todos os direitos reservados.</p>
          <div className="flex gap-6 mt-4 md:mt-0">
            <a href="#" className="hover:underline">
              Política de Privacidade
            </a>
            <a href="#" className="hover:underline">
              Termos de Serviço
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}

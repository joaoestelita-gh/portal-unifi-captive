'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft, Wifi, Router, Ticket, Users, LayoutGrid, BookOpen, Layers } from 'lucide-react'
import { useRouter } from 'next/navigation'

type SectionId = 'overview' | 'aruba' | 'unifi' | 'both' | 'vouchers' | 'users'

const sections: { id: SectionId; label: string; icon: typeof Wifi }[] = [
  { id: 'overview', label: 'Visao Geral', icon: LayoutGrid },
  { id: 'aruba', label: 'Aruba Instant On', icon: Wifi },
  { id: 'unifi', label: 'UniFi', icon: Router },
  { id: 'both', label: 'Ambas (UniFi + Aruba)', icon: Layers },
  { id: 'vouchers', label: 'Vouchers', icon: Ticket },
  { id: 'users', label: 'Usuarios', icon: Users },
]

export function HelpCenter() {
  const router = useRouter()
  const [active, setActive] = useState<SectionId>('overview')

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border/50 bg-card/50 backdrop-blur sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center gap-3">
          <Button variant="ghost" size="sm" className="gap-2" onClick={() => router.push('/admin')}>
            <ArrowLeft className="w-4 h-4" />
            Voltar ao painel
          </Button>
          <div className="flex items-center gap-2 text-foreground">
            <BookOpen className="w-5 h-5 text-green-400" />
            <span className="font-semibold">Central de Ajuda</span>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8 flex flex-col md:flex-row gap-8">
        {/* Sidebar */}
        <nav className="md:w-56 shrink-0">
          <ul className="flex flex-row md:flex-col gap-1 overflow-x-auto md:overflow-visible">
            {sections.map((s) => {
              const Icon = s.icon
              const isActive = active === s.id
              return (
                <li key={s.id} className="shrink-0">
                  <button
                    onClick={() => setActive(s.id)}
                    className={`flex items-center gap-2 w-full rounded-lg px-3 py-2 text-sm transition-colors ${
                      isActive
                        ? 'bg-green-500/10 text-green-400 font-medium'
                        : 'text-muted-foreground hover:bg-secondary/50 hover:text-foreground'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {s.label}
                  </button>
                </li>
              )
            })}
          </ul>
        </nav>

        {/* Content */}
        <main className="flex-1 min-w-0">
          {active === 'overview' && <OverviewSection />}
          {active === 'aruba' && <ArubaSection />}
          {active === 'unifi' && <UnifiSection />}
          {active === 'both' && <BothSection />}
          {active === 'vouchers' && <VouchersSection />}
          {active === 'users' && <UsersSection />}
        </main>
      </div>
    </div>
  )
}

function SectionHeader({ icon: Icon, title, subtitle }: { icon: typeof Wifi; title: string; subtitle: string }) {
  return (
    <header className="mb-6">
      <div className="flex items-center gap-3 mb-2">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-green-500/10 text-green-400">
          <Icon className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold text-foreground text-balance">{title}</h1>
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        </div>
      </div>
    </header>
  )
}

function Table({ head, rows }: { head: string[]; rows: string[][] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border/50 text-left text-foreground">
            {head.map((h) => (
              <th key={h} className="py-2 pr-4 font-medium">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="text-muted-foreground">
          {rows.map((row, i) => (
            <tr key={i} className={i < rows.length - 1 ? 'border-b border-border/30' : ''}>
              {row.map((cell, j) => (
                <td key={j} className={`py-2 pr-4 ${j === 0 ? 'text-foreground' : ''}`}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/* ---------- Visão Geral ---------- */
function OverviewSection() {
  return (
    <div className="flex flex-col gap-6">
      <SectionHeader icon={LayoutGrid} title="Visao Geral do Sistema" subtitle="Como tudo funciona em conjunto" />

      <Card>
        <CardHeader><CardTitle className="text-lg">O que e o sistema</CardTitle></CardHeader>
        <CardContent className="text-sm text-muted-foreground leading-relaxed flex flex-col gap-3">
          <p>
            Este e um sistema de <strong className="text-foreground">portal captivo</strong> para redes WiFi de visitantes.
            Ele controla quem acessa a internet, por quanto tempo e em qual velocidade, integrando-se com
            controladoras <strong className="text-foreground">UniFi</strong> e <strong className="text-foreground">Aruba Instant On</strong>.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-lg">Fluxo de acesso</CardTitle></CardHeader>
        <CardContent>
          <ol className="flex flex-col gap-3 text-sm">
            {[
              ['Cliente conecta no WiFi Guest', 'O dispositivo entra na rede de visitantes'],
              ['Controladora redireciona', 'UniFi ou Aruba envia o cliente para o portal'],
              ['Sistema detecta a controladora', 'Identifica automaticamente pela query string'],
              ['Reconexao automatica', 'Se o MAC ja tem sessao ativa, libera sem novo login'],
              ['Login / cadastro / voucher', 'Caso nao tenha sessao, o cliente se autentica'],
              ['Autorizacao na controladora', 'O sistema libera o acesso pelo tempo definido'],
            ].map(([t, d], i) => (
              <li key={i} className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-green-500/10 text-green-400 text-xs font-medium">{i + 1}</span>
                <span className="text-muted-foreground"><strong className="text-foreground">{t}:</strong> {d}</span>
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-lg">Modulos principais</CardTitle></CardHeader>
        <CardContent>
          <Table
            head={['Modulo', 'Funcao']}
            rows={[
              ['Portal Captivo', 'Tela de login, cadastro e voucher para visitantes'],
              ['Painel Admin', 'Gestao de usuarios, sessoes, vouchers e configuracoes'],
              ['Controladoras', 'Integracao com UniFi e Aruba (ate ambas ao mesmo tempo)'],
              ['Controle de Acesso', 'Limites de tempo, velocidade e aprovacao'],
              ['Login Unico', 'Uma sessao ativa por usuario por vez'],
              ['Logs de Acesso', 'Registro em tempo real dos redirecionamentos'],
            ]}
          />
        </CardContent>
      </Card>
    </div>
  )
}

/* ---------- Aruba ---------- */
function ArubaSection() {
  return (
    <div className="flex flex-col gap-6">
      <SectionHeader icon={Wifi} title="Configuracao do Portal Captivo" subtitle="Aruba Instant On" />

      <Card>
        <CardHeader><CardTitle className="text-lg">Visao Geral</CardTitle></CardHeader>
        <CardContent className="text-sm text-muted-foreground leading-relaxed flex flex-col gap-3">
          <p>
            O Aruba Instant On usa o metodo <strong className="text-foreground">Portal Captivo Externo</strong> com
            autenticacao via <strong className="text-foreground">servidor RADIUS externo (FreeRADIUS)</strong>.
            Quando um cliente conecta na rede Guest, o AP redireciona o navegador para a URL do portal,
            passando parametros na query string (MAC, SSID, nome do AP, etc.).
          </p>
          <p>
            Apos o login no portal, o cliente e enviado para o endpoint de login do AP (<code className="text-foreground">/cgi-bin/login</code>)
            com um token de uso unico. O AP valida esse token contra o seu servidor RADIUS e libera o acesso.
          </p>
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-amber-300">
            <strong className="text-amber-200">Importante:</strong> o modo &quot;Confirmacao do Portal de Convidados&quot;
            (acknowledgement) <strong className="text-amber-200">nao e mais suportado</strong> por ser instavel em HTTPS.
            Use sempre &quot;Autenticacao de Convidado (padrao)&quot; com RADIUS.
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-lg">Campos no painel (aba Controladora)</CardTitle></CardHeader>
        <CardContent className="text-sm text-muted-foreground leading-relaxed flex flex-col gap-3">
          <p>
            Selecione <strong className="text-foreground">HP Aruba</strong> (ou <strong className="text-foreground">Ambas</strong>)
            em <strong className="text-foreground">Painel Admin &gt; Controladora</strong>. O painel exibe um guia com a
            <strong className="text-foreground"> URL do portal</strong>, o <strong className="text-foreground">dominio permitido</strong> e
            os <strong className="text-foreground">campos do servidor RADIUS</strong> que voce deve preencher na tela do Aruba.
          </p>
          <div className="rounded-lg border border-green-500/30 bg-green-500/10 p-3 text-green-300">
            A autenticacao acontece no <strong className="text-green-200">FreeRADIUS</strong> instalado na sua VPS.
            Veja o guia <strong className="text-green-200">docs/INSTALACAO-FREERADIUS.md</strong> para configurar o servidor.
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-lg">Pre-requisitos</CardTitle></CardHeader>
        <CardContent>
          <Table
            head={['Requisito', 'Descricao']}
            rows={[
              ['Servidor RADIUS', 'FreeRADIUS instalado e acessivel na sua VPS (portas UDP 1812/1813)'],
              ['HTTPS valido', 'O dominio do portal precisa de certificado SSL (a Vercel emite automaticamente)'],
              ['Dominio configurado', 'Adicionar o dominio no projeto Vercel (Settings > Domains)'],
              ['Rede Guest', 'Uma rede de visitantes criada no Instant On'],
              ['DNS liberado', 'O AP precisa resolver o dominio do portal antes do login'],
            ]}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-lg">Passo a Passo no Aruba Instant On</CardTitle></CardHeader>
        <CardContent>
          <ol className="flex flex-col gap-3 text-sm">
            {[
              ['App ou portal.arubainstanton.com', 'Acesse sua conta'],
              ['Redes', 'Selecione sua rede Guest (visitantes)'],
              ['Autenticacao', 'Escolha "Autenticacao de Convidado (padrao)" (NAO use Confirmacao)'],
              ['Tipo de Portal', 'Defina "Externa" e cole a URL do portal'],
              ['Servidor RADIUS', 'Informe o IP da VPS, portas 1812/1813 e o segredo compartilhado'],
              ['Dominios Permitidos (Walled Garden)', 'Adicione o dominio do portal'],
              ['Salvar', 'Confirme as configuracoes'],
            ].map(([local, acao], i) => (
              <li key={i} className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-green-500/10 text-green-400 text-xs font-medium">{i + 1}</span>
                <span className="text-muted-foreground"><strong className="text-foreground">{local}:</strong> {acao}</span>
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-lg">Servidor RADIUS (na tela do Aruba)</CardTitle></CardHeader>
        <CardContent>
          <Table
            head={['Campo', 'Valor']}
            rows={[
              ['Servidor / Endereco IP', 'IP publico da sua VPS (onde roda o FreeRADIUS)'],
              ['Porta de autenticacao', '1812'],
              ['Porta de accounting', '1813'],
              ['Segredo compartilhado', 'mesmo Shared Secret do clients.conf do FreeRADIUS'],
            ]}
          />
          <div className="mt-4 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-amber-300 text-sm">
            O AP precisa <strong className="text-amber-200">alcancar a VPS</strong> nas portas UDP 1812/1813.
            Garanta que o firewall da VPS libere essas portas.
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-lg">URL do Servidor</CardTitle></CardHeader>
        <CardContent className="text-sm text-muted-foreground leading-relaxed flex flex-col gap-3">
          <p>
            Use a URL real do seu deploy. Tanto <code className="text-foreground">/portal</code> quanto
            a raiz <code className="text-foreground">/</code> funcionam, pois as duas rotas foram unificadas.
          </p>
          <pre className="rounded-lg bg-secondary/50 p-3 text-foreground overflow-x-auto">https://SEU-DOMINIO/portal</pre>
          <p>Exemplo com dominio personalizado:</p>
          <pre className="rounded-lg bg-secondary/50 p-3 text-foreground overflow-x-auto">https://portal.centernet.inf.br/portal</pre>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-lg">Dominios Permitidos (Walled Garden)</CardTitle></CardHeader>
        <CardContent className="text-sm text-muted-foreground leading-relaxed flex flex-col gap-3">
          <p>Adicione estes dominios para que o portal carregue ANTES da autenticacao:</p>
          <pre className="rounded-lg bg-secondary/50 p-3 text-foreground overflow-x-auto">portal.centernet.inf.br
fonts.googleapis.com
fonts.gstatic.com</pre>
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-amber-300">
            <strong className="text-amber-200">IMPORTANTE:</strong> Antes de autenticar, o cliente nao tem internet.
            Para o portal carregar, o dominio DEVE estar no Walled Garden, incluindo a liberacao de DNS.
            Use a mesma grafia exata do dominio na URL do portal e aqui (<strong className="text-amber-200">portal.centernet.inf.br</strong>).
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-lg">Parametros enviados pela Aruba</CardTitle></CardHeader>
        <CardContent>
          <Table
            head={['Parametro', 'Descricao']}
            rows={[
              ['cmd', 'Comando (login, logout) - identifica que e Aruba'],
              ['mac', 'MAC address do cliente'],
              ['ip', 'IP do cliente'],
              ['essid', 'SSID da rede'],
              ['apname', 'Nome do Access Point'],
              ['apmac', 'MAC do Access Point'],
              ['switchip', 'IP do switch/AP (host de login para o RADIUS)'],
              ['vcname', 'Nome do Virtual Controller'],
              ['url', 'URL original que o cliente tentava acessar'],
            ]}
          />
          <p className="mt-4 text-sm text-muted-foreground">Exemplo de redirecionamento recebido:</p>
          <pre className="mt-2 rounded-lg bg-secondary/50 p-3 text-foreground overflow-x-auto text-xs">https://portal.centernet.inf.br/portal?cmd=login&mac=XX:XX:XX&essid=Guest&apname=AP01</pre>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-lg">Solucao de Problemas</CardTitle></CardHeader>
        <CardContent>
          <Table
            head={['Sintoma', 'Causa provavel', 'Solucao']}
            rows={[
              ['"Site nao encontrado" ao conectar', 'DNS bloqueado antes do login', 'Adicionar dominio + DNS no Walled Garden'],
              ['Portal nao abre / tela em branco', 'Dominio fora do Walled Garden', 'Adicionar o dominio do portal no Walled Garden'],
              ['Erro de certificado', 'HTTPS nao configurado', 'Confirmar SSL ativo no dominio da Vercel'],
              ['Loga no portal mas nao libera', 'AP nao alcanca o RADIUS', 'Liberar UDP 1812/1813 e conferir IP/segredo do RADIUS'],
              ['"Access-Reject" no RADIUS', 'Segredo ou token incorreto', 'Conferir o Shared Secret no clients.conf e no AP'],
              ['Log nao aparece no admin', 'AP nao esta redirecionando', 'Confirmar tipo "Externa" e modo "Autenticacao de Convidado"'],
            ]}
          />
        </CardContent>
      </Card>
    </div>
  )
}

/* ---------- UniFi ---------- */
function UnifiSection() {
  return (
    <div className="flex flex-col gap-6">
      <SectionHeader icon={Router} title="Configuracao UniFi" subtitle="Ubiquiti Cloud Key, UDM, UDR" />

      <Card>
        <CardHeader><CardTitle className="text-lg">Visao Geral</CardTitle></CardHeader>
        <CardContent className="text-sm text-muted-foreground leading-relaxed flex flex-col gap-3">
          <p>
            O UniFi usa <strong className="text-foreground">API de autorizacao ativa</strong>. O sistema se conecta
            a controladora com usuario e senha e autoriza/desautoriza clientes diretamente, alem de aplicar
            limites de velocidade.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-lg">Campos no painel (aba Controladora)</CardTitle></CardHeader>
        <CardContent className="flex flex-col gap-3">
          <p className="text-sm text-muted-foreground">
            Selecione <strong className="text-foreground">UniFi</strong> em
            <strong className="text-foreground"> Painel Admin &gt; Controladora</strong> e preencha:
          </p>
          <Table
            head={['Campo', 'Exemplo / Valor', 'Descricao']}
            rows={[
              ['URL do Controller', 'https://192.168.1.1', 'IP local ou dominio do Cloud Key / UDM / UDR'],
              ['Usuario', 'admin', 'Conta com permissao de administrador na controladora'],
              ['Senha', '••••••', 'Senha do usuario administrador'],
              ['Site / Dispositivo', 'default', 'Nome do site (geralmente "default")'],
            ]}
          />
          <div className="rounded-lg border border-blue-500/30 bg-blue-500/10 p-3 text-blue-300 text-sm">
            Use o botao <strong className="text-blue-200">Testar Conexao</strong> apos preencher para
            validar usuario, senha e listar os sites disponiveis antes de salvar.
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-lg">Passo a Passo</CardTitle></CardHeader>
        <CardContent>
          <ol className="flex flex-col gap-3 text-sm">
            {[
              ['Criar usuario na controladora', 'Crie um admin dedicado (Settings > Admins) para a integracao'],
              ['Painel admin > Controladora', 'Selecione "UniFi" (ou "Ambas") como tipo'],
              ['Preencher os dados', 'URL do Controller, usuario, senha e site'],
              ['Testar Conexao', 'Valide as credenciais e selecione o site detectado'],
              ['Configurar Guest Portal na UniFi', 'Em Settings > Guest Hotspot, ative portal externo e aponte para a URL do sistema'],
              ['Salvar Configuracao', 'Confirme para gravar os dados no sistema'],
            ].map(([t, d], i) => (
              <li key={i} className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-green-500/10 text-green-400 text-xs font-medium">{i + 1}</span>
                <span className="text-muted-foreground"><strong className="text-foreground">{t}:</strong> {d}</span>
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-lg">Vantagens da API ativa</CardTitle></CardHeader>
        <CardContent>
          <ul className="flex flex-col gap-2 text-sm text-muted-foreground list-disc pl-5">
            <li>Desconexao imediata quando o admin encerra a sessao.</li>
            <li>Desconexao do dispositivo antigo no login unico.</li>
            <li>Aplicacao de limites de velocidade por usuario.</li>
            <li>Listagem de sites e dispositivos diretamente no painel.</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}

/* ---------- Ambas (UniFi + Aruba) ---------- */
function BothSection() {
  return (
    <div className="flex flex-col gap-6">
      <SectionHeader icon={Layers} title="Modo Ambas" subtitle="UniFi e Aruba ao mesmo tempo" />

      <Card>
        <CardHeader><CardTitle className="text-lg">Quando usar</CardTitle></CardHeader>
        <CardContent className="text-sm text-muted-foreground leading-relaxed flex flex-col gap-3">
          <p>
            O modo <strong className="text-foreground">Ambas</strong> permite operar
            <strong className="text-foreground"> UniFi e Aruba Instant On simultaneamente</strong> com o mesmo
            portal. Util quando voce tem redes separadas (ex: UniFi no escritorio e Aruba na loja) gerenciadas
            pelo mesmo sistema.
          </p>
          <p>
            Selecione <strong className="text-foreground">Ambas</strong> em
            <strong className="text-foreground"> Painel Admin &gt; Controladora</strong>. O painel mostra os campos
            das duas controladoras ao mesmo tempo: preencha os dados de API da UniFi e siga as instrucoes de RADIUS da Aruba.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-lg">Deteccao automatica</CardTitle></CardHeader>
        <CardContent className="flex flex-col gap-3">
          <p className="text-sm text-muted-foreground">
            O sistema identifica qual controladora redirecionou o cliente pelos parametros da URL e autoriza
            no equipamento correto, sem conflito:
          </p>
          <Table
            head={['Parametro recebido', 'Controladora detectada', 'Acao']}
            rows={[
              ['cmd=login', 'Aruba Instant On', 'Libera via RADIUS (/cgi-bin/login)'],
              ['ap=XX:XX:XX', 'UniFi', 'Autoriza via API ativa'],
              ['Nenhum', 'Acesso direto', 'Mostra o portal normalmente'],
            ]}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-lg">Estabilidade</CardTitle></CardHeader>
        <CardContent className="text-sm text-muted-foreground leading-relaxed flex flex-col gap-3">
          <p>
            Cada cliente vem de apenas <strong className="text-foreground">uma</strong> controladora por vez, entao
            nao ha risco de conflito. A unica situacao de atencao seria a mesma rede WiFi passando pelas duas
            controladoras ao mesmo tempo &mdash; cenario raro de arquitetura de rede.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

/* ---------- Vouchers ---------- */
function VouchersSection() {
  return (
    <div className="flex flex-col gap-6">
      <SectionHeader icon={Ticket} title="Gestao de Vouchers" subtitle="Codigos de acesso temporario" />

      <Card>
        <CardHeader><CardTitle className="text-lg">O que sao vouchers</CardTitle></CardHeader>
        <CardContent className="text-sm text-muted-foreground leading-relaxed">
          <p>
            Vouchers sao <strong className="text-foreground">codigos de acesso</strong> que o visitante digita no
            portal para liberar a internet, sem precisar de cadastro. Ideais para eventos, recepcoes e acessos rapidos.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-lg">Parametros de um voucher</CardTitle></CardHeader>
        <CardContent>
          <Table
            head={['Campo', 'Descricao']}
            rows={[
              ['Codigo', 'Gerado automaticamente ou definido manualmente'],
              ['Duracao', 'Tempo de acesso em minutos'],
              ['Maximo de usos', 'Quantas vezes o codigo pode ser usado'],
              ['Velocidade', 'Limites de download e upload (kbps)'],
              ['Expiracao', 'Data limite para o voucher ser valido'],
            ]}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-lg">Como criar</CardTitle></CardHeader>
        <CardContent>
          <ol className="flex flex-col gap-3 text-sm">
            {[
              ['Painel admin > Vouchers', 'Acesse a aba de vouchers'],
              ['Definir parametros', 'Duracao, usos, velocidade e expiracao'],
              ['Gerar', 'O sistema cria o codigo'],
              ['Distribuir', 'Entregue o codigo ao visitante'],
            ].map(([t, d], i) => (
              <li key={i} className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-green-500/10 text-green-400 text-xs font-medium">{i + 1}</span>
                <span className="text-muted-foreground"><strong className="text-foreground">{t}:</strong> {d}</span>
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>
    </div>
  )
}

/* ---------- Usuários ---------- */
function UsersSection() {
  return (
    <div className="flex flex-col gap-6">
      <SectionHeader icon={Users} title="Gestao de Usuarios" subtitle="Aprovacao, bloqueio e limites" />

      <Card>
        <CardHeader><CardTitle className="text-lg">Status de um usuario</CardTitle></CardHeader>
        <CardContent>
          <Table
            head={['Status', 'Significado']}
            rows={[
              ['Pendente', 'Aguardando aprovacao do admin (se aprovacao estiver ativa)'],
              ['Ativo', 'Pode acessar a internet normalmente'],
              ['Bloqueado', 'Acesso negado e desconectado da controladora'],
            ]}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-lg">Limites por usuario</CardTitle></CardHeader>
        <CardContent>
          <Table
            head={['Limite', 'Descricao']}
            rows={[
              ['Tempo por sessao', 'Duracao de cada conexao em minutos'],
              ['Tempo diario', 'Total de minutos por dia (0 = ilimitado)'],
              ['Velocidade download', 'Limite de download em kbps'],
              ['Velocidade upload', 'Limite de upload em kbps'],
            ]}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-lg">Login Unico</CardTitle></CardHeader>
        <CardContent className="text-sm text-muted-foreground leading-relaxed flex flex-col gap-3">
          <p>
            Cada usuario pode ter <strong className="text-foreground">apenas uma sessao ativa por vez</strong>.
            Ao fazer login em um novo dispositivo, a sessao anterior e encerrada automaticamente e o dispositivo
            antigo e desconectado (no caso do UniFi, imediatamente via API).
          </p>
          <p>
            Quando o campo MAC esta preenchido e o dispositivo ja possui sessao ativa, o sistema faz
            <strong className="text-foreground"> reconexao automatica</strong> sem pedir login novamente.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-lg">Aprovacao de pendentes</CardTitle></CardHeader>
        <CardContent>
          <ol className="flex flex-col gap-3 text-sm">
            {[
              ['Ativar aprovacao', 'Em Configuracoes, habilite "Requer aprovacao"'],
              ['Usuario se cadastra', 'O novo cadastro entra como pendente'],
              ['Admin revisa', 'Na Visao Geral aparecem os usuarios aguardando'],
              ['Aprovar ou bloquear', 'Decida o acesso de cada um'],
            ].map(([t, d], i) => (
              <li key={i} className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-green-500/10 text-green-400 text-xs font-medium">{i + 1}</span>
                <span className="text-muted-foreground"><strong className="text-foreground">{t}:</strong> {d}</span>
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>
    </div>
  )
}

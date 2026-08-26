'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft, Wifi, Router, Ticket, Users, LayoutGrid, BookOpen, Layers, Palette, FileText, ExternalLink } from 'lucide-react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { COLOR_SCHEMES } from '@/lib/color-schemes'

type SectionId = 'overview' | 'aruba' | 'unifi' | 'both' | 'vouchers' | 'users' | 'customization'

const sections: { id: SectionId; label: string; icon: typeof Wifi }[] = [
  { id: 'overview', label: 'Visão Geral', icon: LayoutGrid },
  { id: 'aruba', label: 'Aruba Instant On', icon: Wifi },
  { id: 'unifi', label: 'UniFi', icon: Router },
  { id: 'both', label: 'Ambas (UniFi + Aruba)', icon: Layers },
  { id: 'vouchers', label: 'Vouchers', icon: Ticket },
  { id: 'users', label: 'Usuários', icon: Users },
  { id: 'customization', label: 'Personalização', icon: Palette },
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
            <BookOpen className="w-5 h-5 text-primary" />
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
                        ? 'bg-primary/10 text-primary font-medium'
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
          {active === 'customization' && <CustomizationSection />}
        </main>
      </div>
    </div>
  )
}

function SectionHeader({ icon: Icon, title, subtitle }: { icon: typeof Wifi; title: string; subtitle: string }) {
  return (
    <header className="mb-6">
      <div className="flex items-center gap-3 mb-2">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
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
      <SectionHeader icon={LayoutGrid} title="Visão Geral do Sistema" subtitle="Como tudo funciona em conjunto" />

      <Card>
        <CardHeader><CardTitle className="text-lg">O que é o sistema</CardTitle></CardHeader>
        <CardContent className="text-sm text-muted-foreground leading-relaxed flex flex-col gap-3">
          <p>
            Este é um sistema de <strong className="text-foreground">portal captivo</strong> para redes WiFi de visitantes.
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
              ['Reconexão automática', 'Se o MAC já tem sessão ativa, libera sem novo login'],
              ['Login / cadastro / voucher', 'Caso não tenha sessão, o cliente se autentica'],
              ['Autorização na controladora', 'O sistema libera o acesso pelo tempo definido'],
            ].map(([t, d], i) => (
              <li key={i} className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-medium">{i + 1}</span>
                <span className="text-muted-foreground"><strong className="text-foreground">{t}:</strong> {d}</span>
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-lg">Módulos principais</CardTitle></CardHeader>
        <CardContent>
          <Table
            head={['Módulo', 'Função']}
            rows={[
              ['Portal Captivo', 'Tela de login, cadastro e voucher para visitantes'],
              ['Painel Admin', 'Gestão de usuários, sessões, vouchers e configurações'],
              ['Controladoras', 'Integração com UniFi e Aruba (até ambas ao mesmo tempo)'],
              ['Controle de Acesso', 'Limites de tempo, velocidade e aprovação'],
              ['Login Único', 'Uma sessão ativa por usuário por vez'],
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
      <SectionHeader icon={Wifi} title="Configuração do Portal Captivo" subtitle="Aruba Instant On" />

      <Card>
        <CardHeader><CardTitle className="text-lg">Visão Geral</CardTitle></CardHeader>
        <CardContent className="text-sm text-muted-foreground leading-relaxed flex flex-col gap-3">
          <p>
            O Aruba Instant On usa o método <strong className="text-foreground">Portal Captivo Externo</strong> com
            autenticação via <strong className="text-foreground">servidor RADIUS externo (FreeRADIUS)</strong>.
            Quando um cliente conecta na rede Guest, o AP redireciona o navegador para a URL do portal,
            passando parâmetros na query string (MAC, SSID, nome do AP, etc.).
          </p>
          <p>
            Após o login no portal, o cliente é enviado para o endpoint de login do AP (<code className="text-foreground">/cgi-bin/login</code>)
            com um token de uso único. O AP valida esse token contra o seu servidor RADIUS e libera o acesso.
          </p>
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-amber-300">
            <strong className="text-amber-200">Importante:</strong> o modo &quot;Confirmação do Portal de Convidados&quot;
            (acknowledgement) <strong className="text-amber-200">não é mais suportado</strong> por ser instável em HTTPS.
            Use sempre &quot;Autenticação de Convidado (padrão)&quot; com RADIUS.
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-lg">Campos no painel (aba Controladora)</CardTitle></CardHeader>
        <CardContent className="text-sm text-muted-foreground leading-relaxed flex flex-col gap-3">
          <p>
            Selecione <strong className="text-foreground">HP Aruba</strong> (ou <strong className="text-foreground">Ambas</strong>)
            em <strong className="text-foreground">Painel Admin &gt; Controladora</strong>. O painel exibe um guia com a
            <strong className="text-foreground"> URL do portal</strong>, o <strong className="text-foreground">domínio permitido</strong> e
            os <strong className="text-foreground">campos do servidor RADIUS</strong> que você deve preencher na tela do Aruba.
          </p>
          <div className="rounded-lg border border-primary/30 bg-primary/10 p-3 text-foreground">
            A autenticação acontece no <strong className="text-primary">FreeRADIUS</strong> instalado na sua VPS.
            Veja o guia <strong className="text-primary">docs/INSTALACAO-FREERADIUS.md</strong> para configurar o servidor.
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-lg">Pré-requisitos</CardTitle></CardHeader>
        <CardContent>
          <Table
            head={['Requisito', 'Descrição']}
            rows={[
              ['Servidor RADIUS', 'FreeRADIUS instalado e acessível na sua VPS (portas UDP 1812/1813)'],
              ['HTTPS válido', 'O domínio do portal precisa de certificado SSL (a Vercel emite automaticamente)'],
              ['Domínio configurado', 'Adicionar o domínio no projeto Vercel (Settings > Domains)'],
              ['Rede Guest', 'Uma rede de visitantes criada no Instant On'],
              ['DNS liberado', 'O AP precisa resolver o domínio do portal antes do login'],
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
              ['Autenticação', 'Escolha "Autenticação de Convidado (padrão)" (NÃO use Confirmação)'],
              ['Tipo de Portal', 'Defina "Externa" e cole a URL do portal'],
              ['Servidor RADIUS', 'Informe o IP da VPS, portas 1812/1813 e o segredo compartilhado'],
              ['Domínios Permitidos (Walled Garden)', 'Adicione o domínio do portal'],
              ['Salvar', 'Confirme as configurações'],
            ].map(([local, acao], i) => (
              <li key={i} className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-medium">{i + 1}</span>
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
              ['Servidor / Endereço IP', 'IP público da sua VPS (onde roda o FreeRADIUS)'],
              ['Porta de autenticação', '1812'],
              ['Porta de accounting', '1813'],
              ['Segredo compartilhado', 'mesmo Shared Secret do clients.conf do FreeRADIUS'],
            ]}
          />
          <div className="mt-4 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-amber-300 text-sm">
            O AP precisa <strong className="text-amber-200">alcançar a VPS</strong> nas portas UDP 1812/1813.
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
          <p>Exemplo com domínio personalizado:</p>
          <pre className="rounded-lg bg-secondary/50 p-3 text-foreground overflow-x-auto">https://portal.centernet.inf.br/portal</pre>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-lg">Domínios Permitidos (Walled Garden)</CardTitle></CardHeader>
        <CardContent className="text-sm text-muted-foreground leading-relaxed flex flex-col gap-3">
          <p>Adicione estes domínios para que o portal carregue ANTES da autenticação:</p>
          <pre className="rounded-lg bg-secondary/50 p-3 text-foreground overflow-x-auto">portal.centernet.inf.br
fonts.googleapis.com
fonts.gstatic.com</pre>
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-amber-300">
            <strong className="text-amber-200">IMPORTANTE:</strong> Antes de autenticar, o cliente não tem internet.
            Para o portal carregar, o domínio DEVE estar no Walled Garden, incluindo a liberação de DNS.
            Use a mesma grafia exata do domínio na URL do portal e aqui (<strong className="text-amber-200">portal.centernet.inf.br</strong>).
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-lg">Parâmetros enviados pela Aruba</CardTitle></CardHeader>
        <CardContent>
          <Table
            head={['Parâmetro', 'Descrição']}
            rows={[
              ['cmd', 'Comando (login, logout) - identifica que é Aruba'],
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
        <CardHeader><CardTitle className="text-lg">Solução de Problemas</CardTitle></CardHeader>
        <CardContent>
          <Table
            head={['Sintoma', 'Causa provável', 'Solução']}
            rows={[
              ['"Site não encontrado" ao conectar', 'DNS bloqueado antes do login', 'Adicionar domínio + DNS no Walled Garden'],
              ['Portal não abre / tela em branco', 'Domínio fora do Walled Garden', 'Adicionar o domínio do portal no Walled Garden'],
              ['Erro de certificado', 'HTTPS não configurado', 'Confirmar SSL ativo no domínio da Vercel'],
              ['Loga no portal mas não libera', 'AP não alcança o RADIUS', 'Liberar UDP 1812/1813 e conferir IP/segredo do RADIUS'],
              ['"Access-Reject" no RADIUS', 'Segredo ou token incorreto', 'Conferir o Shared Secret no clients.conf e no AP'],
              ['Log não aparece no admin', 'AP não está redirecionando', 'Confirmar tipo "Externa" e modo "Autenticação de Convidado"'],
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
      <SectionHeader icon={Router} title="Configuração UniFi" subtitle="Ubiquiti Cloud Key, UDM, UDR" />

      <Link
        href="/docs/unifi"
        target="_blank"
        className="group flex items-center gap-4 rounded-lg border border-primary/30 bg-primary/5 p-4 transition-colors hover:bg-primary/10"
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <FileText className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-medium text-foreground">Guia completo em versão imprimível</p>
          <p className="text-sm text-muted-foreground">Abra a documentação da integração UniFi para ler ou salvar em PDF.</p>
        </div>
        <ExternalLink className="h-4 w-4 shrink-0 text-muted-foreground transition-colors group-hover:text-primary" />
      </Link>

      <Card>
        <CardHeader><CardTitle className="text-lg">Visão Geral</CardTitle></CardHeader>
        <CardContent className="text-sm text-muted-foreground leading-relaxed flex flex-col gap-3">
          <p>
            O UniFi usa <strong className="text-foreground">API de autorização ativa</strong>. O sistema se conecta
            à controladora com usuário e senha e autoriza/desautoriza clientes diretamente, além de aplicar
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
            head={['Campo', 'Exemplo / Valor', 'Descrição']}
            rows={[
              ['URL do Controller', 'https://192.168.1.1', 'IP local ou domínio do Cloud Key / UDM / UDR'],
              ['Usuário', 'admin', 'Conta com permissão de administrador na controladora'],
              ['Senha', '••••••', 'Senha do usuário administrador'],
              ['Site / Dispositivo', 'default', 'Nome do site (geralmente "default")'],
            ]}
          />
          <div className="rounded-lg border border-blue-500/30 bg-blue-500/10 p-3 text-blue-300 text-sm">
            Use o botão <strong className="text-blue-200">Testar Conexão</strong> após preencher para
            validar usuário, senha e listar os sites disponíveis antes de salvar.
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-lg">Passo a Passo</CardTitle></CardHeader>
        <CardContent>
          <ol className="flex flex-col gap-3 text-sm">
            {[
              ['Criar usuário na controladora', 'Crie um admin dedicado (Settings > Admins) para a integração'],
              ['Painel admin > Controladora', 'Selecione "UniFi" (ou "Ambas") como tipo'],
              ['Preencher os dados', 'URL do Controller, usuário, senha e site'],
              ['Testar Conexão', 'Valide as credenciais e selecione o site detectado'],
              ['Configurar Guest Portal na UniFi', 'Em Settings > Guest Hotspot, ative portal externo e aponte para a URL do sistema'],
              ['Salvar Configuração', 'Confirme para gravar os dados no sistema'],
            ].map(([t, d], i) => (
              <li key={i} className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-medium">{i + 1}</span>
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
            <li>Desconexão imediata quando o admin encerra a sessão.</li>
            <li>Desconexão do dispositivo antigo no login único.</li>
            <li>Aplicação de limites de velocidade por usuário.</li>
            <li>Listagem de sites e dispositivos diretamente no painel.</li>
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-lg">Diagnóstico: Autorizar MAC de teste</CardTitle></CardHeader>
        <CardContent className="text-sm text-muted-foreground leading-relaxed flex flex-col gap-3">
          <p>
            Na aba <strong className="text-foreground">Controladora</strong> existe a ferramenta
            <strong className="text-foreground"> Autorizar MAC de teste</strong>. Ela valida, de ponta a ponta, se o
            sistema consegue liberar um dispositivo na controladora UniFi sem precisar conectar um cliente real na rede.
          </p>
          <ol className="flex flex-col gap-3">
            {[
              ['Salve as credenciais', 'Preencha e salve URL, usuário, senha e site do UniFi antes de usar a ferramenta'],
              ['Informe o MAC', 'Digite o endereço MAC do dispositivo de teste (ex: aa:bb:cc:dd:ee:ff)'],
              ['Autorizar MAC', 'O sistema envia a autorização via API por 5 minutos'],
              ['Confira o resultado', 'Um toast confirma o sucesso ou mostra o erro retornado pela controladora'],
            ].map(([t, d], i) => (
              <li key={i} className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-medium">{i + 1}</span>
                <span><strong className="text-foreground">{t}:</strong> {d}</span>
              </li>
            ))}
          </ol>
          <div className="rounded-lg border border-blue-500/30 bg-blue-500/10 p-3 text-blue-300">
            A autorização de teste dura <strong className="text-blue-200">5 minutos</strong> e serve apenas para
            diagnóstico. É exclusiva do UniFi (a Aruba autoriza via RADIUS, não por API).
          </div>
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
            portal. Útil quando você tem redes separadas (ex: UniFi no escritório e Aruba na loja) gerenciadas
            pelo mesmo sistema.
          </p>
          <p>
            Selecione <strong className="text-foreground">Ambas</strong> em
            <strong className="text-foreground"> Painel Admin &gt; Controladora</strong>. O painel mostra os campos
            das duas controladoras ao mesmo tempo: preencha os dados de API da UniFi e siga as instruções de RADIUS da Aruba.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-lg">Detecção automática</CardTitle></CardHeader>
        <CardContent className="flex flex-col gap-3">
          <p className="text-sm text-muted-foreground">
            O sistema identifica qual controladora redirecionou o cliente pelos parâmetros da URL e autoriza
            no equipamento correto, sem conflito:
          </p>
          <Table
            head={['Parâmetro recebido', 'Controladora detectada', 'Ação']}
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
            Cada cliente vem de apenas <strong className="text-foreground">uma</strong> controladora por vez, então
            não há risco de conflito. A única situação de atenção seria a mesma rede WiFi passando pelas duas
            controladoras ao mesmo tempo &mdash; cenário raro de arquitetura de rede.
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
      <SectionHeader icon={Ticket} title="Gestão de Vouchers" subtitle="Códigos de acesso temporário" />

      <Card>
        <CardHeader><CardTitle className="text-lg">O que são vouchers</CardTitle></CardHeader>
        <CardContent className="text-sm text-muted-foreground leading-relaxed">
          <p>
            Vouchers são <strong className="text-foreground">códigos de acesso</strong> que o visitante digita no
            portal para liberar a internet, sem precisar de cadastro. Ideais para eventos, recepções e acessos rápidos.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-lg">Parâmetros de um voucher</CardTitle></CardHeader>
        <CardContent>
          <Table
            head={['Campo', 'Descrição']}
            rows={[
              ['Código', 'Gerado automaticamente ou definido manualmente'],
              ['Duração', 'Tempo de acesso em minutos'],
              ['Máximo de usos', 'Quantas vezes o código pode ser usado'],
              ['Velocidade', 'Limites de download e upload (kbps)'],
              ['Expiração', 'Data limite para o voucher ser válido'],
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
              ['Definir parâmetros', 'Duração, usos, velocidade e expiração'],
              ['Gerar', 'O sistema cria o código'],
              ['Distribuir', 'Entregue o código ao visitante'],
            ].map(([t, d], i) => (
              <li key={i} className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-medium">{i + 1}</span>
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
      <SectionHeader icon={Users} title="Gestão de Usuários" subtitle="Aprovação, bloqueio e limites" />

      <Card>
        <CardHeader><CardTitle className="text-lg">Status de um usuário</CardTitle></CardHeader>
        <CardContent>
          <Table
            head={['Status', 'Significado']}
            rows={[
              ['Pendente', 'Aguardando aprovação do admin (se aprovação estiver ativa)'],
              ['Ativo', 'Pode acessar a internet normalmente'],
              ['Bloqueado', 'Acesso negado e desconectado da controladora'],
            ]}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-lg">Limites por usuário</CardTitle></CardHeader>
        <CardContent>
          <Table
            head={['Limite', 'Descrição']}
            rows={[
              ['Tempo por sessão', 'Duração de cada conexão em minutos'],
              ['Tempo diário', 'Total de minutos por dia (0 = ilimitado)'],
              ['Velocidade download', 'Limite de download em kbps'],
              ['Velocidade upload', 'Limite de upload em kbps'],
            ]}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-lg">Login Único</CardTitle></CardHeader>
        <CardContent className="text-sm text-muted-foreground leading-relaxed flex flex-col gap-3">
          <p>
            Cada usuário pode ter <strong className="text-foreground">apenas uma sessão ativa por vez</strong>.
            Ao fazer login em um novo dispositivo, a sessão anterior é encerrada automaticamente e o dispositivo
            antigo é desconectado (no caso do UniFi, imediatamente via API).
          </p>
          <p>
            Quando o campo MAC está preenchido e o dispositivo já possui sessão ativa, o sistema faz
            <strong className="text-foreground"> reconexão automática</strong> sem pedir login novamente.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-lg">Aprovação de pendentes</CardTitle></CardHeader>
        <CardContent>
          <ol className="flex flex-col gap-3 text-sm">
            {[
              ['Ativar aprovação', 'Em Configurações, habilite "Requer aprovação"'],
              ['Usuário se cadastra', 'O novo cadastro entra como pendente'],
              ['Admin revisa', 'Na Visão Geral aparecem os usuários aguardando'],
              ['Aprovar ou bloquear', 'Decida o acesso de cada um'],
            ].map(([t, d], i) => (
              <li key={i} className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-medium">{i + 1}</span>
                <span className="text-muted-foreground"><strong className="text-foreground">{t}:</strong> {d}</span>
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>
    </div>
  )
}

/* ---------- Personalização ---------- */
function CustomizationSection() {
  return (
    <div className="flex flex-col gap-6">
      <SectionHeader
        icon={Palette}
        title="Personalização"
        subtitle="Aparência do painel e do portal captivo"
      />

      <Card>
        <CardHeader><CardTitle className="text-lg">Duas aparências independentes</CardTitle></CardHeader>
        <CardContent className="text-sm text-muted-foreground leading-relaxed flex flex-col gap-3">
          <p>
            O sistema tem <strong className="text-foreground">duas telas de login distintas</strong>, com aparências
            configuradas separadamente:
          </p>
          <ul className="flex flex-col gap-2 list-disc pl-5">
            <li>
              <strong className="text-foreground">Painel administrativo</strong> (onde o admin entra): usa o
              <strong className="text-foreground"> Esquema de Cores</strong> escolhido abaixo.
            </li>
            <li>
              <strong className="text-foreground">Portal captivo</strong> (o que o visitante vê no WiFi): usa a
              <strong className="text-foreground"> Aparência do Portal</strong> (logo, imagem/cor de fundo e cor primária).
            </li>
          </ul>
          <div className="rounded-lg border border-blue-500/30 bg-blue-500/10 p-3 text-blue-300">
            As duas são independentes de propósito: o portal do visitante costuma ter a identidade da marca,
            enquanto o painel segue o tema interno da equipe.
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-lg">Esquema de Cores do Painel</CardTitle></CardHeader>
        <CardContent className="text-sm text-muted-foreground leading-relaxed flex flex-col gap-4">
          <p>
            Em <strong className="text-foreground">Configurações &gt; Esquema de Cores do Painel</strong> você escolhe
            um tema fechado (sem precisar definir cores individuais). A prévia é aplicada na hora; clique em
            <strong className="text-foreground"> Salvar Configurações</strong> para persistir. Vale para o painel e
            para a tela de login do admin. O botão sol/lua continua controlando o modo claro/escuro.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {COLOR_SCHEMES.map((scheme) => (
              <div key={scheme.id} className="flex items-center gap-3 rounded-lg border border-border/50 p-3">
                <div className="flex shrink-0 gap-1">
                  <span className="h-6 w-6 rounded-full border border-border/50" style={{ backgroundColor: scheme.swatches.primary }} />
                  <span className="h-6 w-6 rounded-full border border-border/50" style={{ backgroundColor: scheme.swatches.accent }} />
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-foreground">{scheme.label}</p>
                  <p className="text-xs text-muted-foreground">{scheme.description}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-lg">Aparência do Portal Captivo</CardTitle></CardHeader>
        <CardContent className="flex flex-col gap-3">
          <p className="text-sm text-muted-foreground leading-relaxed">
            Ainda em <strong className="text-foreground">Configurações</strong>, personalize o que o visitante vê ao
            conectar. Esses campos <strong className="text-foreground">não</strong> usam o esquema de cores do painel.
          </p>
          <Table
            head={['Campo', 'Função']}
            rows={[
              ['Título do Portal', 'Texto exibido no topo da tela de login do visitante'],
              ['Logo', 'Imagem da marca mostrada no portal (upload ou URL)'],
              ['Imagem de Fundo', 'Fundo da tela de login; se preenchida, tem prioridade sobre a cor'],
              ['Cor de Fundo', 'Cor sólida usada quando não há imagem de fundo'],
              ['Cor Primária', 'Cor dos botões e destaques do portal'],
              ['Termos de Uso', 'Texto de termos exibido ao visitante antes do acesso'],
            ]}
          />
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-amber-300 text-sm">
            Sem imagem e sem cor de fundo selecionada, o portal usa um <strong className="text-amber-200">gradiente padrão</strong>.
            Use o botão <strong className="text-amber-200">Usar padrão</strong> para limpar a cor escolhida.
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

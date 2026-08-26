'use client'

import { Printer, ArrowLeft, Router, Wifi, ShieldCheck, ListChecks, Gauge, Stethoscope, AlertTriangle } from 'lucide-react'
import Link from 'next/link'

const DOMAIN = 'portal.centernet.inf.br'

const toc = [
  { id: 'visao-geral', label: 'Visão Geral' },
  { id: 'pre-requisitos', label: 'Pré-requisitos' },
  { id: 'campos-painel', label: 'Campos no painel' },
  { id: 'passo-a-passo', label: 'Passo a passo' },
  { id: 'guest-hotspot', label: 'Guest Hotspot na UniFi' },
  { id: 'vantagens', label: 'Vantagens da API ativa' },
  { id: 'diagnostico', label: 'Diagnóstico de MAC' },
  { id: 'problemas', label: 'Solução de problemas' },
]

const camposPainel: [string, string, string][] = [
  ['URL do Controller', 'https://192.168.1.1', 'IP local ou domínio do Cloud Key / UDM / UDR'],
  ['Usuário', 'admin', 'Conta com permissão de administrador na controladora'],
  ['Senha', '••••••', 'Senha do usuário administrador'],
  ['Site / Dispositivo', 'default', 'Nome do site (geralmente "default")'],
]

const passos: [string, string][] = [
  ['Criar usuário na controladora', 'Crie um admin dedicado (Settings > Admins) para a integração'],
  ['Painel admin > Controladora', 'Selecione "UniFi" (ou "Ambas") como tipo'],
  ['Preencher os dados', 'URL do Controller, usuário, senha e site'],
  ['Testar Conexão', 'Valide as credenciais e selecione o site detectado'],
  ['Configurar Guest Portal na UniFi', 'Em Settings > Guest Hotspot, ative o portal externo e aponte para a URL do sistema'],
  ['Salvar Configuração', 'Confirme para gravar os dados no sistema'],
]

const preRequisitos: [string, string][] = [
  ['Controladora UniFi', 'Cloud Key, UDM, UDM Pro ou UDR com a rede de visitantes ativa'],
  ['Usuário administrador', 'Conta com permissão para autorizar clientes via API'],
  ['Acesso à controladora', 'O sistema precisa alcançar a URL/IP do controller pela rede'],
  ['HTTPS válido', 'O domínio do portal precisa de certificado SSL (a Vercel emite automaticamente)'],
  ['Guest Hotspot', 'Recurso de portal externo habilitado nas configurações da UniFi'],
]

const vantagens = [
  'Desconexão imediata quando o admin encerra a sessão.',
  'Desconexão do dispositivo antigo no login único.',
  'Aplicação de limites de velocidade por usuário.',
  'Listagem de sites e dispositivos diretamente no painel.',
]

const diagnostico: [string, string][] = [
  ['Salve as credenciais', 'Preencha e salve URL, usuário, senha e site do UniFi antes de usar a ferramenta'],
  ['Informe o MAC', 'Digite o endereço MAC do dispositivo de teste (ex: aa:bb:cc:dd:ee:ff)'],
  ['Autorizar MAC', 'O sistema envia a autorização via API por 5 minutos'],
  ['Confira o resultado', 'Um toast confirma o sucesso ou mostra o erro retornado pela controladora'],
]

const problemas: [string, string, string][] = [
  ['Testar Conexão falha', 'URL/IP inacessível ou credenciais erradas', 'Confirmar URL do controller, usuário e senha; verificar rota de rede'],
  ['Cliente não é liberado', 'Guest Hotspot sem portal externo', 'Ativar portal externo apontando para a URL do sistema'],
  ['Erro de certificado', 'HTTPS não configurado', 'Confirmar SSL ativo no domínio da Vercel'],
  ['Site não encontrado na lista', 'Nome do site incorreto', 'Usar "Testar Conexão" e selecionar o site detectado'],
  ['Velocidade não é aplicada', 'Perfil de limite ausente', 'Definir limites por usuário no painel admin'],
]

export default function UnifiDocsPage() {
  return (
    <div className="docs-root min-h-screen bg-neutral-100 text-neutral-900">
      <PrintStyles />

      {/* Top bar */}
      <header className="no-print sticky top-0 z-10 border-b border-neutral-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-6 py-3">
          <Link
            href="/admin"
            className="inline-flex items-center gap-2 text-sm font-medium text-neutral-600 transition-colors hover:text-neutral-900"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar ao painel
          </Link>
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-700"
          >
            <Printer className="h-4 w-4" />
            Imprimir / Salvar PDF
          </button>
        </div>
      </header>

      {/* Document */}
      <main className="mx-auto max-w-3xl px-6 py-10">
        <article className="docs-paper rounded-2xl border border-neutral-200 bg-white p-8 shadow-sm sm:p-12">
          {/* Title block */}
          <div className="flex items-start gap-4 border-b border-neutral-200 pb-6">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-600/10 text-blue-600">
              <Router className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-blue-600">Guia de Configuração</p>
              <h1 className="mt-1 text-3xl font-bold tracking-tight text-balance">Integração UniFi</h1>
              <p className="mt-2 text-sm leading-relaxed text-neutral-500">
                Portal captivo com autorização ativa via API — Ubiquiti Cloud Key, UDM e UDR.
              </p>
            </div>
          </div>

          {/* Meta */}
          <dl className="mt-6 grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
            <div>
              <dt className="text-neutral-400">Domínio do portal</dt>
              <dd className="font-medium">{DOMAIN}</dd>
            </div>
            <div>
              <dt className="text-neutral-400">Método</dt>
              <dd className="font-medium">API de autorização ativa</dd>
            </div>
            <div>
              <dt className="text-neutral-400">Emitido em</dt>
              <dd className="font-medium">
                {new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
              </dd>
            </div>
          </dl>

          {/* TOC */}
          <nav className="mt-8 rounded-xl border border-neutral-200 bg-neutral-50 p-5">
            <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-neutral-500">Conteúdo</p>
            <ol className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
              {toc.map((item, i) => (
                <li key={item.id}>
                  <a href={`#${item.id}`} className="inline-flex items-center gap-2 text-neutral-700 hover:text-blue-600">
                    <span className="text-neutral-400">{String(i + 1).padStart(2, '0')}</span>
                    {item.label}
                  </a>
                </li>
              ))}
            </ol>
          </nav>

          {/* Sections */}
          <Section id="visao-geral" icon={Wifi} title="Visão Geral">
            <p>
              O UniFi usa <strong>API de autorização ativa</strong>. O sistema se conecta à controladora com usuário e
              senha e autoriza ou desautoriza os clientes diretamente, além de aplicar limites de velocidade. Diferente
              da Aruba (que usa RADIUS), aqui o portal comanda a liberação em tempo real.
            </p>
          </Section>

          <Section id="pre-requisitos" icon={ShieldCheck} title="Pré-requisitos">
            <KeyValueTable head={['Requisito', 'Descrição']} rows={preRequisitos} />
          </Section>

          <Section id="campos-painel" icon={ListChecks} title="Campos no painel (aba Controladora)">
            <p>
              Selecione <strong>UniFi</strong> em <strong>Painel Admin &gt; Controladora</strong> e preencha:
            </p>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b border-neutral-200 text-left">
                    <th className="py-2 pr-4 font-semibold">Campo</th>
                    <th className="py-2 pr-4 font-semibold">Exemplo / Valor</th>
                    <th className="py-2 font-semibold">Descrição</th>
                  </tr>
                </thead>
                <tbody>
                  {camposPainel.map(([campo, valor, desc]) => (
                    <tr key={campo} className="border-b border-neutral-100 align-top">
                      <td className="py-2 pr-4 font-medium">{campo}</td>
                      <td className="py-2 pr-4 font-mono text-xs text-neutral-600">{valor}</td>
                      <td className="py-2 text-neutral-600">{desc}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Callout tone="info">
              Use o botão <strong>Testar Conexão</strong> após preencher para validar usuário, senha e listar os sites
              disponíveis antes de salvar.
            </Callout>
          </Section>

          <Section id="passo-a-passo" icon={ListChecks} title="Passo a passo">
            <ol className="flex flex-col gap-4">
              {passos.map(([titulo, desc], i) => (
                <li key={titulo} className="flex gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-600/10 text-xs font-semibold text-blue-600">
                    {i + 1}
                  </span>
                  <span className="text-neutral-700">
                    <strong className="text-neutral-900">{titulo}:</strong> {desc}
                  </span>
                </li>
              ))}
            </ol>
          </Section>

          <Section id="guest-hotspot" icon={Router} title="Guest Hotspot na UniFi">
            <p>
              Em <strong>Settings &gt; Guest Hotspot</strong>, ative o portal e escolha o modo de
              <strong> portal externo</strong>. Aponte a URL para o endereço do sistema:
            </p>
            <pre className="mt-3 overflow-x-auto rounded-lg bg-neutral-900 p-3 text-sm text-neutral-100">https://{DOMAIN}/portal</pre>
            <Callout tone="warn">
              Garanta que a rede de visitantes esteja associada a esse Guest Hotspot e que o domínio do portal esteja
              acessível para os clientes antes da autenticação.
            </Callout>
          </Section>

          <Section id="vantagens" icon={Gauge} title="Vantagens da API ativa">
            <ul className="flex list-disc flex-col gap-2 pl-5 text-neutral-700">
              {vantagens.map((v) => (
                <li key={v}>{v}</li>
              ))}
            </ul>
          </Section>

          <Section id="diagnostico" icon={Stethoscope} title="Diagnóstico: Autorizar MAC de teste">
            <p>
              Na aba <strong>Controladora</strong> existe a ferramenta <strong>Autorizar MAC de teste</strong>. Ela
              valida, de ponta a ponta, se o sistema consegue liberar um dispositivo na controladora sem precisar
              conectar um cliente real na rede.
            </p>
            <ol className="mt-4 flex flex-col gap-4">
              {diagnostico.map(([titulo, desc], i) => (
                <li key={titulo} className="flex gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-600/10 text-xs font-semibold text-blue-600">
                    {i + 1}
                  </span>
                  <span className="text-neutral-700">
                    <strong className="text-neutral-900">{titulo}:</strong> {desc}
                  </span>
                </li>
              ))}
            </ol>
            <Callout tone="info">
              A autorização de teste dura <strong>5 minutos</strong> e serve apenas para diagnóstico. É exclusiva do
              UniFi (a Aruba autoriza via RADIUS, não por API).
            </Callout>
          </Section>

          <Section id="problemas" icon={AlertTriangle} title="Solução de problemas">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b border-neutral-200 text-left">
                    <th className="py-2 pr-4 font-semibold">Sintoma</th>
                    <th className="py-2 pr-4 font-semibold">Causa provável</th>
                    <th className="py-2 font-semibold">Solução</th>
                  </tr>
                </thead>
                <tbody>
                  {problemas.map(([s, c, sol]) => (
                    <tr key={s} className="border-b border-neutral-100 align-top">
                      <td className="py-2 pr-4 font-medium">{s}</td>
                      <td className="py-2 pr-4 text-neutral-600">{c}</td>
                      <td className="py-2 text-neutral-600">{sol}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>

          <footer className="mt-10 border-t border-neutral-200 pt-6 text-xs text-neutral-400">
            Portal WiFi Captive — Guia de Integração UniFi. Documento gerado para {DOMAIN}.
          </footer>
        </article>
      </main>
    </div>
  )
}

function Section({
  id,
  icon: Icon,
  title,
  children,
}: {
  id: string
  icon: typeof Router
  title: string
  children: React.ReactNode
}) {
  return (
    <section id={id} className="mt-10 scroll-mt-20">
      <h2 className="flex items-center gap-2 text-xl font-semibold tracking-tight">
        <Icon className="h-5 w-5 text-blue-600" />
        {title}
      </h2>
      <div className="mt-3 text-sm leading-relaxed text-neutral-700">{children}</div>
    </section>
  )
}

function KeyValueTable({ head, rows }: { head: [string, string]; rows: [string, string][] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-neutral-200 text-left">
            <th className="py-2 pr-4 font-semibold">{head[0]}</th>
            <th className="py-2 font-semibold">{head[1]}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(([k, v]) => (
            <tr key={k} className="border-b border-neutral-100 align-top">
              <td className="py-2 pr-4 font-medium">{k}</td>
              <td className="py-2 text-neutral-600">{v}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function Callout({ tone, children }: { tone: 'info' | 'warn'; children: React.ReactNode }) {
  const styles =
    tone === 'warn'
      ? 'border-amber-300 bg-amber-50 text-amber-900'
      : 'border-blue-300 bg-blue-50 text-blue-900'
  return <div className={`mt-4 rounded-lg border p-3 text-sm ${styles}`}>{children}</div>
}

function PrintStyles() {
  return (
    <style>{`
      @media print {
        .no-print { display: none !important; }
        .docs-root { background: #fff !important; }
        .docs-paper {
          border: none !important;
          box-shadow: none !important;
          border-radius: 0 !important;
          padding: 0 !important;
          max-width: none !important;
        }
        main { padding: 0 !important; }
        a[href^="#"] { color: inherit !important; text-decoration: none; }
        section { break-inside: avoid; }
        pre { background: #f4f4f5 !important; color: #111 !important; border: 1px solid #e4e4e7; }
        @page { margin: 1.5cm; }
      }
    `}</style>
  )
}

'use server'

/**
 * Server Actions — Controladores WiFi
 *
 * Estas actions são o ÚNICO ponto de entrada entre a UI e os controladores.
 * Usam o ControllerService (Facade) que resolve o adapter correto via Factory.
 *
 * A UI NUNCA conversa diretamente com a API de nenhum fabricante.
 */

import { ControllerService, ControllerFactory, UnifiCloudAdapter, ControllerApiError } from '@/lib/controllers'
import type { ControllerType, ControllerConfig, ControllerErrorCode } from '@/lib/controllers'
import { getPortalSettings } from './portal-settings'
import { decryptSecret } from '@/lib/secret-crypto'

// --- Types para a UI ---

interface TestConnectionResponse {
  success: boolean
  message: string
  details?: {
    model?: string
    version?: string
    status?: string
    siteName?: string
    totalSites?: number
    aps?: number
    switches?: number
    gateways?: number
    clientsOnline?: number
    guestsOnline?: number
  }
}

interface FetchSitesResponse {
  success: boolean
  sites: Array<{ id: string; name: string; description?: string }>
  error?: string
}

interface FetchDetailsResponse {
  success: boolean
  error?: string
  info?: {
    siteName: string
    clientCount: number
    guestCount: number
    gateway: {
      name: string
      model: string
      ip: string
      lanIp?: string
      wanIp?: string
      version: string
      uptime: number
      state: string
      mac: string
    } | null
    wan?: { status: string; ip?: string }
    wlan?: { status: string; numAp?: number; numGuest?: number }
    devices: Array<{
      name: string
      model: string
      type: string
      ip: string
      mac: string
      version?: string
      state: string
      clients: number
      guests: number
    }>
  }
}

// --- Helpers ---

/**
 * Resolve a senha UniFi local: a fornecida pela UI ou, se vazia (campo mascarado),
 * a armazenada (criptografada) nos settings. Permite testar sem re-digitar.
 */
async function resolveUnifiPassword(provided: string): Promise<string> {
  if (provided) return provided
  const settings = await getPortalSettings()
  return decryptSecret(settings.unifiPassword)
}

function buildUnifiConfig(url: string, username: string, password: string, site: string): ControllerConfig {
  return {
    type: 'unifi',
    baseUrl: url.replace(/\/+$/, ''), // Remove trailing slash
    credentials: {
      username,
      password,
      site: site || 'default',
    },
  }
}

function getSpecificErrorMessage(error: unknown, controllerType: string): string {
  const isCloud = controllerType.includes('Cloud')

  // Caminho preferido: erro tipado com `code` normalizado na origem (adapter Cloud).
  if (error instanceof ControllerApiError) {
    const trace = error.traceId ? ` (traceId: ${error.traceId})` : ''
    switch (error.code) {
      case 'TIMEOUT':
        return `Tempo de conexão esgotado. O ${controllerType} não respondeu em 10s — verifique se o console está online e conectado à internet.${trace}`
      case 'NETWORK':
        return `Não foi possível alcançar o ${controllerType}. Verifique a conexão de rede/DNS do servidor do portal.${trace}`
      case 'UNAUTHORIZED':
        return isCloud
          ? `API Key inválida ou expirada. Gere uma nova em unifi.ui.com → Settings → API e cole no painel.${trace}`
          : `Credenciais inválidas. Verifique usuário e senha do ${controllerType}.`
      case 'NOT_OWNER':
        return `Este console pertence a outra conta. A API Key precisa ser gerada pela conta PROPRIETÁRIA (owner) do console em unifi.ui.com → Settings → API — contas convidadas/admins não têm acesso ao Connector Proxy.${trace}`
      case 'DEVICE_OFFLINE':
        return `O console selecionado está offline (ou é um registro duplicado). Selecione o console online correto e confirme que o UDM/console está conectado à internet.${trace}`
      case 'FORBIDDEN':
        return isCloud
          ? `Acesso negado. A API Key não tem permissão para este recurso. Verifique se ela foi gerada com acesso de administrador em unifi.ui.com → Settings → API.${trace}`
          : `Acesso negado. O usuário não tem permissão suficiente no ${controllerType}. Use uma conta com perfil Admin.`
      case 'NOT_FOUND':
        return isCloud
          ? `Recurso não encontrado no UniFi Cloud. Verifique se o console e o site selecionados ainda existem na sua conta.${trace}`
          : `Endpoint não encontrado. A URL do ${controllerType} pode estar incorreta.`
      case 'RATE_LIMITED':
        return `Muitas requisições ao ${controllerType}. Aguarde alguns segundos e tente novamente.${trace}`
      case 'SERVER_ERROR':
        return `Serviço ${controllerType} indisponível (erro no servidor da Ubiquiti). Aguarde alguns minutos e tente novamente.${trace}`
      case 'BAD_RESPONSE':
        return `Resposta inesperada do ${controllerType}. Tente novamente; se persistir, contate o suporte.${trace}`
      default:
        return `Falha na comunicação com ${controllerType}: ${error.message}${trace}`
    }
  }

  // Fallback: erros não-tipados (ex.: adapter UniFi local, que lança Error simples).
  const message = error instanceof Error ? error.message : String(error)

  // Erros de rede / DNS
  if (message.includes('ENOTFOUND') || message.includes('getaddrinfo')) {
    return `Endereço não encontrado. Verifique se a URL do ${controllerType} está correta e acessível pela rede.`
  }
  if (message.includes('ECONNREFUSED')) {
    return `Conexão recusada. O controlador ${controllerType} não está respondendo neste endereço/porta. Verifique se está ligado e acessível.`
  }
  if (message.includes('ETIMEDOUT') || message.includes('timeout') || message.includes('ETIME')) {
    return `Tempo de conexão esgotado. O controlador ${controllerType} não respondeu. Verifique se o endereço está correto e se há bloqueio de firewall.`
  }
  if (message.includes('ECONNRESET')) {
    return `Conexão interrompida pelo controlador. Verifique se a porta está correta e se o serviço HTTPS está ativo.`
  }
  if (message.includes('CERT') || message.includes('certificate') || message.includes('SSL')) {
    return `Erro de certificado SSL. O controlador usa HTTPS com certificado auto-assinado — isso é normal e já é tratado automaticamente.`
  }

  // UniFi Cloud — casos específicos do Connector Proxy (checar antes do 403/404 genérico)
  if (isCloud && (message.includes('not the owner') || message.includes('owner of this host'))) {
    return `Este console pertence a outra conta. A API Key precisa ser gerada pela conta PROPRIETÁRIA (owner) do console em unifi.ui.com → Settings → API — contas convidadas/admins não têm acesso ao Connector Proxy.`
  }
  if (isCloud && message.includes('device_offline')) {
    return `O console selecionado está offline (ou é um registro duplicado). Selecione o console online correto e confirme que o UDM/console está conectado à internet.`
  }

  // Erros de autenticação
  if (message.includes('401') || message.includes('Login failed')) {
    if (isCloud) {
      return `API Key inválida ou expirada. Gere uma nova em unifi.ui.com → Settings → API e cole no painel.`
    }
    return `Credenciais inválidas. Verifique o usuário e senha do ${controllerType}. Certifique-se de que o usuário tem permissão de administrador.`
  }
  if (message.includes('403')) {
    if (isCloud) {
      return `Acesso negado. A API Key não tem permissão para este recurso. Verifique se ela foi gerada com acesso de administrador em unifi.ui.com → Settings → API.`
    }
    return `Acesso negado. O usuário não tem permissão suficiente no ${controllerType}. Use uma conta com perfil Admin.`
  }

  // Erros de endpoint
  if (message.includes('404')) {
    if (isCloud) {
      return `Recurso não encontrado no UniFi Cloud. Verifique se o console e o site selecionados ainda existem na sua conta.`
    }
    return `Endpoint não encontrado. A URL do ${controllerType} pode estar incorreta. Tente usar o formato: https://IP-DO-CONTROLLER`
  }
  if (message.includes('502') || message.includes('503')) {
    return `Serviço indisponível. O ${controllerType} está iniciando ou em manutenção. Aguarde alguns minutos e tente novamente.`
  }

  // Erro genérico — mas NUNCA apenas "Erro"
  if (message.includes('Not implemented')) {
    return `Funcionalidade em implementação para ${controllerType}.`
  }

  return `Falha na comunicação com ${controllerType}: ${message}`
}

/**
 * Traduz um AuthorizeGuestResult falho em mensagem de UI, preservando o `errorCode`
 * normalizado (em vez de re-embrulhar `result.error` num Error, o que perderia o code).
 */
function messageFromAuthResult(
  result: { error?: string; errorCode?: string; traceId?: string },
  controllerType: string
): string {
  if (result.errorCode) {
    const synthetic = new ControllerApiError('unifi-cloud', result.error || 'Falha na autorização', {
      code: result.errorCode as ControllerErrorCode,
      endpoint: '',
      api: 'integration-proxy',
      traceId: result.traceId,
    })
    return getSpecificErrorMessage(synthetic, controllerType)
  }
  return getSpecificErrorMessage(new Error(result.error || 'Falha na autorização'), controllerType)
}

// --- Actions ---

/**
 * Testa a conexão com o controlador UniFi.
 * Retorna informações detalhadas: modelo, versão, APs, switches, clientes.
 *
 * Mensagens de erro são SEMPRE específicas sobre o motivo da falha.
 */
export async function testUnifiConnectionV2(
  url: string,
  username: string,
  password: string,
  site: string
): Promise<TestConnectionResponse> {
  password = await resolveUnifiPassword(password)
  if (!url || !username || !password) {
    return {
      success: false,
      message: 'Preencha URL, usuário e senha do controlador UniFi.',
    }
  }

  const config = buildUnifiConfig(url, username, password, site)

  try {
    // 1. Testar conexão básica (login + sites)
    const testResult = await ControllerService.testConnection(
      {
        controllerType: 'unifi',
        unifiEnabled: true,
        unifiControllerUrl: url,
        unifiUsername: username,
        unifiPassword: password,
        unifiSite: site,
      },
      'unifi'
    )

    if (!testResult.success) {
      return {
        success: false,
        message: getSpecificErrorMessage(new Error(testResult.message), 'UniFi'),
      }
    }

    // 2. Buscar dispositivos e clientes para informações detalhadas
    const adapter = ControllerFactory.create('unifi')
    const [devices, clients] = await Promise.all([
      adapter.getDevices(config),
      adapter.getConnectedClients(config),
    ])

    const aps = devices.filter(d => d.type === 'ap').length
    const switches = devices.filter(d => d.type === 'switch').length
    const gateways = devices.filter(d => d.type === 'gateway').length
    const gatewayDevice = devices.find(d => d.type === 'gateway')
    const guestsOnline = clients.filter(c => c.isGuest).length

    return {
      success: true,
      message: 'Conexão estabelecida com sucesso!',
      details: {
        model: gatewayDevice?.model || 'UniFi Controller',
        version: gatewayDevice?.version || (testResult.details?.version as string),
        status: gatewayDevice?.state || 'online',
        siteName: testResult.details?.siteName as string,
        totalSites: testResult.details?.totalSites as number,
        aps,
        switches,
        gateways,
        clientsOnline: clients.length,
        guestsOnline,
      },
    }
  } catch (error) {
    return {
      success: false,
      message: getSpecificErrorMessage(error, 'UniFi'),
    }
  }
}

/**
 * Busca os sites disponíveis no controlador UniFi.
 */
export async function fetchUnifiSitesV2(
  url: string,
  username: string,
  password: string
): Promise<FetchSitesResponse> {
  password = await resolveUnifiPassword(password)
  if (!url || !username || !password) {
    return {
      success: false,
      sites: [],
      error: 'Preencha URL, usuário e senha primeiro.',
    }
  }

  const config = buildUnifiConfig(url, username, password, 'default')

  try {
    const adapter = ControllerFactory.create('unifi')
    const sites = await adapter.getSites(config)

    if (sites.length === 0) {
      return {
        success: false,
        sites: [],
        error: 'Nenhum site encontrado. Verifique se o usuário tem acesso a pelo menos um site.',
      }
    }

    return {
      success: true,
      sites: sites.map(s => ({
        id: s.id,
        name: s.name,
        description: s.description,
      })),
    }
  } catch (error) {
    return {
      success: false,
      sites: [],
      error: getSpecificErrorMessage(error, 'UniFi'),
    }
  }
}

/**
 * Busca informações detalhadas de um site (gateway, devices, clients).
 */
export async function fetchUnifiDetailsV2(
  url: string,
  username: string,
  password: string,
  site: string
): Promise<FetchDetailsResponse> {
  password = await resolveUnifiPassword(password)
  if (!url || !username || !password || !site) {
    return {
      success: false,
      error: 'Preencha todos os campos e selecione um site.',
    }
  }

  const config = buildUnifiConfig(url, username, password, site)

  try {
    const adapter = ControllerFactory.create('unifi')

    const [devices, clients, sites] = await Promise.all([
      adapter.getDevices(config),
      adapter.getConnectedClients(config),
      adapter.getSites(config),
    ])

    const currentSite = sites.find(s => s.id === site)
    const gatewayDevice = devices.find(d => d.type === 'gateway')
    const guestsOnline = clients.filter(c => c.isGuest).length

    return {
      success: true,
      info: {
        siteName: currentSite?.name || site,
        clientCount: clients.length,
        guestCount: guestsOnline,
        gateway: gatewayDevice ? {
          name: gatewayDevice.name,
          model: gatewayDevice.model,
          ip: gatewayDevice.ip,
          version: gatewayDevice.version || '',
          uptime: 0, // TODO: add uptime to NetworkDevice type
          state: gatewayDevice.state,
          mac: gatewayDevice.mac,
        } : null,
        devices: devices.map(d => ({
          name: d.name,
          model: d.model,
          type: d.type,
          ip: d.ip,
          mac: d.mac,
          version: d.version,
          state: d.state,
          clients: d.clientCount || 0,
          guests: d.guestCount || 0,
        })),
      },
    }
  } catch (error) {
    return {
      success: false,
      error: getSpecificErrorMessage(error, 'UniFi'),
    }
  }
}

interface AuthorizeTestMacResponse {
  success: boolean
  message: string
}

/**
 * Ferramenta de diagnóstico: autoriza um MAC de teste no controlador UniFi.
 *
 * Executa uma autorização REAL (authorize-guest) para validar de ponta a ponta
 * que as credenciais têm permissão de escrita e que o fluxo de liberação funciona.
 * Usada apenas para UniFi (Aruba usa redirect/RADIUS e não autoriza MAC por API).
 */
export async function authorizeTestMac(
  url: string,
  username: string,
  password: string,
  site: string,
  macAddress: string,
  sessionMinutes = 5
): Promise<AuthorizeTestMacResponse> {
  password = await resolveUnifiPassword(password)
  if (!url || !username || !password) {
    return { success: false, message: 'Preencha URL, usuário e senha do controlador UniFi.' }
  }

  const normalizedMac = macAddress.trim().toLowerCase().replace(/-/g, ':')
  const macRegex = /^([0-9a-f]{2}:){5}[0-9a-f]{2}$/
  if (!macRegex.test(normalizedMac)) {
    return {
      success: false,
      message: 'MAC inválido. Use o formato aa:bb:cc:dd:ee:ff (12 dígitos hexadecimais).',
    }
  }

  try {
    const result = await ControllerService.authorizeGuest(
      {
        controllerType: 'unifi',
        unifiEnabled: true,
        unifiControllerUrl: url,
        unifiUsername: username,
        unifiPassword: password,
        unifiSite: site || 'default',
      },
      { macAddress: normalizedMac, sessionMinutes },
      'unifi'
    )

    if (!result.success) {
      return {
        success: false,
        message: getSpecificErrorMessage(new Error(result.error || 'Falha na autorização'), 'UniFi'),
      }
    }

    return {
      success: true,
      message: `MAC ${normalizedMac} autorizado por ${sessionMinutes} min. A liberação está funcionando corretamente.`,
    }
  } catch (error) {
    return {
      success: false,
      message: getSpecificErrorMessage(error, 'UniFi'),
    }
  }
}

// ============================================================================
// UNIFI CLOUD (Site Manager API + Connector Proxy)
// ============================================================================

/**
 * Resolve a API key a usar: a fornecida pela UI (recém-digitada) ou, se vazia,
 * a armazenada (criptografada) nos settings. Permite testar sem re-digitar.
 */
async function resolveCloudApiKey(provided?: string): Promise<string> {
  if (provided) return provided
  const settings = await getPortalSettings()
  return decryptSecret(settings.unifiApiKey)
}

interface CloudConsolesResponse {
  success: boolean
  consoles: Array<{ id: string; name: string; ip?: string; version?: string }>
  error?: string
}

/**
 * Testa a API key e lista os consoles da conta (GET /v1/hosts).
 */
export async function fetchUnifiCloudConsoles(apiKey?: string): Promise<CloudConsolesResponse> {
  const key = await resolveCloudApiKey(apiKey)
  if (!key) {
    return { success: false, consoles: [], error: 'Informe a API key do UniFi (unifi.ui.com → Settings → API).' }
  }

  try {
    const consoles = await UnifiCloudAdapter.listConsoles(key)
    if (consoles.length === 0) {
      return { success: false, consoles: [], error: 'Nenhum console UniFi OS encontrado nesta conta.' }
    }
    return { success: true, consoles }
  } catch (error) {
    return { success: false, consoles: [], error: getSpecificErrorMessage(error, 'UniFi Cloud') }
  }
}

interface CloudSitesResponse {
  success: boolean
  sites: Array<{ id: string; name: string; description?: string }>
  error?: string
}

/**
 * Lista os sites de um console (via Connector Proxy).
 */
export async function fetchUnifiCloudSites(apiKey: string | undefined, consoleId: string): Promise<CloudSitesResponse> {
  const key = await resolveCloudApiKey(apiKey)
  if (!key || !consoleId) {
    return { success: false, sites: [], error: 'Informe a API key e selecione um console primeiro.' }
  }

  try {
    const sites = await UnifiCloudAdapter.listSitesForConsole(key, consoleId)
    if (sites.length === 0) {
      return { success: false, sites: [], error: 'Nenhum site encontrado neste console.' }
    }
    return { success: true, sites: sites.map((s) => ({ id: s.id, name: s.name, description: s.description })) }
  } catch (error) {
    return { success: false, sites: [], error: getSpecificErrorMessage(error, 'UniFi Cloud') }
  }
}

/**
 * Diagnóstico ponta-a-ponta: autoriza um MAC de teste via UniFi Cloud.
 */
export async function authorizeTestMacCloud(
  apiKey: string | undefined,
  consoleId: string,
  siteId: string,
  macAddress: string,
  sessionMinutes = 5
): Promise<AuthorizeTestMacResponse> {
  const key = await resolveCloudApiKey(apiKey)
  if (!key || !consoleId || !siteId) {
    return { success: false, message: 'Informe API key, console e site.' }
  }

  const normalizedMac = macAddress.trim().toLowerCase().replace(/-/g, ':')
  const macRegex = /^([0-9a-f]{2}:){5}[0-9a-f]{2}$/
  if (!macRegex.test(normalizedMac)) {
    return { success: false, message: 'MAC inválido. Use o formato aa:bb:cc:dd:ee:ff.' }
  }

  const config: ControllerConfig = {
    type: 'unifi-cloud',
    baseUrl: 'https://api.ui.com',
    credentials: { apiKey: key, site: siteId },
    options: { consoleId },
  }

  try {
    const adapter = ControllerFactory.create('unifi-cloud')
    const result = await adapter.authorizeGuest(config, { macAddress: normalizedMac, sessionMinutes })
    if (!result.success) {
      return { success: false, message: messageFromAuthResult(result, 'UniFi Cloud') }
    }
    return { success: true, message: `MAC ${normalizedMac} autorizado por ${sessionMinutes} min via UniFi Cloud.` }
  } catch (error) {
    return { success: false, message: getSpecificErrorMessage(error, 'UniFi Cloud') }
  }
}

/**
 * Retorna os tipos de controller suportados pelo sistema.
 */
export async function getSupportedControllerTypes(): Promise<ControllerType[]> {
  return ControllerFactory.getSupportedTypes()
}

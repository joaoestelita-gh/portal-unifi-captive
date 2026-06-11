// UniFi Controller API Client
// Compatible with Cloud Key Gen2+ and UniFi OS

interface UnifiConfig {
  baseUrl: string
  username: string
  password: string
  site: string
}

interface UnifiSite {
  _id: string
  name: string
  desc: string
  role?: string
  attr_hidden_id?: string
  attr_no_delete?: boolean
}

interface UnifiDevice {
  _id: string
  mac: string
  model: string
  model_in_lts?: boolean
  model_in_eol?: boolean
  type: string
  name?: string
  ip: string
  version: string
  adopted: boolean
  state: number
  uptime: number
  last_seen: number
  connected_at?: number
  provisioned_at?: number
  lan_ip?: string
  wan_ip?: string
  wan2_ip?: string
  gateway_mac?: string
  satisfaction?: number
  num_sta?: number
  guest_num_sta?: number
  user_num_sta?: number
  upgradable?: boolean
  displayable_version?: string
}

interface UnifiSiteHealth {
  subsystem: string
  status: string
  num_user?: number
  num_guest?: number
  num_iot?: number
  tx_bytes_r?: number
  rx_bytes_r?: number
  lan_ip?: string
  wan_ip?: string
  gateways?: string[]
  gw_mac?: string
  gw_name?: string
  gw_version?: string
  uptime?: number
  num_ap?: number
  num_adopted?: number
  num_pending?: number
  num_sw?: number
  num_gw?: number
}

interface UnifiClient {
  mac: string
  ip?: string
  hostname?: string
  name?: string
  authorized: boolean
  is_guest: boolean
  first_seen?: number
  last_seen?: number
  uptime?: number
  tx_bytes?: number
  rx_bytes?: number
}

class UnifiController {
  private config: UnifiConfig
  private cookies: string | null = null

  constructor(config: UnifiConfig) {
    this.config = config
  }

  private async login(): Promise<void> {
    const loginUrl = `${this.config.baseUrl}/api/auth/login`
    
    const response = await fetch(loginUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: this.config.username,
        password: this.config.password,
      }),
      // @ts-expect-error - Node.js specific option
      rejectUnauthorized: false,
    })

    if (!response.ok) {
      throw new Error(`UniFi login failed: ${response.status}`)
    }

    const setCookie = response.headers.get('set-cookie')
    if (setCookie) {
      this.cookies = setCookie.split(';')[0]
    }
  }

  private async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    if (!this.cookies) {
      await this.login()
    }

    const url = `${this.config.baseUrl}/proxy/network/api/s/${this.config.site}${endpoint}`
    
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Cookie': this.cookies || '',
        ...options?.headers,
      },
      // @ts-expect-error - Node.js specific option
      rejectUnauthorized: false,
    })

    if (response.status === 401) {
      this.cookies = null
      await this.login()
      return this.request<T>(endpoint, options)
    }

    if (!response.ok) {
      throw new Error(`UniFi API error: ${response.status}`)
    }

    const data = await response.json()
    return data.data as T
  }

  async authorizeGuest(
    mac: string,
    minutes: number,
    up?: number, // Kbps
    down?: number, // Kbps
    megabytes?: number
  ): Promise<void> {
    await this.request('/cmd/stamgr', {
      method: 'POST',
      body: JSON.stringify({
        cmd: 'authorize-guest',
        mac: mac.toLowerCase(),
        minutes,
        up,
        down,
        bytes: megabytes ? megabytes * 1024 * 1024 : undefined,
      }),
    })
  }

  async unauthorizeGuest(mac: string): Promise<void> {
    await this.request('/cmd/stamgr', {
      method: 'POST',
      body: JSON.stringify({
        cmd: 'unauthorize-guest',
        mac: mac.toLowerCase(),
      }),
    })
  }

  async kickClient(mac: string): Promise<void> {
    await this.request('/cmd/stamgr', {
      method: 'POST',
      body: JSON.stringify({
        cmd: 'kick-sta',
        mac: mac.toLowerCase(),
      }),
    })
  }

  async getActiveClients(): Promise<UnifiClient[]> {
    return this.request<UnifiClient[]>('/stat/sta')
  }

  async getGuestClients(): Promise<UnifiClient[]> {
    const clients = await this.getActiveClients()
    return clients.filter(client => client.is_guest)
  }

  // List all sites available on this controller
  async getSites(): Promise<UnifiSite[]> {
    if (!this.cookies) {
      await this.login()
    }

    const url = `${this.config.baseUrl}/proxy/network/api/self/sites`
    
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        'Cookie': this.cookies || '',
      },
      // @ts-expect-error - Node.js specific option
      rejectUnauthorized: false,
    })

    if (response.status === 401) {
      this.cookies = null
      await this.login()
      return this.getSites()
    }

    if (!response.ok) {
      throw new Error(`UniFi API error: ${response.status}`)
    }

    const data = await response.json()
    return data.data as UnifiSite[]
  }

  // Get site health and status information
  async getSiteHealth(): Promise<UnifiSiteHealth[]> {
    return this.request<UnifiSiteHealth[]>('/stat/health')
  }

  // Get all devices (APs, Switches, Gateways)
  async getDevices(): Promise<UnifiDevice[]> {
    return this.request<UnifiDevice[]>('/stat/device')
  }

  // Get site info summary
  async getSiteInfo(): Promise<{
    siteName: string
    health: UnifiSiteHealth[]
    devices: UnifiDevice[]
    clientCount: number
    guestCount: number
  }> {
    const [sites, health, devices, clients] = await Promise.all([
      this.getSites(),
      this.getSiteHealth(),
      this.getDevices(),
      this.getActiveClients(),
    ])

    const currentSite = sites.find(s => s.name === this.config.site)
    const guestClients = clients.filter(c => c.is_guest)

    return {
      siteName: currentSite?.desc || currentSite?.name || this.config.site,
      health,
      devices,
      clientCount: clients.length,
      guestCount: guestClients.length,
    }
  }
}

// Singleton instance
let unifiClient: UnifiController | null = null

interface GetUnifiClientOptions {
  controllerUrl?: string
  username?: string
  password?: string
  site?: string
}

export function getUnifiClient(options?: GetUnifiClientOptions): UnifiController {
  // If options provided, create new client with those settings
  if (options?.controllerUrl && options?.username && options?.password) {
    return new UnifiController({
      baseUrl: options.controllerUrl,
      username: options.username,
      password: options.password,
      site: options.site || 'default',
    })
  }
  
  // Otherwise use singleton with env vars
  if (!unifiClient) {
    const config: UnifiConfig = {
      baseUrl: process.env.UNIFI_CONTROLLER_URL || 'https://192.168.1.1',
      username: process.env.UNIFI_USERNAME || 'admin',
      password: process.env.UNIFI_PASSWORD || '',
      site: process.env.UNIFI_SITE || 'default',
    }
    unifiClient = new UnifiController(config)
  }
  return unifiClient
}

export type { UnifiClient, UnifiConfig, UnifiSite, UnifiDevice, UnifiSiteHealth }

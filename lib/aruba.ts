// HP Aruba Instant On / Central API Client

interface ArubaConfig {
  baseUrl: string
  clientId?: string
  clientSecret?: string
}

// Parameters sent by the Aruba Instant On AP in the captive-portal redirect.
// `switchip` is the captive-portal domain we MUST authenticate against
// (e.g. "securelogin.arubanetworks.com").
interface ArubaRedirectParams {
  mac?: string
  ip?: string
  essid?: string
  apname?: string
  apmac?: string
  vcname?: string
  switchip?: string
  url?: string
}

class ArubaController {
  private config: ArubaConfig

  constructor(config: ArubaConfig) {
    this.config = config
  }

  // HP Aruba Instant On uses a different approach for captive portal
  // The authorization happens via redirect back to the Aruba gateway
  // with specific parameters indicating successful authentication

  async authorizeGuest(
    mac: string,
    minutes: number,
    clientIp?: string,
    arubaParams?: ArubaRedirectParams
  ): Promise<{ redirectUrl: string }> {
    // Aruba Instant On uses an External Captive Portal (ECP).
    // After the splash page authenticates the user, the browser MUST be sent
    // back to the captive-portal domain the AP provided in the `switchip`
    // parameter (e.g. "securelogin.arubanetworks.com"). Redirecting to the
    // admin-configured controller URL makes the AP answer
    // "404 captive portal not find ecp config", so `switchip` takes priority.

    const formattedMac = (arubaParams?.mac || mac || '').toLowerCase()

    // Determine the authentication host. Prefer the switchip domain sent by
    // the AP; fall back to the configured base URL only when it is missing.
    let authHost = arubaParams?.switchip?.trim()

    let authUrl: URL
    if (authHost) {
      // switchip may come as a bare host or already include a scheme/path.
      if (!/^https?:\/\//i.test(authHost)) {
        authHost = `https://${authHost}`
      }
      const base = new URL(authHost)
      // Aruba Instant On expects the login CGI endpoint on the portal domain.
      if (base.pathname === '/' || base.pathname === '') {
        base.pathname = '/cgi-bin/login'
      }
      authUrl = base
    } else {
      // Legacy fallback: use the manually configured controller URL.
      authUrl = new URL(this.config.baseUrl)
    }

    // Authentication parameters expected by the Aruba ECP login endpoint.
    authUrl.searchParams.set('cmd', 'authenticate')
    authUrl.searchParams.set('mac', formattedMac)
    authUrl.searchParams.set('duration', String(minutes))

    const ip = arubaParams?.ip || clientIp
    if (ip) authUrl.searchParams.set('ip', ip)
    if (arubaParams?.essid) authUrl.searchParams.set('essid', arubaParams.essid)
    if (arubaParams?.apname) authUrl.searchParams.set('apname', arubaParams.apname)
    if (arubaParams?.apmac) authUrl.searchParams.set('apmac', arubaParams.apmac)
    if (arubaParams?.vcname) authUrl.searchParams.set('vcname', arubaParams.vcname)

    // Original URL the client tried to reach, so the AP redirects there afterwards.
    if (arubaParams?.url) authUrl.searchParams.set('url', arubaParams.url)

    return {
      redirectUrl: authUrl.toString()
    }
  }

  // For Aruba Central with API access
  async authorizeGuestViaApi(
    mac: string,
    minutes: number,
    speedUp?: number,
    speedDown?: number
  ): Promise<boolean> {
    if (!this.config.clientId || !this.config.clientSecret) {
      console.warn('Aruba API credentials not configured, using redirect method')
      return false
    }

    try {
      // Aruba Central API requires OAuth2 authentication
      const tokenUrl = `${this.config.baseUrl}/oauth2/token`
      
      const tokenResponse = await fetch(tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'client_credentials',
          client_id: this.config.clientId,
          client_secret: this.config.clientSecret,
        }),
      })

      if (!tokenResponse.ok) {
        console.error('Aruba token error:', await tokenResponse.text())
        return false
      }

      const tokenData = await tokenResponse.json()
      const accessToken = tokenData.access_token

      // Authorize the guest MAC
      const authResponse = await fetch(`${this.config.baseUrl}/guest/v1/portals/authorize`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          mac_address: mac.toLowerCase(),
          session_timeout: minutes * 60, // Convert to seconds
          bandwidth_limit_up: speedUp ? speedUp * 1000 : undefined, // Convert Kbps to bps
          bandwidth_limit_down: speedDown ? speedDown * 1000 : undefined,
        }),
      })

      if (!authResponse.ok) {
        console.error('Aruba authorize error:', await authResponse.text())
        return false
      }

      return true
    } catch (error) {
      console.error('Aruba API error:', error)
      return false
    }
  }

  async unauthorizeGuest(mac: string): Promise<boolean> {
    if (!this.config.clientId || !this.config.clientSecret) {
      return false
    }

    try {
      const tokenUrl = `${this.config.baseUrl}/oauth2/token`
      
      const tokenResponse = await fetch(tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'client_credentials',
          client_id: this.config.clientId,
          client_secret: this.config.clientSecret,
        }),
      })

      if (!tokenResponse.ok) return false

      const tokenData = await tokenResponse.json()
      const accessToken = tokenData.access_token

      const response = await fetch(`${this.config.baseUrl}/guest/v1/portals/deauthorize`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          mac_address: mac.toLowerCase(),
        }),
      })

      return response.ok
    } catch (error) {
      console.error('Aruba deauthorize error:', error)
      return false
    }
  }

  // Generate the success redirect URL for Aruba captive portal
  // This is used when Aruba sends users to our portal - after auth,
  // we redirect them back to this URL to complete the process
  getSuccessRedirectUrl(params: {
    switchUrl?: string
    cmd?: string
    mac?: string
    ip?: string
    essid?: string
    apname?: string
    url?: string
  }): string {
    // Aruba Instant On expects redirect back to the switch_url or gateway
    // with success parameters
    
    if (params.switchUrl) {
      const redirectUrl = new URL(params.switchUrl)
      redirectUrl.searchParams.set('login', 'success')
      if (params.mac) redirectUrl.searchParams.set('mac', params.mac)
      return redirectUrl.toString()
    }

    // Fallback: redirect to the original URL the user tried to access
    return params.url || 'http://connectivitycheck.gstatic.com/generate_204'
  }
}

// Factory function to get Aruba client
export function getArubaClient(options: ArubaConfig): ArubaController {
  return new ArubaController(options)
}

export type { ArubaConfig, ArubaRedirectParams }

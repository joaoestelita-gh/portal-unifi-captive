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

// Credentials the Aruba ECP login endpoint expects on the authentication POST.
interface ArubaAuthCredentials {
  user?: string
  password?: string
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
    arubaParams?: ArubaRedirectParams,
    credentials?: ArubaAuthCredentials,
    finalRedirect?: string
  ): Promise<{ redirectUrl: string }> {
    // Aruba Instant On "Guest Portal" External Captive Portal, in
    // "Confirmação do Portal de Convidados" (Guest Portal Acknowledgement)
    // mode, does NOT expose a /cgi-bin/login endpoint. Redirecting the client
    // there is exactly what produces "404 captive portal not find ecp config".
    //
    // In this mode the splash page must instead return the predefined token
    // "Aruba.InstantOn.Acknowledge" in its response body; the AP detects the
    // token and grants internet access.
    // (Ref: Aruba Instant On 2.8 user guide, p.97.)
    //
    // We therefore send the browser to our own acknowledge endpoint, which
    // emits that token and then forwards the user to the final destination.
    const destination = finalRedirect || arubaParams?.url || ''
    const redirectUrl = destination
      ? `/api/aruba/acknowledge?redirect=${encodeURIComponent(destination)}`
      : '/api/aruba/acknowledge'

    return { redirectUrl }
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

export type { ArubaConfig, ArubaRedirectParams, ArubaAuthCredentials }

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const SESSION_COOKIE_NAME = 'session_token'

// Rotas que NÃO precisam de autenticação
const PUBLIC_ROUTES = [
  '/', // Portal captivo (página principal)
  '/portal', // Portal captivo
  '/admin/login', // Login do admin
  '/api/radius', // Endpoint chamado pelo FreeRADIUS
  '/api/file', // Entrega pública de imagens do portal
  '/api/setup', // Setup inicial (tem sua própria proteção interna)
]

// Rotas que exigem CRON_SECRET no header Authorization
const CRON_ROUTES = ['/api/cron']

// Rotas que exigem sessão de admin
const ADMIN_ROUTES = ['/admin', '/api/upload', '/api/debug']

function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(route + '/')
  )
}

function isCronRoute(pathname: string): boolean {
  return CRON_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(route + '/')
  )
}

function isAdminRoute(pathname: string): boolean {
  return ADMIN_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(route + '/')
  )
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Ignorar arquivos estáticos e Next.js internals
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.includes('.') // arquivos estáticos (css, js, imagens, etc.)
  ) {
    return NextResponse.next()
  }

  // Rotas públicas — acesso livre
  if (isPublicRoute(pathname)) {
    return NextResponse.next()
  }

  // Rotas de cron — exigem Bearer token
  if (isCronRoute(pathname)) {
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET

    // Em dev sem CRON_SECRET, permite acesso (mantém compatibilidade)
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    return NextResponse.next()
  }

  // Rotas admin — exigem cookie de sessão
  if (isAdminRoute(pathname)) {
    const sessionToken = request.cookies.get(SESSION_COOKIE_NAME)?.value

    if (!sessionToken) {
      // Se for API, retornar 401
      if (pathname.startsWith('/api/')) {
        return NextResponse.json(
          { error: 'Não autenticado' },
          { status: 401 }
        )
      }
      // Se for página admin, redirecionar para login
      const loginUrl = new URL('/admin/login', request.url)
      return NextResponse.redirect(loginUrl)
    }

    // O cookie existe — deixa passar.
    // A validação completa (sessão expirada, role admin) é feita no server component/action.
    // O middleware apenas garante que requests sem cookie sejam bloqueados cedo.
    return NextResponse.next()
  }

  // Todas as outras rotas — acesso livre
  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}

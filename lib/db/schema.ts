import { pgTable, text, timestamp, boolean, integer, date, index } from 'drizzle-orm/pg-core'

// --- Auth tables -------------------------------------------
export const users = pgTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('emailVerified').notNull().default(false),
  image: text('image'),
  password: text('password'),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
  role: text('role').notNull().default('user'),
})

export const sessions = pgTable('session', {
  id: text('id').primaryKey(),
  expiresAt: timestamp('expiresAt').notNull(),
  token: text('token').notNull().unique(),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
  ipAddress: text('ipAddress'),
  userAgent: text('userAgent'),
  userId: text('userId')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
}, (table) => [
  index('session_userId_idx').on(table.userId),
])

export const account = pgTable('account', {
  id: text('id').primaryKey(),
  accountId: text('accountId').notNull(),
  providerId: text('providerId').notNull(),
  userId: text('userId')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  accessToken: text('accessToken'),
  refreshToken: text('refreshToken'),
  idToken: text('idToken'),
  accessTokenExpiresAt: timestamp('accessTokenExpiresAt'),
  refreshTokenExpiresAt: timestamp('refreshTokenExpiresAt'),
  scope: text('scope'),
  password: text('password'),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
})

export const verification = pgTable('verification', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: timestamp('expiresAt').notNull(),
  createdAt: timestamp('createdAt').defaultNow(),
  updatedAt: timestamp('updatedAt').defaultNow(),
})

// --- WiFi Portal tables ----------------------------------------------------
export const wifiUsers = pgTable('wifi_users', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  phone: text('phone'),
  password: text('password').notNull(),
  status: text('status').notNull().default('pending'), // pending, approved, blocked
  macAddress: text('macAddress'),
  dailyLimitMinutes: integer('dailyLimitMinutes').default(240),
  sessionLimitMinutes: integer('sessionLimitMinutes').default(120),
  speedLimitDown: integer('speedLimitDown').default(10240), // Kbps
  speedLimitUp: integer('speedLimitUp').default(5120), // Kbps
  totalTimeUsedToday: integer('totalTimeUsedToday').default(0),
  lastResetDate: date('lastResetDate').defaultNow(),
  // Dispositivos confiáveis: se trusted=true, o MAC reconecta sem login
  trusted: boolean('trusted').notNull().default(false),
  trustedUntil: timestamp('trustedUntil'), // null = permanente, com data = expira naquele momento
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
}, (table) => [
  index('wifi_users_status_idx').on(table.status),
  index('wifi_users_macAddress_idx').on(table.macAddress),
])

export const wifiSessions = pgTable('wifi_sessions', {
  id: text('id').primaryKey(),
  wifiUserId: text('wifiUserId'),
  macAddress: text('macAddress').notNull(),
  ipAddress: text('ipAddress'),
  apName: text('apName'),            // Nome/MAC do AP que redirecionou
  ssid: text('ssid'),                // Rede WiFi que o cliente conectou
  site: text('site'),                // Site/local do controller
  lgpdAcceptedAt: timestamp('lgpdAcceptedAt'), // Momento do aceite LGPD
  startTime: timestamp('startTime').notNull().defaultNow(),
  expectedEndTime: timestamp('expectedEndTime'),
  endTime: timestamp('endTime'),
  duration: integer('duration').default(0), // minutes
  status: text('status').notNull().default('active'), // active, ended, expired
  endReason: text('endReason'), // manual, expired, new_login
  createdAt: timestamp('createdAt').notNull().defaultNow(),
}, (table) => [
  index('wifi_sessions_mac_status_idx').on(table.macAddress, table.status),
  index('wifi_sessions_status_expectedEnd_idx').on(table.status, table.expectedEndTime),
  index('wifi_sessions_wifiUserId_idx').on(table.wifiUserId),
])

export const wifiVouchers = pgTable('wifi_vouchers', {
  id: text('id').primaryKey(),
  code: text('code').notNull().unique(),
  durationMinutes: integer('durationMinutes').notNull().default(60),
  speedLimitDown: integer('speedLimitDown').default(10240),
  speedLimitUp: integer('speedLimitUp').default(5120),
  maxUses: integer('maxUses').default(1),
  usedCount: integer('usedCount').default(0),
  expiresAt: timestamp('expiresAt'),
  createdBy: text('createdBy').notNull(),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
})

// Short-lived tokens used to authenticate guests via RADIUS.
// When a user/voucher is validated by our portal, we issue a random token and
// send it as user/password in the redirect to the AP. The AP forwards it to
// FreeRADIUS, which validates the token against this table through our REST
// endpoint. This avoids exposing real passwords in the redirect URL.
export const radiusTokens = pgTable('radius_tokens', {
  id: text('id').primaryKey(),
  token: text('token').notNull().unique(),
  macAddress: text('macAddress'),
  wifiUserId: text('wifiUserId'),
  voucherId: text('voucherId'),
  sessionMinutes: integer('sessionMinutes').notNull().default(120),
  speedLimitDown: integer('speedLimitDown'),
  speedLimitUp: integer('speedLimitUp'),
  used: boolean('used').notNull().default(false),
  usedAt: timestamp('usedAt'),
  expiresAt: timestamp('expiresAt').notNull(),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
}, (table) => [
  index('radius_tokens_expiresAt_idx').on(table.expiresAt),
])

// --- WiFi User Devices (multiple MACs per user, max 3) ---
export const wifiUserDevices = pgTable('wifi_user_devices', {
  id: text('id').primaryKey(),
  wifiUserId: text('wifiUserId').notNull(),
  macAddress: text('macAddress').notNull(),
  deviceName: text('deviceName'), // e.g. "Celular", "Notebook", "Tablet"
  trusted: boolean('trusted').notNull().default(false),
  trustedUntil: timestamp('trustedUntil'), // null = permanente
  lastSeen: timestamp('lastSeen').notNull().defaultNow(),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
}, (table) => [
  index('wifi_user_devices_userId_idx').on(table.wifiUserId),
  index('wifi_user_devices_mac_idx').on(table.macAddress),
])

// --- Pre-authorized MACs -------------------------------------------------
// Lista de MACs "pré-autorizados": ao se cadastrar/logar com um desses MACs,
// o usuário é aprovado automaticamente (pula a fila de aprovação manual).
// Cada entrada nasce "pending" (não vinculada) e vira "linked" quando um
// usuário se cadastra/loga com aquele dispositivo.
export const wifiPreauthorizedMacs = pgTable('wifi_preauthorized_macs', {
  id: text('id').primaryKey(),
  macAddress: text('macAddress').notNull().unique(), // normalizado: aa:bb:cc:dd:ee:ff
  label: text('label'),                              // rótulo/observação (ex.: "Notebook Diretoria")
  status: text('status').notNull().default('pending'), // pending (não vinculado) | linked
  linkedUserId: text('linkedUserId'),                // wifiUsers.id quando vinculado
  linkedAt: timestamp('linkedAt'),
  createdBy: text('createdBy'),                       // id do admin que importou
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
}, (table) => [
  index('wifi_preauth_macs_mac_idx').on(table.macAddress),
  index('wifi_preauth_macs_status_idx').on(table.status),
])

export const portalSettings = pgTable('portal_settings', {
  id: text('id').primaryKey().default('default'),
  portalTitle: text('portalTitle').default('WiFi Gratuito'),
  portalSubtitle: text('portalSubtitle').default('Conecte-se à nossa rede'),
  logoUrl: text('logoUrl'),
  backgroundUrl: text('backgroundUrl'),
  backgroundColor: text('backgroundColor'),
  primaryColor: text('primaryColor').default('#3b82f6'),
  secondaryColor: text('secondaryColor').default('#1e40af'),
  // Esquema de cores do painel admin: 'default' | 'grafana' | 'unifi' | 'cloudflare' | 'github' | 'azure'
  colorScheme: text('colorScheme').default('default'),
  termsText: text('termsText'),
  successRedirectUrl: text('successRedirectUrl').default('https://google.com'),
  defaultSessionMinutes: integer('defaultSessionMinutes').default(120),
  defaultDailyMinutes: integer('defaultDailyMinutes').default(240),
  defaultSpeedDown: integer('defaultSpeedDown').default(10240),
  defaultSpeedUp: integer('defaultSpeedUp').default(5120),
  requireApproval: boolean('requireApproval').default(true),
  // Controller Type: 'unifi' | 'unifi-cloud' | 'aruba' | 'none' | 'both'
  controllerType: text('controllerType').default('none'),
  // Enable individual controllers (for 'both' mode)
  unifiEnabled: boolean('unifiEnabled').default(false),
  arubaEnabled: boolean('arubaEnabled').default(false),
  // UniFi Controller Settings (local — login por cookie)
  unifiControllerUrl: text('unifiControllerUrl'),
  unifiUsername: text('unifiUsername'),
  unifiPassword: text('unifiPassword'), // criptografado em repouso (ver lib/secret-crypto)
  unifiSite: text('unifiSite').default('default'),
  // UniFi Cloud (Site Manager API + Connector Proxy — autenticação por X-API-KEY)
  unifiApiKey: text('unifiApiKey'), // criptografado em repouso (ver lib/secret-crypto)
  unifiConsoleId: text('unifiConsoleId'), // hostId do console no Site Manager (api.ui.com/v1/hosts)
  unifiSiteId: text('unifiSiteId'), // id do site na Integration API (distinto de unifiSite "name")
  // HP Aruba Instant On Settings
  arubaControllerUrl: text('arubaControllerUrl'),
  arubaClientId: text('arubaClientId'),
  arubaClientSecret: text('arubaClientSecret'), // criptografado em repouso (ver lib/secret-crypto)
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
})

// --- Logs de chamadas à UniFi Cloud API --------------------
// Persistente (Postgres) para sobreviver a restart e ser compartilhado entre
// réplicas — ao contrário de lib/portal-logs.ts (buffer em memória, por processo).
// Uma linha por chamada ao Site Manager / Connector Proxy (sucesso ou falha).
// NÃO contém credenciais/MAC/IP: a API key vive só no header e nunca é montada
// no endpoint; bodySnippet é truncado (<=300) e gravado apenas em erro.
export const cloudApiLogs = pgTable('cloud_api_logs', {
  id: text('id').primaryKey(),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  api: text('api').notNull(), // 'site-manager' | 'integration-proxy'
  method: text('method').notNull(), // GET/POST/DELETE
  endpoint: text('endpoint').notNull(), // só o path (ids de site/cliente não são segredo)
  consoleId: text('consoleId'), // hostId do console (não é segredo)
  siteId: text('siteId'),
  status: integer('status'), // status HTTP; null em erro de rede/timeout
  ok: boolean('ok').notNull().default(false),
  errorCode: text('errorCode'), // ControllerErrorCode ou null em sucesso
  latencyMs: integer('latencyMs').notNull().default(0),
  traceId: text('traceId'), // traceId da Ubiquiti para escalar suporte
  bodySnippet: text('bodySnippet'), // corpo truncado <=300 chars, só em erro
}, (table) => [
  index('cloud_api_logs_createdAt_idx').on(table.createdAt),
  index('cloud_api_logs_errorCode_idx').on(table.errorCode),
])

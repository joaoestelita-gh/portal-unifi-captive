import { pgTable, text, timestamp, boolean, integer, date } from 'drizzle-orm/pg-core'

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
})

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
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
})

export const wifiSessions = pgTable('wifi_sessions', {
  id: text('id').primaryKey(),
  wifiUserId: text('wifiUserId'),
  macAddress: text('macAddress').notNull(),
  ipAddress: text('ipAddress'),
  startTime: timestamp('startTime').notNull().defaultNow(),
  expectedEndTime: timestamp('expectedEndTime'),
  endTime: timestamp('endTime'),
  duration: integer('duration').default(0), // minutes
  status: text('status').notNull().default('active'), // active, ended, expired
  endReason: text('endReason'), // manual, expired, new_login
  createdAt: timestamp('createdAt').notNull().defaultNow(),
})

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
})

export const portalSettings = pgTable('portal_settings', {
  id: text('id').primaryKey().default('default'),
  portalTitle: text('portalTitle').default('WiFi Gratuito'),
  portalSubtitle: text('portalSubtitle').default('Conecte-se à nossa rede'),
  logoUrl: text('logoUrl'),
  backgroundUrl: text('backgroundUrl'),
  primaryColor: text('primaryColor').default('#3b82f6'),
  secondaryColor: text('secondaryColor').default('#1e40af'),
  termsText: text('termsText'),
  successRedirectUrl: text('successRedirectUrl').default('https://google.com'),
  defaultSessionMinutes: integer('defaultSessionMinutes').default(120),
  defaultDailyMinutes: integer('defaultDailyMinutes').default(240),
  defaultSpeedDown: integer('defaultSpeedDown').default(10240),
  defaultSpeedUp: integer('defaultSpeedUp').default(5120),
  requireApproval: boolean('requireApproval').default(true),
  // Controller Type: 'unifi' | 'aruba' | 'none' | 'both'
  controllerType: text('controllerType').default('none'),
  // Enable individual controllers (for 'both' mode)
  unifiEnabled: boolean('unifiEnabled').default(false),
  arubaEnabled: boolean('arubaEnabled').default(false),
  // UniFi Controller Settings
  unifiControllerUrl: text('unifiControllerUrl'),
  unifiUsername: text('unifiUsername'),
  unifiPassword: text('unifiPassword'),
  unifiSite: text('unifiSite').default('default'),
  // HP Aruba Instant On Settings
  arubaControllerUrl: text('arubaControllerUrl'),
  arubaClientId: text('arubaClientId'),
  arubaClientSecret: text('arubaClientSecret'),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
})

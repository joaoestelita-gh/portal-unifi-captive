CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"accountId" text NOT NULL,
	"providerId" text NOT NULL,
	"userId" text NOT NULL,
	"accessToken" text,
	"refreshToken" text,
	"idToken" text,
	"accessTokenExpiresAt" timestamp,
	"refreshTokenExpiresAt" timestamp,
	"scope" text,
	"password" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "portal_settings" (
	"id" text PRIMARY KEY DEFAULT 'default' NOT NULL,
	"portalTitle" text DEFAULT 'WiFi Gratuito',
	"portalSubtitle" text DEFAULT 'Conecte-se à nossa rede',
	"logoUrl" text,
	"backgroundUrl" text,
	"primaryColor" text DEFAULT '#3b82f6',
	"secondaryColor" text DEFAULT '#1e40af',
	"termsText" text,
	"successRedirectUrl" text DEFAULT 'https://google.com',
	"defaultSessionMinutes" integer DEFAULT 120,
	"defaultDailyMinutes" integer DEFAULT 240,
	"defaultSpeedDown" integer DEFAULT 10240,
	"defaultSpeedUp" integer DEFAULT 5120,
	"requireApproval" boolean DEFAULT true,
	"controllerType" text DEFAULT 'none',
	"unifiEnabled" boolean DEFAULT false,
	"arubaEnabled" boolean DEFAULT false,
	"unifiControllerUrl" text,
	"unifiUsername" text,
	"unifiPassword" text,
	"unifiSite" text DEFAULT 'default',
	"arubaControllerUrl" text,
	"arubaClientId" text,
	"arubaClientSecret" text,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expiresAt" timestamp NOT NULL,
	"token" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"ipAddress" text,
	"userAgent" text,
	"userId" text NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"emailVerified" boolean DEFAULT false NOT NULL,
	"image" text,
	"password" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"role" text DEFAULT 'user' NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expiresAt" timestamp NOT NULL,
	"createdAt" timestamp DEFAULT now(),
	"updatedAt" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "wifi_sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"wifiUserId" text,
	"macAddress" text NOT NULL,
	"ipAddress" text,
	"startTime" timestamp DEFAULT now() NOT NULL,
	"expectedEndTime" timestamp,
	"endTime" timestamp,
	"duration" integer DEFAULT 0,
	"status" text DEFAULT 'active' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "wifi_users" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"phone" text,
	"password" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"macAddress" text,
	"dailyLimitMinutes" integer DEFAULT 240,
	"sessionLimitMinutes" integer DEFAULT 120,
	"speedLimitDown" integer DEFAULT 10240,
	"speedLimitUp" integer DEFAULT 5120,
	"totalTimeUsedToday" integer DEFAULT 0,
	"lastResetDate" date DEFAULT now(),
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "wifi_users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "wifi_vouchers" (
	"id" text PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"durationMinutes" integer DEFAULT 60 NOT NULL,
	"speedLimitDown" integer DEFAULT 10240,
	"speedLimitUp" integer DEFAULT 5120,
	"maxUses" integer DEFAULT 1,
	"usedCount" integer DEFAULT 0,
	"expiresAt" timestamp,
	"createdBy" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "wifi_vouchers_code_unique" UNIQUE("code")
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
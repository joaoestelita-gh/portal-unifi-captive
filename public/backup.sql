-- ============================================
-- Dump SQL do banco (schema public)
-- Gerado em: 2026-06-30T16:37:18.209Z
-- Tabelas: account, portal_access_logs, portal_settings, radius_tokens, session, user, verification, wifi_sessions, wifi_users, wifi_vouchers
-- ============================================

BEGIN;

-- ---------- Tabela: account ----------
DROP TABLE IF EXISTS "account" CASCADE;
CREATE TABLE "account" (
  "id" text NOT NULL,
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
  "updatedAt" timestamp DEFAULT now() NOT NULL,
  PRIMARY KEY ("id")
);

-- Dados de account (1 linha(s))
INSERT INTO "account" ("id", "accountId", "providerId", "userId", "accessToken", "refreshToken", "idToken", "accessTokenExpiresAt", "refreshTokenExpiresAt", "scope", "password", "createdAt", "updatedAt") VALUES ('7D8YfAobV61CMm-LajgN_', 'S4YOqdtghLGckpbGZTWxg', 'credential', 'S4YOqdtghLGckpbGZTWxg', NULL, NULL, NULL, NULL, NULL, NULL, '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9', '2026-06-01T16:28:28.091Z', '2026-06-01T16:28:28.091Z');

-- ---------- Tabela: portal_access_logs ----------
DROP TABLE IF EXISTS "portal_access_logs" CASCADE;
CREATE TABLE "portal_access_logs" (
  "id" text NOT NULL,
  "timestamp" timestamp DEFAULT now() NOT NULL,
  "controller" text NOT NULL,
  "mac" text,
  "ip" text,
  "ssid" text,
  "apName" text,
  "params" text,
  "createdAt" timestamp DEFAULT now() NOT NULL,
  PRIMARY KEY ("id")
);

-- (sem dados em portal_access_logs)

-- ---------- Tabela: portal_settings ----------
DROP TABLE IF EXISTS "portal_settings" CASCADE;
CREATE TABLE "portal_settings" (
  "id" text DEFAULT 'default'::text NOT NULL,
  "portalTitle" text DEFAULT 'WiFi Gratuito'::text,
  "portalSubtitle" text DEFAULT 'Conecte-se à nossa rede'::text,
  "logoUrl" text,
  "backgroundUrl" text,
  "primaryColor" text DEFAULT '#3b82f6'::text,
  "secondaryColor" text DEFAULT '#1e40af'::text,
  "termsText" text,
  "defaultSessionMinutes" integer DEFAULT 120,
  "defaultDailyMinutes" integer DEFAULT 240,
  "defaultSpeedDown" integer DEFAULT 10240,
  "defaultSpeedUp" integer DEFAULT 5120,
  "requireApproval" boolean DEFAULT true,
  "updatedAt" timestamp DEFAULT now() NOT NULL,
  "unifiControllerUrl" text,
  "unifiUsername" text,
  "unifiPassword" text,
  "unifiSite" text DEFAULT 'default'::text,
  "controllerType" text DEFAULT 'none'::text,
  "ciscoWlcUrl" text,
  "ciscoWlcUsername" text,
  "ciscoWlcPassword" text,
  "ciscoWlcVirtualIp" text,
  "arubaControllerUrl" text,
  "arubaClientId" text,
  "arubaClientSecret" text,
  "successRedirectUrl" text DEFAULT 'https://google.com'::text,
  "unifiEnabled" boolean DEFAULT false,
  "arubaEnabled" boolean DEFAULT false,
  "arubaAuthMode" text DEFAULT 'confirmation'::text,
  PRIMARY KEY ("id")
);

-- Dados de portal_settings (1 linha(s))
INSERT INTO "portal_settings" ("id", "portalTitle", "portalSubtitle", "logoUrl", "backgroundUrl", "primaryColor", "secondaryColor", "termsText", "defaultSessionMinutes", "defaultDailyMinutes", "defaultSpeedDown", "defaultSpeedUp", "requireApproval", "updatedAt", "unifiControllerUrl", "unifiUsername", "unifiPassword", "unifiSite", "controllerType", "ciscoWlcUrl", "ciscoWlcUsername", "ciscoWlcPassword", "ciscoWlcVirtualIp", "arubaControllerUrl", "arubaClientId", "arubaClientSecret", "successRedirectUrl", "unifiEnabled", "arubaEnabled", "arubaAuthMode") VALUES ('default', 'WiFi Gratuito', 'Conecte-se à nossa rede', NULL, NULL, '#3b82f6', '#1e40af', '"Ao utilizar esta rede WiFi, você concorda com nossas políticas de uso. O acesso é monitorado e limitado."', 0, 0, 0, 0, TRUE, '2026-06-18T18:02:49.275Z', '', '', '', 'default', 'aruba', 'https://187.120.167.252', 'admin', 'Vrepari@#2', '', '', '', '', 'https://google.com', FALSE, TRUE, 'confirmation');

-- ---------- Tabela: radius_tokens ----------
DROP TABLE IF EXISTS "radius_tokens" CASCADE;
CREATE TABLE "radius_tokens" (
  "id" text NOT NULL,
  "token" text NOT NULL,
  "macAddress" text,
  "wifiUserId" text,
  "voucherId" text,
  "sessionMinutes" integer DEFAULT 120 NOT NULL,
  "speedLimitDown" integer,
  "speedLimitUp" integer,
  "used" boolean DEFAULT false NOT NULL,
  "usedAt" timestamp,
  "expiresAt" timestamp NOT NULL,
  "createdAt" timestamp DEFAULT now() NOT NULL,
  PRIMARY KEY ("id")
);

-- Dados de radius_tokens (13 linha(s))
INSERT INTO "radius_tokens" ("id", "token", "macAddress", "wifiUserId", "voucherId", "sessionMinutes", "speedLimitDown", "speedLimitUp", "used", "usedAt", "expiresAt", "createdAt") VALUES ('Syu6XfrfLDyK7SvZe2sUw', 'tPi9J9Z3BZcSCFCG2eh77rb', '8a:6c:2a:7c:b5:60', 'YdJTLB1gqDI9OEFSE77Vz', NULL, 117, 10240, 5120, FALSE, NULL, '2026-06-17T10:55:57.133Z', '2026-06-17T10:45:57.133Z');
INSERT INTO "radius_tokens" ("id", "token", "macAddress", "wifiUserId", "voucherId", "sessionMinutes", "speedLimitDown", "speedLimitUp", "used", "usedAt", "expiresAt", "createdAt") VALUES ('ts-9G4rZNEFqKp0KYT2gz', 'tMWw2RDspvqtyVCbEumrUcOf', '8a:6c:2a:7c:b5:60', 'YdJTLB1gqDI9OEFSE77Vz', NULL, 117, 10240, 5120, FALSE, NULL, '2026-06-17T10:56:08.217Z', '2026-06-17T10:46:08.217Z');
INSERT INTO "radius_tokens" ("id", "token", "macAddress", "wifiUserId", "voucherId", "sessionMinutes", "speedLimitDown", "speedLimitUp", "used", "usedAt", "expiresAt", "createdAt") VALUES ('Ckh5Kw8HQdrBxULx5nzIV', 'tGwjqjTiR9vtGTjKbqNxLuRaR', '8a:6c:2a:7c:b5:60', 'YdJTLB1gqDI9OEFSE77Vz', NULL, 117, 10240, 5120, FALSE, NULL, '2026-06-17T10:56:08.796Z', '2026-06-17T10:46:08.796Z');
INSERT INTO "radius_tokens" ("id", "token", "macAddress", "wifiUserId", "voucherId", "sessionMinutes", "speedLimitDown", "speedLimitUp", "used", "usedAt", "expiresAt", "createdAt") VALUES ('SDCRILowHPd2MYfJsOCV-', 'tiha9QdUTfoLzWaFPPnA2g8qY', '', 'YdJTLB1gqDI9OEFSE77Vz', NULL, 120, 10240, 5120, FALSE, NULL, '2026-06-17T11:08:16.792Z', '2026-06-17T10:58:16.792Z');
INSERT INTO "radius_tokens" ("id", "token", "macAddress", "wifiUserId", "voucherId", "sessionMinutes", "speedLimitDown", "speedLimitUp", "used", "usedAt", "expiresAt", "createdAt") VALUES ('4h83U3V-8-HN604RD3KZD', 'txyrdj92RRDypmzIk6pWj2NtU', '', 'YdJTLB1gqDI9OEFSE77Vz', NULL, 120, 10240, 5120, FALSE, NULL, '2026-06-17T11:09:05.736Z', '2026-06-17T10:59:05.736Z');
INSERT INTO "radius_tokens" ("id", "token", "macAddress", "wifiUserId", "voucherId", "sessionMinutes", "speedLimitDown", "speedLimitUp", "used", "usedAt", "expiresAt", "createdAt") VALUES ('KCmEFsKLfgUuWBw5vL0sF', 't8r5puJJKpgOwEs6GsZGO04', '8a:6c:2a:7c:b5:60', 'YdJTLB1gqDI9OEFSE77Vz', NULL, 120, 10240, 5120, FALSE, NULL, '2026-06-17T16:38:45.269Z', '2026-06-17T16:28:45.269Z');
INSERT INTO "radius_tokens" ("id", "token", "macAddress", "wifiUserId", "voucherId", "sessionMinutes", "speedLimitDown", "speedLimitUp", "used", "usedAt", "expiresAt", "createdAt") VALUES ('IbChOmJMBykZJQIcdXtk4', 'toRmaPXrVpt9USafqI0ZuV0L', '8a:6c:2a:7c:b5:60', 'YdJTLB1gqDI9OEFSE77Vz', NULL, 120, 10240, 5120, FALSE, NULL, '2026-06-17T16:38:46.462Z', '2026-06-17T16:28:46.462Z');
INSERT INTO "radius_tokens" ("id", "token", "macAddress", "wifiUserId", "voucherId", "sessionMinutes", "speedLimitDown", "speedLimitUp", "used", "usedAt", "expiresAt", "createdAt") VALUES ('UPrnOK8r0253ypbqDbjqF', 'twTN7yZ9OwPblqm0VoI2o3fJ', '8a:6c:2a:7c:b5:60', 'YdJTLB1gqDI9OEFSE77Vz', NULL, 118, 10240, 5120, FALSE, NULL, '2026-06-17T16:41:27.329Z', '2026-06-17T16:31:27.329Z');
INSERT INTO "radius_tokens" ("id", "token", "macAddress", "wifiUserId", "voucherId", "sessionMinutes", "speedLimitDown", "speedLimitUp", "used", "usedAt", "expiresAt", "createdAt") VALUES ('W5JZcaACEeumedTXTGeUF', 'tFIYRGIAokHSKoKp09aXVLpXm', '8a:6c:2a:7c:b5:60', 'YdJTLB1gqDI9OEFSE77Vz', NULL, 117, 10240, 5120, FALSE, NULL, '2026-06-17T16:41:45.623Z', '2026-06-17T16:31:45.623Z');
INSERT INTO "radius_tokens" ("id", "token", "macAddress", "wifiUserId", "voucherId", "sessionMinutes", "speedLimitDown", "speedLimitUp", "used", "usedAt", "expiresAt", "createdAt") VALUES ('8PcTHnVd7JrDvwF9UQWg3', 'tAhAnU3j2uozPHkdAk2ZuZtT', '8a:6c:2a:7c:b5:60', 'YdJTLB1gqDI9OEFSE77Vz', NULL, 117, 10240, 5120, FALSE, NULL, '2026-06-17T16:41:46.180Z', '2026-06-17T16:31:46.180Z');
INSERT INTO "radius_tokens" ("id", "token", "macAddress", "wifiUserId", "voucherId", "sessionMinutes", "speedLimitDown", "speedLimitUp", "used", "usedAt", "expiresAt", "createdAt") VALUES ('J5xvsy-YG0fbEOugcuCQf', 'tDhvoNiEk7AIsAo0vHy8m9TG', '', 'YdJTLB1gqDI9OEFSE77Vz', NULL, 120, 10240, 5120, FALSE, NULL, '2026-06-17T16:42:54.434Z', '2026-06-17T16:32:54.434Z');
INSERT INTO "radius_tokens" ("id", "token", "macAddress", "wifiUserId", "voucherId", "sessionMinutes", "speedLimitDown", "speedLimitUp", "used", "usedAt", "expiresAt", "createdAt") VALUES ('V1kJ79XHG2JsJikln35SC', 'tMZltXq6V0qXGOiyHfJs6Mazv', '', 'YdJTLB1gqDI9OEFSE77Vz', NULL, 120, 10240, 5120, FALSE, NULL, '2026-06-17T18:40:21.044Z', '2026-06-17T18:30:21.044Z');
INSERT INTO "radius_tokens" ("id", "token", "macAddress", "wifiUserId", "voucherId", "sessionMinutes", "speedLimitDown", "speedLimitUp", "used", "usedAt", "expiresAt", "createdAt") VALUES ('Lo5w-iFgNrESInVVQCUr0', 'tQ0fb4T4zSTIGysvMlxbeezzy', '', 'YdJTLB1gqDI9OEFSE77Vz', NULL, 120, 10240, 5120, FALSE, NULL, '2026-06-18T18:13:18.849Z', '2026-06-18T18:03:18.849Z');

-- ---------- Tabela: session ----------
DROP TABLE IF EXISTS "session" CASCADE;
CREATE TABLE "session" (
  "id" text NOT NULL,
  "expiresAt" timestamp NOT NULL,
  "token" text NOT NULL,
  "createdAt" timestamp DEFAULT now() NOT NULL,
  "updatedAt" timestamp DEFAULT now() NOT NULL,
  "ipAddress" text,
  "userAgent" text,
  "userId" text NOT NULL,
  PRIMARY KEY ("id")
);

-- Dados de session (47 linha(s))
INSERT INTO "session" ("id", "expiresAt", "token", "createdAt", "updatedAt", "ipAddress", "userAgent", "userId") VALUES ('Ol52Zh_9kgTU0TSduzipM', '2026-06-09T13:55:17.516Z', 'iuLKLgjbF9BGuAOZlIICg8Lh4ueBNyng', '2026-06-02T13:55:17.516Z', '2026-06-02T13:55:17.516Z', NULL, NULL, 'n59tEPpG6n6BfBV1SOSbp');
INSERT INTO "session" ("id", "expiresAt", "token", "createdAt", "updatedAt", "ipAddress", "userAgent", "userId") VALUES ('EIehF16X7WcFTvQ40MiLM', '2026-06-09T16:29:51.809Z', 'uh6E9a-66YWyjNu0EHpf0NPUUwBdeSxc', '2026-06-02T16:29:51.809Z', '2026-06-02T16:29:51.809Z', NULL, NULL, 'n59tEPpG6n6BfBV1SOSbp');
INSERT INTO "session" ("id", "expiresAt", "token", "createdAt", "updatedAt", "ipAddress", "userAgent", "userId") VALUES ('r-lPvObZNEhSvtXESDZ80', '2026-06-09T16:34:25.447Z', '1w2c057nj7ikm5bYcHT3btWsqT5WIygT', '2026-06-02T16:34:25.447Z', '2026-06-02T16:34:25.447Z', NULL, NULL, 'n59tEPpG6n6BfBV1SOSbp');
INSERT INTO "session" ("id", "expiresAt", "token", "createdAt", "updatedAt", "ipAddress", "userAgent", "userId") VALUES ('07O0AXT9VTvP7xdsIAr5T', '2026-06-09T17:51:03.670Z', 'S5-Ny2-4q3RmmCNmO21q0QwmQE7yzv8Q', '2026-06-02T17:51:03.670Z', '2026-06-02T17:51:03.670Z', NULL, NULL, 'n59tEPpG6n6BfBV1SOSbp');
INSERT INTO "session" ("id", "expiresAt", "token", "createdAt", "updatedAt", "ipAddress", "userAgent", "userId") VALUES ('jp-R_mf8Q7TMN2hsMO_fG', '2026-06-09T18:25:05.796Z', 'EXa-dLHkjxlgD76kc5I3fV4gDB7WU31e', '2026-06-02T18:25:05.796Z', '2026-06-02T18:25:05.796Z', NULL, NULL, 'n59tEPpG6n6BfBV1SOSbp');
INSERT INTO "session" ("id", "expiresAt", "token", "createdAt", "updatedAt", "ipAddress", "userAgent", "userId") VALUES ('K4bZU_9pFCFzdJEg4gbTJ', '2026-06-09T18:47:32.323Z', 'YhH2luxkr9l_rRFCAqEextUv3TwD-tlI', '2026-06-02T18:47:32.323Z', '2026-06-02T18:47:32.323Z', NULL, NULL, 'n59tEPpG6n6BfBV1SOSbp');
INSERT INTO "session" ("id", "expiresAt", "token", "createdAt", "updatedAt", "ipAddress", "userAgent", "userId") VALUES ('q11iGivkh2qebyCwvO9UW', '2026-06-09T19:07:40.067Z', 'K5b9So5a7RlBFQb3S5MK6j9RtTsae8Tz', '2026-06-02T19:07:40.067Z', '2026-06-02T19:07:40.067Z', NULL, NULL, 'n59tEPpG6n6BfBV1SOSbp');
INSERT INTO "session" ("id", "expiresAt", "token", "createdAt", "updatedAt", "ipAddress", "userAgent", "userId") VALUES ('ak0z7FFCNIVEuRPNiB_gr', '2026-06-09T19:07:42.869Z', 'RK9K5xye3-EC6N0TPElMaAYt2mLvaZRv', '2026-06-02T19:07:42.869Z', '2026-06-02T19:07:42.869Z', NULL, NULL, 'n59tEPpG6n6BfBV1SOSbp');
INSERT INTO "session" ("id", "expiresAt", "token", "createdAt", "updatedAt", "ipAddress", "userAgent", "userId") VALUES ('I8ebzS6svoQN5gE4dFgkp', '2026-06-09T19:12:07.408Z', '8cIDFGYs2bqZABG47aD4t8hLUrVwUb9W', '2026-06-02T19:12:07.408Z', '2026-06-02T19:12:07.408Z', NULL, NULL, 'n59tEPpG6n6BfBV1SOSbp');
INSERT INTO "session" ("id", "expiresAt", "token", "createdAt", "updatedAt", "ipAddress", "userAgent", "userId") VALUES ('nxzQ_e_Azo6n7mpX6O1z6', '2026-06-10T10:48:20.659Z', 'uSo7BHmPMZsGDXsCgC3UxkSm-jJFtXp7', '2026-06-03T10:48:20.659Z', '2026-06-03T10:48:20.659Z', NULL, NULL, 'n59tEPpG6n6BfBV1SOSbp');
INSERT INTO "session" ("id", "expiresAt", "token", "createdAt", "updatedAt", "ipAddress", "userAgent", "userId") VALUES ('FjGAZ-lSN_FsOpS2ffVd8', '2026-06-10T16:12:21.626Z', 'DEYlLP8woUR6mNB1H2eAAmE_sLWMm8Mb', '2026-06-03T16:12:21.626Z', '2026-06-03T16:12:21.626Z', NULL, NULL, 'n59tEPpG6n6BfBV1SOSbp');
INSERT INTO "session" ("id", "expiresAt", "token", "createdAt", "updatedAt", "ipAddress", "userAgent", "userId") VALUES ('JqSCbfx47kIJZRiIbCLqg', '2026-06-10T16:14:32.092Z', 'qWypqb17TWPa3Pskn1KWuS2NpYq38uP3', '2026-06-03T16:14:32.092Z', '2026-06-03T16:14:32.092Z', NULL, NULL, 'n59tEPpG6n6BfBV1SOSbp');
INSERT INTO "session" ("id", "expiresAt", "token", "createdAt", "updatedAt", "ipAddress", "userAgent", "userId") VALUES ('vYZZFZu9JZV1nCVWy3T4n', '2026-06-10T16:32:27.473Z', 'Y-QQ99tGQsGEweMfURJ4MPlvzXiC6kDj', '2026-06-03T16:32:27.474Z', '2026-06-03T16:32:27.474Z', NULL, NULL, 'n59tEPpG6n6BfBV1SOSbp');
INSERT INTO "session" ("id", "expiresAt", "token", "createdAt", "updatedAt", "ipAddress", "userAgent", "userId") VALUES ('-DAsf_A6ST7wGthfYBrMI', '2026-06-10T16:37:55.968Z', 'MSsQ_trkf3RIAk8Mis9Sa3O3ozIa3JAp', '2026-06-03T16:37:55.968Z', '2026-06-03T16:37:55.968Z', NULL, NULL, 'n59tEPpG6n6BfBV1SOSbp');
INSERT INTO "session" ("id", "expiresAt", "token", "createdAt", "updatedAt", "ipAddress", "userAgent", "userId") VALUES ('ZJaqGbzTkVuVGdS24LdRi', '2026-06-10T16:41:08.627Z', '7eSl9FKJrm105GvjDTfHU-RGUp69dLK-', '2026-06-03T16:41:08.627Z', '2026-06-03T16:41:08.627Z', NULL, NULL, 'n59tEPpG6n6BfBV1SOSbp');
INSERT INTO "session" ("id", "expiresAt", "token", "createdAt", "updatedAt", "ipAddress", "userAgent", "userId") VALUES ('ZAnIFMjQdUpFgJUmj9xmR', '2026-06-10T16:55:35.374Z', '_g1-gm-TLJu4hI9HX_T1wxZvzmKMHlfi', '2026-06-03T16:55:35.374Z', '2026-06-03T16:55:35.374Z', NULL, NULL, 'n59tEPpG6n6BfBV1SOSbp');
INSERT INTO "session" ("id", "expiresAt", "token", "createdAt", "updatedAt", "ipAddress", "userAgent", "userId") VALUES ('bZmnDqiGgjENO43fDCgMG', '2026-06-10T18:17:42.228Z', 'ryWpDOvxGGD8HsVdJwuZs1lu_q9DooIT', '2026-06-03T18:17:42.228Z', '2026-06-03T18:17:42.228Z', NULL, NULL, 'n59tEPpG6n6BfBV1SOSbp');
INSERT INTO "session" ("id", "expiresAt", "token", "createdAt", "updatedAt", "ipAddress", "userAgent", "userId") VALUES ('z6eO0Rj1EGMtabq5Ywli8', '2026-06-10T18:33:10.547Z', 'eK8MAbcmG1xqgDBnhl7xAjqS6HxVVuHW', '2026-06-03T18:33:10.547Z', '2026-06-03T18:33:10.547Z', NULL, NULL, 'n59tEPpG6n6BfBV1SOSbp');
INSERT INTO "session" ("id", "expiresAt", "token", "createdAt", "updatedAt", "ipAddress", "userAgent", "userId") VALUES ('hDZFCRkSjU_Hn_r-azjjo', '2026-06-10T19:08:45.022Z', 'PT61mLwFwCJizNXQ4oGNqo-bDrPVl-wU', '2026-06-03T19:08:45.023Z', '2026-06-03T19:08:45.023Z', NULL, NULL, 'n59tEPpG6n6BfBV1SOSbp');
INSERT INTO "session" ("id", "expiresAt", "token", "createdAt", "updatedAt", "ipAddress", "userAgent", "userId") VALUES ('pRPryR1p4qmzuuFszfCeE', '2026-06-10T19:15:38.875Z', 'JP7ceIuZeHVRgYQdlVbZLRO_WJiYu2JO', '2026-06-03T19:15:38.875Z', '2026-06-03T19:15:38.875Z', NULL, NULL, 'n59tEPpG6n6BfBV1SOSbp');
INSERT INTO "session" ("id", "expiresAt", "token", "createdAt", "updatedAt", "ipAddress", "userAgent", "userId") VALUES ('ElKvlwkyMlkygCc8f0sBW', '2026-06-15T16:48:37.779Z', 'empZLFeIGqI2-xte8jksL1BSiuu-XxvT', '2026-06-08T16:48:37.779Z', '2026-06-08T16:48:37.779Z', NULL, NULL, 'n59tEPpG6n6BfBV1SOSbp');
INSERT INTO "session" ("id", "expiresAt", "token", "createdAt", "updatedAt", "ipAddress", "userAgent", "userId") VALUES ('xvVEfDGVk6LbREuQZjiot', '2026-06-15T19:08:11.026Z', 'OJbkD_W5qF7v8Ay3DHNdg9FESOOxnESr', '2026-06-08T19:08:11.027Z', '2026-06-08T19:08:11.027Z', NULL, NULL, 'n59tEPpG6n6BfBV1SOSbp');
INSERT INTO "session" ("id", "expiresAt", "token", "createdAt", "updatedAt", "ipAddress", "userAgent", "userId") VALUES ('u-XRlsMCcGn17WboZ8TsX', '2026-06-15T19:36:51.710Z', 'XdkOnDshqyThWib_fWy40cn_Coh9GjOF', '2026-06-08T19:36:51.710Z', '2026-06-08T19:36:51.710Z', NULL, NULL, 'n59tEPpG6n6BfBV1SOSbp');
INSERT INTO "session" ("id", "expiresAt", "token", "createdAt", "updatedAt", "ipAddress", "userAgent", "userId") VALUES ('_2HPXGgbQn7K1kvp46-pn', '2026-06-15T19:46:56.034Z', 'rxdkln10DI5o-mNxT0rYYTaR3VrmXbTk', '2026-06-08T19:46:56.034Z', '2026-06-08T19:46:56.034Z', NULL, NULL, 'n59tEPpG6n6BfBV1SOSbp');
INSERT INTO "session" ("id", "expiresAt", "token", "createdAt", "updatedAt", "ipAddress", "userAgent", "userId") VALUES ('8ywJXAsDpCwI4gqVpE14_', '2026-06-20T18:19:48.053Z', 'R5J2Oo0NxXDnWGTql4IWT_kfq7EGXT1u', '2026-06-13T18:19:48.053Z', '2026-06-13T18:19:48.053Z', NULL, NULL, 'n59tEPpG6n6BfBV1SOSbp');
INSERT INTO "session" ("id", "expiresAt", "token", "createdAt", "updatedAt", "ipAddress", "userAgent", "userId") VALUES ('477XcZxV3hEcEse2arTRb', '2026-06-20T18:48:32.014Z', 'VmP2m2L7aqnLtYPYN96jaCedd0rbRV91', '2026-06-13T18:48:32.014Z', '2026-06-13T18:48:32.014Z', NULL, NULL, 'n59tEPpG6n6BfBV1SOSbp');
INSERT INTO "session" ("id", "expiresAt", "token", "createdAt", "updatedAt", "ipAddress", "userAgent", "userId") VALUES ('qIGpQ5aCrcWM30FgJ4_8t', '2026-06-20T19:03:24.811Z', 'tFbl0tWXZCtjBKHuppPVlE_ZgNZ6CD8M', '2026-06-13T19:03:24.811Z', '2026-06-13T19:03:24.811Z', NULL, NULL, 'n59tEPpG6n6BfBV1SOSbp');
INSERT INTO "session" ("id", "expiresAt", "token", "createdAt", "updatedAt", "ipAddress", "userAgent", "userId") VALUES ('RtaO6CJAEtDsg5RSsFQNJ', '2026-06-20T19:31:21.202Z', 'YiBnz7YYJ9wUVO37l4MBqhUrbcShutv3', '2026-06-13T19:31:21.202Z', '2026-06-13T19:31:21.202Z', NULL, NULL, 'n59tEPpG6n6BfBV1SOSbp');
INSERT INTO "session" ("id", "expiresAt", "token", "createdAt", "updatedAt", "ipAddress", "userAgent", "userId") VALUES ('89NLSSVTLj5o3ux7fj-Fx', '2026-06-20T19:42:28.508Z', 'z8ZGC24oIOqRs2pr7YfFY2jrUq9pV2gJ', '2026-06-13T19:42:28.509Z', '2026-06-13T19:42:28.509Z', NULL, NULL, 'n59tEPpG6n6BfBV1SOSbp');
INSERT INTO "session" ("id", "expiresAt", "token", "createdAt", "updatedAt", "ipAddress", "userAgent", "userId") VALUES ('KbUdRRLwdW0s1OsBnRo8l', '2026-06-20T19:52:59.070Z', 'Z8MX-FcviNjaBhJgK3VZIdCh5IZeSJ8i', '2026-06-13T19:52:59.070Z', '2026-06-13T19:52:59.070Z', NULL, NULL, 'n59tEPpG6n6BfBV1SOSbp');
INSERT INTO "session" ("id", "expiresAt", "token", "createdAt", "updatedAt", "ipAddress", "userAgent", "userId") VALUES ('KSHddFTXbzSRpcPPUf0T2', '2026-06-23T18:11:59.185Z', 'YwgDMmkvmSAXBkZ52p1ixFL4QT6hhu8c', '2026-06-16T18:11:59.185Z', '2026-06-16T18:11:59.185Z', NULL, NULL, 'n59tEPpG6n6BfBV1SOSbp');
INSERT INTO "session" ("id", "expiresAt", "token", "createdAt", "updatedAt", "ipAddress", "userAgent", "userId") VALUES ('jan9A7NCWWI4EudSEA8OB', '2026-06-24T10:45:04.635Z', 'Eke4c3vsvYYXbVcnr2bwDL2Efs1qMhiO', '2026-06-17T10:45:04.635Z', '2026-06-17T10:45:04.635Z', NULL, NULL, 'n59tEPpG6n6BfBV1SOSbp');
INSERT INTO "session" ("id", "expiresAt", "token", "createdAt", "updatedAt", "ipAddress", "userAgent", "userId") VALUES ('ITJnr6wk0OHBh_Ceusxtj', '2026-06-24T13:24:54.581Z', 'LGEaWPFlMZYtG-tDXEM8aaWrjIw1gPlO', '2026-06-17T13:24:54.581Z', '2026-06-17T13:24:54.581Z', NULL, NULL, 'n59tEPpG6n6BfBV1SOSbp');
INSERT INTO "session" ("id", "expiresAt", "token", "createdAt", "updatedAt", "ipAddress", "userAgent", "userId") VALUES ('lGOvR3oiGVJHzH7ET05QJ', '2026-06-24T13:30:53.378Z', 'ewKwVKBgExu2WZ8c1kzclKSF5ttp5S2l', '2026-06-17T13:30:53.378Z', '2026-06-17T13:30:53.378Z', NULL, NULL, 'n59tEPpG6n6BfBV1SOSbp');
INSERT INTO "session" ("id", "expiresAt", "token", "createdAt", "updatedAt", "ipAddress", "userAgent", "userId") VALUES ('WexNPUPa727kQSORcp4r0', '2026-06-24T13:31:59.024Z', '4_aBpclxt-WeCxnrmylbs2LiIIf0oG5s', '2026-06-17T13:31:59.024Z', '2026-06-17T13:31:59.024Z', NULL, NULL, 'n59tEPpG6n6BfBV1SOSbp');
INSERT INTO "session" ("id", "expiresAt", "token", "createdAt", "updatedAt", "ipAddress", "userAgent", "userId") VALUES ('Q4J9-DGmFk03KOD5L24HC', '2026-06-24T13:37:47.556Z', 'O5WeLMcyig9ou3Ig8xveCsdh17YloK-u', '2026-06-17T13:37:47.556Z', '2026-06-17T13:37:47.556Z', NULL, NULL, 'n59tEPpG6n6BfBV1SOSbp');
INSERT INTO "session" ("id", "expiresAt", "token", "createdAt", "updatedAt", "ipAddress", "userAgent", "userId") VALUES ('gHYxBPsnNGhgkPX85DVy6', '2026-06-24T13:44:33.729Z', 'tddVLDx5hiIGLK9YpvDN-67iSV1fOljj', '2026-06-17T13:44:33.729Z', '2026-06-17T13:44:33.729Z', NULL, NULL, 'n59tEPpG6n6BfBV1SOSbp');
INSERT INTO "session" ("id", "expiresAt", "token", "createdAt", "updatedAt", "ipAddress", "userAgent", "userId") VALUES ('L7HzvXIkE52Dg1qGVraA1', '2026-06-24T13:53:43.355Z', 'MTJ7BFuy-Sh28EaoEfyQCUgO75HOXJAn', '2026-06-17T13:53:43.355Z', '2026-06-17T13:53:43.355Z', NULL, NULL, 'n59tEPpG6n6BfBV1SOSbp');
INSERT INTO "session" ("id", "expiresAt", "token", "createdAt", "updatedAt", "ipAddress", "userAgent", "userId") VALUES ('TWI-o67d0cYouJY4ugHIz', '2026-06-24T13:56:54.162Z', 'SeuQmYCEljHJzrseKCFC0mIWczU-jcZk', '2026-06-17T13:56:54.162Z', '2026-06-17T13:56:54.162Z', NULL, NULL, 'n59tEPpG6n6BfBV1SOSbp');
INSERT INTO "session" ("id", "expiresAt", "token", "createdAt", "updatedAt", "ipAddress", "userAgent", "userId") VALUES ('wPuEXTPgZ2eiFls1v2TWy', '2026-06-24T13:57:16.768Z', 'dVvh0ptwfHA4MKk-YM7fqQTztT-Podii', '2026-06-17T13:57:16.768Z', '2026-06-17T13:57:16.768Z', NULL, NULL, 'n59tEPpG6n6BfBV1SOSbp');
INSERT INTO "session" ("id", "expiresAt", "token", "createdAt", "updatedAt", "ipAddress", "userAgent", "userId") VALUES ('794lMSmiEt847P4_56DcO', '2026-06-24T14:02:11.828Z', 'LM1CtmWXe9fkvSGkok1WdKSnu7SrxAqf', '2026-06-17T14:02:11.828Z', '2026-06-17T14:02:11.828Z', NULL, NULL, 'n59tEPpG6n6BfBV1SOSbp');
INSERT INTO "session" ("id", "expiresAt", "token", "createdAt", "updatedAt", "ipAddress", "userAgent", "userId") VALUES ('u5v9q--Gj4q2FkTNvl64S', '2026-06-24T18:47:21.331Z', '5_AfsbSXX0uHSzKHDw8waZ12mM781e0g', '2026-06-17T18:47:21.331Z', '2026-06-17T18:47:21.331Z', NULL, NULL, 'n59tEPpG6n6BfBV1SOSbp');
INSERT INTO "session" ("id", "expiresAt", "token", "createdAt", "updatedAt", "ipAddress", "userAgent", "userId") VALUES ('E4koR32fZmL1IuLRvbHeh', '2026-06-24T19:15:04.836Z', 'i4hoguWRUJw06oRbj83ZsuXFxlZt7WMM', '2026-06-17T19:15:04.836Z', '2026-06-17T19:15:04.836Z', NULL, NULL, 'n59tEPpG6n6BfBV1SOSbp');
INSERT INTO "session" ("id", "expiresAt", "token", "createdAt", "updatedAt", "ipAddress", "userAgent", "userId") VALUES ('i7cu4dxHZ6etjJuxKJzxJ', '2026-06-24T19:20:17.265Z', 'b14x--_aKqKhPuuaG5e40FHZkcTjK_mT', '2026-06-17T19:20:17.265Z', '2026-06-17T19:20:17.265Z', NULL, NULL, 'n59tEPpG6n6BfBV1SOSbp');
INSERT INTO "session" ("id", "expiresAt", "token", "createdAt", "updatedAt", "ipAddress", "userAgent", "userId") VALUES ('phozv2vwVuYO7T7Jtbzz1', '2026-06-25T18:02:22.617Z', 'P4xivDjeWcPFZRj-gOnZxgCaJ6gvbdVG', '2026-06-18T18:02:22.617Z', '2026-06-18T18:02:22.617Z', NULL, NULL, 'n59tEPpG6n6BfBV1SOSbp');
INSERT INTO "session" ("id", "expiresAt", "token", "createdAt", "updatedAt", "ipAddress", "userAgent", "userId") VALUES ('gTWKkd--w4iBT3QzF0akt', '2026-06-26T16:05:45.578Z', '6Bb4myotxCtIsyYTt3trH8pO7aaD0ycL', '2026-06-19T16:05:45.578Z', '2026-06-19T16:05:45.578Z', NULL, NULL, 'n59tEPpG6n6BfBV1SOSbp');
INSERT INTO "session" ("id", "expiresAt", "token", "createdAt", "updatedAt", "ipAddress", "userAgent", "userId") VALUES ('R7M5po9Og6IH4kkVheTcg', '2026-07-03T12:56:47.962Z', 'RWt_Xr6SHMr6Xy0Y88fyvI72vZAQuy38', '2026-06-26T12:56:47.962Z', '2026-06-26T12:56:47.962Z', NULL, NULL, 'n59tEPpG6n6BfBV1SOSbp');

-- ---------- Tabela: user ----------
DROP TABLE IF EXISTS "user" CASCADE;
CREATE TABLE "user" (
  "id" text NOT NULL,
  "name" text NOT NULL,
  "email" text NOT NULL,
  "emailVerified" boolean DEFAULT false NOT NULL,
  "image" text,
  "createdAt" timestamp DEFAULT now() NOT NULL,
  "updatedAt" timestamp DEFAULT now() NOT NULL,
  "role" text DEFAULT 'user'::text NOT NULL,
  "password" text,
  PRIMARY KEY ("id")
);

-- Dados de user (2 linha(s))
INSERT INTO "user" ("id", "name", "email", "emailVerified", "image", "createdAt", "updatedAt", "role", "password") VALUES ('S4YOqdtghLGckpbGZTWxg', 'Administrador', 'admin@exemplo.com', TRUE, NULL, '2026-06-01T16:28:28.069Z', '2026-06-01T16:28:28.069Z', 'admin', NULL);
INSERT INTO "user" ("id", "name", "email", "emailVerified", "image", "createdAt", "updatedAt", "role", "password") VALUES ('n59tEPpG6n6BfBV1SOSbp', 'João Estelita', 'joaoestelita@outlook.com', FALSE, NULL, '2026-06-02T13:54:56.640Z', '2026-06-02T13:54:56.640Z', 'admin', '$2b$10$tuJUmdZj9LxmIZHlORxpXeuIlsNBkainpzRSQsh4vHD9CiY4JFmRO');

-- ---------- Tabela: verification ----------
DROP TABLE IF EXISTS "verification" CASCADE;
CREATE TABLE "verification" (
  "id" text NOT NULL,
  "identifier" text NOT NULL,
  "value" text NOT NULL,
  "expiresAt" timestamp NOT NULL,
  "createdAt" timestamp DEFAULT now() NOT NULL,
  "updatedAt" timestamp DEFAULT now() NOT NULL,
  PRIMARY KEY ("id")
);

-- (sem dados em verification)

-- ---------- Tabela: wifi_sessions ----------
DROP TABLE IF EXISTS "wifi_sessions" CASCADE;
CREATE TABLE "wifi_sessions" (
  "id" text NOT NULL,
  "wifiUserId" text,
  "macAddress" text NOT NULL,
  "ipAddress" text,
  "startTime" timestamp DEFAULT now() NOT NULL,
  "endTime" timestamp,
  "duration" integer DEFAULT 0,
  "status" text DEFAULT 'active'::text NOT NULL,
  "createdAt" timestamp DEFAULT now() NOT NULL,
  "expectedEndTime" timestamp,
  "endReason" text,
  PRIMARY KEY ("id")
);

-- Dados de wifi_sessions (21 linha(s))
INSERT INTO "wifi_sessions" ("id", "wifiUserId", "macAddress", "ipAddress", "startTime", "endTime", "duration", "status", "createdAt", "expectedEndTime", "endReason") VALUES ('wcVGxkzpSVcT3i4pd5cNJ', NULL, 'AA:BB:CC:DD:EE:FF', NULL, '2026-06-03T10:50:03.743Z', '2026-06-03T16:18:38.070Z', 329, 'ended', '2026-06-03T10:50:03.743Z', '2026-06-03T11:50:03.743Z', NULL);
INSERT INTO "wifi_sessions" ("id", "wifiUserId", "macAddress", "ipAddress", "startTime", "endTime", "duration", "status", "createdAt", "expectedEndTime", "endReason") VALUES ('MTv9sZX4MT8yWcYBcvf6c', 'YdJTLB1gqDI9OEFSE77Vz', '72:a3:a2:f5:c1:f5', NULL, '2026-06-13T18:50:14.452Z', '2026-06-13T18:54:23.867Z', 4, 'ended', '2026-06-13T18:50:14.452Z', '2026-06-13T20:50:14.452Z', 'manual');
INSERT INTO "wifi_sessions" ("id", "wifiUserId", "macAddress", "ipAddress", "startTime", "endTime", "duration", "status", "createdAt", "expectedEndTime", "endReason") VALUES ('eSuM5n2Qr_XqKuhsAu3eQ', 'YdJTLB1gqDI9OEFSE77Vz', '72:a3:a2:f5:c1:f5', NULL, '2026-06-13T18:55:26.420Z', '2026-06-13T18:58:48.813Z', 3, 'ended', '2026-06-13T18:55:26.420Z', '2026-06-13T20:55:26.420Z', 'manual');
INSERT INTO "wifi_sessions" ("id", "wifiUserId", "macAddress", "ipAddress", "startTime", "endTime", "duration", "status", "createdAt", "expectedEndTime", "endReason") VALUES ('jdYMGKqhKs0YKEt-gTA6j', 'YdJTLB1gqDI9OEFSE77Vz', '72:a3:a2:f5:c1:f5', NULL, '2026-06-13T18:59:28.205Z', '2026-06-13T19:00:01.250Z', 1, 'ended', '2026-06-13T18:59:28.205Z', '2026-06-13T20:59:28.205Z', 'manual');
INSERT INTO "wifi_sessions" ("id", "wifiUserId", "macAddress", "ipAddress", "startTime", "endTime", "duration", "status", "createdAt", "expectedEndTime", "endReason") VALUES ('UdKHoBTnNO1eb5HlLZ1om', 'YdJTLB1gqDI9OEFSE77Vz', '72:a3:a2:f5:c1:f5', NULL, '2026-06-13T19:03:56.832Z', '2026-06-13T19:31:24.967Z', 27, 'ended', '2026-06-13T19:03:56.832Z', '2026-06-13T21:03:56.832Z', 'manual');
INSERT INTO "wifi_sessions" ("id", "wifiUserId", "macAddress", "ipAddress", "startTime", "endTime", "duration", "status", "createdAt", "expectedEndTime", "endReason") VALUES ('WVCDcL0xHOdLST0s75hWd', 'YdJTLB1gqDI9OEFSE77Vz', '72:a3:a2:f5:c1:f5', NULL, '2026-06-13T19:32:11.804Z', '2026-06-13T19:42:32.041Z', 10, 'ended', '2026-06-13T19:32:11.804Z', '2026-06-13T21:32:11.804Z', 'manual');
INSERT INTO "wifi_sessions" ("id", "wifiUserId", "macAddress", "ipAddress", "startTime", "endTime", "duration", "status", "createdAt", "expectedEndTime", "endReason") VALUES ('qu4eHMjCsJ8eHv_iWQ8iF', 'YdJTLB1gqDI9OEFSE77Vz', '72:a3:a2:f5:c1:f5', NULL, '2026-06-13T19:43:11.507Z', '2026-06-13T19:44:01.207Z', 0, 'ended', '2026-06-13T19:43:11.507Z', '2026-06-13T21:43:11.507Z', 'new_login');
INSERT INTO "wifi_sessions" ("id", "wifiUserId", "macAddress", "ipAddress", "startTime", "endTime", "duration", "status", "createdAt", "expectedEndTime", "endReason") VALUES ('_2ni5R63vW6KXuCKcDGPh', 'YdJTLB1gqDI9OEFSE77Vz', '', NULL, '2026-06-13T19:44:01.239Z', '2026-06-13T19:44:58.557Z', 1, 'ended', '2026-06-13T19:44:01.239Z', '2026-06-13T21:44:01.239Z', 'manual');
INSERT INTO "wifi_sessions" ("id", "wifiUserId", "macAddress", "ipAddress", "startTime", "endTime", "duration", "status", "createdAt", "expectedEndTime", "endReason") VALUES ('PfYkKtIFByeTxM_tmh24y', 'YdJTLB1gqDI9OEFSE77Vz', '72:a3:a2:f5:c1:f5', NULL, '2026-06-13T19:45:40.609Z', '2026-06-13T19:53:02.458Z', 7, 'ended', '2026-06-13T19:45:40.609Z', '2026-06-13T21:45:40.609Z', 'manual');
INSERT INTO "wifi_sessions" ("id", "wifiUserId", "macAddress", "ipAddress", "startTime", "endTime", "duration", "status", "createdAt", "expectedEndTime", "endReason") VALUES ('reghZkrxK4EHbjzP8FP5Y', 'YdJTLB1gqDI9OEFSE77Vz', '72:a3:a2:f5:c1:f5', NULL, '2026-06-13T19:53:37.563Z', '2026-06-13T19:54:11.535Z', 1, 'ended', '2026-06-13T19:53:37.563Z', '2026-06-13T21:53:37.563Z', 'manual');
INSERT INTO "wifi_sessions" ("id", "wifiUserId", "macAddress", "ipAddress", "startTime", "endTime", "duration", "status", "createdAt", "expectedEndTime", "endReason") VALUES ('F9WI6xa1rKFNird3hL8PJ', 'YdJTLB1gqDI9OEFSE77Vz', '72:a3:a2:f5:c1:f5', NULL, '2026-06-14T00:08:52.485Z', '2026-06-14T00:14:17.419Z', 0, 'ended', '2026-06-14T00:08:52.485Z', '2026-06-14T02:08:52.485Z', 'new_login');
INSERT INTO "wifi_sessions" ("id", "wifiUserId", "macAddress", "ipAddress", "startTime", "endTime", "duration", "status", "createdAt", "expectedEndTime", "endReason") VALUES ('KvmkUYgIhWeqE_8F9T5jz', 'YdJTLB1gqDI9OEFSE77Vz', '', NULL, '2026-06-14T00:14:17.425Z', '2026-06-14T00:15:20.233Z', 0, 'ended', '2026-06-14T00:14:17.425Z', '2026-06-14T02:14:17.425Z', 'new_login');
INSERT INTO "wifi_sessions" ("id", "wifiUserId", "macAddress", "ipAddress", "startTime", "endTime", "duration", "status", "createdAt", "expectedEndTime", "endReason") VALUES ('J7NjqN_UkAfWywb4KnubE', 'YdJTLB1gqDI9OEFSE77Vz', '2c:7b:a0:e8:40:13', NULL, '2026-06-14T00:15:20.247Z', '2026-06-14T00:17:24.224Z', 0, 'ended', '2026-06-14T00:15:20.247Z', '2026-06-14T02:15:20.247Z', 'new_login');
INSERT INTO "wifi_sessions" ("id", "wifiUserId", "macAddress", "ipAddress", "startTime", "endTime", "duration", "status", "createdAt", "expectedEndTime", "endReason") VALUES ('u5N8S49f4RVGwZOZCQqJ7', 'YdJTLB1gqDI9OEFSE77Vz', '72:a3:a2:f5:c1:f5', NULL, '2026-06-14T00:17:24.231Z', '2026-06-15T00:14:07.976Z', 1437, 'expired', '2026-06-14T00:17:24.231Z', '2026-06-14T02:17:24.231Z', NULL);
INSERT INTO "wifi_sessions" ("id", "wifiUserId", "macAddress", "ipAddress", "startTime", "endTime", "duration", "status", "createdAt", "expectedEndTime", "endReason") VALUES ('-8hzRVmuVZCJuSl6C4nRs', 'YdJTLB1gqDI9OEFSE77Vz', '8a:6c:2a:7c:b5:60', NULL, '2026-06-17T10:42:33.924Z', '2026-06-17T10:58:16.860Z', 0, 'ended', '2026-06-17T10:42:33.924Z', '2026-06-17T12:42:33.924Z', 'new_login');
INSERT INTO "wifi_sessions" ("id", "wifiUserId", "macAddress", "ipAddress", "startTime", "endTime", "duration", "status", "createdAt", "expectedEndTime", "endReason") VALUES ('6EPavhxEcG4BVjx03zB13', 'YdJTLB1gqDI9OEFSE77Vz', '', NULL, '2026-06-17T10:58:16.895Z', '2026-06-17T10:59:05.749Z', 0, 'ended', '2026-06-17T10:58:16.895Z', '2026-06-17T12:58:16.895Z', 'new_login');
INSERT INTO "wifi_sessions" ("id", "wifiUserId", "macAddress", "ipAddress", "startTime", "endTime", "duration", "status", "createdAt", "expectedEndTime", "endReason") VALUES ('gjy4YmrJL5KFdEo6u0ISX', 'YdJTLB1gqDI9OEFSE77Vz', '', NULL, '2026-06-17T10:59:05.759Z', '2026-06-17T16:28:45.394Z', 0, 'ended', '2026-06-17T10:59:05.759Z', '2026-06-17T12:59:05.759Z', 'new_login');
INSERT INTO "wifi_sessions" ("id", "wifiUserId", "macAddress", "ipAddress", "startTime", "endTime", "duration", "status", "createdAt", "expectedEndTime", "endReason") VALUES ('BYtiyioxk2eYeLyt3dBDx', 'YdJTLB1gqDI9OEFSE77Vz', '8a:6c:2a:7c:b5:60', NULL, '2026-06-17T16:28:45.407Z', '2026-06-17T16:32:54.450Z', 0, 'ended', '2026-06-17T16:28:45.407Z', '2026-06-17T18:28:45.407Z', 'new_login');
INSERT INTO "wifi_sessions" ("id", "wifiUserId", "macAddress", "ipAddress", "startTime", "endTime", "duration", "status", "createdAt", "expectedEndTime", "endReason") VALUES ('sx8wlaYjFEgGoKy997162', 'YdJTLB1gqDI9OEFSE77Vz', '', NULL, '2026-06-17T16:32:54.458Z', '2026-06-17T18:30:21.076Z', 0, 'ended', '2026-06-17T16:32:54.458Z', '2026-06-17T18:32:54.458Z', 'new_login');
INSERT INTO "wifi_sessions" ("id", "wifiUserId", "macAddress", "ipAddress", "startTime", "endTime", "duration", "status", "createdAt", "expectedEndTime", "endReason") VALUES ('EPs40zHNa8t8iGhts1-v0', 'YdJTLB1gqDI9OEFSE77Vz', '', NULL, '2026-06-17T18:30:21.089Z', '2026-06-17T19:00:53.788Z', 31, 'ended', '2026-06-17T18:30:21.089Z', '2026-06-17T20:30:21.089Z', 'manual');
INSERT INTO "wifi_sessions" ("id", "wifiUserId", "macAddress", "ipAddress", "startTime", "endTime", "duration", "status", "createdAt", "expectedEndTime", "endReason") VALUES ('pEVrMqRoArcV1KRiqv-LO', 'YdJTLB1gqDI9OEFSE77Vz', '', NULL, '2026-06-18T18:03:18.886Z', '2026-06-18T18:04:28.751Z', 1, 'ended', '2026-06-18T18:03:18.886Z', '2026-06-18T20:03:18.886Z', 'manual');

-- ---------- Tabela: wifi_users ----------
DROP TABLE IF EXISTS "wifi_users" CASCADE;
CREATE TABLE "wifi_users" (
  "id" text NOT NULL,
  "name" text NOT NULL,
  "email" text NOT NULL,
  "phone" text,
  "password" text NOT NULL,
  "status" text DEFAULT 'pending'::text NOT NULL,
  "macAddress" text,
  "dailyLimitMinutes" integer DEFAULT 240,
  "sessionLimitMinutes" integer DEFAULT 120,
  "speedLimitDown" integer DEFAULT 10240,
  "speedLimitUp" integer DEFAULT 5120,
  "totalTimeUsedToday" integer DEFAULT 0,
  "lastResetDate" date DEFAULT CURRENT_DATE,
  "createdAt" timestamp DEFAULT now() NOT NULL,
  "updatedAt" timestamp DEFAULT now() NOT NULL,
  PRIMARY KEY ("id")
);

-- Dados de wifi_users (2 linha(s))
INSERT INTO "wifi_users" ("id", "name", "email", "phone", "password", "status", "macAddress", "dailyLimitMinutes", "sessionLimitMinutes", "speedLimitDown", "speedLimitUp", "totalTimeUsedToday", "lastResetDate", "createdAt", "updatedAt") VALUES ('YdJTLB1gqDI9OEFSE77Vz', 'Joao', 'joaoestelita@outlook.com', NULL, '$2b$10$PpFAgKYkAaGZSeyr2OiaoOFNeolAKpE9vQPaqKS8DwFnXSy6rhgd.', 'approved', '', 0, 0, 0, 0, 0, '2026-06-30T00:00:00.000Z', '2026-06-13T18:40:13.122Z', '2026-06-30T00:17:37.399Z');
INSERT INTO "wifi_users" ("id", "name", "email", "phone", "password", "status", "macAddress", "dailyLimitMinutes", "sessionLimitMinutes", "speedLimitDown", "speedLimitUp", "totalTimeUsedToday", "lastResetDate", "createdAt", "updatedAt") VALUES ('s9k9WrkMMw1uxyYHnk-gg', 'Pedro ', 'pedroomsc@hotmail.com', '64981414415', '$2b$10$nWES8pp4RTwtKSXYsyAFp.Ls.zl6pTZ97c93.cjBgXRDBOkcRPx7W', 'approved', NULL, 0, 0, 0, 0, 0, '2026-06-30T00:00:00.000Z', '2026-06-23T19:38:55.396Z', '2026-06-30T00:17:37.414Z');

-- ---------- Tabela: wifi_vouchers ----------
DROP TABLE IF EXISTS "wifi_vouchers" CASCADE;
CREATE TABLE "wifi_vouchers" (
  "id" text NOT NULL,
  "code" text NOT NULL,
  "durationMinutes" integer DEFAULT 60 NOT NULL,
  "speedLimitDown" integer DEFAULT 10240,
  "speedLimitUp" integer DEFAULT 5120,
  "maxUses" integer DEFAULT 1,
  "usedCount" integer DEFAULT 0,
  "expiresAt" timestamp,
  "createdBy" text NOT NULL,
  "createdAt" timestamp DEFAULT now() NOT NULL,
  PRIMARY KEY ("id")
);

-- (sem dados em wifi_vouchers)

COMMIT;

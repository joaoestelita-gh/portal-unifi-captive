/**
 * WiFi Actions — Barrel re-export for backwards compatibility.
 *
 * All logic has been split into focused modules:
 * - portal-settings.ts  → getPortalSettings, updatePortalSettings, updateControllerSettings, etc.
 * - wifi-users.ts       → registerWifiUser, getWifiUsers, approveUser, blockUser, etc.
 * - wifi-sessions.ts    → checkActiveSession, loginWifiUser, loginWithVoucher, getActiveSessions, etc.
 * - wifi-vouchers.ts    → generateVouchers, getVouchers, deleteVoucher
 * - wifi-stats.ts       → getDashboardStats
 * - controller.ts       → testUnifiConnectionV2, fetchUnifiSitesV2, fetchUnifiDetailsV2
 *
 * This file re-exports everything to maintain existing import paths.
 * New code should import from the specific module directly.
 */

// Portal Settings
export {
  getPortalSettings,
  getPortalSettingsForClient,
  updatePortalSettings,
  updateControllerSettings,
  updateUnifiSettings,
  testControllerConnection,
  testUnifiConnection,
} from './portal-settings'

// WiFi Users
export {
  registerWifiUser,
  getWifiUsers,
  getPendingUsers,
  approveUser,
  blockUser,
  deleteWifiUser,
  createWifiUserByAdmin,
  updateWifiUser,
  updateUserLimits,
  setTrustedDevice,
  removeTrustedDevice,
  getUserDevices,
  setDeviceTrusted,
  removeDeviceTrust,
  renameDevice,
  removeDevice,
} from './wifi-users'

// WiFi Sessions
export {
  checkActiveSession,
  loginWifiUser,
  loginWithVoucher,
  getActiveSessions,
  endSession,
} from './wifi-sessions'

// WiFi Vouchers
export {
  generateVouchers,
  getVouchers,
  deleteVoucher,
} from './wifi-vouchers'

// Pré-autorização de MACs
export {
  importPreauthorizedMacs,
  addPreauthorizedMac,
  getPreauthorizedMacs,
  deletePreauthorizedMac,
  linkPreauthorizedMacToUser,
  unlinkPreauthorizedMac,
} from './wifi-preauth'

// WiFi Stats
export {
  getDashboardStats,
} from './wifi-stats'

// Legacy exports for UniFi site info (kept for admin UI)
// These use the new ControllerService via actions/controller.ts
export {
  testUnifiConnectionV2,
  fetchUnifiSitesV2,
  fetchUnifiDetailsV2,
} from './controller'

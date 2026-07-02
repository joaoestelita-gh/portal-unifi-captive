'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { 
  Users, 
  Wifi, 
  Clock, 
  Ticket, 
  Settings, 
  LogOut,
  Trash2,
  Plus,
  RefreshCw,
  CheckCircle,
  XCircle,
  Copy,
  Activity,
  Shield,
  LockOpen,
  KeyRound,
  Zap,
  TrendingUp,
  Ban,
  UserCheck,
  Link2,
  Eye,
  EyeOff,
  Pencil,
  BookOpen,
  Smartphone
} from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { logoutAdmin, registerAdmin, updatePassword, listAdmins, removeAdmin, editAdmin } from '@/app/actions/auth'
import { 
  approveUser, 
  blockUser, 
  deleteWifiUser, 
  endSession, 
  generateVouchers, 
  deleteVoucher,
  updatePortalSettings,
  createWifiUserByAdmin,
  updateWifiUser,
  setTrustedDevice,
  removeTrustedDevice,
  getUserDevices,
  setDeviceTrusted,
  removeDeviceTrust,
  renameDevice,
  removeDevice,
} from '@/app/actions/wifi'
import { ControllerSetup } from './controller-setup'
import { ImageUpload } from './image-upload'
import { VoucherPrintButtons } from './voucher-print'

interface DashboardStats {
  totalUsers: number
  pendingUsers: number
  activeSessions: number
  activeVouchers: number
}

interface WifiUser {
  id: string
  name: string
  email: string
  phone: string | null
  status: string
  macAddress: string | null
  dailyLimitMinutes: number | null
  sessionLimitMinutes: number | null
  speedLimitDown: number | null
  speedLimitUp: number | null
  totalTimeUsedToday: number | null
  trusted: boolean
  trustedUntil: Date | null
  createdAt: Date
}

interface WifiSession {
  id: string
  wifiUserId: string
  macAddress: string
  ipAddress: string | null
  startTime: Date
  status: string
  userName: string
  userEmail: string
}

interface Voucher {
  id: string
  code: string
  durationMinutes: number
  speedLimitDown: number | null
  speedLimitUp: number | null
  maxUses: number | null
  usedCount: number | null
  expiresAt: Date | null
  createdAt: Date
}

interface PortalSettings {
  portalTitle: string | null
  portalSubtitle: string | null
  logoUrl: string | null
  backgroundUrl: string | null
  primaryColor: string | null
  secondaryColor: string | null
  termsText: string | null
  successRedirectUrl: string | null
  defaultSessionMinutes: number | null
  defaultDailyMinutes: number | null
  defaultSpeedDown: number | null
  defaultSpeedUp: number | null
  requireApproval: boolean | null
  controllerType: string | null
  unifiControllerUrl: string | null
  unifiUsername: string | null
  unifiPassword: string | null
  unifiSite: string | null
  arubaControllerUrl: string | null
  arubaClientId: string | null
  arubaClientSecret: string | null
}

interface Admin {
  id: string
  name: string
  email: string
  createdAt: Date
}

interface AdminDashboardProps {
  stats: DashboardStats
  users: WifiUser[]
  sessions: WifiSession[]
  vouchers: Voucher[]
  pendingUsers: WifiUser[]
  settings: PortalSettings
  adminName: string
}

export function AdminDashboard({ 
  stats, 
  users, 
  sessions, 
  vouchers,
  pendingUsers,
  settings,
  adminName 
}: AdminDashboardProps) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState('overview')

  // Pagination state
  const ITEMS_PER_PAGE = 10
  const [usersPage, setUsersPage] = useState(1)
  const [sessionsPage, setSessionsPage] = useState(1)
  const [vouchersPage, setVouchersPage] = useState(1)

  // Auto-refresh state
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date())

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true)
    router.refresh()
    setLastUpdated(new Date())
    // Visual feedback for the spinner; server data arrives shortly after
    setTimeout(() => setIsRefreshing(false), 600)
  }, [router])

  // Periodically refresh the server data so the dashboard shows current info
  useEffect(() => {
    if (!autoRefresh) return
    const interval = setInterval(() => {
      router.refresh()
      setLastUpdated(new Date())
    }, 15000)
    return () => clearInterval(interval)
  }, [autoRefresh, router])

  const [voucherQuantity, setVoucherQuantity] = useState('5')
  const [voucherDuration, setVoucherDuration] = useState('60')
  const [generatedCodes, setGeneratedCodes] = useState<string[]>([])
  
  // Settings state
  const [portalTitle, setPortalTitle] = useState(settings.portalTitle || '')
  const [portalSubtitle, setPortalSubtitle] = useState(settings.portalSubtitle || '')
  const [logoUrl, setLogoUrl] = useState(settings.logoUrl || '')
  const [backgroundUrl, setBackgroundUrl] = useState(settings.backgroundUrl || '')
  const [termsText, setTermsText] = useState(settings.termsText || '')
  const [successRedirectUrl, setSuccessRedirectUrl] = useState(settings.successRedirectUrl || 'https://google.com')
  const [defaultSession, setDefaultSession] = useState(String(settings.defaultSessionMinutes || 120))
  const [defaultDaily, setDefaultDaily] = useState(String(settings.defaultDailyMinutes || 240))
  const [defaultSessionUnlimited, setDefaultSessionUnlimited] = useState(settings.defaultSessionMinutes === 0)
  const [defaultDailyUnlimited, setDefaultDailyUnlimited] = useState(settings.defaultDailyMinutes === 0)
  const [defaultSpeedDown, setDefaultSpeedDown] = useState(String(settings.defaultSpeedDown || 10240))
  const [defaultSpeedUp, setDefaultSpeedUp] = useState(String(settings.defaultSpeedUp || 5120))
  const [defaultSpeedDownUnlimited, setDefaultSpeedDownUnlimited] = useState(settings.defaultSpeedDown === 0)
  const [defaultSpeedUpUnlimited, setDefaultSpeedUpUnlimited] = useState(settings.defaultSpeedUp === 0)
  const [requireApproval, setRequireApproval] = useState(settings.requireApproval ?? true)

  // Admin management state
  const [adminList, setAdminList] = useState<Admin[]>([])
  const [newAdminName, setNewAdminName] = useState('')
  const [newAdminEmail, setNewAdminEmail] = useState('')
  const [newAdminPassword, setNewAdminPassword] = useState('')
  const [adminError, setAdminError] = useState('')
  const [adminSuccess, setAdminSuccess] = useState('')
  
  // Password change state
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordError, setPasswordError] = useState('')
const [passwordSuccess, setPasswordSuccess] = useState('')

  // Edit admin state
  const [editingAdmin, setEditingAdmin] = useState<Admin | null>(null)
  const [editAdminName, setEditAdminName] = useState('')
  const [editAdminEmail, setEditAdminEmail] = useState('')
  const [editAdminPassword, setEditAdminPassword] = useState('')
  const [showEditAdminPassword, setShowEditAdminPassword] = useState(false)
  const [editAdminError, setEditAdminError] = useState('')

  // WiFi User creation state
  const [newWifiUserName, setNewWifiUserName] = useState('')
  const [newWifiUserEmail, setNewWifiUserEmail] = useState('')
  const [newWifiUserPhone, setNewWifiUserPhone] = useState('')
  const [newWifiUserPassword, setNewWifiUserPassword] = useState('')
  const [newWifiUserMac, setNewWifiUserMac] = useState('')
  const [newWifiUserDailyLimit, setNewWifiUserDailyLimit] = useState('240')
  const [newWifiUserSessionLimit, setNewWifiUserSessionLimit] = useState('120')
  const [newWifiUserDailyUnlimited, setNewWifiUserDailyUnlimited] = useState(false)
  const [newWifiUserSessionUnlimited, setNewWifiUserSessionUnlimited] = useState(false)
  const [wifiUserError, setWifiUserError] = useState('')
  const [wifiUserSuccess, setWifiUserSuccess] = useState('')
  const [showCreateUserForm, setShowCreateUserForm] = useState(false)
  const [showWifiUserPassword, setShowWifiUserPassword] = useState(false)
  
  // Edit user state
  const [editingUser, setEditingUser] = useState<WifiUser | null>(null)
  const [editUserName, setEditUserName] = useState('')
  const [editUserEmail, setEditUserEmail] = useState('')
  const [editUserPhone, setEditUserPhone] = useState('')
  const [editUserPassword, setEditUserPassword] = useState('')
  const [editUserMac, setEditUserMac] = useState('')
  const [editUserDailyLimit, setEditUserDailyLimit] = useState('')
  const [editUserSessionLimit, setEditUserSessionLimit] = useState('')
  const [editUserDailyUnlimited, setEditUserDailyUnlimited] = useState(false)
  const [editUserSessionUnlimited, setEditUserSessionUnlimited] = useState(false)
  const [showEditPassword, setShowEditPassword] = useState(false)
  const [editUserError, setEditUserError] = useState('')
  const [editTrustedDuration, setEditTrustedDuration] = useState('permanent')
  const [editUserDevices, setEditUserDevices] = useState<Array<{
    id: string
    macAddress: string
    deviceName: string | null
    trusted: boolean
    trustedUntil: Date | null
    lastSeen: Date
  }>>([])
  const [deviceTrustDuration, setDeviceTrustDuration] = useState<Record<string, string>>({})
  
  const handleLogout = async () => {
    await logoutAdmin()
    window.location.href = '/admin/login'
  }

  const handleGenerateVouchers = async () => {
    const codes = await generateVouchers({
      quantity: parseInt(voucherQuantity),
      durationMinutes: parseInt(voucherDuration),
      createdBy: adminName,
    })
    setGeneratedCodes(codes)
  }

  const handleSaveSettings = async () => {
    await updatePortalSettings({
      portalTitle,
      portalSubtitle,
      logoUrl: logoUrl || null,
      backgroundUrl: backgroundUrl || null,
      termsText,
      successRedirectUrl,
      defaultSessionMinutes: defaultSessionUnlimited ? 0 : parseInt(defaultSession),
      defaultDailyMinutes: defaultDailyUnlimited ? 0 : parseInt(defaultDaily),
      defaultSpeedDown: defaultSpeedDownUnlimited ? 0 : parseInt(defaultSpeedDown),
      defaultSpeedUp: defaultSpeedUpUnlimited ? 0 : parseInt(defaultSpeedUp),
      requireApproval,
    })
    alert('Configurações salvas com sucesso!')
  }

  const loadAdmins = async () => {
    const result = await listAdmins()
    if (result.success && result.admins) {
      setAdminList(result.admins)
    }
  }

  const handleRegisterAdmin = async () => {
    setAdminError('')
    setAdminSuccess('')
    
    if (!newAdminName || !newAdminEmail || !newAdminPassword) {
      setAdminError('Preencha todos os campos')
      return
    }
    
    if (newAdminPassword.length < 6) {
      setAdminError('A senha deve ter no mínimo 6 caracteres')
      return
    }
    
    const result = await registerAdmin({
      name: newAdminName,
      email: newAdminEmail,
      password: newAdminPassword,
    })
    
    if (result.error) {
      setAdminError(result.error)
    } else {
      setAdminSuccess('Administrador cadastrado com sucesso!')
      setNewAdminName('')
      setNewAdminEmail('')
      setNewAdminPassword('')
      loadAdmins()
    }
  }

  const handleDeleteAdmin = async (adminId: string) => {
    if (!confirm('Tem certeza que deseja excluir este administrador?')) return
    
    const result = await removeAdmin(adminId)
    if (result.error) {
      alert(result.error)
    } else {
      loadAdmins()
    }
  }

  const openEditAdmin = (admin: Admin) => {
    setEditingAdmin(admin)
    setEditAdminName(admin.name)
    setEditAdminEmail(admin.email)
    setEditAdminPassword('')
    setEditAdminError('')
    setShowEditAdminPassword(false)
  }

  const handleUpdateAdmin = async () => {
    if (!editingAdmin) return
    setEditAdminError('')
    
    if (!editAdminName || !editAdminEmail) {
      setEditAdminError('Nome e email são obrigatórios')
      return
    }
    
    if (editAdminPassword && editAdminPassword.length < 6) {
      setEditAdminError('A senha deve ter no mínimo 6 caracteres')
      return
    }
    
    const result = await editAdmin(editingAdmin.id, {
      name: editAdminName,
      email: editAdminEmail,
      password: editAdminPassword || undefined,
    })
    
    if (result.error) {
      setEditAdminError(result.error)
    } else {
      setEditingAdmin(null)
      loadAdmins()
    }
  }

  const handleChangePassword = async () => {
    setPasswordError('')
    setPasswordSuccess('')
    
    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError('Preencha todos os campos')
      return
    }
    
    if (newPassword.length < 6) {
      setPasswordError('A nova senha deve ter no mínimo 6 caracteres')
      return
    }
    
    if (newPassword !== confirmPassword) {
      setPasswordError('As senhas não coincidem')
      return
    }
    
    const result = await updatePassword(currentPassword, newPassword)
    
    if (result.error) {
      setPasswordError(result.error)
    } else {
      setPasswordSuccess('Senha alterada com sucesso!')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    }
  }
  
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  const handleCreateWifiUser = async () => {
    setWifiUserError('')
    setWifiUserSuccess('')
    
    if (!newWifiUserName || !newWifiUserEmail || !newWifiUserPassword) {
      setWifiUserError('Nome, email e senha são obrigatórios')
      return
    }
    
    if (newWifiUserPassword.length < 6) {
      setWifiUserError('A senha deve ter no mínimo 6 caracteres')
      return
    }
    
const result = await createWifiUserByAdmin({
    name: newWifiUserName,
    email: newWifiUserEmail,
    phone: newWifiUserPhone || undefined,
    password: newWifiUserPassword,
    macAddress: newWifiUserMac || undefined,
    dailyLimitMinutes: newWifiUserDailyUnlimited ? 0 : parseInt(newWifiUserDailyLimit) || undefined,
    sessionLimitMinutes: newWifiUserSessionUnlimited ? 0 : parseInt(newWifiUserSessionLimit) || undefined,
  })
    
    if (result.error) {
      setWifiUserError(result.error)
    } else {
      setWifiUserSuccess(`Usuário ${newWifiUserName} cadastrado com sucesso!`)
      setNewWifiUserName('')
      setNewWifiUserEmail('')
      setNewWifiUserPhone('')
      setNewWifiUserPassword('')
      setNewWifiUserMac('')
      setShowCreateUserForm(false)
      // Reload page to refresh user list
window.location.reload()
    }
  }

  const openEditUser = async (user: WifiUser) => {
    setEditingUser(user)
    setEditUserName(user.name)
    setEditUserEmail(user.email)
    setEditUserPhone(user.phone || '')
    setEditUserMac(user.macAddress || '')
    setEditUserDailyLimit(String(user.dailyLimitMinutes || 240))
    setEditUserSessionLimit(String(user.sessionLimitMinutes || 120))
    setEditUserDailyUnlimited(user.dailyLimitMinutes === 0)
    setEditUserSessionUnlimited(user.sessionLimitMinutes === 0)
    setEditUserPassword('')
    setEditUserError('')
    setShowEditPassword(false)
    // Load user devices
    const devices = await getUserDevices(user.id)
    setEditUserDevices(devices)
    setDeviceTrustDuration({})
  }

  const handleUpdateUser = async () => {
    if (!editingUser) return
    setEditUserError('')
    
    if (!editUserName || !editUserEmail) {
      setEditUserError('Nome e email são obrigatórios')
      return
    }
    
const result = await updateWifiUser(editingUser.id, {
    name: editUserName,
    email: editUserEmail,
    phone: editUserPhone || undefined,
    macAddress: editUserMac || undefined,
    password: editUserPassword || undefined,
    dailyLimitMinutes: editUserDailyUnlimited ? 0 : parseInt(editUserDailyLimit) || undefined,
    sessionLimitMinutes: editUserSessionUnlimited ? 0 : parseInt(editUserSessionLimit) || undefined,
  })
    
    if (result.success) {
      setEditingUser(null)
      window.location.reload()
    } else {
      setEditUserError('Erro ao atualizar usuário')
    }
  }
  
  const copyAllCodes = () => {
    navigator.clipboard.writeText(generatedCodes.join('\n'))
  }

  const formatDuration = (startTime: Date) => {
    const now = new Date()
    const diff = Math.floor((now.getTime() - new Date(startTime).getTime()) / 60000)
    const hours = Math.floor(diff / 60)
    const mins = diff % 60
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/30">Aprovado</Badge>
      case 'pending':
        return <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 hover:bg-amber-500/30">Pendente</Badge>
      case 'blocked':
        return <Badge className="bg-red-500/20 text-red-400 border-red-500/30 hover:bg-red-500/30">Bloqueado</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  return (
    <div className="min-h-screen bg-background font-sans flex">
      {/* Decorative ambient glow */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-20 h-80 w-80 rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute top-1/3 right-0 h-96 w-96 rounded-full bg-accent/5 blur-3xl" />
      </div>

      {/* Sidebar */}
      <aside className="w-64 bg-card/60 backdrop-blur-xl border-r border-border/50 flex flex-col fixed h-screen z-10">
        {/* Logo */}
        <div className="p-6 border-b border-border/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg shadow-primary/25 ring-1 ring-white/10">
              <Wifi className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-foreground tracking-tight">WiFi Portal</h1>
              <p className="text-xs text-muted-foreground">Painel Admin</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1">
          <button
            onClick={() => setActiveTab('overview')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
              activeTab === 'overview' 
                ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20' 
                : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
            }`}
          >
            <TrendingUp className="w-5 h-5" />
            Visão Geral
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
              activeTab === 'users' 
                ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20' 
                : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
            }`}
          >
            <Users className="w-5 h-5" />
            Usuários
          </button>
          <button
            onClick={() => setActiveTab('sessions')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
              activeTab === 'sessions' 
                ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20' 
                : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
            }`}
          >
            <Wifi className="w-5 h-5" />
            Sessões
          </button>
          <button
            onClick={() => setActiveTab('vouchers')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
              activeTab === 'vouchers' 
                ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20' 
                : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
            }`}
          >
            <Ticket className="w-5 h-5" />
            Vouchers
          </button>
          <button
            onClick={() => { setActiveTab('admins'); loadAdmins(); }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
              activeTab === 'admins' 
                ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20' 
                : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
            }`}
          >
            <Shield className="w-5 h-5" />
            Admins
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
              activeTab === 'settings' 
                ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20' 
                : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
            }`}
          >
            <Settings className="w-5 h-5" />
            Configurações
          </button>
          <button
            onClick={() => setActiveTab('integration')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
              activeTab === 'integration' 
                ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20' 
                : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
            }`}
          >
            <Link2 className="w-5 h-5" />
            Controladora
          </button>
          <Link
            href="/admin/ajuda"
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all text-muted-foreground hover:text-foreground hover:bg-secondary/50"
          >
            <BookOpen className="w-5 h-5" />
            Ajuda
          </Link>
        </nav>

        {/* User Info & Logout */}
        <div className="p-4 border-t border-border/50">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center">
              <span className="text-sm font-medium text-primary">{adminName.charAt(0).toUpperCase()}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{adminName}</p>
              <p className="text-xs text-muted-foreground">Administrador</p>
            </div>
          </div>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={handleLogout}
            className="w-full justify-start text-muted-foreground hover:text-foreground hover:bg-secondary/50"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Sair
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 ml-64 p-8 relative z-10">
        {/* Header / Refresh bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <div>
            <h2 className="text-2xl font-semibold text-foreground tracking-tight text-balance">Painel de Controle</h2>
            <div className="flex items-center gap-2 mt-1">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400/70" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              </span>
              <p className="text-sm text-muted-foreground">
                {'Atualizado as '}
                {lastUpdated.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 rounded-xl border border-border/50 bg-card/50 px-3 py-2">
              <Switch
                id="auto-refresh"
                checked={autoRefresh}
                onCheckedChange={setAutoRefresh}
              />
              <Label htmlFor="auto-refresh" className="text-sm text-muted-foreground cursor-pointer">
                Atualização automática
              </Label>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="gap-2 bg-card/50"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            {
              label: 'Total de Usuários',
              value: stats.totalUsers,
              caption: 'cadastrados',
              captionClass: 'text-muted-foreground',
              Icon: Users,
              accent: 'text-primary',
              iconBg: 'from-primary/20 to-primary/5',
              bar: 'bg-primary',
              hover: 'hover:border-primary/50 hover:shadow-primary/10',
            },
            {
              label: 'Pendentes',
              value: stats.pendingUsers,
              caption: 'aguardando aprovação',
              captionClass: 'text-amber-400',
              Icon: Clock,
              accent: 'text-amber-500',
              iconBg: 'from-amber-500/20 to-amber-500/5',
              bar: 'bg-amber-500',
              hover: 'hover:border-amber-500/50 hover:shadow-amber-500/10',
            },
            {
              label: 'Sessões Ativas',
              value: stats.activeSessions,
              caption: 'conectados agora',
              captionClass: 'text-emerald-400',
              Icon: Activity,
              accent: 'text-emerald-500',
              iconBg: 'from-emerald-500/20 to-emerald-500/5',
              bar: 'bg-emerald-500',
              hover: 'hover:border-emerald-500/50 hover:shadow-emerald-500/10',
            },
            {
              label: 'Vouchers Ativos',
              value: stats.activeVouchers,
              caption: 'disponíveis',
              captionClass: 'text-sky-400',
              Icon: Ticket,
              accent: 'text-sky-500',
              iconBg: 'from-sky-500/20 to-sky-500/5',
              bar: 'bg-sky-500',
              hover: 'hover:border-sky-500/50 hover:shadow-sky-500/10',
            },
          ].map(({ label, value, caption, captionClass, Icon, accent, iconBg, bar, hover }) => (
            <Card
              key={label}
              className={`group relative overflow-hidden bg-card/50 border-border/50 transition-all duration-300 hover:shadow-xl ${hover}`}
            >
              <div className={`absolute inset-x-0 top-0 h-0.5 ${bar} opacity-60 group-hover:opacity-100 transition-opacity`} />
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground font-medium">{label}</p>
                    <p className="text-3xl font-bold text-foreground mt-1 tabular-nums tracking-tight">{value}</p>
                    <p className={`text-xs mt-1 ${captionClass}`}>{caption}</p>
                  </div>
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${iconBg} flex items-center justify-center ring-1 ring-inset ring-white/5 transition-transform duration-300 group-hover:scale-110`}>
                    <Icon className={`w-6 h-6 ${accent}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Main Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>

          {/* Overview Tab */}
          <TabsContent value="overview">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Pending Approvals */}
              <Card className="bg-card/50 border-border/50">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
                      <Clock className="w-4 h-4 text-amber-500" />
                    </div>
                    Aguardando Aprovação
                  </CardTitle>
                  <CardDescription>Usuários que precisam de aprovação</CardDescription>
                </CardHeader>
                <CardContent>
                  {pendingUsers.length === 0 ? (
                    <div className="text-center py-8">
                      <div className="w-12 h-12 rounded-full bg-secondary/50 flex items-center justify-center mx-auto mb-3">
                        <CheckCircle className="w-6 h-6 text-muted-foreground" />
                      </div>
                      <p className="text-sm text-muted-foreground">Nenhum usuário pendente</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {pendingUsers.slice(0, 5).map((user) => (
                        <div key={user.id} className="flex items-center justify-between p-4 bg-secondary/30 rounded-xl border border-border/30 hover:border-border/50 transition-colors">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                              <span className="text-sm font-semibold text-primary">
                                {user.name.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <div>
                              <p className="font-medium text-foreground">{user.name}</p>
                              <p className="text-sm text-muted-foreground">{user.email}</p>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button 
                              size="sm" 
                              variant="ghost"
                              className="text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10"
                              onClick={async () => { await approveUser(user.id); window.location.reload() }}
                            >
                              <CheckCircle className="w-4 h-4" />
                            </Button>
                            <Button 
                              size="sm" 
                              variant="ghost"
                              className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                              onClick={async () => { await blockUser(user.id); window.location.reload() }}
                            >
                              <XCircle className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Active Sessions */}
              <Card className="bg-card/50 border-border/50">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                      <Wifi className="w-4 h-4 text-emerald-500" />
                    </div>
                    Sessões Ativas
                  </CardTitle>
                  <CardDescription>Usuários conectados agora</CardDescription>
                </CardHeader>
                <CardContent>
                  {sessions.length === 0 ? (
                    <div className="text-center py-8">
                      <div className="w-12 h-12 rounded-full bg-secondary/50 flex items-center justify-center mx-auto mb-3">
                        <Wifi className="w-6 h-6 text-muted-foreground" />
                      </div>
                      <p className="text-sm text-muted-foreground">Nenhuma sessão ativa</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {sessions.slice(0, 5).map((session) => (
                        <div key={session.id} className="flex items-center justify-between p-4 bg-secondary/30 rounded-xl border border-border/30 hover:border-border/50 transition-colors">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
                              <Activity className="w-4 h-4 text-emerald-500" />
                            </div>
                            <div>
                              <p className="font-medium text-foreground">{session.userName}</p>
                              <p className="text-xs text-muted-foreground font-mono">{session.macAddress}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="text-right">
                              <p className="text-sm font-medium text-foreground">{formatDuration(session.startTime)}</p>
                              <p className="text-xs text-muted-foreground">conectado</p>
                            </div>
                            <Button 
                              size="sm" 
                              variant="ghost"
                              className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                              onClick={() => endSession(session.id)}
                            >
                              <XCircle className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Users Tab */}
          <TabsContent value="users">
            {/* Create User Form */}
            {showCreateUserForm && (
              <Card className="bg-card/50 border-border/50 mb-6">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Plus className="w-5 h-5 text-accent" />
                    Cadastrar Usuário WiFi
                  </CardTitle>
                  <CardDescription>Cadastre um novo usuário para acessar a rede WiFi</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {wifiUserError && (
                    <div className="p-3 bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl text-sm">
                      {wifiUserError}
                    </div>
                  )}
                  {wifiUserSuccess && (
                    <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-xl text-sm">
                      {wifiUserSuccess}
                    </div>
                  )}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-muted-foreground">Nome *</Label>
                      <Input
                        placeholder="Nome completo"
                        value={newWifiUserName}
                        onChange={(e) => setNewWifiUserName(e.target.value)}
                        className="bg-secondary/50 border-border/50"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-muted-foreground">Email *</Label>
                      <Input
                        type="email"
                        placeholder="email@exemplo.com"
                        value={newWifiUserEmail}
                        onChange={(e) => setNewWifiUserEmail(e.target.value)}
                        className="bg-secondary/50 border-border/50"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-muted-foreground">Telefone</Label>
                      <Input
                        placeholder="(00) 00000-0000"
                        value={newWifiUserPhone}
                        onChange={(e) => setNewWifiUserPhone(e.target.value)}
                        className="bg-secondary/50 border-border/50"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-muted-foreground">Senha *</Label>
                      <div className="relative">
                        <Input
                          type={showWifiUserPassword ? "text" : "password"}
                          placeholder="Mínimo 6 caracteres"
                          value={newWifiUserPassword}
                          onChange={(e) => setNewWifiUserPassword(e.target.value)}
                          className="bg-secondary/50 border-border/50 pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowWifiUserPassword(!showWifiUserPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                        >
                          {showWifiUserPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label className="text-muted-foreground">MAC Address (opcional)</Label>
                      <Input
                        placeholder="AA:BB:CC:DD:EE:FF"
                        value={newWifiUserMac}
                        onChange={(e) => setNewWifiUserMac(e.target.value)}
                        className="bg-secondary/50 border-border/50"
                      />
                      <p className="text-xs text-muted-foreground">
                        Se informado, o dispositivo será vinculado a este usuário
                      </p>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-muted-foreground">Limite Diário (min)</Label>
                        <label className="flex items-center gap-2 text-sm cursor-pointer">
                          <input
                            type="checkbox"
                            checked={newWifiUserDailyUnlimited}
                            onChange={(e) => setNewWifiUserDailyUnlimited(e.target.checked)}
                            className="rounded border-border"
                          />
                          <span className="text-muted-foreground">Ilimitado</span>
                        </label>
                      </div>
                      <Input
                        type="number"
                        placeholder="240"
                        value={newWifiUserDailyLimit}
                        onChange={(e) => setNewWifiUserDailyLimit(e.target.value)}
                        disabled={newWifiUserDailyUnlimited}
                        className="bg-secondary/50 border-border/50 disabled:opacity-50"
                      />
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-muted-foreground">Limite por Sessão (min)</Label>
                        <label className="flex items-center gap-2 text-sm cursor-pointer">
                          <input
                            type="checkbox"
                            checked={newWifiUserSessionUnlimited}
                            onChange={(e) => setNewWifiUserSessionUnlimited(e.target.checked)}
                            className="rounded border-border"
                          />
                          <span className="text-muted-foreground">Ilimitado</span>
                        </label>
                      </div>
                      <Input
                        type="number"
                        placeholder="120"
                        value={newWifiUserSessionLimit}
                        onChange={(e) => setNewWifiUserSessionLimit(e.target.value)}
                        disabled={newWifiUserSessionUnlimited}
                        className="bg-secondary/50 border-border/50 disabled:opacity-50"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2 pt-2">
                    <Button onClick={handleCreateWifiUser} className="bg-accent hover:bg-accent/90">
                      <Plus className="w-4 h-4 mr-2" />
                      Cadastrar Usuário
                    </Button>
                    <Button variant="outline" onClick={() => setShowCreateUserForm(false)}>
                      Cancelar
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            <Card className="bg-card/50 border-border/50">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="w-5 h-5 text-primary" />
                      Gerenciar Usuários
                    </CardTitle>
                    <CardDescription>Lista de todos os usuários cadastrados no portal</CardDescription>
                  </div>
                  {!showCreateUserForm && (
                    <Button onClick={() => setShowCreateUserForm(true)} className="bg-accent hover:bg-accent/90">
                      <Plus className="w-4 h-4 mr-2" />
                      Novo Usuário
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="rounded-xl border border-border/50 overflow-hidden max-h-[500px] overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-secondary/30 hover:bg-secondary/30 border-border/30">
                        <TableHead className="text-muted-foreground font-medium">Usuário</TableHead>
                        <TableHead className="text-muted-foreground font-medium">Status</TableHead>
                        <TableHead className="text-muted-foreground font-medium">Limite Diário</TableHead>
                        <TableHead className="text-muted-foreground font-medium">Usado Hoje</TableHead>
                        <TableHead className="text-muted-foreground font-medium text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                            Nenhum usuário cadastrado
                          </TableCell>
                        </TableRow>
                      ) : (
                        users.slice((usersPage - 1) * ITEMS_PER_PAGE, usersPage * ITEMS_PER_PAGE).map((user) => (
                          <TableRow key={user.id} className="border-border/30 hover:bg-secondary/20">
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                                  <span className="text-xs font-semibold text-primary">
                                    {user.name.charAt(0).toUpperCase()}
                                  </span>
                                </div>
                                <div>
                                  <p className="font-medium text-foreground">{user.name}</p>
                                  <p className="text-xs text-muted-foreground">{user.email}</p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                {getStatusBadge(user.status)}
                                {user.trusted && (
                                  <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 hover:bg-blue-500/30">
                                    <KeyRound className="w-3 h-3 mr-1" />
                                    Confiável
                                  </Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-muted-foreground">{user.dailyLimitMinutes || 240} min</TableCell>
                            <TableCell className="text-muted-foreground">{user.totalTimeUsedToday || 0} min</TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-1">
                                {user.status === 'pending' && (
                                  <Button 
                                    size="sm" 
                                    variant="ghost"
                                    className="text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10"
                                    onClick={() => approveUser(user.id)}
                                  >
                                    <UserCheck className="w-4 h-4" />
                                  </Button>
                                )}
                                {user.status !== 'blocked' && (
                                  <Button 
                                    size="sm" 
                                    variant="ghost"
                                    className="text-amber-400 hover:text-amber-300 hover:bg-amber-500/10"
                                    onClick={() => blockUser(user.id)}
                                  >
                                    <Ban className="w-4 h-4" />
                                  </Button>
                                )}
                                {user.status === 'blocked' && (
                                  <Button 
                                    size="sm" 
                                    variant="ghost"
                                    className="text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10"
                                    onClick={() => approveUser(user.id)}
                                  >
                                    <CheckCircle className="w-4 h-4" />
                                  </Button>
                                )}
                                {user.status === 'approved' && !user.trusted && (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="text-blue-400 hover:text-blue-300 hover:bg-blue-500/10"
                                    title="Marcar como dispositivo confiável"
                                    onClick={async () => { await setTrustedDevice(user.id, 'permanent'); router.refresh() }}
                                  >
                                    <KeyRound className="w-4 h-4" />
                                  </Button>
                                )}
                                {user.trusted && (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="text-blue-300 hover:text-red-300 hover:bg-red-500/10 bg-blue-500/10"
                                    title="Remover confiança do dispositivo"
                                    onClick={async () => { await removeTrustedDevice(user.id); router.refresh() }}
                                  >
                                    <KeyRound className="w-4 h-4" />
                                  </Button>
                                )}
<Button
                            size="sm"
                            variant="ghost"
                            className="text-primary hover:text-primary/80 hover:bg-primary/10"
                            onClick={() => openEditUser(user)}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                            onClick={() => deleteWifiUser(user.id)}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
                {users.length > ITEMS_PER_PAGE && (
                  <div className="flex items-center justify-between pt-4">
                    <p className="text-sm text-muted-foreground">
                      Mostrando {((usersPage - 1) * ITEMS_PER_PAGE) + 1}-{Math.min(usersPage * ITEMS_PER_PAGE, users.length)} de {users.length}
                    </p>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={usersPage === 1}
                        onClick={() => setUsersPage(p => p - 1)}
                      >
                        Anterior
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={usersPage * ITEMS_PER_PAGE >= users.length}
                        onClick={() => setUsersPage(p => p + 1)}
                      >
                        Próxima
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
</Card>

            {/* Edit User Modal */}
            {editingUser && (
              <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                <Card className="w-full max-w-lg bg-card border-border max-h-[90vh] overflow-y-auto">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Pencil className="w-5 h-5 text-primary" />
                      Editar Usuário
                    </CardTitle>
                    <CardDescription>Altere os dados do usuário {editingUser.name}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {editUserError && (
                      <div className="p-3 bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl text-sm">
                        {editUserError}
                      </div>
                    )}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-muted-foreground">Nome *</Label>
                        <Input
                          placeholder="Nome completo"
                          value={editUserName}
                          onChange={(e) => setEditUserName(e.target.value)}
                          className="bg-secondary/50 border-border/50"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-muted-foreground">Email *</Label>
                        <Input
                          type="email"
                          placeholder="email@exemplo.com"
                          value={editUserEmail}
                          onChange={(e) => setEditUserEmail(e.target.value)}
                          className="bg-secondary/50 border-border/50"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-muted-foreground">Telefone</Label>
                        <Input
                          placeholder="(00) 00000-0000"
                          value={editUserPhone}
                          onChange={(e) => setEditUserPhone(e.target.value)}
                          className="bg-secondary/50 border-border/50"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-muted-foreground">Nova Senha (deixe vazio para manter)</Label>
                        <div className="relative">
                          <Input
                            type={showEditPassword ? "text" : "password"}
                            placeholder="Nova senha"
                            value={editUserPassword}
                            onChange={(e) => setEditUserPassword(e.target.value)}
                            className="bg-secondary/50 border-border/50 pr-10"
                          />
                          <button
                            type="button"
                            onClick={() => setShowEditPassword(!showEditPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                          >
                            {showEditPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-muted-foreground">MAC Address</Label>
                        <Input
                          placeholder="AA:BB:CC:DD:EE:FF"
                          value={editUserMac}
                          onChange={(e) => setEditUserMac(e.target.value)}
                          className="bg-secondary/50 border-border/50"
                        />
                      </div>
<div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-muted-foreground">Limite Diário (min)</Label>
                        <label className="flex items-center gap-2 text-sm cursor-pointer">
                          <input
                            type="checkbox"
                            checked={editUserDailyUnlimited}
                            onChange={(e) => setEditUserDailyUnlimited(e.target.checked)}
                            className="rounded border-border"
                          />
                          <span className="text-muted-foreground">Ilimitado</span>
                        </label>
                      </div>
                      <Input
                        type="number"
                        placeholder="240"
                        value={editUserDailyLimit}
                        onChange={(e) => setEditUserDailyLimit(e.target.value)}
                        disabled={editUserDailyUnlimited}
                        className="bg-secondary/50 border-border/50 disabled:opacity-50"
                      />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-muted-foreground">Limite por Sessão (min)</Label>
                        <label className="flex items-center gap-2 text-sm cursor-pointer">
                          <input
                            type="checkbox"
                            checked={editUserSessionUnlimited}
                            onChange={(e) => setEditUserSessionUnlimited(e.target.checked)}
                            className="rounded border-border"
                          />
                          <span className="text-muted-foreground">Ilimitado</span>
                        </label>
                      </div>
                      <Input
                        type="number"
                        placeholder="120"
                        value={editUserSessionLimit}
                        onChange={(e) => setEditUserSessionLimit(e.target.value)}
                        disabled={editUserSessionUnlimited}
                        className="bg-secondary/50 border-border/50 disabled:opacity-50"
                      />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label className="text-muted-foreground flex items-center gap-2">
                        <Smartphone className="w-4 h-4 text-blue-400" />
                        Dispositivos ({editUserDevices.length}/3)
                      </Label>
                      {editUserDevices.length === 0 ? (
                        <p className="text-xs text-muted-foreground">
                          Nenhum dispositivo registrado. O MAC é salvo automaticamente quando o usuário faz login pelo portal.
                        </p>
                      ) : (
                        <div className="space-y-2">
                          {editUserDevices.map((device) => (
                            <div key={device.id} className="flex items-center gap-2 p-2 rounded-lg bg-secondary/30 border border-border/30">
                              <Smartphone className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-mono text-foreground truncate">{device.macAddress}</p>
                                <p className="text-xs text-muted-foreground">
                                  {device.deviceName || 'Sem nome'} · Visto {new Date(device.lastSeen).toLocaleDateString('pt-BR')}
                                </p>
                              </div>
                              {device.trusted ? (
                                <div className="flex items-center gap-1">
                                  <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 text-xs">
                                    <Shield className="w-3 h-3 mr-1" />
                                    Confiável
                                  </Badge>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-6 w-6 p-0 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                                    title="Remover confiança"
                                    onClick={async () => {
                                      await removeDeviceTrust(device.id)
                                      const devices = await getUserDevices(editingUser!.id)
                                      setEditUserDevices(devices)
                                    }}
                                  >
                                    <XCircle className="w-3 h-3" />
                                  </Button>
                                </div>
                              ) : (
                                <div className="flex items-center gap-1">
                                  <select
                                    value={deviceTrustDuration[device.id] || 'permanent'}
                                    onChange={(e) => setDeviceTrustDuration(prev => ({ ...prev, [device.id]: e.target.value }))}
                                    className="h-7 rounded border border-border/50 bg-secondary/50 px-1 text-xs text-foreground"
                                  >
                                    <option value="permanent">Permanente</option>
                                    <option value="7days">7 dias</option>
                                    <option value="30days">30 dias</option>
                                    <option value="90days">90 dias</option>
                                  </select>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-6 w-6 p-0 text-blue-400 hover:text-blue-300 hover:bg-blue-500/10"
                                    title="Marcar como confiável"
                                    onClick={async () => {
                                      await setDeviceTrusted(device.id, deviceTrustDuration[device.id] || 'permanent')
                                      const devices = await getUserDevices(editingUser!.id)
                                      setEditUserDevices(devices)
                                    }}
                                  >
                                    <Shield className="w-3 h-3" />
                                  </Button>
                                </div>
                              )}
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-6 w-6 p-0 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                                title="Remover dispositivo"
                                onClick={async () => {
                                  await removeDevice(device.id)
                                  const devices = await getUserDevices(editingUser!.id)
                                  setEditUserDevices(devices)
                                }}
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2 pt-4">
                      <Button onClick={handleUpdateUser} className="bg-primary hover:bg-primary/90">
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Salvar Alteracoes
                      </Button>
                      <Button variant="outline" onClick={() => setEditingUser(null)}>
                        Cancelar
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>
          
          {/* Sessions Tab */}
          <TabsContent value="sessions">
            <Card className="bg-card/50 border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wifi className="w-5 h-5 text-emerald-500" />
                  Sessões de Conexão
                </CardTitle>
                <CardDescription>Monitore as conexoes ativas</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-xl border border-border/50 overflow-hidden max-h-[500px] overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-secondary/30 hover:bg-secondary/30 border-border/30">
                        <TableHead className="text-muted-foreground font-medium">Usuário</TableHead>
                        <TableHead className="text-muted-foreground font-medium">MAC Address</TableHead>
                        <TableHead className="text-muted-foreground font-medium">IP</TableHead>
                        <TableHead className="text-muted-foreground font-medium">Tempo</TableHead>
                        <TableHead className="text-muted-foreground font-medium text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sessions.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                            Nenhuma sessão ativa
                          </TableCell>
                        </TableRow>
                      ) : (
                        sessions.slice((sessionsPage - 1) * ITEMS_PER_PAGE, sessionsPage * ITEMS_PER_PAGE).map((session) => (
                          <TableRow key={session.id} className="border-border/30 hover:bg-secondary/20">
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center">
                                  <Activity className="w-4 h-4 text-emerald-500" />
                                </div>
                                <div>
                                  <p className="font-medium text-foreground">{session.userName}</p>
                                  <p className="text-xs text-muted-foreground">{session.userEmail}</p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="font-mono text-sm text-muted-foreground">{session.macAddress}</TableCell>
                            <TableCell className="text-muted-foreground">{session.ipAddress || '-'}</TableCell>
                            <TableCell>
                              <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                                {formatDuration(session.startTime)}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <Button 
                                size="sm" 
                                variant="ghost"
                                className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                                onClick={() => endSession(session.id)}
                              >
                                <XCircle className="w-4 h-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
                {sessions.length > ITEMS_PER_PAGE && (
                  <div className="flex items-center justify-between pt-4">
                    <p className="text-sm text-muted-foreground">
                      Mostrando {((sessionsPage - 1) * ITEMS_PER_PAGE) + 1}-{Math.min(sessionsPage * ITEMS_PER_PAGE, sessions.length)} de {sessions.length}
                    </p>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={sessionsPage === 1}
                        onClick={() => setSessionsPage(p => p - 1)}
                      >
                        Anterior
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={sessionsPage * ITEMS_PER_PAGE >= sessions.length}
                        onClick={() => setSessionsPage(p => p + 1)}
                      >
                        Próxima
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Vouchers Tab */}
          <TabsContent value="vouchers">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card className="bg-card/50 border-border/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="w-5 h-5 text-violet-500" />
                    Gerar Vouchers
                  </CardTitle>
                  <CardDescription>Crie codigos de acesso rapido</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">Quantidade</Label>
                    <Input
                      type="number"
                      value={voucherQuantity}
                      onChange={(e) => setVoucherQuantity(e.target.value)}
                      className="bg-secondary/50 border-border/50 focus:border-primary"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">Duração (minutos)</Label>
                    <Input
                      type="number"
                      value={voucherDuration}
                      onChange={(e) => setVoucherDuration(e.target.value)}
                      className="bg-secondary/50 border-border/50 focus:border-primary"
                    />
                  </div>
                  <Button onClick={handleGenerateVouchers} className="w-full bg-primary hover:bg-primary/90">
                    <Zap className="w-4 h-4 mr-2" />
                    Gerar Vouchers
                  </Button>
                  
                  {generatedCodes.length > 0 && (
                    <div className="mt-4 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center justify-between">
                      <p className="text-sm text-emerald-400">{generatedCodes.length} voucher(s) gerados com sucesso</p>
                      <Button size="sm" variant="ghost" onClick={copyAllCodes} className="text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10">
                        <Copy className="w-3 h-3 mr-1" />
                        Copiar todos
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="lg:col-span-2 bg-card/50 border-border/50">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Ticket className="w-5 h-5 text-violet-500" />
                        Vouchers Disponíveis
                      </CardTitle>
                      <CardDescription>{vouchers.filter(v => (v.usedCount || 0) < (v.maxUses || 1)).length} voucher(s) disponíveis para uso</CardDescription>
                    </div>
                    <VoucherPrintButtons
                      vouchers={vouchers}
                      portalTitle={settings.portalTitle || 'WiFi'}
                    />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="rounded-xl border border-border/50 overflow-hidden max-h-[500px] overflow-y-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-secondary/30 hover:bg-secondary/30 border-border/30">
                          <TableHead className="text-muted-foreground font-medium">Código</TableHead>
                          <TableHead className="text-muted-foreground font-medium">Duração</TableHead>
                          <TableHead className="text-muted-foreground font-medium">Usos</TableHead>
                          <TableHead className="text-muted-foreground font-medium text-right">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {vouchers.filter(v => (v.usedCount || 0) < (v.maxUses || 1)).length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                              Nenhum voucher disponível
                            </TableCell>
                          </TableRow>
                        ) : (
                          vouchers.filter(v => (v.usedCount || 0) < (v.maxUses || 1)).slice((vouchersPage - 1) * ITEMS_PER_PAGE, vouchersPage * ITEMS_PER_PAGE).map((voucher) => (
                            <TableRow key={voucher.id} className="border-border/30 hover:bg-secondary/20">
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <code className="px-2 py-1 bg-secondary/50 rounded-lg text-sm font-mono text-foreground">
                                    {voucher.code}
                                  </code>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => copyToClipboard(voucher.code)}
                                    className="text-muted-foreground hover:text-foreground h-6 w-6 p-0"
                                  >
                                    <Copy className="w-3 h-3" />
                                  </Button>
                                </div>
                              </TableCell>
                              <TableCell className="text-muted-foreground">{voucher.durationMinutes} min</TableCell>
                              <TableCell className="text-muted-foreground">{voucher.usedCount || 0}/{voucher.maxUses || 1}</TableCell>
                              <TableCell className="text-right">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => deleteVoucher(voucher.id)}
                                  className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                  {vouchers.filter(v => (v.usedCount || 0) < (v.maxUses || 1)).length > ITEMS_PER_PAGE && (
                    <div className="flex items-center justify-between pt-4">
                      <p className="text-sm text-muted-foreground">
                        Mostrando {((vouchersPage - 1) * ITEMS_PER_PAGE) + 1}-{Math.min(vouchersPage * ITEMS_PER_PAGE, vouchers.filter(v => (v.usedCount || 0) < (v.maxUses || 1)).length)} de {vouchers.filter(v => (v.usedCount || 0) < (v.maxUses || 1)).length} disponíveis
                      </p>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={vouchersPage === 1}
                          onClick={() => setVouchersPage(p => p - 1)}
                        >
                          Anterior
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={vouchersPage * ITEMS_PER_PAGE >= vouchers.filter(v => (v.usedCount || 0) < (v.maxUses || 1)).length}
                          onClick={() => setVouchersPage(p => p + 1)}
                        >
                          Próxima
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Admins Tab */}
          <TabsContent value="admins">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="bg-card/50 border-border/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Plus className="w-5 h-5 text-primary" />
                    Cadastrar Administrador
                  </CardTitle>
                  <CardDescription>Adicione um novo administrador ao sistema</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {adminError && (
                    <div className="p-3 bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl text-sm">
                      {adminError}
                    </div>
                  )}
                  {adminSuccess && (
                    <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-xl text-sm">
                      {adminSuccess}
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">Nome</Label>
                    <Input
                      value={newAdminName}
                      onChange={(e) => setNewAdminName(e.target.value)}
                      placeholder="Nome do administrador"
                      className="bg-secondary/50 border-border/50 focus:border-primary"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">Email</Label>
                    <Input
                      type="email"
                      value={newAdminEmail}
                      onChange={(e) => setNewAdminEmail(e.target.value)}
                      placeholder="email@exemplo.com"
                      className="bg-secondary/50 border-border/50 focus:border-primary"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">Senha</Label>
                    <Input
                      type="password"
                      value={newAdminPassword}
                      onChange={(e) => setNewAdminPassword(e.target.value)}
                      placeholder="Mínimo 6 caracteres"
                      className="bg-secondary/50 border-border/50 focus:border-primary"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={handleRegisterAdmin} className="flex-1 bg-primary hover:bg-primary/90">
                      <Plus className="w-4 h-4 mr-2" />
                      Cadastrar Administrador
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        setNewAdminName('')
                        setNewAdminEmail('')
                        setNewAdminPassword('')
                        setAdminError('')
                        setAdminSuccess('')
                      }}
                    >
                      Cancelar
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card className="mt-6 bg-card/50 border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5 text-violet-500" />
                  Administradores Cadastrados
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="rounded-xl border border-border/50 overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-secondary/30 hover:bg-secondary/30 border-border/30">
                        <TableHead className="text-muted-foreground font-medium">Nome</TableHead>
                        <TableHead className="text-muted-foreground font-medium">Email</TableHead>
                        <TableHead className="text-muted-foreground font-medium">Data de Cadastro</TableHead>
                        <TableHead className="text-muted-foreground font-medium text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {adminList.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                            Clique na aba para carregar os administradores
                          </TableCell>
                        </TableRow>
                      ) : (
                        adminList.map((admin) => (
                          <TableRow key={admin.id} className="border-border/30 hover:bg-secondary/20">
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-violet-500/20 flex items-center justify-center">
                                  <Shield className="w-4 h-4 text-violet-500" />
                                </div>
                                <span className="font-medium text-foreground">{admin.name}</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-muted-foreground">{admin.email}</TableCell>
                            <TableCell className="text-muted-foreground">
                              {new Date(admin.createdAt).toLocaleDateString('pt-BR')}
                            </TableCell>
<TableCell className="text-right">
                              <div className="flex justify-end gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => openEditAdmin(admin)}
                                  className="text-primary hover:text-primary/80 hover:bg-primary/10"
                                >
                                  <Pencil className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDeleteAdmin(admin.id)}
                                  className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
</Card>

  {/* Edit Admin Modal */}
  {editingAdmin && (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Pencil className="w-5 h-5 text-primary" />
            Alterar Administrador
          </CardTitle>
          <CardDescription>Altere os dados do administrador {editingAdmin.name}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {editAdminError && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl text-sm">
              {editAdminError}
            </div>
          )}
          <div className="space-y-2">
            <Label className="text-muted-foreground">Nome *</Label>
            <Input
              placeholder="Nome do administrador"
              value={editAdminName}
              onChange={(e) => setEditAdminName(e.target.value)}
              className="bg-secondary/50 border-border/50"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-muted-foreground">Email *</Label>
            <Input
              type="email"
              placeholder="email@exemplo.com"
              value={editAdminEmail}
              onChange={(e) => setEditAdminEmail(e.target.value)}
              className="bg-secondary/50 border-border/50"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-muted-foreground">Nova Senha (deixe vazio para manter)</Label>
            <div className="relative">
              <Input
                type={showEditAdminPassword ? "text" : "password"}
                placeholder="Nova senha"
                value={editAdminPassword}
                onChange={(e) => setEditAdminPassword(e.target.value)}
                className="bg-secondary/50 border-border/50 pr-10"
              />
              <button
                type="button"
                onClick={() => setShowEditAdminPassword(!showEditAdminPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showEditAdminPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <div className="flex gap-2 pt-4">
            <Button onClick={handleUpdateAdmin} className="bg-primary hover:bg-primary/90">
              <CheckCircle className="w-4 h-4 mr-2" />
              Salvar Alteracoes
            </Button>
            <Button variant="outline" onClick={() => setEditingAdmin(null)}>
              Cancelar
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )}
  </TabsContent>
  
  {/* Settings Tab */}
          <TabsContent value="settings">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="bg-card/50 border-border/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="w-5 h-5 text-primary" />
                    Configurações do Portal
                  </CardTitle>
                  <CardDescription>Personalize a aparencia do portal captivo</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">Título do Portal</Label>
                    <Input
                      value={portalTitle}
                      onChange={(e) => setPortalTitle(e.target.value)}
                      placeholder="WiFi Gratuito"
                      className="bg-secondary/50 border-border/50 focus:border-primary"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">Subtitulo</Label>
                    <Input
                      value={portalSubtitle}
                      onChange={(e) => setPortalSubtitle(e.target.value)}
                      placeholder="Conecte-se a nossa rede"
                      className="bg-secondary/50 border-border/50 focus:border-primary"
                    />
                  </div>
                  <ImageUpload
                    label="Logo"
                    value={logoUrl}
                    onChange={setLogoUrl}
                    previewMode="logo"
                    placeholder="https://exemplo.com/logo.png"
                    hint="Exibido no topo da tela de login"
                  />
                  <ImageUpload
                    label="Imagem de Fundo"
                    value={backgroundUrl}
                    onChange={setBackgroundUrl}
                    previewMode="background"
                    placeholder="https://exemplo.com/fundo.jpg"
                    hint="Fundo da tela de login do portal. Deixe vazio para usar o padrao"
                  />
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">Termos de Uso</Label>
                    <Textarea
                      value={termsText}
                      onChange={(e) => setTermsText(e.target.value)}
                      placeholder="Digite os termos de uso..."
                      rows={4}
                      className="bg-secondary/50 border-border/50 focus:border-primary"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">URL de Redirecionamento Pos-Login</Label>
                    <Input
                      value={successRedirectUrl}
                      onChange={(e) => setSuccessRedirectUrl(e.target.value)}
                      placeholder="https://google.com"
                      className="bg-secondary/50 border-border/50 focus:border-primary"
                    />
                    <p className="text-xs text-muted-foreground">Página que o usuário verá apos conectar ao WiFi</p>
                  </div>
                  <div className="flex items-center justify-between p-4 rounded-xl bg-secondary/30 border border-border/30">
                    <div>
                      <Label className="text-foreground">Requer Aprovação</Label>
                      <p className="text-xs text-muted-foreground">Novos usuários precisam ser aprovados</p>
                    </div>
                    <Switch
                      checked={requireApproval}
                      onCheckedChange={setRequireApproval}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-card/50 border-border/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="w-5 h-5 text-accent" />
                    Limites Padrão
                  </CardTitle>
                  <CardDescription>Configure os limites padrao para novos usuários</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-muted-foreground">Sessão (min)</Label>
                        <label className="flex items-center gap-2 text-sm cursor-pointer">
                          <input
                            type="checkbox"
                            checked={defaultSessionUnlimited}
                            onChange={(e) => setDefaultSessionUnlimited(e.target.checked)}
                            className="rounded border-border"
                          />
                          <span className="text-muted-foreground">Ilimitado</span>
                        </label>
                      </div>
                      <Input
                        type="number"
                        value={defaultSession}
                        onChange={(e) => setDefaultSession(e.target.value)}
                        disabled={defaultSessionUnlimited}
                        className="bg-secondary/50 border-border/50 focus:border-primary disabled:opacity-50"
                      />
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-muted-foreground">Diário (min)</Label>
                        <label className="flex items-center gap-2 text-sm cursor-pointer">
                          <input
                            type="checkbox"
                            checked={defaultDailyUnlimited}
                            onChange={(e) => setDefaultDailyUnlimited(e.target.checked)}
                            className="rounded border-border"
                          />
                          <span className="text-muted-foreground">Ilimitado</span>
                        </label>
                      </div>
                      <Input
                        type="number"
                        value={defaultDaily}
                        onChange={(e) => setDefaultDaily(e.target.value)}
                        disabled={defaultDailyUnlimited}
                        className="bg-secondary/50 border-border/50 focus:border-primary disabled:opacity-50"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-muted-foreground">Download (Kbps)</Label>
                        <label className="flex items-center gap-2 text-sm cursor-pointer">
                          <input
                            type="checkbox"
                            checked={defaultSpeedDownUnlimited}
                            onChange={(e) => setDefaultSpeedDownUnlimited(e.target.checked)}
                            className="rounded border-border"
                          />
                          <span className="text-muted-foreground">Ilimitado</span>
                        </label>
                      </div>
                      <Input
                        type="number"
                        value={defaultSpeedDown}
                        onChange={(e) => setDefaultSpeedDown(e.target.value)}
                        disabled={defaultSpeedDownUnlimited}
                        className="bg-secondary/50 border-border/50 focus:border-primary disabled:opacity-50"
                      />
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-muted-foreground">Upload (Kbps)</Label>
                        <label className="flex items-center gap-2 text-sm cursor-pointer">
                          <input
                            type="checkbox"
                            checked={defaultSpeedUpUnlimited}
                            onChange={(e) => setDefaultSpeedUpUnlimited(e.target.checked)}
                            className="rounded border-border"
                          />
                          <span className="text-muted-foreground">Ilimitado</span>
                        </label>
                      </div>
                      <Input
                        type="number"
                        value={defaultSpeedUp}
                        onChange={(e) => setDefaultSpeedUp(e.target.value)}
                        disabled={defaultSpeedUpUnlimited}
                        className="bg-secondary/50 border-border/50 focus:border-primary disabled:opacity-50"
                      />
                    </div>
                  </div>
                  <Button onClick={handleSaveSettings} className="w-full bg-primary hover:bg-primary/90">
                    <Settings className="w-4 h-4 mr-2" />
                    Salvar Configurações
                  </Button>
                </CardContent>
              </Card>
            </div>
            </TabsContent>

{/* Integration Tab */}
          <TabsContent value="integration">
            <ControllerSetup 
              portalUrl={typeof window !== 'undefined' ? window.location.origin : ''} 
              settings={{
                controllerType: settings.controllerType,
                unifiControllerUrl: settings.unifiControllerUrl,
                unifiUsername: settings.unifiUsername,
                unifiPassword: settings.unifiPassword,
                unifiSite: settings.unifiSite,
                arubaControllerUrl: settings.arubaControllerUrl,
                arubaClientId: settings.arubaClientId,
                arubaClientSecret: settings.arubaClientSecret,
              }}
            />
          </TabsContent>
          </Tabs>
      </main>
    </div>
  )
}

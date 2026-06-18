import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { AdminDashboard } from '@/components/admin/admin-dashboard'
import { 
  getDashboardStats, 
  getWifiUsers, 
  getActiveSessions, 
  getVouchers,
  getPendingUsers,
  getPortalSettings
} from '@/app/actions/wifi'

export default async function AdminPage() {
  const session = await getSession()
  
  if (!session?.user) {
    redirect('/admin/login')
  }

  // Check if user is admin
  if (session.user.role !== 'admin') {
    redirect('/admin/login')
  }

  const [stats, users, sessions, vouchers, pendingUsers, settings] = await Promise.all([
    getDashboardStats(),
    getWifiUsers(),
    getActiveSessions(),
    getVouchers(),
    getPendingUsers(),
    getPortalSettings(),
  ])

  return (
    <AdminDashboard 
      stats={stats}
      users={users.items}
      sessions={sessions.items}
      vouchers={vouchers.items}
      pendingUsers={pendingUsers}
      settings={settings}
      adminName={session.user.name || 'Admin'}
    />
  )
}

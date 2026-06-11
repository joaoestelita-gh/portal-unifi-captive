import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { HelpCenter } from '@/components/admin/help-center'

export default async function AjudaPage() {
  const session = await getSession()

  if (!session?.user || session.user.role !== 'admin') {
    redirect('/admin/login')
  }

  return <HelpCenter />
}

'use server'

import { signIn, signOut, getSession, createUser, changePassword, getAllAdmins, deleteAdmin, updateAdmin } from '@/lib/auth'
import { loginSchema, registerAdminSchema, changePasswordSchema } from '@/lib/validations'
import { revalidatePath } from 'next/cache'

export async function loginAdmin(email: string, password: string) {
  const parsed = loginSchema.safeParse({ email, password })
  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message || 'Dados inválidos' }
  }

  try {
    const user = await signIn(parsed.data.email, parsed.data.password)
    
    if (user.role !== 'admin') {
      return { error: 'Acesso negado. Apenas administradores podem acessar.' }
    }
    
    return { success: true, user }
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Erro ao fazer login' }
  }
}

export async function logoutAdmin() {
  await signOut()
  return { success: true }
}

export async function getCurrentUser() {
  const session = await getSession()
  return session?.user || null
}

export async function registerAdmin(data: { name: string; email: string; password: string }) {
  const parsed = registerAdminSchema.safeParse(data)
  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message || 'Dados inválidos' }
  }

  try {
    const session = await getSession()
    if (!session || session.user.role !== 'admin') {
      return { error: 'Acesso negado' }
    }
    
    const user = await createUser({
      name: parsed.data.name,
      email: parsed.data.email,
      password: parsed.data.password,
      role: 'admin',
    })
    
    revalidatePath('/admin')
    return { success: true, user }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erro ao cadastrar administrador'
    if (message.includes('unique') || message.includes('duplicate')) {
      return { error: 'Este email já está cadastrado' }
    }
    return { error: message }
  }
}

export async function updatePassword(currentPassword: string, newPassword: string) {
  const parsed = changePasswordSchema.safeParse({ currentPassword, newPassword })
  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message || 'Dados inválidos' }
  }

  try {
    const session = await getSession()
    if (!session) {
      return { error: 'Não autenticado' }
    }
    
    await changePassword(session.user.id, parsed.data.currentPassword, parsed.data.newPassword)
    return { success: true }
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Erro ao alterar senha' }
  }
}

export async function listAdmins() {
  try {
    const session = await getSession()
    if (!session || session.user.role !== 'admin') {
      return { error: 'Acesso negado' }
    }
    
    const admins = await getAllAdmins()
    return { success: true, admins }
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Erro ao listar administradores' }
  }
}

export async function removeAdmin(adminId: string) {
  try {
    const session = await getSession()
    if (!session || session.user.role !== 'admin') {
      return { error: 'Acesso negado' }
    }
    
    await deleteAdmin(adminId, session.user.id)
    revalidatePath('/admin')
    return { success: true }
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Erro ao excluir administrador' }
  }
}

export async function editAdmin(adminId: string, data: { name?: string; email?: string; password?: string }) {
  try {
    const session = await getSession()
    if (!session || session.user.role !== 'admin') {
      return { error: 'Acesso negado' }
    }
    
    await updateAdmin(adminId, data)
    revalidatePath('/admin')
    return { success: true }
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Erro ao atualizar administrador' }
  }
}

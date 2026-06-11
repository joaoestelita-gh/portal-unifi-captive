'use server'

import { signIn, signOut, getSession, createUser, changePassword, getAllAdmins, deleteAdmin, updateAdmin } from '@/lib/auth'
import { revalidatePath } from 'next/cache'

export async function loginAdmin(email: string, password: string) {
  try {
    const user = await signIn(email, password)
    
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
  try {
    const session = await getSession()
    if (!session || session.user.role !== 'admin') {
      return { error: 'Acesso negado' }
    }
    
    const user = await createUser({
      name: data.name,
      email: data.email,
      password: data.password,
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
  try {
    const session = await getSession()
    if (!session) {
      return { error: 'Não autenticado' }
    }
    
    await changePassword(session.user.id, currentPassword, newPassword)
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

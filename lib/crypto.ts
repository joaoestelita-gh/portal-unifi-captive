/**
 * Crypto utilities — Funções centralizadas de hashing e verificação de senhas.
 *
 * Único ponto de definição para hashPassword e verifyPassword.
 * Todos os módulos devem importar daqui.
 */

import bcrypt from 'bcryptjs'

const SALT_ROUNDS = 10

/**
 * Gera o hash bcrypt de uma senha.
 *
 * @param password - Senha em texto plano
 * @returns Hash bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS)
}

/**
 * Verifica se uma senha corresponde ao hash armazenado.
 *
 * @param password - Senha em texto plano
 * @param hash - Hash bcrypt armazenado
 * @returns true se a senha confere
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

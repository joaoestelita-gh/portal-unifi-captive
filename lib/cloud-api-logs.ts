/**
 * Persistência dos logs de chamadas à UniFi Cloud API (Postgres via Drizzle).
 *
 * Substitui, para o caso Cloud, a limitação de `lib/portal-logs.ts` (buffer em
 * memória, cap 20, por processo, não persistido): aqui os registros sobrevivem a
 * restart e são compartilhados entre réplicas.
 *
 * `recordCloudApiLog` é FIRE-AND-FORGET e NUNCA lança para o chamador — uma falha
 * ao gravar log jamais pode quebrar a chamada de API que a originou.
 */

import { nanoid } from 'nanoid'
import { desc, lt, eq, sql } from 'drizzle-orm'
import { db } from './db'
import { cloudApiLogs } from './db/schema'
import { createLogger } from './logger'
import type { ControllerErrorCode, ControllerApi } from './controllers/errors'

const logger = createLogger('CloudApiLogs')

/** Máximo de linhas mantidas (backstop por contagem). */
const MAX_ROWS = 500
/** Idade máxima antes do prune por tempo. */
const RETENTION_DAYS = 14
/** Probabilidade de rodar o prune em cada insert (amortiza o custo). */
const PRUNE_PROBABILITY = 0.02

export interface NewCloudApiLog {
  api: ControllerApi
  method: string
  endpoint: string
  consoleId?: string | null
  siteId?: string | null
  status?: number | null
  ok: boolean
  errorCode?: ControllerErrorCode | null
  latencyMs: number
  traceId?: string | null
  bodySnippet?: string | null
}

export interface CloudApiLog extends NewCloudApiLog {
  id: string
  createdAt: Date
}

/**
 * Grava um log de chamada Cloud. Fire-and-forget: retorna imediatamente e
 * engole qualquer erro (apenas um warn no console), sem afetar o chamador.
 */
export function recordCloudApiLog(entry: NewCloudApiLog): void {
  void (async () => {
    try {
      await db.insert(cloudApiLogs).values({
        id: nanoid(),
        api: entry.api,
        method: entry.method,
        endpoint: entry.endpoint,
        consoleId: entry.consoleId ?? null,
        siteId: entry.siteId ?? null,
        status: entry.status ?? null,
        ok: entry.ok,
        errorCode: entry.errorCode ?? null,
        latencyMs: entry.latencyMs,
        traceId: entry.traceId ?? null,
        bodySnippet: entry.bodySnippet ?? null,
      })

      if (Math.random() < PRUNE_PROBABILITY) {
        await pruneCloudApiLogs()
      }
    } catch (error) {
      logger.warn('falha ao gravar log de API Cloud', { err: String(error) })
    }
  })()
}

/** Lista os logs mais recentes (padrão 100), opcionalmente só erros. */
export async function getCloudApiLogs(opts?: { limit?: number; onlyErrors?: boolean }): Promise<CloudApiLog[]> {
  const limit = Math.min(Math.max(opts?.limit ?? 100, 1), 500)
  const rows = await db
    .select()
    .from(cloudApiLogs)
    .where(opts?.onlyErrors ? eq(cloudApiLogs.ok, false) : undefined)
    .orderBy(desc(cloudApiLogs.createdAt))
    .limit(limit)
  return rows as CloudApiLog[]
}

/** Remove todos os logs (usado pelo botão "Limpar" do painel admin). */
export async function clearCloudApiLogs(): Promise<void> {
  await db.delete(cloudApiLogs)
}

/**
 * Prune híbrido: apaga por idade (>RETENTION_DAYS) e, como backstop, trima o
 * excedente acima de MAX_ROWS mantendo os mais novos. Idempotente entre réplicas.
 */
async function pruneCloudApiLogs(): Promise<void> {
  const cutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000)
  await db.delete(cloudApiLogs).where(lt(cloudApiLogs.createdAt, cutoff))

  // Backstop por contagem: mantém apenas os MAX_ROWS mais recentes.
  await db.execute(sql`
    DELETE FROM ${cloudApiLogs}
    WHERE ${cloudApiLogs.id} NOT IN (
      SELECT ${cloudApiLogs.id} FROM ${cloudApiLogs}
      ORDER BY ${cloudApiLogs.createdAt} DESC
      LIMIT ${MAX_ROWS}
    )
  `)
}

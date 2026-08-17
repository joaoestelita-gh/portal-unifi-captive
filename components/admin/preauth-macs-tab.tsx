'use client'

/**
 * PreauthMacsTab — Gestão de MACs pré-autorizados.
 *
 * MACs desta lista têm aprovação automática ao se cadastrar/logar no portal
 * (pulam a fila de aprovação manual). Cada entrada nasce "pendente" (não
 * vinculada) e vira "vinculada" quando um usuário se cadastra/loga com aquele
 * dispositivo. O admin também pode vincular/desvincular manualmente.
 */

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Upload, Plus, Trash2, Link2, Unlink, Loader2, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  importPreauthorizedMacs,
  addPreauthorizedMac,
  deletePreauthorizedMac,
  linkPreauthorizedMacToUser,
  unlinkPreauthorizedMac,
} from '@/app/actions/wifi'

interface PreauthMac {
  id: string
  macAddress: string
  label: string | null
  status: string
  linkedUserId: string | null
  linkedAt: Date | null
  createdAt: Date
  userName: string | null
  userEmail: string | null
}

interface UserOption {
  id: string
  name: string
  email: string
}

interface PreauthMacsTabProps {
  preauthMacs: PreauthMac[]
  users: UserOption[]
}

const ITEMS_PER_PAGE = 10

export function PreauthMacsTab({ preauthMacs, users }: PreauthMacsTabProps) {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [rawText, setRawText] = useState('')
  const [importing, setImporting] = useState(false)

  const [singleMac, setSingleMac] = useState('')
  const [singleLabel, setSingleLabel] = useState('')
  const [adding, setAdding] = useState(false)

  const [rowActionId, setRowActionId] = useState<string | null>(null)
  const [page, setPage] = useState(1)

  const totalPages = Math.max(1, Math.ceil(preauthMacs.length / ITEMS_PER_PAGE))
  const pageItems = preauthMacs.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE)

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const text = await file.text()
    setRawText((prev) => (prev ? `${prev}\n${text}` : text))
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleImport = async () => {
    if (!rawText.trim()) {
      toast.error('Cole ao menos um MAC ou selecione um arquivo')
      return
    }
    setImporting(true)
    try {
      const result = await importPreauthorizedMacs(rawText)
      toast.success(
        `Importação concluída: ${result.added} adicionado(s), ${result.skipped} já existia(m), ${result.invalid} inválido(s).`
      )
      setRawText('')
      router.refresh()
    } catch {
      toast.error('Erro ao importar MACs')
    } finally {
      setImporting(false)
    }
  }

  const handleAddSingle = async () => {
    if (!singleMac.trim()) {
      toast.error('Informe um MAC')
      return
    }
    setAdding(true)
    try {
      const result = await addPreauthorizedMac(singleMac, singleLabel)
      if (result.success) {
        toast.success('MAC adicionado')
        setSingleMac('')
        setSingleLabel('')
        router.refresh()
      } else {
        toast.error(result.error || 'Erro ao adicionar')
      }
    } catch {
      toast.error('Erro ao adicionar MAC')
    } finally {
      setAdding(false)
    }
  }

  const handleDelete = async (id: string) => {
    setRowActionId(id)
    try {
      await deletePreauthorizedMac(id)
      toast.success('MAC removido')
      router.refresh()
    } catch {
      toast.error('Erro ao remover')
    } finally {
      setRowActionId(null)
    }
  }

  const handleLink = async (id: string, userId: string) => {
    if (!userId) return
    setRowActionId(id)
    try {
      const result = await linkPreauthorizedMacToUser(id, userId)
      if (result.success) {
        toast.success('MAC vinculado ao usuário')
        router.refresh()
      } else {
        toast.error(result.error || 'Erro ao vincular')
      }
    } catch {
      toast.error('Erro ao vincular')
    } finally {
      setRowActionId(null)
    }
  }

  const handleUnlink = async (id: string) => {
    setRowActionId(id)
    try {
      await unlinkPreauthorizedMac(id)
      toast.success('Vínculo removido')
      router.refresh()
    } catch {
      toast.error('Erro ao desvincular')
    } finally {
      setRowActionId(null)
    }
  }

  return (
    <div className="space-y-6">
      {/* Import + Add */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-card/50 border-border/50">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Upload className="w-5 h-5 text-primary" />
              Importar em lote
            </CardTitle>
            <CardDescription>
              Um MAC por linha. Opcional: <code>MAC,rótulo</code>. Aceita colar texto ou enviar um arquivo CSV.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Textarea
              placeholder={'AA:BB:CC:DD:EE:FF,Notebook Diretoria\n11:22:33:44:55:66'}
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              rows={6}
              className="font-mono text-sm"
            />
            <div className="flex flex-wrap gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv,text/plain"
                hidden
                onChange={handleFile}
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={importing}
              >
                <Upload className="w-4 h-4 mr-2" />
                Selecionar CSV
              </Button>
              <Button type="button" onClick={handleImport} disabled={importing}>
                {importing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
                Importar
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 border-border/50">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Plus className="w-5 h-5 text-primary" />
              Adicionar individual
            </CardTitle>
            <CardDescription>Cadastrar um único MAC pré-autorizado.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="single-mac">MAC Address</Label>
              <Input
                id="single-mac"
                placeholder="AA:BB:CC:DD:EE:FF"
                value={singleMac}
                onChange={(e) => setSingleMac(e.target.value)}
                className="font-mono"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="single-label">Rótulo (opcional)</Label>
              <Input
                id="single-label"
                placeholder="Ex.: Notebook Diretoria"
                value={singleLabel}
                onChange={(e) => setSingleLabel(e.target.value)}
              />
            </div>
            <Button type="button" onClick={handleAddSingle} disabled={adding}>
              {adding ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
              Adicionar
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* List */}
      <Card className="bg-card/50 border-border/50">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-primary" />
            MACs Pré-autorizados ({preauthMacs.length})
          </CardTitle>
          <CardDescription>
            Dispositivos com aprovação automática. O vínculo com um usuário fica pendente até alguém se cadastrar/logar com o MAC.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {preauthMacs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              Nenhum MAC pré-autorizado ainda.
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>MAC</TableHead>
                      <TableHead>Rótulo</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Usuário vinculado</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pageItems.map((row) => {
                      const busy = rowActionId === row.id
                      return (
                        <TableRow key={row.id}>
                          <TableCell className="font-mono text-sm">{row.macAddress}</TableCell>
                          <TableCell>{row.label || <span className="text-muted-foreground">—</span>}</TableCell>
                          <TableCell>
                            {row.status === 'linked' ? (
                              <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-0">
                                Vinculado
                              </Badge>
                            ) : (
                              <Badge className="bg-amber-500/15 text-amber-600 dark:text-amber-400 border-0">
                                Pendente
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            {row.userName ? (
                              <div className="text-sm">
                                <div className="font-medium">{row.userName}</div>
                                <div className="text-muted-foreground text-xs">{row.userEmail}</div>
                              </div>
                            ) : (
                              <span className="text-muted-foreground text-sm">—</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center justify-end gap-2">
                              {row.status === 'linked' ? (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleUnlink(row.id)}
                                  disabled={busy}
                                  title="Desvincular"
                                >
                                  {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Unlink className="w-4 h-4" />}
                                </Button>
                              ) : (
                                <div className="flex items-center gap-1">
                                  <Link2 className="w-4 h-4 text-muted-foreground" />
                                  <select
                                    className="text-sm bg-background border border-border rounded-md px-2 py-1 max-w-[160px]"
                                    defaultValue=""
                                    disabled={busy || users.length === 0}
                                    onChange={(e) => handleLink(row.id, e.target.value)}
                                  >
                                    <option value="" disabled>
                                      Vincular a…
                                    </option>
                                    {users.map((u) => (
                                      <option key={u.id} value={u.id}>
                                        {u.name} ({u.email})
                                      </option>
                                    ))}
                                  </select>
                                </div>
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDelete(row.id)}
                                disabled={busy}
                                title="Remover"
                              >
                                <Trash2 className="w-4 h-4 text-destructive" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>

              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <span className="text-sm text-muted-foreground">
                    Página {page} de {totalPages}
                  </span>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                    >
                      Anterior
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                    >
                      Próxima
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

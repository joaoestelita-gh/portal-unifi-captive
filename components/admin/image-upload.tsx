'use client'

import { useRef, useState } from 'react'
import { toast } from 'sonner'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Upload, Loader2, X, CheckCircle2, AlertCircle } from 'lucide-react'

interface ImageUploadProps {
  label: string
  value: string
  onChange: (url: string) => void
  hint?: string
  previewMode?: 'logo' | 'background'
  placeholder?: string
}

export function ImageUpload({
  label,
  value,
  onChange,
  hint,
  previewMode = 'logo',
  placeholder = 'https://exemplo.com/imagem.png',
}: ImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [justUploaded, setJustUploaded] = useState(false)

  async function handleFile(file: File) {
    setError('')
    setJustUploaded(false)
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch('/api/upload', { method: 'POST', body: formData })
      const data = await res.json()
      if (!res.ok) {
        const message = data.error || 'Falha no upload'
        setError(message)
        toast.error('Falha no upload', { description: message })
        return
      }
      onChange(data.url)
      setJustUploaded(true)
      toast.success('Imagem enviada', { description: `${label} atualizada com sucesso.` })
      // Esconde o badge de sucesso após alguns segundos
      setTimeout(() => setJustUploaded(false), 3000)
    } catch {
      setError('Falha no upload')
      toast.error('Falha no upload', { description: 'Não foi possível enviar a imagem. Tente novamente.' })
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Label className="text-muted-foreground">{label}</Label>
        {justUploaded && (
          <Badge className="gap-1 bg-emerald-500/15 text-emerald-600 border-emerald-500/30 animate-in fade-in duration-200">
            <CheckCircle2 className="w-3 h-3" />
            Enviada
          </Badge>
        )}
      </div>

      <div className="flex gap-2">
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="bg-secondary/50 border-border/50 focus:border-primary"
        />
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) handleFile(file)
            e.target.value = ''
          }}
        />
        <Button
          type="button"
          variant="outline"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="shrink-0 gap-2"
        >
          {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
          {uploading ? 'Enviando' : 'Upload'}
        </Button>
      </div>

      {error && (
        <p className="flex items-center gap-1.5 text-xs text-destructive animate-in fade-in duration-200">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          {error}
        </p>
      )}

      {value && (
        <div className="relative mt-2">
          {previewMode === 'logo' ? (
            <div className="p-3 rounded-lg bg-secondary/30 border border-border/30 flex items-center justify-center">
              <img src={value || "/placeholder.svg"} alt="Pre-visualizacao" className="h-16 object-contain" />
            </div>
          ) : (
            <div
              className="h-28 rounded-lg border border-border/30 bg-cover bg-center"
              style={{ backgroundImage: `url(${value})` }}
              role="img"
              aria-label="Pre-visualizacao do fundo"
            />
          )}
          <Button
            type="button"
            size="icon"
            variant="destructive"
            className="absolute top-2 right-2 h-7 w-7"
            onClick={() => onChange('')}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      )}

      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  )
}

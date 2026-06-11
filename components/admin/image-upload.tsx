'use client'

import { useRef, useState } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Upload, Loader2, X } from 'lucide-react'

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

  async function handleFile(file: File) {
    setError('')
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch('/api/upload', { method: 'POST', body: formData })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Falha no upload')
        return
      }
      onChange(data.url)
    } catch {
      setError('Falha no upload')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="space-y-2">
      <Label className="text-muted-foreground">{label}</Label>

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

      {error && <p className="text-xs text-red-400">{error}</p>}

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

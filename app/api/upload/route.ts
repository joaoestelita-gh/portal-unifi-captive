import { put } from '@vercel/blob'
import { type NextRequest, NextResponse } from 'next/server'

const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/svg+xml', 'image/gif']
const MAX_SIZE = 5 * 1024 * 1024 // 5 MB

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'Nenhum arquivo enviado' }, { status: 400 })
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: 'Formato invalido. Use PNG, JPG, WEBP, GIF ou SVG' }, { status: 400 })
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: 'Imagem muito grande. Maximo de 5 MB' }, { status: 400 })
    }

    const blob = await put(`portal/${Date.now()}-${file.name}`, file, {
      access: 'private',
    })

    // O store e privado: retornamos a URL da nossa rota de entrega publica,
    // que faz o stream do arquivo (necessario para exibir no portal sem login)
    const url = `/api/file?pathname=${encodeURIComponent(blob.pathname)}`
    return NextResponse.json({ url })
  } catch (error) {
    console.error('[v0] Upload error:', error)
    return NextResponse.json({ error: 'Falha no upload' }, { status: 500 })
  }
}

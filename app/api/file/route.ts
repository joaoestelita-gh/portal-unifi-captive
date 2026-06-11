import { type NextRequest, NextResponse } from 'next/server'
import { get } from '@vercel/blob'

// Rota publica de entrega de imagens do portal (logo e fundo).
// O store de Blob e privado, entao precisamos fazer o stream do arquivo aqui.
// Estas imagens sao exibidas no portal captivo antes do login, por isso sao publicas.
export async function GET(request: NextRequest) {
  try {
    const pathname = request.nextUrl.searchParams.get('pathname')

    if (!pathname) {
      return NextResponse.json({ error: 'pathname ausente' }, { status: 400 })
    }

    const result = await get(pathname, {
      access: 'private',
      ifNoneMatch: request.headers.get('if-none-match') ?? undefined,
    })

    if (!result) {
      return new NextResponse('Nao encontrado', { status: 404 })
    }

    if (result.statusCode === 304) {
      return new NextResponse(null, {
        status: 304,
        headers: {
          ETag: result.blob.etag,
          'Cache-Control': 'public, max-age=3600',
        },
      })
    }

    return new NextResponse(result.stream, {
      headers: {
        'Content-Type': result.blob.contentType,
        ETag: result.blob.etag,
        'Cache-Control': 'public, max-age=3600',
      },
    })
  } catch (error) {
    console.error('[v0] Erro ao servir arquivo:', error)
    return NextResponse.json({ error: 'Falha ao servir arquivo' }, { status: 500 })
  }
}

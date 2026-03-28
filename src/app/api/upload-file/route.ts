import { NextRequest, NextResponse } from 'next/server'

export const maxDuration = 300 // 5 min timeout for large files

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.ASSEMBLYAI_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'AssemblyAI API key not configured' }, { status: 500 })
    }

    // Read raw binary body as Node.js Buffer
    const arrayBuf = await req.arrayBuffer()

    if (!arrayBuf.byteLength) {
      return NextResponse.json({ error: 'Empty file received' }, { status: 400 })
    }

    const nodeBuffer = Buffer.from(arrayBuf)

    // Upload directly to AssemblyAI — they store the file and return a URL
    const uploadRes = await fetch('https://api.assemblyai.com/v2/upload', {
      method: 'POST',
      headers: {
        authorization: apiKey,
        'Content-Type': 'application/octet-stream',
      },
      body: nodeBuffer as any,
    })

    if (!uploadRes.ok) {
      const errText = await uploadRes.text()
      console.error('AssemblyAI upload error:', errText)
      return NextResponse.json(
        { error: `Upload failed: ${uploadRes.status} ${errText}` },
        { status: 500 }
      )
    }

    const data = await uploadRes.json()
    return NextResponse.json({ url: data.upload_url })
  } catch (err) {
    console.error('Upload route error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Upload failed' },
      { status: 500 }
    )
  }
}

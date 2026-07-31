'use client'

import { unzipSync } from 'fflate'
import { createClient } from '@/lib/supabase/client'

export type PickedFile = { path: string; file: Blob; name: string }

const SYSTEM_RE = /(^|\/)(__MACOSX(\/|$)|\.DS_Store$|Thumbs\.db$|\._)/i

function isSystemPath(path: string): boolean {
  const base = path.split('/').pop() || path
  return SYSTEM_RE.test(path) || base.startsWith('.')
}

// ── Gather files from a drop / folder-select / .zip ─────────────────────────

async function readEntry(entry: any, prefix: string, out: PickedFile[]): Promise<void> {
  if (entry.isFile) {
    const file: File = await new Promise((res, rej) => entry.file(res, rej))
    const path = prefix + file.name
    if (!isSystemPath(path)) out.push({ path, file, name: file.name })
  } else if (entry.isDirectory) {
    const reader = entry.createReader()
    const entries: any[] = await new Promise((res) => {
      const all: any[] = []
      const step = () => reader.readEntries((batch: any[]) => {
        if (!batch.length) return res(all)
        all.push(...batch)
        step()
      })
      step()
    })
    for (const e of entries) await readEntry(e, prefix + entry.name + '/', out)
  }
}

async function expandZip(file: Blob, name: string, out: PickedFile[]): Promise<void> {
  const buf = new Uint8Array(await file.arrayBuffer())
  const entries = unzipSync(buf, { filter: (f) => !f.name.endsWith('/') && !isSystemPath(f.name) })
  for (const [path, data] of Object.entries(entries)) {
    const base = path.split('/').pop() || path
    out.push({ path, file: new Blob([data]), name: base })
  }
}

/** From a DataTransfer (drag-drop): walks folders and expands any .zip. */
export async function filesFromDrop(dt: DataTransfer): Promise<PickedFile[]> {
  const out: PickedFile[] = []
  const items = Array.from(dt.items)
  const entries = items.map((it) => (it.webkitGetAsEntry ? it.webkitGetAsEntry() : null))
  for (let i = 0; i < items.length; i++) {
    const entry = entries[i]
    const file = items[i].getAsFile()
    if (entry) {
      await readEntry(entry, '', out)
    } else if (file) {
      if (/\.zip$/i.test(file.name)) await expandZip(file, file.name, out)
      else if (!isSystemPath(file.name)) out.push({ path: file.name, file, name: file.name })
    }
  }
  return out
}

/** From an <input> (files or webkitdirectory or a picked .zip). */
export async function filesFromInput(list: FileList): Promise<PickedFile[]> {
  const out: PickedFile[] = []
  for (const file of Array.from(list)) {
    const path = (file as any).webkitRelativePath || file.name
    if (/\.zip$/i.test(file.name)) await expandZip(file, file.name, out)
    else if (!isSystemPath(path)) out.push({ path, file, name: file.name })
  }
  return out
}

// ── Upload + process pipeline ───────────────────────────────────────────────

export type MatchReport = {
  files: { path: string; basename: string; status: string; importCode?: string; reason?: string }[]
  matched: { path: string; importCode: string }[]
  summary: { total: number; matched: number; unmatched: number; driveDup: number; heic: number; skipped: number; conflicts: { importCode: string; paths: string[] }[] }
}

type UploadPlan = { path: string; importCode: string; ext: string; rawPath: string; token: string }

async function pool<T>(items: T[], size: number, worker: (item: T) => Promise<void>) {
  let i = 0
  await Promise.all(
    Array.from({ length: Math.min(size, items.length) }, async () => {
      while (i < items.length) {
        const idx = i++
        await worker(items[idx])
      }
    })
  )
}

export type PipelineHandlers = {
  onReport: (r: MatchReport) => void
  onUploadProgress: (done: number, total: number) => void
  onProcessProgress: (done: number, total: number) => void
  onDone: (result: { processed: number; failed: number; failures: string[] }) => void
  onError: (msg: string) => void
}

export async function runImagePipeline(files: PickedFile[], h: PipelineHandlers) {
  try {
    const filenames = files.map((f) => f.path)
    const res = await fetch('/api/admin/menu-import/image-urls', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filenames }),
    })
    const data = await res.json()
    if (!res.ok || !data.ok) return h.onError(data.error || 'ขอ URL อัปโหลดไม่สำเร็จ')
    const report: MatchReport = data.report
    const plans: UploadPlan[] = data.uploads
    h.onReport(report)

    const byPath = new Map(files.map((f) => [f.path, f.file]))
    const supabase = createClient()
    const bucket: string = data.bucket

    // 1) direct upload originals to Supabase (concurrency 4, one retry each)
    let uploaded = 0
    const uploadedPlans: UploadPlan[] = []
    await pool(plans, 4, async (p) => {
      const blob = byPath.get(p.path)
      if (!blob) return
      for (let attempt = 0; attempt < 2; attempt++) {
        const { error } = await supabase.storage.from(bucket).uploadToSignedUrl(p.rawPath, p.token, blob)
        if (!error) {
          uploadedPlans.push(p)
          break
        }
        if (attempt === 1) h.onError(`อัปโหลด ${p.path} ไม่สำเร็จ: ${error.message}`)
      }
      h.onUploadProgress(++uploaded, plans.length)
    })

    // 2) process in batches of 8 (server converts with sharp)
    let processed = 0
    let failed = 0
    const failures: string[] = []
    const items = uploadedPlans.map((p) => ({ importCode: p.importCode, ext: p.ext }))
    for (let i = 0; i < items.length; i += 8) {
      const batch = items.slice(i, i + 8)
      const pr = await fetch('/api/admin/menu-import/process-images', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: batch }),
      })
      const pd = await pr.json()
      if (pr.ok && pd.ok) {
        processed += pd.processed
        failed += pd.failed
        for (const r of pd.results as { importCode: string; ok: boolean; error?: string }[]) {
          if (!r.ok) failures.push(`${r.importCode}: ${r.error}`)
        }
      } else {
        failed += batch.length
        failures.push(pd.error || 'process ไม่สำเร็จ')
      }
      h.onProcessProgress(Math.min(i + 8, items.length), items.length)
    }

    h.onDone({ processed, failed, failures })
  } catch (e) {
    h.onError(e instanceof Error ? e.message : 'เกิดข้อผิดพลาด')
  }
}

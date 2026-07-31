'use client'

import { useRef, useState } from 'react'
import { toast } from 'sonner'
import { Upload, FileSpreadsheet, Image as ImageIcon, Download, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { filesFromDrop, filesFromInput, runImagePipeline, type PickedFile, type MatchReport } from './imageClient'

type DiffRow = {
  imageCode: string; nameTh: string | null; categoryNo: string
  action: 'create' | 'update' | 'unchanged' | 'error'
  incomplete: boolean; changes: { field: string; from: unknown; to: unknown }[]; issues: string[]
}
type Preview = {
  ok: boolean; fileName: string; fileHash: string
  summary: { total: number; toCreate: number; toUpdate: number; unchanged: number; incomplete: number; errors: number }
  rows: DiffRow[]; categoriesNotFound: string[]
  errors?: { type: string; columns?: string[]; code?: string; rows?: number[]; row?: number; value?: string }[]
}
type CommitReport = {
  ok: boolean
  summary: { total: number; created: number; updated: number; unchanged: number; incomplete: number; errors: number }
  report: {
    incompleteMenus: { imageCode: string; nameTh: string | null; reasons: string[] }[]
    menusWithoutImages: { imageCode: string; nameTh: string | null }[]
    menusNotInFile: { imageCode: string; nameTh: string | null }[]
  }
}

const ACTION_LABEL: Record<string, string> = { create: 'สร้างใหม่', update: 'อัปเดต', unchanged: 'ไม่เปลี่ยน', error: 'มีปัญหา' }
const ACTION_STYLE: Record<string, string> = {
  create: 'bg-emerald-100 text-emerald-800', update: 'bg-amber-100 text-amber-800',
  unchanged: 'bg-gray-100 text-gray-600', error: 'bg-red-100 text-red-700',
}

export function ImportWizard() {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1)
  const [mode, setMode] = useState<'full' | 'imageOnly'>('full')
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<Preview | null>(null)
  const [busy, setBusy] = useState(false)
  const [filter, setFilter] = useState<'all' | DiffRow['action']>('all')
  const [scrolledToEnd, setScrolledToEnd] = useState(false)
  const [committed, setCommitted] = useState<CommitReport | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  async function doPreview(f: File) {
    setBusy(true)
    try {
      const fd = new FormData(); fd.append('file', f)
      const res = await fetch('/api/admin/menu-import/preview', { method: 'POST', body: fd })
      const data: Preview = await res.json()
      if (!data.ok) {
        toast.error('ไฟล์ไม่ถูกต้อง — ดูรายละเอียดด้านล่าง')
        setPreview(data)
      } else {
        setPreview(data); setStep(2); setScrolledToEnd(false); setFilter('all')
      }
    } catch { toast.error('อ่านไฟล์ไม่สำเร็จ') } finally { setBusy(false) }
  }

  async function doCommit() {
    if (!file || !preview) return
    setBusy(true)
    try {
      const fd = new FormData(); fd.append('file', file); fd.append('fileHash', preview.fileHash)
      const res = await fetch('/api/admin/menu-import/commit', { method: 'POST', body: fd })
      const data: CommitReport & { error?: string } = await res.json()
      if (!data.ok) { toast.error(data.error || 'บันทึกไม่สำเร็จ'); return }
      setCommitted(data); setStep(4)
      toast.success(`บันทึกแล้ว — สร้าง ${data.summary.created} · อัปเดต ${data.summary.updated}`)
    } catch { toast.error('บันทึกไม่สำเร็จ') } finally { setBusy(false) }
  }

  const rows = preview?.rows ?? []
  const shown = filter === 'all' ? rows : rows.filter((r) => r.action === filter)

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">นำเข้าเมนูจาก Excel</h1>
          <p className="text-sm text-muted-foreground">อัปไฟล์ Excel ทีเดียวหลายร้อยรายการ + รูปภาพ</p>
        </div>
        <a href="/api/admin/menu-import/template" download>
          <Button variant="outline" size="sm"><Download className="size-4 mr-1" /> ดาวน์โหลดไฟล์ต้นแบบ</Button>
        </a>
      </div>

      <Stepper step={step} mode={mode} />

      {/* STEP 1 — pick file */}
      {step === 1 && (
        <div className="rounded-xl border bg-white p-8 space-y-5 text-center">
          <FileSpreadsheet className="size-10 mx-auto text-[#4a3520]" />
          <div>
            <p className="font-medium">เลือกไฟล์ Excel (.xlsx)</p>
            <p className="text-sm text-muted-foreground">อ่านเฉพาะชีท <code>menu</code> — ต้องมีครบ 19 คอลัมน์</p>
          </div>
          <input ref={fileRef} type="file" accept=".xlsx" className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) { setFile(f); setMode('full'); doPreview(f) } }} />
          <div className="flex flex-col items-center gap-2">
            <Button onClick={() => fileRef.current?.click()} disabled={busy}>
              <Upload className="size-4 mr-1" /> {busy ? 'กำลังอ่าน…' : 'เลือกไฟล์'}
            </Button>
            <button className="text-sm text-muted-foreground underline"
              onClick={() => { setMode('imageOnly'); setStep(4) }}>
              หรือ อัปเฉพาะรูป (ไม่มี Excel)
            </button>
          </div>
          {preview && !preview.ok && <FileErrors errors={preview.errors} />}
        </div>
      )}

      {/* STEP 2 — review */}
      {step === 2 && preview?.ok && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            <Stat label="ทั้งหมด" value={preview.summary.total} />
            <Stat label="สร้างใหม่" value={preview.summary.toCreate} tone="emerald" />
            <Stat label="อัปเดต" value={preview.summary.toUpdate} tone="amber" />
            <Stat label="ไม่เปลี่ยน" value={preview.summary.unchanged} />
            <Stat label="ยังไม่เปิดขาย" value={preview.summary.incomplete} tone="red" />
          </div>
          {preview.categoriesNotFound.length > 0 && (
            <p className="text-sm text-red-600">⚠ พบหมวดที่ไม่รู้จัก: {preview.categoriesNotFound.join(', ')} — แก้ไฟล์ก่อนบันทึก</p>
          )}

          <div className="flex gap-1.5 flex-wrap">
            {(['all', 'create', 'update', 'unchanged', 'error'] as const).map((k) => (
              <button key={k} onClick={() => setFilter(k)}
                className={`px-3 py-1 rounded-full text-xs font-medium ${filter === k ? 'bg-[#4a3520] text-white' : 'bg-gray-100 text-gray-600'}`}>
                {k === 'all' ? 'ทั้งหมด' : ACTION_LABEL[k]}
              </button>
            ))}
          </div>

          <div className="rounded-xl border bg-white max-h-[420px] overflow-y-auto"
            onScroll={(e) => {
              const el = e.currentTarget
              if (el.scrollHeight - el.scrollTop - el.clientHeight < 40) setScrolledToEnd(true)
            }}>
            <table className="w-full text-[13px]">
              <thead className="sticky top-0 bg-gray-50 text-left text-muted-foreground">
                <tr><th className="p-2">รหัส</th><th className="p-2">ชื่อ</th><th className="p-2">หมวด</th><th className="p-2">สถานะ</th><th className="p-2">เปลี่ยนแปลง</th></tr>
              </thead>
              <tbody>
                {shown.map((r) => (
                  <tr key={r.imageCode} className="border-t">
                    <td className="p-2 font-mono text-xs">{r.imageCode}</td>
                    <td className="p-2">{r.nameTh || <span className="text-muted-foreground">— (ยังไม่มีชื่อ)</span>}</td>
                    <td className="p-2">{r.categoryNo}</td>
                    <td className="p-2"><span className={`px-2 py-0.5 rounded-full text-xs ${ACTION_STYLE[r.action]}`}>{ACTION_LABEL[r.action]}</span>{r.incomplete && <span className="ml-1 text-[11px] text-red-600">พัก</span>}</td>
                    <td className="p-2 text-xs text-muted-foreground">
                      {r.action === 'update' && r.changes.map((c) => (
                        <div key={c.field}>{c.field}: <span className="line-through">{fmt(c.from)}</span> → <b>{fmt(c.to)}</b></div>
                      ))}
                      {r.issues.length > 0 && <div className="text-red-600">{r.issues.join(', ')}</div>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between">
            <Button variant="outline" onClick={() => { setStep(1); setPreview(null); setFile(null) }}><ArrowLeft className="size-4 mr-1" /> เปลี่ยนไฟล์</Button>
            <div className="flex items-center gap-3">
              {!scrolledToEnd && <span className="text-xs text-muted-foreground">เลื่อนดูรายการให้ครบก่อนบันทึก</span>}
              <ConfirmCommit disabled={!scrolledToEnd || busy || preview.categoriesNotFound.length > 0} summary={preview.summary} onConfirm={doCommit} />
            </div>
          </div>
        </div>
      )}

      {/* STEP 4 — images (also the image-only entry) */}
      {step === 4 && (
        <div className="space-y-4">
          {mode === 'full' && committed && <CommitSummary report={committed} />}
          {mode === 'imageOnly' && (
            <div className="rounded-xl border bg-white p-4 text-sm">
              <p className="font-medium">อัปเฉพาะรูป</p>
              <p className="text-muted-foreground">ลากรูปเข้ามา ระบบทับเฉพาะเมนูที่ชื่อไฟล์ตรงกับ <code>image_code</code> รายการอื่นไม่ขยับ</p>
            </div>
          )}
          <ImagePanel />
          <div>
            <Button variant="outline" onClick={() => { setStep(1); setMode('full'); setFile(null); setPreview(null); setCommitted(null) }}>
              เริ่มใหม่
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

function fmt(v: unknown) {
  if (v == null || v === '') return '—'
  if (typeof v === 'boolean') return v ? 'ใช่' : 'ไม่'
  return String(v)
}

function Stepper({ step, mode }: { step: number; mode: string }) {
  const steps = mode === 'imageOnly'
    ? [['1', 'อัปเฉพาะรูป']]
    : [['1', 'เลือกไฟล์'], ['2', 'ตรวจสรุป'], ['3', 'บันทึกเมนู'], ['4', 'อัปรูป']]
  const activeIdx = mode === 'imageOnly' ? 0 : step === 4 ? 3 : step - 1
  return (
    <div className="flex items-center gap-2 text-sm">
      {steps.map(([n, label], i) => (
        <div key={n} className="flex items-center gap-2">
          <span className={`size-6 rounded-full grid place-items-center text-xs ${i <= activeIdx ? 'bg-[#4a3520] text-white' : 'bg-gray-200 text-gray-500'}`}>{n}</span>
          <span className={i <= activeIdx ? 'font-medium' : 'text-muted-foreground'}>{label}</span>
          {i < steps.length - 1 && <span className="w-6 h-px bg-gray-300" />}
        </div>
      ))}
    </div>
  )
}

function Stat({ label, value, tone }: { label: string; value: number; tone?: 'emerald' | 'amber' | 'red' }) {
  const c = tone === 'emerald' ? 'text-emerald-700' : tone === 'amber' ? 'text-amber-700' : tone === 'red' ? 'text-red-700' : 'text-ink'
  return (
    <div className="rounded-lg bg-gray-50 p-3 text-center">
      <div className={`text-2xl font-semibold ${c}`}>{value}</div>
      <div className="text-[11px] text-muted-foreground">{label}</div>
    </div>
  )
}

function FileErrors({ errors }: { errors?: Preview['errors'] }) {
  if (!errors?.length) return null
  return (
    <div className="text-left text-sm rounded-lg bg-red-50 border border-red-200 p-3 space-y-1">
      {errors.map((e, i) => (
        <div key={i} className="text-red-700">
          {e.type === 'missing_sheet' && 'ไม่พบชีทชื่อ menu'}
          {e.type === 'missing_columns' && `ขาดคอลัมน์: ${e.columns?.join(', ')}`}
          {e.type === 'duplicate_image_code' && `image_code ซ้ำ: ${e.code} (แถว ${e.rows?.join(', ')})`}
          {e.type === 'missing_image_code' && `แถว ${e.row}: ไม่มี image_code`}
          {e.type === 'invalid_price' && `แถว ${e.row}: ราคาไม่ใช่ตัวเลข ("${e.value}")`}
          {e.type === 'invalid_status' && `แถว ${e.row}: status ไม่ถูกต้อง ("${e.value}")`}
          {e.type === 'empty' && 'ไฟล์ว่าง'}
        </div>
      ))}
    </div>
  )
}

function ConfirmCommit({ disabled, summary, onConfirm }: { disabled: boolean; summary: Preview['summary']; onConfirm: () => void }) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild><Button disabled={disabled}>บันทึกเมนู</Button></AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>ยืนยันบันทึกเมนู?</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-1 text-sm">
              <div>สร้างใหม่ <b>{summary.toCreate}</b> · อัปเดต <b>{summary.toUpdate}</b> · ไม่เปลี่ยน {summary.unchanged}</div>
              {summary.incomplete > 0 && <div className="text-amber-700">{summary.incomplete} รายการยังไม่เปิดขาย (ข้อมูลไม่ครบ)</div>}
              <div className="text-muted-foreground">เมนูใหม่จะยังซ่อนจากลูกค้าจนกว่าจะเปิดหมวด</div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>ยืนยันบันทึก</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

function CommitSummary({ report }: { report: CommitReport }) {
  const g = report.report
  return (
    <div className="rounded-xl border bg-emerald-50/50 p-4 space-y-3 text-sm">
      <p className="font-medium">บันทึกเมนูแล้ว — สร้าง {report.summary.created} · อัปเดต {report.summary.updated} · ไม่เปลี่ยน {report.summary.unchanged}</p>
      <ReportGroup title="ยังไม่เปิดขาย (ข้อมูลไม่ครบ)" items={g.incompleteMenus.map((m) => `${m.imageCode} — ${m.reasons.join(', ')}`)} />
      <ReportGroup title="ยังไม่มีรูป" items={g.menusWithoutImages.map((m) => `${m.imageCode}${m.nameTh ? ' — ' + m.nameTh : ''}`)} />
      <ReportGroup title="เมนูในเว็บที่ไม่มีในไฟล์รอบนี้ (ไม่ถูกแตะ)" items={g.menusNotInFile.map((m) => `${m.imageCode}${m.nameTh ? ' — ' + m.nameTh : ''}`)} />
    </div>
  )
}
function ReportGroup({ title, items }: { title: string; items: string[] }) {
  if (!items.length) return null
  return (
    <details className="rounded-lg bg-white border p-2">
      <summary className="cursor-pointer font-medium">{title} <Badge variant="secondary">{items.length}</Badge></summary>
      <ul className="mt-2 max-h-40 overflow-y-auto text-xs text-muted-foreground space-y-0.5">
        {items.map((t, i) => <li key={i}>{t}</li>)}
      </ul>
    </details>
  )
}

// ── Image upload panel (drag / folder / zip) ────────────────────────────────
function ImagePanel() {
  const [report, setReport] = useState<MatchReport | null>(null)
  const [up, setUp] = useState({ done: 0, total: 0 })
  const [proc, setProc] = useState({ done: 0, total: 0 })
  const [running, setRunning] = useState(false)
  const [result, setResult] = useState<{ processed: number; failed: number; failures: string[] } | null>(null)
  const [drag, setDrag] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const dirRef = useRef<HTMLInputElement>(null)

  async function start(files: PickedFile[]) {
    if (!files.length) { toast.error('ไม่พบไฟล์รูป'); return }
    setRunning(true); setResult(null); setReport(null); setUp({ done: 0, total: 0 }); setProc({ done: 0, total: 0 })
    await runImagePipeline(files, {
      onReport: (r) => { setReport(r); setUp({ done: 0, total: r.matched.length }) },
      onUploadProgress: (done, total) => setUp({ done, total }),
      onProcessProgress: (done, total) => setProc({ done, total }),
      onDone: (res) => { setResult(res); setRunning(false); toast.success(`แปลงรูปเสร็จ ${res.processed} ใบ`) },
      onError: (msg) => toast.error(msg),
    })
    setRunning(false)
  }

  return (
    <div className="space-y-3">
      <div
        onDragOver={(e) => { e.preventDefault(); setDrag(true) }}
        onDragLeave={() => setDrag(false)}
        onDrop={async (e) => { e.preventDefault(); setDrag(false); start(await filesFromDrop(e.dataTransfer)) }}
        className={`rounded-xl border-2 border-dashed p-8 text-center ${drag ? 'border-[#4a3520] bg-[#4a3520]/5' : 'border-gray-300'}`}>
        <ImageIcon className="size-8 mx-auto text-muted-foreground" />
        <p className="mt-2 text-sm font-medium">ลากโฟลเดอร์ / ไฟล์ / .zip มาวาง</p>
        <p className="text-xs text-muted-foreground">ชื่อไฟล์ต้องตรงกับ image_code เช่น 1_01.jpg · โฟลเดอร์ย่อยไม่มีผล</p>
        <div className="mt-3 flex justify-center gap-2">
          <Button variant="outline" size="sm" onClick={() => inputRef.current?.click()} disabled={running}>เลือกไฟล์/zip</Button>
          <Button variant="outline" size="sm" onClick={() => dirRef.current?.click()} disabled={running}>เลือกโฟลเดอร์</Button>
        </div>
        <input ref={inputRef} type="file" multiple accept=".jpg,.jpeg,.png,.webp,.zip" className="hidden"
          onChange={async (e) => { if (e.target.files) start(await filesFromInput(e.target.files)) }} />
        <input ref={dirRef} type="file" {...{ webkitdirectory: '' } as any} className="hidden"
          onChange={async (e) => { if (e.target.files) start(await filesFromInput(e.target.files)) }} />
      </div>

      {report && (
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 text-center text-sm">
          <Stat label="จับคู่ได้" value={report.summary.matched} tone="emerald" />
          <Stat label="ไม่ตรงเมนู" value={report.summary.unmatched} tone="red" />
          <Stat label="ซ้ำจาก Drive" value={report.summary.driveDup} tone="amber" />
          <Stat label="HEIC ใช้ไม่ได้" value={report.summary.heic} tone="red" />
          <Stat label="ข้าม" value={report.summary.skipped} />
        </div>
      )}
      {(running || up.total > 0) && (
        <div className="space-y-2 text-sm">
          <Progress label={`อัปโหลด ${up.done}/${up.total}`} done={up.done} total={up.total} />
          {proc.total > 0 && <Progress label={`แปลงรูป ${proc.done}/${proc.total}`} done={proc.done} total={proc.total} />}
        </div>
      )}
      {report && report.files.some((f) => f.status !== 'matched' && f.status !== 'skipped') && (
        <details className="rounded-lg border bg-white p-2 text-xs">
          <summary className="cursor-pointer font-medium">ไฟล์ที่ต้องดู ({report.files.filter((f) => f.status === 'unmatched' || f.status === 'drive_dup' || f.status === 'heic').length})</summary>
          <ul className="mt-2 max-h-40 overflow-y-auto space-y-0.5 text-muted-foreground">
            {report.files.filter((f) => f.status === 'unmatched' || f.status === 'drive_dup' || f.status === 'heic').map((f, i) => (
              <li key={i}>{f.basename} — {f.reason}</li>
            ))}
          </ul>
        </details>
      )}
      {result && (
        <p className="text-sm">เสร็จ — แปลงสำเร็จ <b>{result.processed}</b> ใบ{result.failed > 0 && <span className="text-red-600"> · ล้มเหลว {result.failed}</span>}</p>
      )}
    </div>
  )
}

function Progress({ label, done, total }: { label: string; done: number; total: number }) {
  const pct = total ? Math.round((done / total) * 100) : 0
  return (
    <div>
      <div className="flex justify-between text-xs text-muted-foreground mb-1"><span>{label}</span><span>{pct}%</span></div>
      <div className="h-2 rounded-full bg-gray-200 overflow-hidden"><div className="h-full bg-[#4a3520] transition-all" style={{ width: `${pct}%` }} /></div>
    </div>
  )
}

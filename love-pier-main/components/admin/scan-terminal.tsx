'use client'

import { useCallback, useEffect, useRef, useState, useTransition } from 'react'
import { Camera, CameraOff, Check, RotateCcw } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { calcInStoreVisit } from '@/lib/points'
import { type ScannedMember } from '@/lib/inStore'
import { lookupMember, recordInStoreVisit } from '@/app/admin/actions/in-store'

// The barcode API isn't in TypeScript's DOM lib yet. Only the two members
// this file touches are declared — a full shim would be dead weight.
type BarcodeDetectorLike = {
  detect: (source: CanvasImageSource) => Promise<{ rawValue: string }[]>
}
type BarcodeDetectorCtor = new (opts?: { formats?: string[] }) => BarcodeDetectorLike

function getBarcodeDetector(): BarcodeDetectorCtor | null {
  if (typeof window === 'undefined') return null
  return (window as unknown as { BarcodeDetector?: BarcodeDetectorCtor }).BarcodeDetector ?? null
}

type Receipt = {
  orderNo: string
  memberNo: string
  grossAmount: number
  discountAmount: number
  pointsRedeemed: number
  netAmount: number
  pointsEarned: number
  pointsBalance: number
  sentToLine: boolean
}

function baht(n: number) {
  return `฿${(Number(n) || 0).toLocaleString('th-TH')}`
}

export function ScanTerminal() {
  const [member, setMember] = useState<ScannedMember | null>(null)
  const [receipt, setReceipt] = useState<Receipt | null>(null)
  const [manualCode, setManualCode] = useState('')
  const [amount, setAmount] = useState('')
  const [pointsToRedeem, setPointsToRedeem] = useState('')
  const [scanning, setScanning] = useState(false)
  const [cameraError, setCameraError] = useState('')
  const [pending, startTransition] = useTransition()

  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  // Guards the detect loop: React state updates a frame too late to stop a
  // tight rAF loop, and without this a single card can be submitted twice.
  const scanningRef = useRef(false)

  const stopCamera = useCallback(() => {
    scanningRef.current = false
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    setScanning(false)
  }, [])

  // Releasing the camera on unmount matters more here than usual: staff leave
  // this tab open all shift, and a live track keeps the phone's camera light
  // on and drains the battery.
  useEffect(() => () => stopCamera(), [stopCamera])

  const submitCode = useCallback(
    (raw: string) => {
      startTransition(async () => {
        const res = await lookupMember(raw)
        if (!res.ok) {
          toast.error(res.error)
          return
        }
        setMember(res.member)
        setReceipt(null)
        setAmount('')
        setPointsToRedeem('')
      })
    },
    [startTransition]
  )

  async function startCamera() {
    setCameraError('')
    const Detector = getBarcodeDetector()
    if (!Detector) {
      setCameraError('เบราว์เซอร์นี้สแกน QR ไม่ได้ กรุณากรอกรหัสสมาชิกแทน')
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      })
      streamRef.current = stream
      scanningRef.current = true
      setScanning(true)
      const video = videoRef.current
      if (video) {
        video.srcObject = stream
        await video.play()
      }
      const detector = new Detector({ formats: ['qr_code'] })
      const tick = async () => {
        if (!scanningRef.current || !videoRef.current) return
        try {
          const codes = await detector.detect(videoRef.current)
          const hit = codes.find((c) => c.rawValue?.startsWith('LPID1:'))
          if (hit) {
            stopCamera()
            submitCode(hit.rawValue)
            return
          }
        } catch {
          // A dropped frame is normal — keep looping rather than bailing out.
        }
        requestAnimationFrame(tick)
      }
      requestAnimationFrame(tick)
    } catch {
      scanningRef.current = false
      setScanning(false)
      setCameraError('เปิดกล้องไม่ได้ — อนุญาตให้ใช้กล้อง หรือกรอกรหัสสมาชิกแทน')
    }
  }

  function confirmVisit() {
    if (!member) return
    const gross = Math.floor(Number(amount) || 0)
    if (gross <= 0) {
      toast.error('กรุณากรอกยอดเงิน')
      return
    }
    startTransition(async () => {
      const res = await recordInStoreVisit(member.customerId, gross, Math.floor(Number(pointsToRedeem) || 0))
      if (!res.ok) {
        toast.error(res.error)
        return
      }
      setReceipt(res.receipt)
      setMember(null)
      toast.success(`บันทึกแล้ว · +${res.receipt.pointsEarned} แต้ม`)
    })
  }

  function reset() {
    stopCamera()
    setMember(null)
    setReceipt(null)
    setManualCode('')
    setAmount('')
    setPointsToRedeem('')
    setCameraError('')
  }

  // Live preview of exactly what the server will commit — same pure function,
  // same rates, so the number staff read out matches the receipt.
  const preview = member
    ? calcInStoreVisit(Number(amount) || 0, {
        discountPercent: member.discountPercent,
        pointsPerBaht: member.pointsPerBaht,
        pointsRedeemed: Math.min(member.pointsBalance, Math.max(0, Math.floor(Number(pointsToRedeem) || 0))),
      })
    : null

  if (receipt) {
    return (
      <Card>
        <CardContent className="space-y-5 pt-6">
          <div className="flex items-center gap-2 text-green-700">
            <Check className="size-5" />
            <p className="font-medium">บันทึกรายการแล้ว</p>
          </div>

          <div className="rounded-lg border bg-gray-50 px-4 py-3 text-center">
            <p className="text-xs text-muted-foreground">แต้มที่ลูกค้าได้รับ</p>
            <p className="mt-1 text-3xl font-semibold text-amber-700">
              +{receipt.pointsEarned.toLocaleString('th-TH')}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              แต้มสะสมรวม {receipt.pointsBalance.toLocaleString('th-TH')} แต้ม
            </p>
          </div>

          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">รหัสสมาชิก</dt>
              <dd className="font-medium">{receipt.memberNo}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">ยอดเต็ม</dt>
              <dd>{baht(receipt.grossAmount)}</dd>
            </div>
            {receipt.discountAmount > 0 && (
              <div className="flex justify-between">
                <dt className="text-muted-foreground">ส่วนลดสมาชิก</dt>
                <dd className="text-green-700">-{baht(receipt.discountAmount)}</dd>
              </div>
            )}
            {receipt.pointsRedeemed > 0 && <div className="flex justify-between"><dt className="text-muted-foreground">ใช้คะแนน</dt><dd className="text-green-700">-{baht(receipt.pointsRedeemed)}</dd></div>}
            <div className="flex justify-between border-t pt-2 text-base font-semibold">
              <dt>ยอดที่เก็บจริง</dt>
              <dd>{baht(receipt.netAmount)}</dd>
            </div>
          </dl>

          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm">
            <p className="font-medium text-amber-900">คีย์เข้า Food Story ด้วย</p>
            <p className="mt-1 text-amber-800">
              ยอด <span className="font-semibold">{baht(receipt.netAmount)}</span> · รหัส{' '}
              <span className="font-semibold">{receipt.memberNo}</span>
            </p>
          </div>

          {!receipt.sentToLine && (
            <p className="text-xs text-muted-foreground">
              แต้มบันทึกเรียบร้อย แต่ส่งข้อความ LINE ให้ลูกค้าไม่สำเร็จ — แจ้งลูกค้าด้วยวาจาได้เลย
            </p>
          )}

          <Button onClick={reset} className="w-full" size="lg">
            <RotateCcw className="size-4" />
            สแกนคนต่อไป
          </Button>
        </CardContent>
      </Card>
    )
  }

  if (member) {
    return (
      <Card>
        <CardContent className="space-y-5 pt-6">
          <div className="rounded-lg border bg-gray-50 px-4 py-3">
            <div className="flex items-baseline justify-between gap-3">
              <p className="text-lg font-semibold">{member.name || 'สมาชิก'}</p>
              <p className="font-mono text-sm text-muted-foreground">{member.memberNo}</p>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              แต้มสะสม {member.pointsBalance.toLocaleString('th-TH')} แต้ม
              {member.discountPercent > 0 && ` · สิทธิ์ลด ${member.discountPercent}%`}
            </p>
            {/* Named only when it is NOT the ordinary counter rate. Staff need
                to know why this customer's discount is 50% before they hand
                over the food, and an unexplained number invites a re-ring. */}
            {member.tierApplied && (
              <p className="mt-1 text-sm font-medium text-amber-700">
                กลุ่มพิเศษ: {member.tierLabel} — ใช้อัตราของกลุ่มแทนอัตราหน้าร้าน
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="gross">ยอดเต็มก่อนลด (บาท)</Label>
            <Input
              id="gross"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="700"
              inputMode="numeric"
              autoFocus
              className="h-14 text-2xl"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="points">ใช้คะแนน (สูงสุด {member.pointsBalance.toLocaleString('th-TH')})</Label>
            <Input id="points" value={pointsToRedeem} onChange={(e) => setPointsToRedeem(e.target.value)} placeholder="0" inputMode="numeric" />
          </div>

          {preview && preview.grossAmount > 0 && (
            <dl className="space-y-2 rounded-lg border px-4 py-3 text-sm">
              {preview.discountAmount > 0 && (
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">ส่วนลด {member.discountPercent}%</dt>
                  <dd className="text-green-700">-{baht(preview.discountAmount)}</dd>
                </div>
              )}
              {preview.pointsRedeemed > 0 && <div className="flex justify-between"><dt className="text-muted-foreground">ใช้คะแนน</dt><dd className="text-green-700">-{baht(preview.pointsRedeemed)}</dd></div>}
              <div className="flex justify-between text-base font-semibold">
                <dt>เก็บเงินลูกค้า</dt>
                <dd>{baht(preview.netAmount)}</dd>
              </div>
              <div className="flex justify-between border-t pt-2">
                <dt className="text-muted-foreground">แต้มที่จะได้</dt>
                <dd className="font-medium text-amber-700">
                  +{preview.pointsEarned.toLocaleString('th-TH')}
                </dd>
              </div>
            </dl>
          )}

          {!member.hasLine && (
            <p className="text-xs text-muted-foreground">
              สมาชิกรายนี้ยังไม่ได้ผูกบัญชี LINE — แต้มจะถูกบันทึก แต่ไม่มีข้อความแจ้งเตือน
            </p>
          )}

          <div className="flex gap-2">
            <Button variant="outline" onClick={reset} disabled={pending} className="flex-1">
              ยกเลิก
            </Button>
            <Button
              onClick={confirmVisit}
              disabled={pending || !preview || preview.grossAmount <= 0}
              size="lg"
              className="flex-[2]"
            >
              {pending ? 'กำลังบันทึก…' : 'ยืนยันและบันทึกแต้ม'}
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardContent className="space-y-5 pt-6">
        {scanning ? (
          <div className="space-y-3">
            <video
              ref={videoRef}
              muted
              playsInline
              className="aspect-square w-full rounded-lg bg-black object-cover"
            />
            <p className="text-center text-sm text-muted-foreground">
              เล็ง QR บนหน้าจอลูกค้าให้อยู่ในกรอบ
            </p>
            <Button variant="outline" onClick={stopCamera} className="w-full">
              <CameraOff className="size-4" />
              ปิดกล้อง
            </Button>
          </div>
        ) : (
          <Button onClick={startCamera} size="lg" className="h-16 w-full text-base">
            <Camera className="size-5" />
            เปิดกล้องสแกน QR
          </Button>
        )}

        {cameraError && <p className="text-sm text-destructive">{cameraError}</p>}

        <div className="space-y-1.5 border-t pt-5">
          <Label htmlFor="manual">หรือกรอกรหัสสมาชิก</Label>
          <div className="flex gap-2">
            <Input
              id="manual"
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && manualCode.trim()) submitCode(manualCode)
              }}
              placeholder="LP002"
              className="h-12"
            />
            <Button
              onClick={() => submitCode(manualCode)}
              disabled={pending || !manualCode.trim()}
              size="lg"
            >
              ค้นหา
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            ใช้เมื่อหน้าจอลูกค้าสแกนไม่ติด — อ่านรหัสจากบัตรสมาชิกได้เลย
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

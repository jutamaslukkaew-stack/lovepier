// Shared order-status constants. Kept out of the "use server" actions file
// (which may only export async functions) and out of client components so
// both server and client code can import them.

export const ORDER_STATUSES = [
  'pending',
  'paid',
  'preparing',
  'done',
  'cancelled',
] as const

export type OrderStatus = (typeof ORDER_STATUSES)[number]

export const STATUS_LABELS: Record<string, string> = {
  pending: 'รอชำระเงิน',
  paid: 'ชำระแล้ว',
  preparing: 'กำลังทำ',
  done: 'เสร็จสิ้น',
  cancelled: 'ยกเลิก',
}

// 'in-store' rows come from /admin/scan (a Love Pier ID scanned at the
// counter), not from the delivery flow — see lib/inStore.ts.
export const DELIVERY_METHOD_LABELS: Record<string, string> = {
  delivery: 'จัดส่ง',
  pickup: 'รับที่ร้าน',
  'in-store': 'หน้าร้าน',
}

export const STATUS_VARIANT: Record<
  string,
  'default' | 'secondary' | 'destructive' | 'outline'
> = {
  pending: 'outline',
  paid: 'default',
  preparing: 'secondary',
  done: 'secondary',
  cancelled: 'destructive',
}

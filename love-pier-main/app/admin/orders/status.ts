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

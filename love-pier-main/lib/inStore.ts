// Shared constants/types for the in-store Love Pier ID counter flow.
//
// These live here rather than in app/admin/actions/in-store.ts because a
// 'use server' module may only export async functions — a plain const or type
// export there makes Next.js drop the whole module's exports at build time.

// Tags orders created by /admin/scan so in-store visits can be told apart
// from real delivery/pickup orders in /admin/orders and later reporting.
// Nothing else in the app writes this value.
export const IN_STORE_METHOD = 'in-store'

export type ScannedMember = {
  customerId: string
  memberNo: string
  name: string
  pointsBalance: number
  hasLine: boolean
  discountPercent: number
  pointsPerBaht: number
}

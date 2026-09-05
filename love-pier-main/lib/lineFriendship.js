// Whether a customer can actually receive a Messaging API push from the OA.
//
// This matters because a LIFF login does NOT make someone an OA friend — LINE
// Login and the Messaging API are different channels. A customer who reaches
// /delivery from the website or a shared link gets a verified lineUserId and
// orders perfectly well, and then every push to them 403s. `lineFriendStatus`
// is what turns that invisible failure into a list the shop can act on
// (rendered in /admin/customers).
//
// Both helpers are best-effort and never throw: the caller is always in the
// middle of something more important — answering a LINE event within its reply
// token, or finishing an order — and losing this stamp is recoverable while
// losing those is not.
import { eq, sql } from 'drizzle-orm'
import { db } from './db'
import { customers } from './db/schema'

/**
 * Record that this user can be pushed to. Called on `follow`, and on a
 * rich-menu tap — a rich menu is only rendered inside a chat with the OA, so
 * a tap arriving at the webhook is proof of a live, unblocked friendship.
 *
 * Deliberately does NOT fetch the LINE profile: this runs on the reply-token
 * critical path, and the name is either already stored or will arrive with the
 * next order. handleFollow keeps its own richer upsert for that reason.
 */
export async function markFriended(userId) {
  if (!userId) return
  try {
    await db.insert(customers).values({
      lineUserId: userId,
      lineFriendStatus: true,
      lineFollowedAt: new Date(),
      lineUnfollowedAt: null,
    }).onConflictDoUpdate({
      target: customers.lineUserId,
      set: {
        lineFriendStatus: true,
        // Only stamp a follow time when there wasn't one — re-tapping the rich
        // menu every week shouldn't keep resetting "customer since".
        lineFollowedAt: sql`coalesce(${customers.lineFollowedAt}, now())`,
        lineUnfollowedAt: null,
        updatedAt: sql`now()`,
      },
    })
  } catch (error) {
    console.error('LINE friend mark failed (non-fatal):', error)
  }
}

/**
 * Record that this user can no longer be pushed to. Called on `unfollow`, and
 * when a push comes back 403 — LINE's answer for "blocked or not a friend".
 *
 * ONLY call this for a genuine 403. A transient LINE 500 or a network blip
 * must never demote a real friend, or the shop ends up chasing customers who
 * were reachable all along.
 */
export async function markUnfriended(userId) {
  if (!userId) return
  try {
    await db.update(customers).set({
      lineFriendStatus: false,
      lineUnfollowedAt: new Date(),
      updatedAt: sql`now()`,
    }).where(eq(customers.lineUserId, userId))
  } catch (error) {
    console.error('LINE unfriend mark failed (non-fatal):', error)
  }
}

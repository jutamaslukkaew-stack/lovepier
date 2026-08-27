import Head from 'next/head'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { useCallback, useEffect, useState } from 'react'
import { useChrome } from '../lib/chrome'
import { useLanguage } from '../lib/language'
import { getProfileIfLoggedIn, isLiffConfigured, loginAndGetProfile, JOIN_LIFF_ID } from '../lib/liff'
import { loadInviteContext, publicInvite } from '../lib/inviteLookup'

// Invite landing page (0016, plan ผัง 1 "ทางที่ 2 — คนที่ยังไม่อยู่ในระบบ").
//
// This page uses its OWN LIFF app (NEXT_PUBLIC_JOIN_LIFF_ID) whose Endpoint
// URL is /join. It must not borrow another app's: bouncing through a foreign
// endpoint to authenticate is what produced the blank stranded screen before,
// and this page is a customer's FIRST contact with the shop.
//
// States: preview → joining → done, with error as a dead end.
//
// The invite is resolved in getServerSideProps, NOT in a client effect. Two
// reasons, and the second is the important one:
//
//  1. The customer sees the group name and discount in the first paint, with
//     no spinner and without being asked to log in first.
//  2. A page whose whole purpose is a ?code= parameter must not depend on
//     client-side query parsing. Statically-optimised pages only learn their
//     query after hydration (router.isReady), and a page that fails to
//     hydrate then shows a permanent "checking your link…" — a blank-wall
//     failure of exactly the kind the pre-order LIFF work already fought.
//     Rendering on the server removes that dependency entirely.

const COPY = {
  th: {
    title: 'เข้ากลุ่มสมาชิก — Love Pier',
    heading: 'เข้ากลุ่มสมาชิก',
    invited: 'คุณได้รับเชิญเข้ากลุ่ม',
    discount: 'ส่วนลด',
    ofFood: 'จากค่าอาหาร',
    noDeliveryFee: 'ส่วนลดคิดจากค่าอาหารเท่านั้น ไม่รวมค่าจัดส่ง',
    join: 'เข้าร่วมด้วย LINE',
    joining: 'กำลังเข้ากลุ่ม…',
    done: 'เข้ากลุ่มเรียบร้อย',
    doneLead: 'สิทธิ์จะใช้ได้กับออเดอร์ครั้งถัดไปโดยอัตโนมัติ',
    validUntil: 'สิทธิ์ถึง',
    kept: 'คุณอยู่ในกลุ่มที่ทางร้านกำหนดให้อยู่แล้ว',
    keptLead: 'ระบบจึงเก็บกลุ่มเดิมของคุณไว้ เพราะสิทธิ์นั้นดีกว่าหรือทางร้านตั้งให้เป็นพิเศษ',
    orderNow: 'สั่งอาหาร',
    viewCard: 'ดูบัตรสมาชิก',
    noCode: 'ลิงก์นี้ไม่มีรหัสเชิญ กรุณาเปิดจากลิงก์ที่ทางร้านส่งให้',
    notFound: 'ไม่พบลิงก์เชิญนี้',
    unusable: 'ลิงก์เชิญนี้ใช้ไม่ได้แล้ว (หมดอายุหรือครบจำนวนผู้ใช้)',
    staffOnly: 'กลุ่มนี้ต้องให้ทางร้านเป็นผู้กำหนดให้',
    errorAuth: 'เซสชัน LINE หมดอายุ กรุณาลองใหม่',
    errorLiff: 'กรุณาเปิดลิงก์นี้จากแอป LINE',
    errorNetwork: 'เชื่อมต่อไม่สำเร็จ กรุณาลองใหม่',
    errorUnconfigured: 'ระบบลิงก์เชิญยังไม่พร้อมใช้งาน กรุณาติดต่อร้าน',
    error: 'เกิดข้อผิดพลาด กรุณาลองใหม่',
    retry: 'ลองใหม่',
  },
  en: {
    title: 'Join a member group — Love Pier',
    heading: 'Join a member group',
    invited: "You've been invited to join",
    discount: 'Discount',
    ofFood: 'off food',
    noDeliveryFee: 'The discount applies to food only, not the delivery fee.',
    join: 'Join with LINE',
    joining: 'Joining…',
    done: "You're in",
    doneLead: 'Your discount applies automatically from your next order.',
    validUntil: 'Valid until',
    kept: "You're already in a group set by the shop",
    keptLead: 'We kept your existing group — it was assigned to you directly.',
    orderNow: 'Order food',
    viewCard: 'View member card',
    noCode: 'This link has no invite code. Please open the link the shop sent you.',
    notFound: 'This invite link was not found.',
    unusable: 'This invite link is no longer usable (expired or fully used).',
    staffOnly: 'This group has to be assigned by the shop.',
    errorAuth: 'Your LINE session has expired. Please try again.',
    errorLiff: 'Please open this link from the LINE app.',
    errorNetwork: 'Could not reach the server. Please try again.',
    errorUnconfigured: 'Invite links are not set up yet. Please contact the shop.',
    error: 'Something went wrong. Please try again.',
    retry: 'Try again',
  },
  zh: {
    title: '加入会员组 — Love Pier',
    heading: '加入会员组',
    invited: '您受邀加入',
    discount: '折扣',
    ofFood: '餐费',
    noDeliveryFee: '折扣仅适用于餐费，不含配送费。',
    join: '使用 LINE 加入',
    joining: '正在加入…',
    done: '加入成功',
    doneLead: '下次下单时将自动享受折扣。',
    validUntil: '有效期至',
    kept: '您已在本店指定的会员组中',
    keptLead: '我们保留了您原有的会员组。',
    orderNow: '订餐',
    viewCard: '查看会员卡',
    noCode: '此链接没有邀请码，请打开本店发送的链接。',
    notFound: '未找到此邀请链接。',
    unusable: '此邀请链接已失效（已过期或已达使用上限）。',
    staffOnly: '此会员组需由本店指定。',
    errorAuth: 'LINE 登录已过期，请重试。',
    errorNetwork: '连接失败，请重试。',
    errorLiff: '请从 LINE 应用打开此链接。',
    errorUnconfigured: '邀请链接功能尚未开通，请联系本店。',
    error: '出错了，请重试。',
    retry: '重试',
  },
}

export default function JoinPage({ invite, failure: initialFailure }) {
  const router = useRouter()
  const { lang } = useLanguage()
  const t = COPY[lang] || COPY.en
  const { setHidden: setChromeHidden } = useChrome()

  // Seeded from the server, so the first paint is already the right screen.
  const [status, setStatus] = useState(initialFailure ? 'error' : 'preview')
  const [joined, setJoined] = useState(null)
  const [failure, setFailure] = useState(initialFailure)

  // Reached from a LINE message, not from the site nav.
  useEffect(() => {
    setChromeHidden(true)
    return () => setChromeHidden(false)
  }, [setChromeHidden])

  const fail = useCallback((kind) => {
    setFailure(kind)
    setStatus('error')
  }, [])

  const code = invite?.code || ''

  const redeem = useCallback(
    async (profile) => {
      if (!profile?.accessToken) return fail('auth')
      setStatus('joining')
      try {
        const res = await fetch('/api/join', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${profile.accessToken}`,
          },
          body: JSON.stringify({ code }),
        })
        // Parsed defensively: a 500 or gateway timeout comes back as HTML and
        // res.json() would throw inside this try, reporting a server error as
        // a network one — the same trap pages/member.js documents.
        const data = await res.json().catch(() => null)
        if (res.status === 401) return fail('auth')
        if (res.status === 403) return fail('staff_only')
        if (res.status === 410) return fail('unusable')
        if (!res.ok || !data?.joined) return fail('server')
        setJoined(data.joined)
        setStatus('done')
      } catch {
        fail('network')
      }
    },
    [code, fail]
  )

  // 2. Join. Deliberately NOT automatic on load: this changes what the
  //    customer pays and which group they are in, so it happens on a tap.
  const handleJoin = useCallback(async () => {
    if (!isLiffConfigured(JOIN_LIFF_ID)) return fail('unconfigured')
    setStatus('joining')
    try {
      const existing = await getProfileIfLoggedIn(JOIN_LIFF_ID)
      if (existing) return redeem(existing)
      const profile = await loginAndGetProfile({ liffId: JOIN_LIFF_ID, ownEndpointPath: '/join' })
      // null means the SDK is redirecting to LINE login; this page reloads and
      // the effect below picks the session up. Not an error, and not a state
      // to sit spinning in either — put the button back.
      if (profile) return redeem(profile)
      setStatus('preview')
    } catch {
      fail('liff')
    }
  }, [redeem, fail])

  // 3. Coming back from the LINE login redirect: the code is still in the URL
  //    and a session now exists, so finish the join the customer already
  //    asked for rather than making them tap twice.
  useEffect(() => {
    if (status !== 'preview' || !invite?.usable || !isLiffConfigured(JOIN_LIFF_ID)) return
    let cancelled = false
    getProfileIfLoggedIn(JOIN_LIFF_ID)
      .then((profile) => {
        if (!cancelled && profile) redeem(profile)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
    // Runs once per arrival at 'preview'; redeem() moves the state on.
  }, [status, invite, redeem])

  const failureCopy =
    failure === 'no_code' ? t.noCode
    : failure === 'not_found' ? t.notFound
    : failure === 'unusable' ? t.unusable
    : failure === 'staff_only' ? t.staffOnly
    : failure === 'auth' ? t.errorAuth
    : failure === 'liff' ? t.errorLiff
    : failure === 'network' ? t.errorNetwork
    : failure === 'unconfigured' ? t.errorUnconfigured
    : t.error

  return (
    <>
      <Head>
        <title>{t.title}</title>
        <meta name="robots" content="noindex" />
      </Head>
      <main className="jn-wrap">
        <div className="jn-card">
          <p className="jn-brand">Love Pier</p>

          {status === 'preview' && invite && (
            <>
              <p className="jn-muted">{t.invited}</p>
              <h1 className="jn-tier">{invite.tierLabel}</h1>
              <p className="jn-pct">
                {t.discount} <strong>{invite.discountPercent}%</strong> {t.ofFood}
              </p>
              <button type="button" className="jn-btn" onClick={handleJoin}>
                {t.join}
              </button>
              <p className="jn-fine">{t.noDeliveryFee}</p>
            </>
          )}

          {status === 'joining' && <p className="jn-muted">{t.joining}</p>}

          {status === 'done' && joined && (
            <>
              {/* `applied: false` means they were already in a staff-assigned
                  group and kept it. Saying "joined!" there would be a lie. */}
              <h1 className="jn-tier">{joined.applied ? t.done : t.kept}</h1>
              <p className="jn-muted">{joined.applied ? t.doneLead : t.keptLead}</p>
              <p className="jn-pct">
                {joined.tierLabel} · {t.discount} <strong>{joined.discountPercent}%</strong>
              </p>
              {joined.tierExpiresAt && (
                <p className="jn-fine">
                  {t.validUntil} {String(joined.tierExpiresAt).slice(0, 10)}
                </p>
              )}
              <Link className="jn-btn" href="/delivery">
                {t.orderNow}
              </Link>
              <Link className="jn-link" href="/member">
                {t.viewCard}
              </Link>
            </>
          )}

          {status === 'error' && (
            <>
              <p className="jn-muted">{failureCopy}</p>
              {/* Retry only where retrying can work. An expired link, a
                  staff-only group or a missing code are settled answers, and a
                  button that cannot help is worse than no button. */}
              {(failure === 'network' || failure === 'server' || failure === 'auth') && (
                <button type="button" className="jn-btn" onClick={() => router.reload()}>
                  {t.retry}
                </button>
              )}
            </>
          )}
        </div>
      </main>

      <style jsx>{`
        .jn-wrap {
          min-height: 100dvh;
          display: grid;
          place-items: center;
          padding: 24px;
          background: #f6f2ec;
        }
        .jn-card {
          width: 100%;
          max-width: 420px;
          background: #fffdf7;
          border: 1px solid #dcd1c2;
          border-radius: 18px;
          padding: 32px 24px;
          text-align: center;
          box-shadow: 0 8px 30px -18px rgba(42, 29, 18, 0.5);
        }
        .jn-brand {
          margin: 0 0 20px;
          font-size: 12px;
          letter-spacing: 0.22em;
          text-transform: uppercase;
          color: #8c682c;
        }
        .jn-tier {
          margin: 8px 0;
          font-size: 26px;
          line-height: 1.35;
          color: #2a1d12;
        }
        .jn-pct {
          margin: 8px 0 24px;
          font-size: 17px;
          color: #1b6e72;
        }
        .jn-muted {
          margin: 8px 0;
          color: #6b5b4c;
          line-height: 1.7;
        }
        .jn-fine {
          margin: 14px 0 0;
          font-size: 12px;
          color: #9a8977;
          line-height: 1.6;
        }
        .jn-btn {
          display: block;
          width: 100%;
          margin-top: 16px;
          padding: 14px 20px;
          border: 0;
          border-radius: 999px;
          background: #4a3520;
          color: #fffdf7;
          font-size: 16px;
          font-weight: 600;
          text-decoration: none;
          cursor: pointer;
        }
        .jn-link {
          display: inline-block;
          margin-top: 14px;
          color: #6b5b4c;
          font-size: 14px;
        }
      `}</style>
    </>
  )
}

// Resolved here rather than in a client effect: see the note at the top of
// this file. Also makes the page dynamic (ƒ) rather than statically
// prerendered, which is correct for a page whose content IS its query string.
export async function getServerSideProps(context) {
  // Invite links are one-to-one with a person; there is nothing here for a
  // crawler or a shared cache to hold on to.
  context.res.setHeader('Cache-Control', 'no-store')

  const ctx = await loadInviteContext(context.query.code)
  if (!ctx.ok) {
    const failure =
      ctx.reason === 'invalid_code' ? 'no_code'
      : ctx.reason === 'not_found' ? 'not_found'
      : ctx.reason === 'gone' ? 'unusable'
      : 'server'
    return { props: { invite: null, failure } }
  }

  const view = publicInvite(ctx)
  if (!view.usable) {
    return {
      props: { invite: null, failure: view.reason === 'staff_only' ? 'staff_only' : 'unusable' },
    }
  }
  return { props: { invite: view, failure: null } }
}

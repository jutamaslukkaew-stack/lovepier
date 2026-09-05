// The order tracker now lives on /delivery (?order=<orderNo>) so it runs on the
// delivery LIFF app's registered Endpoint URL — same LIFF init, same session,
// same cached profile as the order flow. This route stays as a redirect because
// LINE Flex messages already sent to customers point at /order/<orderNo>.
export async function getServerSideProps({ params }) {
  const orderNo = String(params?.orderNo || '')
  return {
    redirect: {
      destination: `/delivery?order=${encodeURIComponent(orderNo)}`,
      permanent: false,
    },
  }
}

export default function OrderRedirect() {
  return null
}

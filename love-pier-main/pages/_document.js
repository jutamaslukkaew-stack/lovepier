import { Html, Head, Main, NextScript } from 'next/document'
export default function Document() {
  return (
    <Html lang="en">
      <Head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,300;1,400&family=Jost:wght@200;300;400;500&family=Noto+Sans+Thai:wght@300;400;500&family=Noto+Serif+Thai:wght@300;400&display=swap" rel="stylesheet" />
        {/* LINE Seed Sans TH — Thai body font */}
        <link rel="preconnect" href="https://cdn.jsdelivr.net" />
        <link href="https://cdn.jsdelivr.net/gh/LINEcorp/line-seed-font/fonts/LINESeedSansTH/css/LINESeedSansTH.css" rel="stylesheet" />
      </Head>
      <body><Main /><NextScript /></body>
    </Html>
  )
}

import type { Metadata } from 'next'
import '../styles/motion-count.css'

export const metadata: Metadata = {
  title: 'Motion Count',
  description: 'Hand-tracking 3D particle count demo',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  )
}

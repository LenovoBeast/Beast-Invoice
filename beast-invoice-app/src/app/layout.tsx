import type { Metadata, Viewport } from 'next'
import { Providers } from '@/components/Providers'
import { AppShell } from '@/components/shell/AppShell'
import '../styles/globals.css'

export const metadata: Metadata = {
  title: 'Beast Invoice',
  description: 'A complete, professional invoice in under 60 seconds. Pick, don\'t type.',
}

export const viewport: Viewport = {
  themeColor: '#07080a',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <AppShell>{children}</AppShell>
        </Providers>
      </body>
    </html>
  )
}

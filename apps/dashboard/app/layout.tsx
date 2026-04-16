import type { ReactNode } from 'react'
import Link from 'next/link'
import './globals.css'

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>
        <div className="shell">
          <header className="shell-header">
            <div className="brand">
              <span className="brand-kicker">Watchtower / Auto Repair Console</span>
              <h1 className="brand-title">Observe. Diagnose. Draft.</h1>
              <p className="brand-copy">
                这是 Watchtower 的 MVP 管理台，围绕 Sentry issue、自动修复资格、验证闸门和 draft PR 编排做最小闭环。
              </p>
            </div>
            <nav className="shell-nav">
              <Link href="/">Overview</Link>
              <Link href="/repositories">Repositories</Link>
            </nav>
          </header>
          {children}
        </div>
      </body>
    </html>
  )
}

import type { PropsWithChildren } from 'react'
import { Navbar } from './Navbar'

export function Layout({ children }: PropsWithChildren) {
  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8">{children}</main>
    </div>
  )
}

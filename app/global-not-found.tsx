import Link from 'next/link'
import { TmdbCredit } from '@/components/TmdbCredit'
import { fontVariables } from '@/lib/fonts'
import './globals.css'

export default function GlobalNotFound() {
  return (
    <html lang="tr" className={fontVariables} data-scroll-behavior="smooth">
      <body className="bg-hall font-body text-text">
        <main id="content" tabIndex={-1} className="outline-none">
          <h1>Sayfa bulunamadı</h1>
          <p lang="en">Page not found</p>
          <Link href="/" className="hover:text-accent">
            Ana sayfa
          </Link>{' '}
          <Link href="/en" lang="en" className="hover:text-accent">
            Home
          </Link>
        </main>
        {/* Sayfanın dili belli değil; TMDB notu iki dilde. */}
        <TmdbCredit locales={['tr', 'en']} />
      </body>
    </html>
  )
}

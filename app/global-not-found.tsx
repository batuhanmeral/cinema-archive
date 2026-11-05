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
          <a href="/">Ana sayfa</a>{' '}
          <a href="/en" lang="en">
            Home
          </a>
        </main>
        {/* Sayfanın dili belli değil; TMDB notu iki dilde. */}
        <TmdbCredit locales={['tr', 'en']} />
      </body>
    </html>
  )
}

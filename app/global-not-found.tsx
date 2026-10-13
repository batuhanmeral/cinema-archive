import { TmdbCredit } from '@/components/TmdbCredit'
import { fontVariables } from '@/lib/fonts'
import './globals.css'

export default function GlobalNotFound() {
  return (
    <html lang="tr" className={fontVariables} data-scroll-behavior="smooth">
      <body className="bg-hall font-body text-text">
        <h1>Sayfa bulunamadı</h1>
        <p>Page not found</p>
        <a href="/">Ana sayfa</a> <a href="/en">Home</a>
        <TmdbCredit locale="tr" />
      </body>
    </html>
  )
}

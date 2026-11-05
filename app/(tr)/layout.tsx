import { SkipLink } from '@/components/navbar/SkipLink'
import { Navbar } from '@/components/navbar/Navbar'
import { fontVariables } from '@/lib/fonts'
import '../globals.css'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr" className={fontVariables} data-scroll-behavior="smooth">
      <body className="bg-hall font-body text-text">
        <SkipLink locale="tr" />
        <Navbar locale="tr" />
        {children}
      </body>
    </html>
  )
}

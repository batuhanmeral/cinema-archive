import { SkipLink } from '@/components/navbar/SkipLink'
import { Navbar } from '@/components/navbar/Navbar'
import { BUILD_TIME_MS } from '@/features/home/build-time'
import { WeekStyle } from '@/features/home/components/WeekStyle'
import { fontVariables } from '@/lib/fonts'
import { weekIndex } from '@/lib/rotation'
import '../globals.css'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="tr"
      className={fontVariables}
      data-scroll-behavior="smooth"
      suppressHydrationWarning
    >
      <head>
        <WeekStyle buildWeek={weekIndex(BUILD_TIME_MS)} />
      </head>
      <body className="bg-hall font-body text-text">
        <SkipLink locale="tr" />
        <Navbar locale="tr" />
        {children}
      </body>
    </html>
  )
}

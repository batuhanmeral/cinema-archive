import { SkipLink } from '@/components/navbar/SkipLink'
import { Navbar } from '@/components/navbar/Navbar'
import { BUILD_TIME_MS } from '@/features/home/build-time'
import { WeekStyle } from '@/features/home/components/WeekStyle'
import { weekIndex } from '@/features/home/rotation'
import { fontVariables } from '@/lib/fonts'
import '../globals.css'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={fontVariables}
      data-scroll-behavior="smooth"
      suppressHydrationWarning
    >
      <head>
        <WeekStyle buildWeek={weekIndex(BUILD_TIME_MS)} />
      </head>
      <body className="bg-hall font-body text-text">
        <SkipLink locale="en" />
        <Navbar locale="en" />
        {children}
      </body>
    </html>
  )
}

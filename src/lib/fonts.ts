import { Big_Shoulders, Schibsted_Grotesk } from 'next/font/google'

// "Big Shoulders Display" artık next/font listesinde yok; opsz eksenli Big Shoulders yüklenir
// ve Display kesimi globals.css'te opsz 72 ile seçilir.
const display = Big_Shoulders({
  subsets: ['latin', 'latin-ext'],
  display: 'swap',
  axes: ['opsz'],
  variable: '--font-big-shoulders',
})

const body = Schibsted_Grotesk({
  subsets: ['latin', 'latin-ext'],
  display: 'swap',
  variable: '--font-schibsted-grotesk',
})

export const fontVariables = `${display.variable} ${body.variable}`

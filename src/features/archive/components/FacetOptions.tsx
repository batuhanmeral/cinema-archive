import { Check } from 'lucide-react'
import type { Locale } from '@/lib/i18n/locale'
import type { FacetOption } from '../select'

// Masaüstü paneli ve mobil alt panel aynı onay kutusu satırlarını kullanır.
export function FacetOptions({
  options,
  locale,
  onChange,
}: {
  options: FacetOption[]
  locale: Locale
  onChange: (value: string) => void
}) {
  const format = new Intl.NumberFormat(locale)
  return options.map((option) => (
    <label
      key={option.value}
      className="group/option grid cursor-pointer grid-cols-[16px_1fr_auto] items-center gap-3 p-2 text-sm hover:bg-surface"
    >
      <span className="relative grid size-4 place-items-center">
        <input
          type="checkbox"
          value={option.value}
          checked={option.selected}
          onChange={() => onChange(option.value)}
          className="peer absolute inset-0 m-0 cursor-pointer appearance-none border border-muted checked:border-accent checked:bg-accent"
        />
        <Check
          size={12}
          strokeWidth={3}
          aria-hidden
          className="pointer-events-none relative hidden text-hall peer-checked:block"
        />
      </span>
      <span className="truncate transition-colors duration-150 group-hover/option:text-accent">
        {option.label}
      </span>{' '}
      <span className="text-xs text-muted">{format.format(option.count)}</span>
    </label>
  ))
}

// Süzgeç düğmesindeki sarı seçili sayısı; panel ve alt panel başlıklarında ortak.
export function SelectedCount({ options }: { options: FacetOption[] }) {
  const selected = options.filter((option) => option.selected).length
  if (selected === 0) return null
  return (
    <>
      {' '}
      <b className="font-medium text-accent">{selected}</b>
    </>
  )
}

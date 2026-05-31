interface SearchBarProps {
  label: string
  placeholder: string
  value: string
  onChange: (value: string) => void
}

export function SearchBar({ label, placeholder, value, onChange }: SearchBarProps) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-semibold text-slate-700">{label}</span>
      <input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="dark-field w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-cyan-500"
      />
    </label>
  )
}

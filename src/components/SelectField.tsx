interface SelectFieldProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  options: { id: string; name: string }[];
}

export function SelectField({ label, options, className = "", ...props }: SelectFieldProps) {
  return (
    <label className="block">
      <span className="block text-sm font-medium text-foreground mb-2">{label}</span>
      <select
        className={`w-full px-4 py-3.5 text-base rounded-xl border-2 border-border bg-white focus:border-primary transition-colors ${className}`}
        {...props}
      >
        <option value="">Select…</option>
        {options.map((opt) => (
          <option key={opt.id} value={opt.id}>
            {opt.name}
          </option>
        ))}
      </select>
    </label>
  );
}

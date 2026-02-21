interface PublicToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
}

export default function Toggle({ checked, onChange, label }: PublicToggleProps) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${checked ? "bg-indigo-600" : "bg-gray-300"}`}
      aria-pressed={checked}
      aria-label={label || "Toggle"}
    >
      <span
        className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${checked ? "translate-x-7" : "translate-x-1"}`}
      />
    </button>
  );
}

interface PublicToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  size?: "sm" | "md" | "lg";
}

export default function Toggle({ checked, onChange, label, size = "md" }: PublicToggleProps) {
  const sizeClass = size === "lg"
    ? { root: "h-10 w-16", knob: "h-8 w-8", on: "translate-x-7", off: "translate-x-1" }
    : size === "sm"
      ? { root: "h-7 w-12", knob: "h-5 w-5", on: "translate-x-6", off: "translate-x-1" }
      : { root: "h-8 w-14", knob: "h-6 w-6", on: "translate-x-7", off: "translate-x-1" };

  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`relative inline-flex ${sizeClass.root} items-center rounded-full transition-colors ${checked ? "bg-indigo-600" : "bg-gray-300"}`}
      aria-pressed={checked}
      aria-label={label || "Toggle"}
    >
      <span
        className={`inline-block ${sizeClass.knob} transform rounded-full bg-white transition-transform ${checked ? sizeClass.on : sizeClass.off}`}
      />
    </button>
  );
}

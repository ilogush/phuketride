import Toggle from "~/components/dashboard/Toggle";

interface FeatureToggleFieldProps {
  label: string;
  enabled: boolean;
  onChange: (value: boolean) => void;
}

export default function FeatureToggleField({ label, enabled, onChange }: FeatureToggleFieldProps) {
  return (
    <div>
      <label className="block text-xs text-gray-600 mb-1">{label}</label>
      <div className="flex items-center justify-between px-4 border border-gray-200 rounded-xl h-[38px] bg-white">
        <span className="text-sm text-gray-900">{enabled ? "Enabled" : "Disabled"}</span>
        <Toggle enabled={enabled} onChange={onChange} />
      </div>
    </div>
  );
}

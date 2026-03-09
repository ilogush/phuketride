import Toggle from '~/components/shared/ui/Toggle';

interface FeatureToggleFieldProps {
  label: string;
  checked: boolean;
  onCheckedChange: (value: boolean) => void;
}

export default function FeatureToggleField({ label, checked, onCheckedChange }: FeatureToggleFieldProps) {
  return (
    <div>
      <label className="block text-xs text-gray-600 mb-1">{label}</label>
      <div className="flex h-11 items-center justify-between rounded-2xl border border-gray-200 bg-white px-4">
        <span className="text-sm text-gray-900">{checked ? "Enabled" : "Disabled"}</span>
        <Toggle checked={checked} onCheckedChange={onCheckedChange} />
      </div>
    </div>
  );
}

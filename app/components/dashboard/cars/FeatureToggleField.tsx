import ToggleField from "~/components/shared/ui/ToggleField";

interface FeatureToggleFieldProps {
  label: string;
  checked: boolean;
  onCheckedChange: (value: boolean) => void;
}

export default function FeatureToggleField({ label, checked, onCheckedChange }: FeatureToggleFieldProps) {
  return <ToggleField label={label} checked={checked} onCheckedChange={onCheckedChange} />;
}

import Toggle from "~/components/dashboard/Toggle";

interface ExtraToggleItem {
  key: string;
  label: string;
  enabled: boolean;
  onToggle: (value: boolean) => void;
}

interface ExtrasToggleGridProps {
  items: ExtraToggleItem[];
}

export default function ExtrasToggleGrid({ items }: ExtrasToggleGridProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {items.map((item) => (
        <div key={item.key} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100">
          <span className="text-sm font-medium text-gray-700">{item.label}</span>
          <Toggle checked={item.enabled} onCheckedChange={item.onToggle} />
        </div>
      ))}
    </div>
  );
}

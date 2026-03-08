import { Input } from "~/components/dashboard/Input";
import { Select } from "~/components/dashboard/Select";
import Toggle from "~/components/dashboard/Toggle";

interface CurrencyOption {
  id: number;
  code: string;
  symbol?: string | null;
}

interface ExtraPaymentItem {
  key: string;
  title: string;
  enabled: boolean;
  onToggle: (value: boolean) => void;
}

interface ExtrasPaymentsSectionProps {
  items: ExtraPaymentItem[];
}

export default function ExtrasPaymentsSection({ items }: ExtrasPaymentsSectionProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      {items.map((item) => (
        <div key={item.key} className="p-4 bg-gray-50 rounded-xl border border-gray-100 flex items-center justify-between">
          <span className="text-sm font-semibold text-gray-900">{item.title}</span>
          <Toggle checked={item.enabled} onCheckedChange={item.onToggle} />
        </div>
      ))}
    </div>
  );
}

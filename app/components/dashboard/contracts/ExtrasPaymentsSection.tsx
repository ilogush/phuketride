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
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {items.map((item) => (
        <div key={item.key} className="p-5 bg-white rounded-2xl border border-gray-100 shadow-sm ring-1 ring-black/5 flex items-center justify-between hover:border-gray-900/10 transition-colors group">
          <div className="flex flex-col gap-0.5">
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest group-hover:text-gray-900 transition-colors">{item.title}</span>
            <div className={`h-0.5 w-4 rounded-full transition-colors ${item.enabled ? 'bg-gray-900' : 'bg-gray-100'}`} />
          </div>
          <Toggle checked={item.enabled} onCheckedChange={item.onToggle} />
        </div>
      ))}
    </div>
  );
}

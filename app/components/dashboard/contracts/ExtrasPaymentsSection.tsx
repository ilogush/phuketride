import FormInput from "~/components/dashboard/FormInput";
import FormSelect from "~/components/dashboard/FormSelect";
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
  currencies: CurrencyOption[];
  items: ExtraPaymentItem[];
}

const PAYMENT_METHODS = [
  { id: "cash", name: "Cash" },
  { id: "bank_transfer", name: "Bank Transfer" },
  { id: "card", name: "Card" },
];

export default function ExtrasPaymentsSection({ currencies, items }: ExtrasPaymentsSectionProps) {
  const currencyOptions = currencies.map((currency) => ({
    id: currency.id,
    name: `${currency.code} (${currency.symbol ?? ""})`,
  }));

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        {items.map((item) => (
          <div key={item.key} className="p-3 bg-gray-50 rounded-lg border border-gray-100">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">{item.title}</span>
              <Toggle enabled={item.enabled} onChange={item.onToggle} />
            </div>
            {item.enabled && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
                <FormInput label="Amount" name={`extra_${item.key}_amount`} type="number" placeholder="0.00" />
                <FormSelect
                  label="Currency"
                  name={`extra_${item.key}_currency`}
                  options={currencyOptions}
                  placeholder="Select Currency"
                />
                <FormSelect
                  label="Method"
                  name={`extra_${item.key}_method`}
                  options={PAYMENT_METHODS}
                  placeholder="Select Method"
                />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

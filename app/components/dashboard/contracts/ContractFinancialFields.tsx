import { useState } from "react";
import { Input } from "~/components/dashboard/Input";
import { Select } from "~/components/dashboard/Select";

type ContractFinancialFieldsProps = {
  currencies?: Array<{ id: number; code: string; symbol?: string | null }>;
  defaults?: {
    rentalAmount?: number | null;
    deliveryCost?: number | null;
    returnCost?: number | null;
    depositAmount?: number | null;
    totalAmount?: number | null;
    currencyId?: number | null;
    depositCurrencyId?: number | null;
  };
  values?: {
    rentalAmount?: number | string;
    deliveryCost?: number | string;
    returnCost?: number | string;
    extras?: Array<{ key: string; title: string; amount: number | string; method?: string }>;
  };
  onRentalAmountChange?: (value: string) => void;
  onDeliveryCostChange?: (value: string) => void;
  onReturnCostChange?: (value: string) => void;
  onExtraAmountChange?: (key: string, value: string) => void;
  onExtraMethodChange?: (key: string, value: string) => void;
};

export default function ContractFinancialFields({
  currencies = [],
  defaults,
  values,
  onRentalAmountChange,
  onDeliveryCostChange,
  onReturnCostChange,
  onExtraAmountChange,
}: ContractFinancialFieldsProps) {
  const [selectedCurrencyId, setSelectedCurrencyId] = useState<number | string>(
    defaults?.currencyId || defaults?.depositCurrencyId || (currencies[0]?.id || "")
  );

  const currencyOptions = currencies.map((c) => ({
    id: c.id,
    name: c.code,
  }));

  const selectedCurrency = currencies.find((c) => Number(c.id) === Number(selectedCurrencyId)) || currencies[0];
  const currencySymbol = selectedCurrency?.symbol || selectedCurrency?.code || "฿";

  // Calculate total automatically
  const rental = Number(values?.rentalAmount || defaults?.rentalAmount || 0);
  const delivery = Number(values?.deliveryCost || defaults?.deliveryCost || 0);
  const ret = Number(values?.returnCost || defaults?.returnCost || 0);
  const extrasSum = (values?.extras || []).reduce((sum, e) => sum + Number(e.amount || 0), 0);
  const calculatedTotal = rental + delivery + ret + extrasSum;

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <div className="md:col-span-2">
        <Input
          label="Rental Price *"
          name="rental_amount"
          type="number"
          value={values?.rentalAmount !== undefined ? values.rentalAmount : (defaults?.rentalAmount ?? "")}
          onChange={(e) => onRentalAmountChange?.(e.target.value)}
          placeholder="0.00"
          addonRight={currencySymbol}
        />
      </div>
      <div className="md:col-span-1">
        <Select
          label="Currency *"
          name="currency_id"
          options={currencyOptions}
          value={String(selectedCurrencyId)}
          onChange={(e) => setSelectedCurrencyId(e.target.value)}
          required
        />
      </div>
      <div className="md:col-span-1">
        <Input
          label="Deposit Payment"
          name="deposit_amount"
          type="number"
          defaultValue={defaults?.depositAmount ?? undefined}
          placeholder="0.00"
          addonRight={currencySymbol}
        />
      </div>

      <div className="md:col-span-1">
        <Input
          label="Delivery Price"
          name="delivery_cost"
          type="number"
          value={values?.deliveryCost !== undefined ? values.deliveryCost : (defaults?.deliveryCost ?? "")}
          onChange={(e) => onDeliveryCostChange?.(e.target.value)}
          placeholder="0.00"
          addonRight={currencySymbol}
        />
      </div>
      <div className="md:col-span-1">
        <Input
          label="Return Price"
          name="return_cost"
          type="number"
          value={values?.returnCost !== undefined ? values.returnCost : (defaults?.returnCost ?? "")}
          onChange={(e) => onReturnCostChange?.(e.target.value)}
          placeholder="0.00"
          addonRight={currencySymbol}
        />
      </div>

      {values?.extras?.map((extra) => (
        <div key={extra.key} className="md:col-span-1">
          <Input
            label={extra.title}
            name={`extra_${extra.key}_amount`}
            type="number"
            value={extra.amount}
            onChange={(e) => onExtraAmountChange?.(extra.key, e.target.value)}
            placeholder="0.00"
            addonRight={currencySymbol}
          />
        </div>
      ))}

      <div className="md:col-span-4 mt-2">
        <Input
          label="Total Rental Cost *"
          name="total_amount"
          type="number"
          value={calculatedTotal || (defaults?.totalAmount ?? "")}
          readOnly
          className="bg-gray-50 text-xl font-bold"
          placeholder="0.00"
          required
          addonRight={currencySymbol}
        />
      </div>
    </div>
  );
}

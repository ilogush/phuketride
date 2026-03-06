import FormInput from "~/components/dashboard/FormInput";
import FormSelect from "~/components/dashboard/FormSelect";

type ContractFinancialFieldsProps = {
  defaults?: {
    deliveryCost?: number | null;
    returnCost?: number | null;
    depositAmount?: number | null;
    depositPaymentMethod?: string | null;
    totalAmount?: number | null;
  };
};

export default function ContractFinancialFields({ defaults }: ContractFinancialFieldsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <FormInput
        label="Delivery Price"
        name="delivery_cost"
        type="number"
        defaultValue={defaults?.deliveryCost ?? undefined}
        placeholder="0.00"
      />
      <FormInput
        label="Return Price"
        name="return_cost"
        type="number"
        defaultValue={defaults?.returnCost ?? undefined}
        placeholder="0.00"
      />
      <FormInput
        label="Deposit Payment"
        name="deposit_amount"
        type="number"
        defaultValue={defaults?.depositAmount ?? undefined}
        placeholder="0.00"
      />
      <FormSelect
        label="Deposit Method"
        name="deposit_payment_method"
        options={[
          { id: "cash", name: "Cash" },
          { id: "bank_transfer", name: "Bank Transfer" },
          { id: "card", name: "Card" },
        ]}
        defaultValue={defaults?.depositPaymentMethod || ""}
        placeholder="Select method"
      />
      <FormInput
        label="Total Rental Cost"
        name="total_amount"
        type="number"
        defaultValue={defaults?.totalAmount ?? undefined}
        placeholder="0.00"
        required
      />
    </div>
  );
}

import { formatDateTimeForDisplay, getCurrencySymbol } from "~/lib/formatters";

type PaymentRow = {
  id: number;
  amount: number;
  currency: string;
  status: string;
  createdAt: string;
  extraType: string | null;
  notes: string | null;
};

type ContractPaymentsTableProps = {
  payments: PaymentRow[];
};

export default function ContractPaymentsTable({ payments = [] }: ContractPaymentsTableProps) {
  if (!payments || payments.length === 0) {
    return (
      <div className="p-4 text-center text-gray-500 bg-gray-50 rounded-xl border border-gray-100">
        No payments found for this contract.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-100">
      <table className="w-full text-sm text-left">
        <thead className="bg-gray-50 text-gray-700">
          <tr>
            <th className="px-4 py-3 font-semibold">Date</th>
            <th className="px-4 py-3 font-semibold">Type</th>
            <th className="px-4 py-3 font-semibold">Amount</th>
            <th className="px-4 py-3 font-semibold">Status</th>
            <th className="px-4 py-3 font-semibold">Notes</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 bg-white">
          {payments.map((payment) => (
            <tr key={payment.id} className="hover:bg-gray-50/50 transition-colors">
              <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                {payment.createdAt ? formatDateTimeForDisplay(payment.createdAt) : "—"}
              </td>
              <td className="px-4 py-3">
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                  {payment.extraType ? payment.extraType.replace(/_/g, " ") : "Rental"}
                </span>
              </td>
              <td className="px-4 py-3 font-medium text-gray-900">
                {getCurrencySymbol(payment.currency)}{payment.amount}
              </td>
              <td className="px-4 py-3">
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                    payment.status === "completed"
                      ? "bg-green-50 text-green-700"
                      : payment.status === "cancelled" || payment.status === "failed" || payment.status === "refunded"
                      ? "bg-red-50 text-red-700"
                      : "bg-yellow-50 text-yellow-700"
                  }`}
                >
                  {payment.status || "—"}
                </span>
              </td>
              <td className="px-4 py-3 text-gray-500">
                {payment.notes || "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

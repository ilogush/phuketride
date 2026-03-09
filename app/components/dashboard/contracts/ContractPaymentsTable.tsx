import DataTable, { type Column } from "~/components/dashboard/data-table/DataTable";
import StatusBadge from "~/components/shared/ui/StatusBadge";
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
  const columns: Column<PaymentRow>[] = [
    {
      key: "createdAt",
      label: "Date",
      render: (payment) => payment.createdAt ? formatDateTimeForDisplay(payment.createdAt) : "—",
    },
    {
      key: "extraType",
      label: "Type",
      render: (payment) => payment.extraType ? payment.extraType.replace(/_/g, " ") : "Rental",
    },
    {
      key: "amount",
      label: "Total Amount",
      render: (payment) => `${getCurrencySymbol(payment.currency)}${payment.amount}`,
    },
    {
      key: "status",
      label: "Status",
      render: (payment) => (
        <StatusBadge
          variant={
            payment.status === "completed"
              ? "success"
              : payment.status === "cancelled" || payment.status === "failed" || payment.status === "refunded"
                ? "error"
                : "warning"
          }
        >
          {payment.status || "—"}
        </StatusBadge>
      ),
    },
    {
      key: "notes",
      label: "Notes",
      wrap: true,
      render: (payment) => payment.notes || "—",
    },
  ];

  if (!payments || payments.length === 0) {
    return (
      <div className="p-4 text-center text-gray-500 bg-gray-50 rounded-xl border border-gray-100">
        No payments found for this contract.
      </div>
    );
  }

  return <DataTable data={payments} columns={columns} pagination={false} />;
}

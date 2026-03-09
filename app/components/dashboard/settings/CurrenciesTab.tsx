import { Form } from "react-router";
import DataTable, { type Column } from "~/components/dashboard/data-table/DataTable";
import Modal from '~/components/shared/ui/Modal';
import Toggle from '~/components/shared/ui/Toggle';
import Button from '~/components/shared/ui/Button';
import { Input } from '~/components/shared/ui/Input';
import { isPhuketName, type Currency } from "~/lib/settings-normalizers";
import AdminCard from '~/components/shared/ui/AdminCard';
import IdBadge from "~/components/shared/ui/IdBadge";
import { CurrencyDollarIcon } from "@heroicons/react/24/outline";

interface CurrenciesTabProps {
  currencies: Currency[];
  companyId: number;
  companyLocationName: string | null | undefined;
  settingsActionUrl: string;
  isCurrencyModalOpen: boolean;
  setIsCurrencyModalOpen: (open: boolean) => void;
  onToggleCurrency: (id: number, field: "isActive" | "isDefault") => void;
  onCurrencyCreated: () => Promise<void> | void;
}

export default function CurrenciesTab({
  currencies,
  companyId,
  companyLocationName,
  settingsActionUrl,
  isCurrencyModalOpen,
  setIsCurrencyModalOpen,
  onToggleCurrency,
  onCurrencyCreated,
}: CurrenciesTabProps) {
  const isPhuketCompany = isPhuketName(companyLocationName);
  const columns: Column<Currency>[] = [
    {
      key: "id",
      label: "ID",
      render: (currency) => <IdBadge>{String(currency.id).padStart(3, "0")}</IdBadge>,
    },
    {
      key: "name",
      label: "Currency",
      render: (currency) => {
        const isThbCurrency = String(currency.code || "").toUpperCase() === "THB";
        const currencyCodeLabel = isThbCurrency ? "฿" : currency.code;
        return (
          <div className="flex flex-col">
            <span className="font-medium text-gray-900">{currency.name}</span>
            <span className="text-xs text-gray-500 uppercase">{currencyCodeLabel} ({currency.symbol})</span>
          </div>
        );
      },
      className: "w-full",
    },
    {
      key: "default",
      label: "Default",
      render: (currency) => {
        const isThbCurrency = String(currency.code || "").toUpperCase() === "THB";
        const lockThbForPhuket = isPhuketCompany && isThbCurrency;
        return (
          <div className="flex justify-center">
            <Toggle
              size="sm"
              checked={lockThbForPhuket ? true : currency.companyId === companyId}
              disabled={lockThbForPhuket}
              onCheckedChange={() => onToggleCurrency(currency.id, "isDefault")}
            />
          </div>
        );
      },
    },
    {
      key: "active",
      label: "Active",
      render: (currency) => {
        const isThbCurrency = String(currency.code || "").toUpperCase() === "THB";
        const lockThbForPhuket = isPhuketCompany && isThbCurrency;
        return (
          <div className="flex justify-center">
            <Toggle
              size="sm"
              checked={lockThbForPhuket ? true : Boolean(currency.isActive)}
              disabled={lockThbForPhuket}
              onCheckedChange={() => onToggleCurrency(currency.id, "isActive")}
            />
          </div>
        );
      },
    },
  ];

  return (
    <div className="flex flex-col lg:flex-row gap-4">
      <div className="flex-1 overflow-hidden">
        <DataTable data={currencies} columns={columns} pagination={false} />
      </div>

      <div className="w-full lg:w-80 shrink-0">
        <AdminCard title="New Currency" icon={<CurrencyDollarIcon className="w-5 h-5" />}>
          <Form
            method="post"
            action={settingsActionUrl}
            className="space-y-4"
            reloadDocument
            onSubmit={() => {
              onCurrencyCreated();
            }}
          >
            <input type="hidden" name="intent" value="createCurrency" />
            <Input
              label="Currency Name"
              name="name"
              placeholder="e.g., British Pound"
              required
              className="text-xs"
            />
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Code"
                name="code"
                placeholder="GBP"
                required
                className="text-xs"
              />
              <Input
                label="Symbol"
                name="symbol"
                placeholder="£"
                required
                className="text-xs"
              />
            </div>
            <div className="pt-2">
              <Button 
                type="submit" 
                variant="solid" 
                className="w-full justify-center py-2.5"
              >
                Create Currency
              </Button>
            </div>
          </Form>
        </AdminCard>
      </div>
    </div>
  );
}

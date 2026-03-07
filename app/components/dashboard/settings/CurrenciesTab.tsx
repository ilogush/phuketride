import { Form } from "react-router";
import Modal from "~/components/dashboard/Modal";
import Toggle from "~/components/dashboard/Toggle";
import Button from "~/components/dashboard/Button";
import { Input } from "~/components/dashboard/Input";
import { isPhuketName, type Currency } from "~/lib/settings-normalizers";

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

  return (
    <div className="space-y-4">
      <div className="overflow-hidden">
        <div className="border border-gray-200 rounded-3xl overflow-hidden bg-white">
          <div className="overflow-x-auto sm:mx-0">
            <table className="min-w-full divide-y divide-gray-100 bg-transparent">
              <thead>
                <tr className="bg-gray-50/50">
                  <th scope="col" className="pl-4 py-3 text-left text-sm font-semibold text-gray-400 tracking-tight">
                    <span>ID</span>
                  </th>
                  <th scope="col" className="px-4 py-3 text-left text-sm font-semibold text-gray-400 tracking-tight">
                    <span>Currency</span>
                  </th>
                  <th scope="col" className="px-4 py-3 text-center text-sm font-semibold text-gray-400 tracking-tight">
                    <span>Default</span>
                  </th>
                  <th scope="col" className="px-4 py-3 text-center text-sm font-semibold text-gray-400 tracking-tight">
                    <span>Active</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {currencies.map((currency) => {
                  const isThbCurrency = String(currency.code || "").toUpperCase() === "THB";
                  const lockThbForPhuket = isPhuketCompany && isThbCurrency;
                  const currencyCodeLabel = isThbCurrency ? "฿" : currency.code;
                  return (
                    <tr key={currency.id} className="group hover:bg-white transition-all">
                      <td className="pl-4 py-3 text-sm text-gray-900 whitespace-nowrap">
                        <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full text-[11px] font-bold font-mono bg-gray-800 text-white min-w-[2.25rem] h-5 leading-none">
                          {String(currency.id).padStart(3, "0")}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">
                        <div className="flex flex-col">
                          <span className="font-medium text-gray-900">{currency.name}</span>
                          <span className="text-xs text-gray-500 uppercase">{currencyCodeLabel} ({currency.symbol})</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap text-center">
                        <Toggle
                          size="sm"
                          checked={lockThbForPhuket ? true : currency.companyId === companyId}
                          disabled={lockThbForPhuket}
                          onCheckedChange={() => onToggleCurrency(currency.id, "isDefault")}
                        />
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap text-center">
                        <Toggle
                          size="sm"
                          checked={lockThbForPhuket ? true : Boolean(currency.isActive)}
                          disabled={lockThbForPhuket}
                          onCheckedChange={() => onToggleCurrency(currency.id, "isActive")}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <Modal
        title="Add Currency"
        open={isCurrencyModalOpen}
        onClose={() => setIsCurrencyModalOpen(false)}
        size="md"
      >
        <Form
          method="post"
          action={settingsActionUrl}
          className="space-y-4"
          reloadDocument
          onSubmit={() => {
            setIsCurrencyModalOpen(false);
            onCurrencyCreated();
          }}
        >
          <input type="hidden" name="intent" value="createCurrency" />
          <Input
            label="Currency Name"
            name="name"
            placeholder="e.g., British Pound"
            required
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Currency Code"
              name="code"
              placeholder="e.g., GBP"
              required
            />
            <Input
              label="Symbol"
              name="symbol"
              placeholder="e.g., £"
              required
            />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button type="submit" variant="solid">Create</Button>
          </div>
        </Form>
      </Modal>
    </div>
  );
}

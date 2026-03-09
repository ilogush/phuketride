import { Form } from "react-router";
import DataTable, { type Column } from "~/components/dashboard/data-table/DataTable";
import Button from '~/components/shared/ui/Button';
import DeleteButton from '~/components/shared/ui/DeleteButton';
import { Input } from '~/components/shared/ui/Input';
import { Select } from '~/components/shared/ui/Select';
import { Textarea } from '~/components/shared/ui/Textarea';
import AdminCard from '~/components/shared/ui/AdminCard';
import IdBadge from "~/components/shared/ui/IdBadge";
import { BanknotesIcon, XMarkIcon } from "@heroicons/react/24/outline";

export type PaymentTemplateItem = {
  id: number;
  name: string;
  sign: "+" | "-";
  description: string | null;
  isSystem?: boolean | number | null;
};

interface PaymentFormState {
  name: string;
  sign: string;
  description: string;
}

interface PaymentTemplatesTabProps {
  paymentTypes: PaymentTemplateItem[];
  settingsActionUrl: string;
  isPaymentModalOpen: boolean;
  editingPaymentTemplate: PaymentTemplateItem | null;
  paymentFormData: PaymentFormState;
  setIsPaymentModalOpen: (open: boolean) => void;
  setEditingPaymentTemplate: (item: PaymentTemplateItem | null) => void;
  setPaymentFormData: (data: PaymentFormState) => void;
}

export default function PaymentTemplatesTab({
  paymentTypes,
  settingsActionUrl,
  isPaymentModalOpen,
  editingPaymentTemplate,
  paymentFormData,
  setIsPaymentModalOpen,
  setEditingPaymentTemplate,
  setPaymentFormData,
}: PaymentTemplatesTabProps) {
  const columns: Column<PaymentTemplateItem>[] = [
    {
      key: "id",
      label: "ID",
      render: (template) => <IdBadge>{String(template.id).padStart(3, "0")}</IdBadge>,
    },
    {
      key: "name",
      label: "Name",
      render: (template) => (
        <div className="flex flex-col">
          <span className="font-medium text-gray-900">{template.name}</span>
          {template.description && (
            <span className="text-xs text-gray-500 mt-0.5">
              {template.description}
            </span>
          )}
        </div>
      ),
      className: "w-full",
    },
    {
      key: "sign",
      label: "Sign",
      render: (template) => (
        <span className={`inline-flex items-center justify-center w-6 h-6 rounded-lg text-sm font-bold border ${template.sign === "+"
          ? "bg-green-50 text-green-700 border-green-100"
          : "bg-red-50 text-red-700 border-red-100"
          }`}>
          {template.sign}
        </span>
      ),
    },
    {
      key: "actions",
      label: "Actions",
      render: (template) => (
        <div className="flex gap-2 justify-end">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              setPaymentFormData({
                name: template.name,
                sign: template.sign ?? "+",
                description: template.description || "",
              });
              setEditingPaymentTemplate(template);
            }}
          >
            Edit
          </Button>
          {!template.isSystem && (
            <Form method="post" action={settingsActionUrl} reloadDocument>
              <input type="hidden" name="intent" value="deletePaymentTemplate" />
              <input type="hidden" name="id" value={template.id} />
              <DeleteButton type="submit" size="sm" title="Delete" />
            </Form>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col lg:flex-row gap-4">
      <div className="flex-1 overflow-hidden">
        <DataTable data={paymentTypes} columns={columns} pagination={false} />
      </div>

      <div className="w-full lg:w-80 shrink-0">
        <AdminCard 
          title={editingPaymentTemplate ? "Edit Payment Type" : "New Payment Type"} 
          icon={<BanknotesIcon className="w-5 h-5" />}
          headerActions={editingPaymentTemplate && (
            <button 
              onClick={() => {
                setEditingPaymentTemplate(null);
                setPaymentFormData({ name: "", sign: "+", description: "" });
              }}
              className="p-1 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
            >
              <XMarkIcon className="w-4 h-4" />
            </button>
          )}
        >
          <Form
            method="post"
            action={settingsActionUrl}
            className="space-y-4"
            reloadDocument
          >
            <input type="hidden" name="intent" value={editingPaymentTemplate ? "updatePaymentTemplate" : "createPaymentTemplate"} />
            {editingPaymentTemplate && <input type="hidden" name="id" value={editingPaymentTemplate.id} />}
            <Input
              label="Payment Type Name"
              name="name"
              value={paymentFormData.name}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPaymentFormData({ ...paymentFormData, name: e.target.value })}
              placeholder="e.g., Rental Payment"
              required
              className="text-xs"
            />
            <Select
              label="Sign"
              name="sign"
              value={paymentFormData.sign}
              onChange={(e) => setPaymentFormData({ ...paymentFormData, sign: e.target.value })}
              options={[
                { id: "+", name: "+ (Income)" },
                { id: "-", name: "- (Expense)" },
              ]}
              required
            />
            <Textarea
              label="Description"
              name="description"
              value={paymentFormData.description}
              onChange={(value) => setPaymentFormData({ ...paymentFormData, description: value })}
              rows={2}
              placeholder="Optional description"
              className="text-xs"
            />
            <div className="pt-2">
              <Button 
                type="submit" 
                variant="primary" 
                className="w-full justify-center py-2.5"
              >
                {editingPaymentTemplate ? "Update" : "Create"}
              </Button>
            </div>
          </Form>
        </AdminCard>
      </div>
    </div>
  );
}

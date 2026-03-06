import { Form } from "react-router";
import Modal from "~/components/dashboard/Modal";
import Button from "~/components/dashboard/Button";
import { Input } from "~/components/dashboard/Input";
import { Textarea } from "~/components/dashboard/Textarea";

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
                  <th scope="col" className="px-4 py-3 text-left text-sm font-semibold text-gray-400 tracking-tight w-full">
                    <span>Name</span>
                  </th>
                  <th scope="col" className="px-4 py-3 text-left text-sm font-semibold text-gray-400 tracking-tight w-24">
                    <span>Sign</span>
                  </th>
                  <th scope="col" className="px-4 py-3 text-left text-sm font-semibold text-gray-400 tracking-tight">
                    <span>Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {paymentTypes.map((template) => (
                  <tr key={template.id} className="group hover:bg-white transition-all">
                    <td className="pl-4 py-3 text-sm text-gray-900 whitespace-nowrap">
                      <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full text-[11px] font-bold font-mono bg-gray-800 text-white min-w-[2.25rem] h-5 leading-none">
                        {String(template.id).padStart(3, "0")}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap w-full">
                      <div className="flex flex-col">
                        <span className="font-medium text-gray-900">{template.name}</span>
                        {template.description && (
                          <span className="text-xs text-gray-500 mt-0.5">
                            {template.description}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap w-24">
                      <span className={`inline-flex items-center justify-center w-6 h-6 rounded-lg text-sm font-bold border ${template.sign === "+"
                        ? "bg-green-50 text-green-700 border-green-100"
                        : "bg-red-50 text-red-700 border-red-100"
                        }`}>
                        {template.sign}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          onClick={() => {
                            setPaymentFormData({
                              name: template.name,
                              sign: template.sign ?? "+",
                              description: template.description || "",
                            });
                            setEditingPaymentTemplate(template);
                            setIsPaymentModalOpen(true);
                          }}
                        >
                          Edit
                        </Button>
                        {!template.isSystem && (
                          <Form method="post" action={settingsActionUrl} reloadDocument>
                            <input type="hidden" name="intent" value="deletePaymentTemplate" />
                            <input type="hidden" name="id" value={template.id} />
                            <Button type="submit" variant="secondary" size="sm">Delete</Button>
                          </Form>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <Modal
        title={editingPaymentTemplate ? "Edit Payment Template" : "Add Payment Template"}
        isOpen={isPaymentModalOpen}
        onClose={() => {
          setIsPaymentModalOpen(false);
          setEditingPaymentTemplate(null);
        }}
        size="md"
      >
        <Form
          method="post"
          action={settingsActionUrl}
          className="space-y-4"
          reloadDocument
          onSubmit={() => {
            setIsPaymentModalOpen(false);
            setEditingPaymentTemplate(null);
          }}
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
          />
          <div>
            <label className="block text-xs text-gray-600 mb-1">Sign</label>
            <select
              name="sign"
              value={paymentFormData.sign}
              onChange={(e) => setPaymentFormData({ ...paymentFormData, sign: e.target.value })}
              className="w-full px-4 py-2 text-gray-600 border border-gray-200 rounded-xl"
              required
            >
              <option value="+">+ (Income)</option>
              <option value="-">- (Expense)</option>
            </select>
          </div>
          <Textarea
            label="Description"
            name="description"
            value={paymentFormData.description}
            onChange={(value) => setPaymentFormData({ ...paymentFormData, description: value })}
            rows={3}
            placeholder="Optional description"
          />
          <div className="flex justify-end gap-3 pt-4">
            <Button type="submit" variant="primary">{editingPaymentTemplate ? "Update" : "Create"}</Button>
          </div>
        </Form>
      </Modal>
    </div>
  );
}

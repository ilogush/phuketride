import { DocumentTextIcon } from "@heroicons/react/24/outline";
import { Form, useNavigate } from "react-router";

import Button from "~/components/dashboard/Button";
import FormSection from "~/components/dashboard/FormSection";
import Modal from "~/components/dashboard/Modal";
import { Input } from "~/components/dashboard/Input";
import { Select } from "~/components/dashboard/Select";
import { Textarea } from "~/components/dashboard/Textarea";
import { useDateMasking } from "~/lib/useDateMasking";
import { useUrlToast } from "~/lib/useUrlToast";
import { getDefaultContractCloseDateTime } from "~/lib/formatters";

import type { CloseContractViewData } from "./contract-close.loader.server";

const fuelLevels = [
  { id: "full", name: "Full (8/8)" },
  { id: "7/8", name: "7/8 (87.5%)" },
  { id: "6/8", name: "6/8 (75%)" },
  { id: "5/8", name: "5/8 (62.5%)" },
  { id: "half", name: "Half (4/8)" },
  { id: "3/8", name: "3/8 (37.5%)" },
  { id: "2/8", name: "2/8 (25%)" },
  { id: "1/8", name: "1/8 (12.5%)" },
  { id: "empty", name: "Empty" },
];

const cleanlinessOptions = [
  { id: "clean", name: "Clean" },
  { id: "dirty", name: "Dirty" },
];

export default function ContractClosePageView({
  contract,
}: CloseContractViewData) {
  useUrlToast();
  const navigate = useNavigate();
  const { maskDateTimeInput } = useDateMasking();

  return (
    <Modal
      open={true}
      onClose={() => navigate("/contracts")}
      title="Close Contract"
      size="large"
    >
      <Form method="post" className="space-y-6">
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
          <h3 className="mb-2 text-sm font-medium text-gray-700">Contract Details</h3>
          <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
            <div>
              <span className="text-gray-500">Car:</span>
              <span className="ml-2 font-medium">
                {contract.companyCar.template?.brand?.name}{" "}
                {contract.companyCar.template?.model?.name}
              </span>
            </div>
            <div>
              <span className="text-gray-500">Client:</span>
              <span className="ml-2 font-medium">
                {contract.client.name} {contract.client.surname}
              </span>
            </div>
            <div>
              <span className="text-gray-500">Start:</span>
              <span className="ml-2 font-medium">
                {new Date(contract.startDate).toLocaleDateString()}
              </span>
            </div>
            <div>
              <span className="text-gray-500">End:</span>
              <span className="ml-2 font-medium">
                {new Date(contract.endDate).toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>

        <FormSection
          title="Return Details"
          icon={<DocumentTextIcon className="h-6 w-6" />}
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Input
              label="Actual End Date & Time"
              type="text"
              name="actualEndDate"
              required
              defaultValue={getDefaultContractCloseDateTime()}
              placeholder="DD/MM/YYYY HH:mm"
              onChange={maskDateTimeInput}
            />
            <Input
              label="End Mileage"
              name="endMileage"
              type="number"
              defaultValue={contract.startMileage || 0}
              required
            />
            <Select
              label="Fuel Level"
              name="fuelLevel"
              options={fuelLevels}
              defaultValue={contract.fuelLevel || "full"}
              required
            />
            <Select
              label="Cleanliness"
              name="cleanliness"
              options={cleanlinessOptions}
              defaultValue={contract.cleanliness || "clean"}
              required
            />
          </div>
        </FormSection>

        <div>
          <Textarea
            label="Closing Notes"
            name="notes"
            rows={3}
            placeholder="Add any notes about the return (damages, issues, etc.)"
          />
        </div>

        <div className="flex justify-end gap-3 border-t border-gray-200 pt-4">
          <Button type="submit" variant="solid">
            Close Contract
          </Button>
        </div>
      </Form>
    </Modal>
  );
}

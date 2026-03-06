import { Form } from "react-router";
import Modal from "~/components/dashboard/Modal";
import Button from "~/components/dashboard/Button";
import { Input } from "~/components/dashboard/Input";
import { Textarea } from "~/components/dashboard/Textarea";

export type DistrictModalFormData = {
  name: string;
  beaches: string;
  streets: string;
  deliveryPrice: string;
};

export type DistrictModalEditingDistrict = {
  id: number;
} | null;

type DistrictModalProps = {
  isOpen: boolean;
  onClose: () => void;
  editingDistrict: DistrictModalEditingDistrict;
  formData: DistrictModalFormData;
  onNameChange: (value: string) => void;
  onBeachesChange: (value: string) => void;
  onStreetsChange: (value: string) => void;
  onDeliveryPriceChange: (value: string) => void;
};

export default function DistrictModal({
  isOpen,
  onClose,
  editingDistrict,
  formData,
  onNameChange,
  onBeachesChange,
  onStreetsChange,
  onDeliveryPriceChange,
}: DistrictModalProps) {
  return (
    <Modal
      title={editingDistrict ? "Edit District" : "Add"}
      isOpen={isOpen}
      onClose={onClose}
      size="md"
    >
      <Form method="post" className="space-y-4" onSubmit={onClose}>
        <input type="hidden" name="intent" value={editingDistrict ? "update" : "create"} />
        {editingDistrict && <input type="hidden" name="id" value={editingDistrict.id} />}

        <Input
          label="District Name"
          name="name"
          value={formData.name}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => onNameChange(e.target.value)}
          placeholder="e.g., Patong"
          required
        />

        <Textarea
          label="Beaches / Locations (comma separated)"
          name="beaches"
          value={formData.beaches}
          onChange={onBeachesChange}
          rows={3}
          placeholder="e.g., Patong Beach, Kalim Beach, Paradise Beach"
          required
        />

        <Textarea
          label="Streets / Roads (comma separated)"
          name="streets"
          value={formData.streets}
          onChange={onStreetsChange}
          rows={3}
          placeholder="e.g., Bangla Road, Beach Road, Rat-U-Thit Road"
        />

        <Input
          label="Delivery Price (THB)"
          name="deliveryPrice"
          type="number"
          value={formData.deliveryPrice}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => onDeliveryPriceChange(e.target.value)}
          placeholder="e.g., 600"
          required
        />

        <div className="flex justify-end gap-3 pt-4">
          {editingDistrict && (
            <Button type="submit" form="delete-district-form" variant="secondary">
              Delete
            </Button>
          )}
          <Button type="submit" variant="primary">
            {editingDistrict ? "Update" : "Create"}
          </Button>
        </div>
      </Form>

      {editingDistrict && (
        <Form id="delete-district-form" method="post" className="hidden" onSubmit={onClose}>
          <input type="hidden" name="intent" value="delete" />
          <input type="hidden" name="id" value={editingDistrict.id} />
        </Form>
      )}
    </Modal>
  );
}

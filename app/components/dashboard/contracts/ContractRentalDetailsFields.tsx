import { Input } from "~/components/dashboard/Input";
import { Select } from "~/components/dashboard/Select";

type DistrictOption = { id: number | string; name: string; deliveryPrice?: number | null };

type ContractRentalDetailsFieldsProps = {
  districts: DistrictOption[];
  onDateChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onPickupDistrictChange?: (districtId: string) => void;
  onReturnDistrictChange?: (districtId: string) => void;
  defaults?: {
    startDateTime?: string;
    pickupDistrictId?: number | string | null;
    pickupHotel?: string | null;
    pickupRoom?: string | null;
    endDateTime?: string;
    returnDistrictId?: number | string | null;
    returnHotel?: string | null;
    returnRoom?: string | null;
  };
};

export default function ContractRentalDetailsFields({ 
  districts, 
  onDateChange, 
  onPickupDistrictChange,
  onReturnDistrictChange,
  defaults 
}: ContractRentalDetailsFieldsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <Input
        label="Start Date & Time"
        type="text"
        name="start_date"
        required
        defaultValue={defaults?.startDateTime ?? undefined}
        placeholder="DD/MM/YYYY HH:mm"
        onChange={onDateChange}
      />
      <Select
        label="Pickup District"
        name="pickup_district_id"
        options={districts}
        defaultValue={defaults?.pickupDistrictId ?? undefined}
        onChange={(e) => onPickupDistrictChange?.(e.target.value)}
        placeholder="Select district"
        showPlaceholderOption
        required
      />
      <Input
        label="Hotel"
        name="pickup_hotel"
        defaultValue={defaults?.pickupHotel ?? undefined}
        placeholder="Type or select hotel..."
      />
      <Input
        label="Room Number"
        name="pickup_room"
        defaultValue={defaults?.pickupRoom ?? undefined}
        placeholder="Room..."
      />
      <Input
        label="End Date & Time"
        type="text"
        name="end_date"
        required
        defaultValue={defaults?.endDateTime ?? undefined}
        placeholder="DD/MM/YYYY HH:mm"
        onChange={onDateChange}
      />
      <Select
        label="Return District"
        name="return_district_id"
        options={districts}
        defaultValue={defaults?.returnDistrictId ?? undefined}
        onChange={(e) => onReturnDistrictChange?.(e.target.value)}
        placeholder="Select district"
        showPlaceholderOption
        required
      />
      <Input
        label="Return Hotel"
        name="return_hotel"
        defaultValue={defaults?.returnHotel ?? undefined}
        placeholder="Type or select return hotel..."
      />
      <Input
        label="Return Room Number"
        name="return_room"
        defaultValue={defaults?.returnRoom ?? undefined}
        placeholder="Room..."
      />
    </div>
  );
}

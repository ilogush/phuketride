import { Input } from '~/components/shared/ui/Input';
import { Select } from '~/components/shared/ui/Select';
import { CONTRACT_CLEANLINESS_OPTIONS, CONTRACT_FUEL_LEVEL_OPTIONS } from "~/lib/contracts-form-options";

type CarOption = { id: number | string; name: string };

type ContractCarDetailsFieldsProps = {
  cars: CarOption[];
  defaults?: {
    companyCarId?: number | string | null;
    fuelLevel?: string | null;
    cleanliness?: string | null;
    startMileage?: number | null;
  };
};

export default function ContractCarDetailsFields({ cars, defaults }: ContractCarDetailsFieldsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <Select
        label="Car"
        name="company_car_id"
        options={cars}
        defaultValue={defaults?.companyCarId ?? undefined}
        placeholder="Select car"
        required
      />
      <Input
        label="Start Mileage"
        name="start_mileage"
        type="number"
        defaultValue={defaults?.startMileage ?? undefined}
        required
      />
      <Select
        label="Fuel Level"
        name="fuel_level"
        options={CONTRACT_FUEL_LEVEL_OPTIONS}
        defaultValue={defaults?.fuelLevel || "Full"}
        required
      />
      <Select
        label="Cleanliness"
        name="cleanliness"
        options={CONTRACT_CLEANLINESS_OPTIONS}
        defaultValue={defaults?.cleanliness || "Clean"}
        required
      />
    </div>
  );
}

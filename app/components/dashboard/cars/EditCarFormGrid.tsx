import { Form } from "react-router";
import AdminCard from '~/components/shared/ui/AdminCard';
import FormSection from '~/components/shared/ui/FormSection';
import { Input } from '~/components/shared/ui/Input';
import { Select } from '~/components/shared/ui/Select';
import Toggle from '~/components/shared/ui/Toggle';
import CarPhotosUpload from "~/components/dashboard/CarPhotosUpload";
import CarTemplateDetails from "~/components/dashboard/cars/CarTemplateDetails";
import FeatureToggleField from "~/components/dashboard/cars/FeatureToggleField";
import SeasonalPricingMatrix from "~/components/dashboard/cars/SeasonalPricingMatrix";
import {
  ExclamationTriangleIcon,
  TruckIcon,
  PhotoIcon,
  WrenchScrewdriverIcon,
  AdjustmentsHorizontalIcon,
  ShieldCheckIcon,
  BanknotesIcon,
  Cog6ToothIcon,
} from "@heroicons/react/24/outline";
import { getCarPhotoUrls } from "~/lib/car-photos";
import { formatDateInput, getCarTemplateDisplayName } from "~/lib/car-form-display";
import type { CarTemplateOption, DurationRow, SeasonRow } from "~/lib/cars-edit-types";

type EditCarViewModel = {
  templateId: number | null;
  colorId: number | null;
  licensePlate: string | null;
  year: number | null;
  template?: {
    drivetrain?: string | null;
    rearCamera?: number | null;
    bluetoothEnabled?: number | null;
    carplayEnabled?: number | null;
    androidAutoEnabled?: number | null;
    featureAirConditioning?: number | null;
    featureAbs?: number | null;
  } | null;
  transmission: string | null;
  engineVolume: number | null;
  fuelType?: { name?: string | null } | null;
  insuranceType: string | null;
  insuranceExpiryDate: string | null;
  registrationExpiry: string | null;
  taxRoadExpiryDate: string | null;
  minRentalDays: number | null;
  insurancePricePerDay: number | null;
  maxInsurancePrice: number | null;
  pricePerDay: number | null;
  deposit: number | null;
  photos: string | null;
  mileage: number | null;
  nextOilChangeMileage: number | null;
  oilChangeInterval: number | null;
  status: "available" | "rented" | "maintenance" | "booked" | null;
};

type EditCarFormGridProps = {
  car: EditCarViewModel;
  templates: CarTemplateOption[];
  colors: Array<{ id: number; name: string }>;
  seasons: SeasonRow[];
  durations: DurationRow[];
  selectedTemplate: CarTemplateOption | undefined;
  linkedTemplate: CarTemplateOption | null;
  pricePerDay: number;
  setPricePerDay: (value: number) => void;
  currentMileage: number;
  setCurrentMileage: (value: number) => void;
  nextOilChange: number;
  setNextOilChange: (value: number) => void;
  isOilChangeDueSoon: boolean;
  kmUntilOilChange: number;
  selectedTemplateId: number | null;
  setSelectedTemplateId: (value: number | null) => void;
  photos: Array<{ base64: string; fileName: string }>;
  setPhotos: (value: Array<{ base64: string; fileName: string }>) => void;
  fullInsuranceEnabled: boolean;
  setFullInsuranceEnabled: (value: boolean) => void;
  drivetrain: string;
  setDrivetrain: (value: string) => void;
  rearCamera: boolean;
  setRearCamera: (value: boolean) => void;
  bluetoothEnabled: boolean;
  setBluetoothEnabled: (value: boolean) => void;
  carplayEnabled: boolean;
  setCarplayEnabled: (value: boolean) => void;
  androidAutoEnabled: boolean;
  setAndroidAutoEnabled: (value: boolean) => void;
  featureAirConditioning: boolean;
  setFeatureAirConditioning: (value: boolean) => void;
  featureAbs: boolean;
  setFeatureAbs: (value: boolean) => void;
  validateLicensePlateInput: (e: React.ChangeEvent<HTMLInputElement>) => void;
};

export default function EditCarFormGrid({
  car,
  templates,
  colors,
  seasons,
  durations,
  selectedTemplate,
  linkedTemplate,
  pricePerDay,
  setPricePerDay,
  currentMileage,
  setCurrentMileage,
  nextOilChange,
  setNextOilChange,
  isOilChangeDueSoon,
  kmUntilOilChange,
  selectedTemplateId,
  setSelectedTemplateId,
  photos,
  setPhotos,
  fullInsuranceEnabled,
  setFullInsuranceEnabled,
  drivetrain,
  setDrivetrain,
  rearCamera,
  setRearCamera,
  bluetoothEnabled,
  setBluetoothEnabled,
  carplayEnabled,
  setCarplayEnabled,
  androidAutoEnabled,
  setAndroidAutoEnabled,
  featureAirConditioning,
  setFeatureAirConditioning,
  featureAbs,
  setFeatureAbs,
  validateLicensePlateInput,
}: EditCarFormGridProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div className="lg:col-span-2">
        <div className="space-y-4">
          <FormSection title="Specifications" icon={<Cog6ToothIcon className="w-5 h-5" />}>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Select
                label="Car Template"
                name="templateId"
                required
                options={templates.map((t) => ({ id: t.id, name: getCarTemplateDisplayName(t) }))}
                defaultValue={car.templateId ?? ""}
                onChange={(e) => setSelectedTemplateId(Number(e.target.value))}
              />
              <Input
                label="License Plate"
                name="licensePlate"
                required
                defaultValue={car.licensePlate ?? ""}
                onChange={validateLicensePlateInput}
              />
              <Select label="Color" name="colorId" required options={colors} defaultValue={car.colorId ?? ""} />
              <Input
                label="Year"
                name="year"
                type="number"
                required
                min={1900}
                max={new Date().getFullYear() + 1}
                defaultValue={car.year || ""}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
              <Select
                label="Drivetrain"
                name="drivetrain"
                required
                value={drivetrain}
                onChange={(e) => setDrivetrain(e.target.value)}
                options={[
                  { id: "FWD", name: "FWD" },
                  { id: "RWD", name: "RWD" },
                  { id: "AWD", name: "AWD" },
                  { id: "4WD", name: "4WD" },
                ]}
              />
              <FeatureToggleField label="Rear Camera" checked={rearCamera} onCheckedChange={setRearCamera} />
              <FeatureToggleField label="Bluetooth" checked={bluetoothEnabled} onCheckedChange={setBluetoothEnabled} />
              <FeatureToggleField label="CarPlay" checked={carplayEnabled} onCheckedChange={setCarplayEnabled} />
              <FeatureToggleField label="Android Auto" checked={androidAutoEnabled} onCheckedChange={setAndroidAutoEnabled} />
              <FeatureToggleField label="Air conditioning" checked={featureAirConditioning} onCheckedChange={setFeatureAirConditioning} />
              <FeatureToggleField label="ABS" checked={featureAbs} onCheckedChange={setFeatureAbs} />
            </div>
            <input type="hidden" name="transmission" value={selectedTemplate?.transmission || car.transmission || "automatic"} />
            <input type="hidden" name="engineVolume" value={selectedTemplate?.engineVolume || car.engineVolume || 1.5} />
            <input type="hidden" name="fuelType" value={(selectedTemplate?.fuelType?.name || car.fuelType?.name || "Petrol").toLowerCase()} />
            <input type="hidden" name="rear_camera" value={rearCamera ? "1" : "0"} />
            <input type="hidden" name="bluetooth_enabled" value={bluetoothEnabled ? "1" : "0"} />
            <input type="hidden" name="carplay_enabled" value={carplayEnabled ? "1" : "0"} />
            <input type="hidden" name="android_auto_enabled" value={androidAutoEnabled ? "1" : "0"} />
            <input type="hidden" name="feature_air_conditioning" value={featureAirConditioning ? "1" : "0"} />
            <input type="hidden" name="feature_abs" value={featureAbs ? "1" : "0"} />
          </FormSection>

          <FormSection title="Insurance" icon={<ShieldCheckIcon className="w-5 h-5" />}>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Select
                label="Insurance Type"
                name="insuranceType"
                required
                hidePlaceholderOption
                options={[
                  { id: "First Class Insurance", name: "First Class Insurance" },
                  { id: "Business Insurance", name: "Business Insurance" },
                ]}
                defaultValue={car.insuranceType || "First Class Insurance"}
              />
              <Input
                label="Insurance Expiry"
                name="insuranceExpiry"
                placeholder="DD-MM-YYYY"
                maxLength={10}
                defaultValue={formatDateInput(car.insuranceExpiryDate)}
              />
              <Input
                label="Registration Expiry"
                name="registrationExpiry"
                placeholder="DD-MM-YYYY"
                maxLength={10}
                defaultValue={formatDateInput(car.registrationExpiry)}
              />
              <Input
                label="Tax Road Expiry"
                name="taxRoadExpiry"
                placeholder="DD-MM-YYYY"
                maxLength={10}
                defaultValue={formatDateInput(car.taxRoadExpiryDate)}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Input label="Min Rental Days" name="minRentalDays" type="number" min={1} step={1} defaultValue={car.minRentalDays || 1} />
              <div>
                <label className="block text-xs text-gray-600 mb-1">Full Insurance</label>
                <div className="flex h-11 items-center justify-between rounded-2xl border border-gray-200 bg-white px-4">
                  <span className="text-sm text-gray-900">{fullInsuranceEnabled ? "Enabled" : "Disabled"}</span>
                  <Toggle checked={fullInsuranceEnabled} onCheckedChange={setFullInsuranceEnabled} />
                </div>
              </div>
              <input type="hidden" name="fullInsuranceEnabled" value={fullInsuranceEnabled ? "true" : "false"} />
              {fullInsuranceEnabled ? (
                <>
                  <Input
                    label="Insurance Price per day"
                    name="insurancePricePerDay"
                    type="number"
                    min={0}
                    step={0.01}
                    defaultValue={car.insurancePricePerDay || ""}
                    addonRight="฿"
                  />
                  <Input
                    label="Max Insurance Price"
                    name="maxInsurancePrice"
                    type="number"
                    min={0}
                    step={0.01}
                    defaultValue={car.maxInsurancePrice || ""}
                    addonRight="฿"
                  />
                </>
              ) : null}
            </div>
          </FormSection>

          <FormSection title="Pricing" icon={<BanknotesIcon className="w-5 h-5" />}>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Input
                label="Price per Day"
                name="pricePerDay"
                type="number"
                required
                min={0}
                step={0.01}
                value={pricePerDay}
                onChange={(e) => setPricePerDay(Number(e.target.value))}
                addonRight="฿"
              />
              <Input
                label="Deposit"
                name="deposit"
                type="number"
                required
                min={0}
                step={0.01}
                defaultValue={car.deposit || 0}
                addonRight="฿"
              />
            </div>
            <div className="mt-4">
              <h4 className="block text-sm text-gray-500 mb-1">Seasonal Pricing Matrix</h4>
              <SeasonalPricingMatrix pricePerDay={pricePerDay} seasons={seasons} durations={durations} />
            </div>
          </FormSection>

          <input type="hidden" name="photos" value={JSON.stringify(photos)} />
        </div>
      </div>

      <div className="space-y-4">
        {linkedTemplate ? (
          <AdminCard title="Template Details" icon={<TruckIcon className="w-5 h-5" />}>
            <CarTemplateDetails template={linkedTemplate} mode="detailed" />
          </AdminCard>
        ) : null}

        <AdminCard title="Photos" icon={<PhotoIcon className="w-5 h-5" />}>
          <CarPhotosUpload currentPhotos={getCarPhotoUrls(car.photos)} onPhotosChange={setPhotos} maxPhotos={6} />
        </AdminCard>

        <AdminCard title="Maintenance" icon={<WrenchScrewdriverIcon className="w-5 h-5" />}>
          <div className="space-y-4">
            <Input
              label="Current Mileage"
              name="currentMileage"
              type="number"
              required
              min={0}
              value={currentMileage}
              onChange={(e) => setCurrentMileage(Number(e.target.value))}
              addonRight="km"
            />
            <div>
              <Input
                label="Next Oil Change Mileage"
                name="nextOilChangeMileage"
                type="number"
                required
                min={0}
                value={nextOilChange}
                onChange={(e) => setNextOilChange(Number(e.target.value))}
                addonRight="km"
                className={isOilChangeDueSoon ? "bg-gray-100 font-bold" : ""}
              />
              {isOilChangeDueSoon ? (
                <div className="mt-2 flex items-center gap-2 text-orange-600 animate-pulse">
                  <ExclamationTriangleIcon className="w-4 h-4" />
                  <span className="text-xs font-medium">Maintenance Due Soon! ({kmUntilOilChange} km left)</span>
                </div>
              ) : null}
            </div>
            <Input
              label="Oil Change Interval (km)"
              name="oilChangeInterval"
              type="number"
              min={1000}
              step={1000}
              defaultValue={car.oilChangeInterval || 10000}
              addonRight="km"
            />
          </div>
        </AdminCard>

        <AdminCard title="Status" icon={<AdjustmentsHorizontalIcon className="w-5 h-5" />}>
          <Select
            label="Status"
            name="status"
            required
            options={[
              { id: "available", name: "Available" },
              { id: "rented", name: "Rented" },
              { id: "maintenance", name: "Maintenance" },
              { id: "booked", name: "Booked" },
            ]}
            defaultValue={car.status || "available"}
          />
        </AdminCard>
      </div>
    </div>
  );
}

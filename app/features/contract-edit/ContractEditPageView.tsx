import { useState } from "react";
import { Form } from "react-router";
import {
  TruckIcon,
  CalendarIcon,
  UserIcon,
  CubeIcon,
  BanknotesIcon,
  DocumentTextIcon,
} from "@heroicons/react/24/outline";
import { format } from "date-fns";

import AdminCard from '~/components/shared/ui/AdminCard';
import BackButton from '~/components/shared/ui/BackButton';
import Button from '~/components/shared/ui/Button';
import FormSection from '~/components/shared/ui/FormSection';
import PageHeader from '~/components/shared/ui/PageHeader';
import ContractCarDetailsFields from "~/components/dashboard/contracts/ContractCarDetailsFields";
import ContractCarPhotosCard from "~/components/dashboard/contracts/ContractCarPhotosCard";
import ContractClientDetailsFields from "~/components/dashboard/contracts/ContractClientDetailsFields";
import ContractDocumentPhotosRow from "~/components/dashboard/contracts/ContractDocumentPhotosRow";
import ContractNotesField from "~/components/dashboard/contracts/ContractNotesField";
import ContractPaymentsTable from "~/components/dashboard/contracts/ContractPaymentsTable";
import ContractRentalDetailsFields from "~/components/dashboard/contracts/ContractRentalDetailsFields";
import type { loadEditContractPageData } from "~/lib/contracts-edit-page.server";
import { formatDateForDisplay } from "~/lib/formatters";
import { useDateMasking } from "~/lib/useDateMasking";
import { useLatinValidation } from "~/lib/useLatinValidation";
import { useUrlToast } from "~/lib/useUrlToast";

type EditContractPageData = Awaited<ReturnType<typeof loadEditContractPageData>>;

type EditContractPageViewProps = {
  contract: EditContractPageData["contract"];
  cars: EditContractPageData["cars"];
  districts: EditContractPageData["districts"];
  client: EditContractPageData["client"];
  currencies: Array<{ id: number; code: string; symbol?: string | null }>;
  extraSettings: EditContractPageData["extraSettings"];
  payments: EditContractPageData["payments"];
};

const getValidDate = (dateValue: unknown) => {
  if (!dateValue) return new Date();
  if (
    typeof dateValue !== "string" &&
    typeof dateValue !== "number" &&
    !(dateValue instanceof Date)
  ) {
    return new Date();
  }
  const date = new Date(dateValue);
  return Number.isNaN(date.getTime()) ? new Date() : date;
};

export default function ContractEditPageView({
  contract,
  cars,
  districts,
  client,
  currencies,
  extraSettings,
  payments,
}: EditContractPageViewProps) {
  useUrlToast();
  const { maskDateTimeInput } = useDateMasking();
  const { validateLatinInput } = useLatinValidation();

  const startDate = getValidDate(contract.startDate);
  const endDate = getValidDate(contract.endDate);
  const [fullInsurance, setFullInsurance] = useState(contract.fullInsuranceEnabled || false);
  const [deliveryFeeAfterHours, setDeliveryFeeAfterHours] = useState(contract.deliveryFeeAfterHoursEnabled || false);
  const [islandTrip, setIslandTrip] = useState(contract.islandTripEnabled || false);
  const [krabiTrip, setKrabiTrip] = useState(contract.krabiTripEnabled || false);
  const [babySeat, setBabySeat] = useState(contract.babySeatEnabled || false);
  const [carPhotos, setCarPhotos] = useState<Array<{ base64: string; fileName: string }>>([]);
  const [passportPhotos, setPassportPhotos] = useState<Array<{ base64: string; fileName: string }>>(
    () => {
      try {
        return client?.passportPhotos ? JSON.parse(client.passportPhotos) : [];
      } catch {
        return [];
      }
    },
  );
  const [driverLicensePhotos, setDriverLicensePhotos] = useState<
    Array<{ base64: string; fileName: string }>
  >(() => {
    try {
      return client?.driverLicensePhotos ? JSON.parse(client.driverLicensePhotos) : [];
    } catch {
      return [];
    }
  });

  const [extraCurrencies, setExtraCurrencies] = useState<Record<string, string | number>>({
    full_insurance: contract.fullInsuranceCurrencyId || currencies[0]?.id || "",
    delivery_fee_after_hours: contract.deliveryFeeAfterHoursCurrencyId || currencies[0]?.id || "",
    island_trip: contract.islandTripCurrencyId || currencies[0]?.id || "",
    krabi_trip: contract.krabiTripCurrencyId || currencies[0]?.id || "",
    baby_seat: contract.babySeatCurrencyId || currencies[0]?.id || "",
  });

  const handleExtraCurrencyChange = (key: string, value: string) => {
    setExtraCurrencies(prev => ({ ...prev, [key]: value }));
  };

  const existingContractPhotos: string[] = (() => {
    try {
      return contract.photos ? JSON.parse(contract.photos) : [];
    } catch {
      return [];
    }
  })();

  const extraPaymentItems = [
    {
      key: "delivery_fee_after_hours",
      title: "Delivery Fee (After Hours)",
      enabled: deliveryFeeAfterHours,
      onToggle: setDeliveryFeeAfterHours,
    },
    {
      key: "island_trip",
      title: "Island Trip Cost",
      enabled: islandTrip,
      onToggle: setIslandTrip,
    },
    {
      key: "krabi_trip",
      title: "Krabi Trip Cost",
      enabled: krabiTrip,
      onToggle: setKrabiTrip,
    },
    {
      key: "baby_seat",
      title: "Baby Seat Cost (per day)",
      enabled: babySeat,
      onToggle: setBabySeat,
    },
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        title={`Edit Contract #${contract.id}`}
        leftActions={<BackButton to="/contracts" />}
        rightActions={
          <Button type="submit" variant="solid" form="edit-contract-form">
            Save
          </Button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Main Form - Left Side */}
        <div className="lg:col-span-2 space-y-4">
          <Form id="edit-contract-form" method="post" className="space-y-4">
            <input type="hidden" name="contractId" value={contract.id} />
            <input type="hidden" name="passportPhotos" value={JSON.stringify(passportPhotos)} />
            <input
              type="hidden"
              name="driverLicensePhotos"
              value={JSON.stringify(driverLicensePhotos)}
            />
            <input
              type="hidden"
              name="photos"
              value={JSON.stringify(
                carPhotos.length > 0 ? carPhotos.map((p) => p.base64) : existingContractPhotos,
              )}
            />
            <input type="hidden" name="fullInsurance" value={fullInsurance ? "true" : "false"} />
            <input type="hidden" name="deliveryFeeAfterHours" value={deliveryFeeAfterHours ? "true" : "false"} />
            <input type="hidden" name="islandTrip" value={islandTrip ? "true" : "false"} />
            <input type="hidden" name="krabiTrip" value={krabiTrip ? "true" : "false"} />
            <input type="hidden" name="babySeat" value={babySeat ? "true" : "false"} />
            
            {extraPaymentItems.filter(i => i.enabled).map(item => (
              <div key={`hidden_${item.key}`}>
                <input type="hidden" name={`extra_${item.key}_currency`} value={extraCurrencies[item.key] || ""} />
                <input type="hidden" name={`extra_${item.key}_method`} value={contract.extras?.[item.key as keyof typeof contract.extras]?.paymentTypeId || ""} />
              </div>
            ))}

            {/* Car Details */}
            <FormSection title="Car Details" icon={<TruckIcon className="w-6 h-6" />}>
              <ContractCarDetailsFields
                cars={cars}
                defaults={{
                  companyCarId: contract.companyCarId,
                  fuelLevel: contract.fuelLevel,
                  cleanliness: contract.cleanliness,
                  startMileage: contract.startMileage,
                }}
              />
            </FormSection>

            {/* Rental Details */}
            <FormSection title="Rental Details" icon={<CalendarIcon className="w-6 h-6" />}>
            <ContractRentalDetailsFields
                districts={districts}
                onDateChange={maskDateTimeInput}
                defaults={{
                  startDateTime: `${formatDateForDisplay(startDate)} ${format(startDate, "HH:mm")}`,
                  pickupDistrictId: contract.pickupDistrictId,
                  pickupHotel: contract.pickupHotel,
                  pickupRoom: contract.pickupRoom,
                  endDateTime: `${formatDateForDisplay(endDate)} ${format(endDate, "HH:mm")}`,
                  returnDistrictId: contract.returnDistrictId,
                  returnHotel: contract.returnHotel,
                  returnRoom: contract.returnRoom,
                }}
              />
            </FormSection>

            {/* User Details */}
            <FormSection title="User Details" icon={<UserIcon className="w-6 h-6" />}>
              <ContractClientDetailsFields
                onLatinNameInput={validateLatinInput}
                defaults={{
                  passportNumber: client?.passport,
                  name: client?.name,
                  surname: client?.surname,
                  phone: client?.phone,
                  whatsapp: client?.whatsapp,
                  telegram: client?.telegram,
                  email: client?.email,
                }}
              />
            </FormSection>

            {/* Payments List */}
            <FormSection title="Payments" icon={<BanknotesIcon className="w-6 h-6" />}>
              <ContractPaymentsTable payments={payments} />
            </FormSection>
          </Form>
        </div>

        {/* Right Sidebar */}
        <div className="lg:col-span-1 space-y-4">
          {/* Car Photos */}
          <ContractCarPhotosCard
            currentPhotos={existingContractPhotos}
            onPhotosChange={setCarPhotos}
          />

          {/* Document Photos */}
          <ContractDocumentPhotosRow
            passportPhotos={passportPhotos}
            onPassportPhotosChange={setPassportPhotos}
            driverLicensePhotos={driverLicensePhotos}
            onDriverLicensePhotosChange={setDriverLicensePhotos}
          />

          {/* Notes & Terms */}
          <AdminCard title="Notes & Terms" icon={<DocumentTextIcon className="w-5 h-5" />}>
            <ContractNotesField defaultValue={contract.notes || ""} />
          </AdminCard>
        </div>
      </div>
    </div>
  );
}

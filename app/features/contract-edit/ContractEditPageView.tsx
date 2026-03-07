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

import BackButton from "~/components/dashboard/BackButton";
import Button from "~/components/dashboard/Button";
import FormSection from "~/components/dashboard/FormSection";
import PageHeader from "~/components/dashboard/PageHeader";
import ContractCarDetailsFields from "~/components/dashboard/contracts/ContractCarDetailsFields";
import ContractCarPhotosCard from "~/components/dashboard/contracts/ContractCarPhotosCard";
import ContractClientDetailsFields from "~/components/dashboard/contracts/ContractClientDetailsFields";
import ContractDocumentPhotosRow from "~/components/dashboard/contracts/ContractDocumentPhotosRow";
import ContractFinancialFields from "~/components/dashboard/contracts/ContractFinancialFields";
import ContractNotesField from "~/components/dashboard/contracts/ContractNotesField";
import ContractRentalDetailsFields from "~/components/dashboard/contracts/ContractRentalDetailsFields";
import ExtrasToggleGrid from "~/components/dashboard/contracts/ExtrasToggleGrid";
import type { loadEditContractPageData } from "~/lib/contracts-edit-page.server";
import { formatDateForDisplay } from "~/lib/formatters";
import { useDateMasking } from "~/lib/useDateMasking";
import { useUrlToast } from "~/lib/useUrlToast";

type EditContractPageData = Awaited<ReturnType<typeof loadEditContractPageData>>;

type EditContractPageViewProps = {
  contract: EditContractPageData["contract"];
  cars: EditContractPageData["cars"];
  districts: EditContractPageData["districts"];
  client: EditContractPageData["client"];
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
}: EditContractPageViewProps) {
  useUrlToast();
  const { maskDateTimeInput } = useDateMasking();

  const startDate = getValidDate(contract.startDate);
  const endDate = getValidDate(contract.endDate);
  const [fullInsurance, setFullInsurance] = useState(contract.fullInsuranceEnabled || false);
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
  const [notes, setNotes] = useState(contract.notes || "");

  const existingContractPhotos: string[] = (() => {
    try {
      return contract.photos ? JSON.parse(contract.photos) : [];
    } catch {
      return [];
    }
  })();

  const extraToggleItems = [
    { key: "full_insurance", label: "Full Insurance", enabled: fullInsurance, onToggle: setFullInsurance },
    { key: "island_trip", label: "Island Trip", enabled: islandTrip, onToggle: setIslandTrip },
    { key: "krabi_trip", label: "Krabi Trip", enabled: krabiTrip, onToggle: setKrabiTrip },
    { key: "baby_seat", label: "Baby Seat", enabled: babySeat, onToggle: setBabySeat },
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

      <Form id="edit-contract-form" method="post" className="space-y-4">
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
        <input type="hidden" name="islandTrip" value={islandTrip ? "true" : "false"} />
        <input type="hidden" name="krabiTrip" value={krabiTrip ? "true" : "false"} />
        <input type="hidden" name="babySeat" value={babySeat ? "true" : "false"} />

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

        <ContractCarPhotosCard
          currentPhotos={existingContractPhotos}
          onPhotosChange={setCarPhotos}
        />

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

        <FormSection title="User Details" icon={<UserIcon className="w-6 h-6" />}>
          <ContractClientDetailsFields
            defaults={{
              passportNumber: client?.passportNumber,
              name: client?.name,
              surname: client?.surname,
              phone: client?.phone,
              whatsapp: client?.whatsapp,
              telegram: client?.telegram,
              email: client?.email,
            }}
          />
        </FormSection>

        <div className="rounded-3xl border border-gray-200 bg-white p-4">
          <ContractDocumentPhotosRow
            passportPhotos={passportPhotos}
            onPassportPhotosChange={setPassportPhotos}
            driverLicensePhotos={driverLicensePhotos}
            onDriverLicensePhotosChange={setDriverLicensePhotos}
          />
        </div>

        <FormSection title="Extras" icon={<CubeIcon className="w-6 h-6" />}>
          <ExtrasToggleGrid items={extraToggleItems} />
        </FormSection>

        <FormSection title="Financial Summary" icon={<BanknotesIcon className="w-6 h-6" />}>
          <ContractFinancialFields
            defaults={{
              deliveryCost: contract.deliveryCost,
              returnCost: contract.returnCost,
              depositAmount: contract.depositAmount,
              depositPaymentMethod: contract.depositPaymentMethod,
              totalAmount: contract.totalAmount,
            }}
          />
        </FormSection>

        <FormSection title="Notes & Terms" icon={<DocumentTextIcon className="w-6 h-6" />}>
          <ContractNotesField value={notes} onChange={setNotes} />
        </FormSection>
      </Form>
    </div>
  );
}

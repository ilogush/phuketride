import { useEffect, useState } from "react";
import { Form } from "react-router";

import BackButton from "~/components/dashboard/BackButton";
import Button from "~/components/dashboard/Button";
import PageHeader from "~/components/dashboard/PageHeader";
import EditCarFormGrid from "~/components/dashboard/cars/EditCarFormGrid";
import type {
  CarTemplateOption,
  DurationRow,
  SeasonRow,
} from "~/lib/cars-edit-types";
import type { loadCarEditPage } from "~/features/car-edit/car-edit.loader.server";
import { useLatinValidation } from "~/lib/useLatinValidation";
import { useUrlToast } from "~/lib/useUrlToast";

type CarEditPageData = Awaited<ReturnType<typeof loadCarEditPage>>;

type CarEditPageViewProps = {
  car: CarEditPageData["car"];
  templates: CarTemplateOption[] | CarEditPageData["templates"];
  colors: CarEditPageData["colors"];
  seasons: SeasonRow[] | CarEditPageData["seasons"];
  durations: DurationRow[] | CarEditPageData["durations"];
};

export default function CarEditPageView({
  car,
  templates,
  colors,
  seasons,
  durations,
}: CarEditPageViewProps) {
  useUrlToast();
  const { validateLatinInput } = useLatinValidation();
  const [pricePerDay, setPricePerDay] = useState(car.pricePerDay || 0);
  const [currentMileage, setCurrentMileage] = useState(car.mileage || 0);
  const [nextOilChange, setNextOilChange] = useState(car.nextOilChangeMileage || 0);
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(car.templateId);
  const selectedTemplate = templates.find((t) => t.id === selectedTemplateId);
  const linkedTemplate = templates.find((t) => t.id === car.templateId) || null;
  const [photos, setPhotos] = useState<Array<{ base64: string; fileName: string }>>([]);
  const [fullInsuranceEnabled, setFullInsuranceEnabled] = useState(
    Boolean((car.insurancePricePerDay ?? 0) > 0 || (car.maxInsurancePrice ?? 0) > 0),
  );
  const [drivetrain, setDrivetrain] = useState<string>(
    String(car.template?.drivetrain || "FWD"),
  );
  const [rearCamera, setRearCamera] = useState(Boolean(car.template?.rearCamera));
  const [bluetoothEnabled, setBluetoothEnabled] = useState(
    Boolean(car.template?.bluetoothEnabled),
  );
  const [carplayEnabled, setCarplayEnabled] = useState(Boolean(car.template?.carplayEnabled));
  const [androidAutoEnabled, setAndroidAutoEnabled] = useState(
    Boolean(car.template?.androidAutoEnabled),
  );
  const [featureAirConditioning, setFeatureAirConditioning] = useState(
    car.template?.featureAirConditioning == null
      ? true
      : Boolean(car.template.featureAirConditioning),
  );
  const [featureAbs, setFeatureAbs] = useState(
    car.template?.featureAbs == null ? true : Boolean(car.template.featureAbs),
  );

  useEffect(() => {
    if (!selectedTemplate) {
      return;
    }
    setDrivetrain(String(selectedTemplate.drivetrain || "FWD"));
    setRearCamera(Boolean(Number(selectedTemplate.rear_camera || 0)));
    setBluetoothEnabled(Boolean(Number(selectedTemplate.bluetooth_enabled || 0)));
    setCarplayEnabled(Boolean(Number(selectedTemplate.carplay_enabled || 0)));
    setAndroidAutoEnabled(Boolean(Number(selectedTemplate.android_auto_enabled || 0)));
    setFeatureAirConditioning(
      selectedTemplate.feature_air_conditioning == null
        ? true
        : Boolean(Number(selectedTemplate.feature_air_conditioning)),
    );
    setFeatureAbs(
      selectedTemplate.feature_abs == null
        ? true
        : Boolean(Number(selectedTemplate.feature_abs)),
    );
  }, [selectedTemplate]);

  const kmUntilOilChange = nextOilChange - currentMileage;
  const isOilChangeDueSoon = kmUntilOilChange < 1000 && kmUntilOilChange >= 0;

  return (
    <div className="space-y-4">
      <PageHeader
        leftActions={<BackButton to="/cars" />}
        title="Edit Car"
        rightActions={
          <div className="flex gap-2">
            {car.archivedAt ? (
              <Form method="post">
                <input type="hidden" name="intent" value="unarchive" />
                <Button type="submit" variant="solid">
                  Unarchive
                </Button>
              </Form>
            ) : (
              <>
                <Form method="post">
                  <input type="hidden" name="intent" value="archive" />
                  <Button type="submit" variant="outline">
                    Archive/Delete
                  </Button>
                </Form>
                <Button type="submit" form="edit-car-form" variant="solid">
                  Save
                </Button>
              </>
            )}
          </div>
        }
      />

      <Form id="edit-car-form" method="post">
        <EditCarFormGrid
          car={car}
          templates={templates}
          colors={colors}
          seasons={seasons}
          durations={durations}
          selectedTemplate={selectedTemplate}
          linkedTemplate={linkedTemplate}
          pricePerDay={pricePerDay}
          setPricePerDay={setPricePerDay}
          currentMileage={currentMileage}
          setCurrentMileage={setCurrentMileage}
          nextOilChange={nextOilChange}
          setNextOilChange={setNextOilChange}
          isOilChangeDueSoon={isOilChangeDueSoon}
          kmUntilOilChange={kmUntilOilChange}
          selectedTemplateId={selectedTemplateId}
          setSelectedTemplateId={setSelectedTemplateId}
          photos={photos}
          setPhotos={setPhotos}
          fullInsuranceEnabled={fullInsuranceEnabled}
          setFullInsuranceEnabled={setFullInsuranceEnabled}
          drivetrain={drivetrain}
          setDrivetrain={setDrivetrain}
          rearCamera={rearCamera}
          setRearCamera={setRearCamera}
          bluetoothEnabled={bluetoothEnabled}
          setBluetoothEnabled={setBluetoothEnabled}
          carplayEnabled={carplayEnabled}
          setCarplayEnabled={setCarplayEnabled}
          androidAutoEnabled={androidAutoEnabled}
          setAndroidAutoEnabled={setAndroidAutoEnabled}
          featureAirConditioning={featureAirConditioning}
          setFeatureAirConditioning={setFeatureAirConditioning}
          featureAbs={featureAbs}
          setFeatureAbs={setFeatureAbs}
          validateLicensePlateInput={(e) => {
            e.target.value = e.target.value.toUpperCase();
            validateLatinInput(e, "License Plate");
          }}
        />
      </Form>
    </div>
  );
}

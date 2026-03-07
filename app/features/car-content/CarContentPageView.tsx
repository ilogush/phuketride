import { ArrowLeftIcon } from "@heroicons/react/24/outline";
import { Form, Link, useSearchParams } from "react-router";

import BackButton from "~/components/dashboard/BackButton";
import Card from "~/components/dashboard/Card";
import PageHeader from "~/components/dashboard/PageHeader";
import CarContentSections from "~/components/dashboard/cars/CarContentSections";
import { useUrlToast } from "~/lib/useUrlToast";

type CarContentPageViewProps = {
  car: {
    id: number;
    brandName: string | null;
    modelName: string | null;
    licensePlate: string | null;
  };
  contractsCount: number;
  includedItems: Record<string, unknown>[];
  rules: Record<string, unknown>[];
  features: Record<string, unknown>[];
  reviews: Record<string, unknown>[];
};

export default function CarContentPageView(data: CarContentPageViewProps) {
  useUrlToast();
  const [searchParams] = useSearchParams();
  const modCompanyId = searchParams.get("modCompanyId");
  const editPath = modCompanyId
    ? `/cars/${data.car.id}/edit?modCompanyId=${encodeURIComponent(modCompanyId)}`
    : `/cars/${data.car.id}/edit`;
  const title =
    `${data.car.brandName || "Car"} ${data.car.modelName || ""} ${data.car.licensePlate || ""}`.trim();

  return (
    <div className="space-y-4">
      <PageHeader
        leftActions={<BackButton to={editPath} />}
        title="Car Content & Reviews"
        rightActions={
          <Form method="post">
            <input type="hidden" name="intent" value="seed_demo" />
            <button
              type="submit"
              className="rounded-xl bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700"
            >
              Seed Demo Data
            </button>
          </Form>
        }
      />

      <Card padding="lg">
        <p className="text-sm text-gray-600">{title}</p>
        <p className="text-sm text-gray-600">
          Trips: {data.contractsCount} • Reviews: {data.reviews.length}
        </p>
      </Card>

      <CarContentSections
        includedItems={data.includedItems}
        rules={data.rules}
        features={data.features}
        reviews={data.reviews}
      />

      <div className="pt-2">
        <Link
          to={editPath}
          className="inline-flex items-center gap-2 rounded-xl bg-gray-100 px-4 py-2 text-sm text-gray-800 hover:bg-gray-200"
        >
          <ArrowLeftIcon className="h-4 w-4" />
          Back to car edit
        </Link>
      </div>
    </div>
  );
}

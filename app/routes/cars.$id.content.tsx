import { type LoaderFunctionArgs, type ActionFunctionArgs } from "react-router";
import { Form, Link, useLoaderData, useSearchParams } from "react-router";
import BackButton from "~/components/dashboard/BackButton";
import PageHeader from "~/components/dashboard/PageHeader";
import Card from "~/components/dashboard/Card";
import CarContentSections from "~/components/dashboard/cars/CarContentSections";
import { handleCarContentManagementAction, loadCarContentManagementPage } from "~/lib/cars-content-management.server";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";
import { useUrlToast } from "~/lib/useUrlToast";

export async function loader({ request, context, params }: LoaderFunctionArgs) {
  const carId = Number(params.id || 0);
  if (!Number.isFinite(carId) || carId <= 0) {
    throw new Response("Invalid car id", { status: 400 });
  }
  return loadCarContentManagementPage({ request, context, carId });
}

export async function action({ request, context, params }: ActionFunctionArgs) {
  const carId = Number(params.id || 0);
  if (!Number.isFinite(carId) || carId <= 0) {
    throw new Response("Invalid car id", { status: 400 });
  }
  return handleCarContentManagementAction({ request, context, carId });
}

export default function CarContentManagementPage() {
    useUrlToast();
  const data = useLoaderData<typeof loader>();
  const [searchParams] = useSearchParams();
  const modCompanyId = searchParams.get("modCompanyId");
  const editPath = modCompanyId
    ? `/cars/${data.car.id}/edit?modCompanyId=${encodeURIComponent(modCompanyId)}`
    : `/cars/${data.car.id}/edit`;
  const title = `${data.car.brandName || "Car"} ${data.car.modelName || ""} ${data.car.licensePlate || ""}`.trim();
  const success = searchParams.get("success");
  const error = searchParams.get("error");

  return (
    <div className="space-y-4">
      <PageHeader
        leftActions={<BackButton to={editPath} />}
        title="Car Content & Reviews"
        rightActions={
          <Form method="post">
            <input type="hidden" name="intent" value="seed_demo" />
            <button type="submit" className="rounded-xl bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700">
              Seed Demo Data
            </button>
          </Form>
        }
      />

      <Card padding="lg">
        {success ? <p className="mb-2 text-sm text-green-700">{success}</p> : null}
        {error ? <p className="mb-2 text-sm text-red-600">{error}</p> : null}
        <p className="text-sm text-gray-600">{title}</p>
        <p className="text-sm text-gray-600">Trips: {data.contractsCount} • Reviews: {data.reviews.length}</p>
      </Card>

      <CarContentSections
        includedItems={data.includedItems as Record<string, unknown>[]}
        rules={data.rules as Record<string, unknown>[]}
        features={data.features as Record<string, unknown>[]}
        reviews={data.reviews as Record<string, unknown>[]}
      />

      <div className="pt-2">
        <Link to={editPath} className="inline-flex items-center gap-2 rounded-xl bg-gray-100 px-4 py-2 text-sm text-gray-800 hover:bg-gray-200">
          <ArrowLeftIcon className="h-4 w-4" />
          Back to car edit
        </Link>
      </div>
    </div>
  );
}

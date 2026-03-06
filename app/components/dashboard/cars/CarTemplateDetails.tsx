type TemplateDetails = {
  brand?: { name?: string | null };
  model?: { name?: string | null };
  bodyType?: { name?: string | null };
  fuelType?: { name?: string | null };
  transmission?: string | null;
  engineVolume?: number | null;
  seats?: number | null;
  doors?: number | null;
  luggage_capacity?: string | null;
  luggageCapacity?: string | null;
  feature_airbags?: number | null;
  featureAirbags?: number | null;
};

type CarTemplateDetailsProps = {
  template: TemplateDetails;
  mode?: "compact" | "detailed";
};

function formatLuggage(value: string | null | undefined) {
  if (!value) return "N/A";
  return `${value[0].toUpperCase()}${value.slice(1)}`;
}

function airbagsEnabled(template: TemplateDetails) {
  return Number(template.feature_airbags ?? template.featureAirbags ?? 0) > 0;
}

export default function CarTemplateDetails({ template, mode = "compact" }: CarTemplateDetailsProps) {
  if (mode === "detailed") {
    return (
      <div className="space-y-3">
        <div className="flex justify-between"><span className="text-sm text-gray-600">Brand</span><span className="text-sm font-medium text-gray-900">{template.brand?.name || "N/A"}</span></div>
        <div className="flex justify-between"><span className="text-sm text-gray-600">Model</span><span className="text-sm font-medium text-gray-900">{template.model?.name || "N/A"}</span></div>
        <div className="flex justify-between"><span className="text-sm text-gray-600">Transmission</span><span className="text-sm font-medium text-gray-900 capitalize">{template.transmission || "N/A"}</span></div>
        <div className="flex justify-between"><span className="text-sm text-gray-600">Body Type</span><span className="text-sm font-medium text-gray-900">{template.bodyType?.name || "N/A"}</span></div>
        <div className="flex justify-between"><span className="text-sm text-gray-600">Fuel Type</span><span className="text-sm font-medium text-gray-900">{template.fuelType?.name || "N/A"}</span></div>
        <div className="flex justify-between"><span className="text-sm text-gray-600">Engine Volume (L)</span><span className="text-sm font-medium text-gray-900">{template.engineVolume == null ? "N/A" : `${String(template.engineVolume).replace(".", ",")}`}</span></div>
        <div className="flex justify-between"><span className="text-sm text-gray-600">Seats</span><span className="text-sm font-medium text-gray-900">{template.seats ?? "N/A"}</span></div>
        <div className="flex justify-between"><span className="text-sm text-gray-600">Doors</span><span className="text-sm font-medium text-gray-900">{template.doors ?? "N/A"}</span></div>
        <div className="flex justify-between"><span className="text-sm text-gray-600">Luggage Capacity</span><span className="text-sm font-medium text-gray-900">{formatLuggage(template.luggage_capacity ?? template.luggageCapacity)}</span></div>
        <div className="flex justify-between"><span className="text-sm text-gray-600">Airbags</span><span className="text-sm font-medium text-gray-900">{airbagsEnabled(template) ? "Enabled" : "Disabled"}</span></div>
      </div>
    );
  }

  return (
    <div className="mt-3 p-3 bg-gray-50 rounded-xl border border-gray-200">
      <p className="text-sm text-gray-500 mb-2">Template Details:</p>
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div><span className="text-gray-500">Body Type:</span> <span className="font-medium">{template.bodyType?.name || "N/A"}</span></div>
        <div><span className="text-gray-500">Transmission:</span> <span className="font-medium capitalize">{template.transmission || "N/A"}</span></div>
        <div><span className="text-gray-500">Engine:</span> <span className="font-medium">{template.engineVolume ?? "N/A"}{template.engineVolume != null ? "L" : ""}</span></div>
        <div><span className="text-gray-500">Seats:</span> <span className="font-medium">{template.seats ?? "N/A"}</span></div>
        <div><span className="text-gray-500">Doors:</span> <span className="font-medium">{template.doors ?? "N/A"}</span></div>
        <div><span className="text-gray-500">Fuel Type:</span> <span className="font-medium">{template.fuelType?.name || "N/A"}</span></div>
      </div>
    </div>
  );
}

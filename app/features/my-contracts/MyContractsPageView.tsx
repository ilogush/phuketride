import { DocumentTextIcon, FunnelIcon } from "@heroicons/react/24/outline";
import { format } from "date-fns";
import { Link, useSearchParams } from "react-router";

import Button from "~/components/dashboard/Button";
import SimplePagination from "~/components/dashboard/SimplePagination";
import { useUrlToast } from "~/lib/useUrlToast";

import type { MyContractRow } from "./my-contracts.loader.server";

type MyContractsPageViewProps = {
  contracts: MyContractRow[];
  totalPages: number;
  currentPage: number;
  status: string;
};

export default function MyContractsPageView({
  contracts,
  totalPages,
  currentPage,
  status,
}: MyContractsPageViewProps) {
  useUrlToast();
  const [searchParams, setSearchParams] = useSearchParams();

  const handleStatusChange = (newStatus: string) => {
    setSearchParams({ status: newStatus, page: "1" });
  };

  const statusColors = {
    active: "bg-blue-100 text-blue-800",
    closed: "bg-green-100 text-green-800",
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My Contracts</h1>
        <p className="mt-1 text-sm text-gray-500">View your rental agreements</p>
      </div>

      <div className="rounded-xl bg-white p-4 shadow-sm">
        <div className="flex items-center gap-4">
          <FunnelIcon className="h-5 w-5 text-gray-400" />
          <div className="flex gap-2">
            <Button
              type="button"
              variant="plain"
              onClick={() => handleStatusChange("all")}
              className={`rounded-xl px-4 py-2 text-sm font-medium transition-colors ${
                status === "all"
                  ? "bg-gray-800 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              All
            </Button>
            <Button
              type="button"
              variant="plain"
              onClick={() => handleStatusChange("active")}
              className={`rounded-xl px-4 py-2 text-sm font-medium transition-colors ${
                status === "active"
                  ? "bg-gray-800 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              Active
            </Button>
            <Button
              type="button"
              variant="plain"
              onClick={() => handleStatusChange("closed")}
              className={`rounded-xl px-4 py-2 text-sm font-medium transition-colors ${
                status === "closed"
                  ? "bg-gray-800 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              Closed
            </Button>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl bg-white shadow-sm">
        {contracts.length > 0 ? (
          <div className="divide-y divide-gray-200">
            {contracts.map((contract) => (
              <Link
                key={contract.id}
                to={`/my-contracts/${contract.id}`}
                className="block p-6 transition-colors hover:bg-gray-50"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="rounded-xl bg-gray-100 p-3">
                      <DocumentTextIcon className="h-6 w-6 text-gray-600" />
                    </div>
                    <div>
                      <div className="mb-1 flex items-center gap-3">
                        <h2 className="font-semibold text-gray-900">Contract #{contract.id}</h2>
                        <span
                          className={`rounded-full px-2 py-1 text-xs font-medium ${
                            statusColors[contract.status]
                          }`}
                        >
                          {contract.status}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600">
                        {contract.brandName} {contract.modelName} {contract.carYear} (
                        {contract.carLicensePlate})
                      </p>
                      <p className="mt-1 text-sm text-gray-500">
                        {format(new Date(contract.startDate), "MMM dd, yyyy")} -{" "}
                        {format(new Date(contract.endDate), "MMM dd, yyyy")}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold text-gray-900">
                      {contract.totalCurrency} {contract.totalAmount}
                    </p>
                    <p className="mt-1 text-sm text-blue-600">View Details →</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="py-20 text-center">
            <DocumentTextIcon className="mx-auto mb-4 h-12 w-12 text-gray-300" />
            <p className="font-medium text-gray-500">No contracts found</p>
            <p className="mt-1 text-sm text-gray-400">Your rental contracts will appear here</p>
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <SimplePagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={(page) => setSearchParams({ status, page: page.toString() })}
        />
      )}
    </div>
  );
}

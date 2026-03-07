import { useLocation, useParams, useSearchParams } from "react-router";

interface UseAppLayoutModModeOptions {
  role: string;
}

export function useAppLayoutModMode({ role }: UseAppLayoutModModeOptions) {
  const location = useLocation();
  const params = useParams();
  const [searchParams] = useSearchParams();

  const pathCompanyId =
    location.pathname.startsWith("/companies/") && params.companyId
      ? Number.parseInt(params.companyId, 10)
      : null;

  const queryCompanyIdRaw = searchParams.get("modCompanyId");
  const queryCompanyId = queryCompanyIdRaw ? Number.parseInt(queryCompanyIdRaw, 10) : null;

  const resolvedModCompanyId =
    pathCompanyId && Number.isFinite(pathCompanyId) && pathCompanyId > 0
      ? pathCompanyId
      : queryCompanyId && Number.isFinite(queryCompanyId) && queryCompanyId > 0
        ? queryCompanyId
        : null;

  const isModMode = role === "admin" && resolvedModCompanyId !== null;

  return {
    isModMode,
    modCompanyId: isModMode ? resolvedModCompanyId : null,
  };
}

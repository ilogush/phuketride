import BackButton from '~/components/shared/ui/BackButton';
import MyContractDetailsCards from "~/components/dashboard/contracts/MyContractDetailsCards";
import type { loadMyContractDetailPage } from "~/features/my-contract-detail/my-contract-detail.loader.server";
import { useUrlToast } from "~/lib/useUrlToast";

type MyContractDetailPageData = Awaited<ReturnType<typeof loadMyContractDetailPage>>;

type MyContractDetailPageViewProps = {
  contract: MyContractDetailPageData["contract"];
  payments: MyContractDetailPageData["payments"];
  existingReview: MyContractDetailPageData["existingReview"];
  canLeaveReview: MyContractDetailPageData["canLeaveReview"];
};

export default function MyContractDetailPageView({
  contract,
  payments,
  existingReview,
  canLeaveReview,
}: MyContractDetailPageViewProps) {
  useUrlToast();

  return (
    <div className="space-y-6">
      <BackButton to="/my-contracts" />
      <MyContractDetailsCards
        contract={contract}
        payments={payments}
        existingReview={existingReview}
        canLeaveReview={canLeaveReview}
      />
    </div>
  );
}

import { ListingDetailPageSkeleton } from '@/components/listing/ListingDetailSkeleton';
import { BreadcrumbsSkeletonDecorative } from '@/components/listing/ListingPageSkeleton';

export default function ListingDetailLoading() {
  return <ListingDetailPageSkeleton breadcrumb={<BreadcrumbsSkeletonDecorative />} />;
}

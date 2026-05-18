export interface ListingPageImageModalProps {
  isOpen: boolean;
  images: string[];
  listingVideoSlide?: { posterUrl: string | null; webmUrl?: string | null; mp4Url: string } | null;
  currentIndex: number;
  imageAltTitle: string;
  imageErrors: Set<number>;
  coverBlurHash?: string | null;
  imageBlurHashes?: (string | null)[] | null;
  onClose: () => void;
  onNext: () => void;
  onPrev: () => void;
  onIndexChange: (_index: number) => void;
  onImageError: (_index: number) => void;
}

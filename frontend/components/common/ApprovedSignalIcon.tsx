import Image from 'next/image';

interface ApprovedSignalIconProps {
  className?: string;
}

export function ApprovedSignalIcon({ className = 'h-5 w-5 shrink-0' }: ApprovedSignalIconProps) {
  return (
    <Image
      src="/icons/approved-signal.svg"
      // eslint-disable-next-line no-hardcoded-text/no-hardcoded-text -- decorative, redundant with aria-hidden
      alt=""
      width={20}
      height={20}
      className={className}
      aria-hidden
      unoptimized
    />
  );
}

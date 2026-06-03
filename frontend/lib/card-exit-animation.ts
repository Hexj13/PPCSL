import { CARD_EXIT_ANIMATION_MS } from '@/lib/constants';

export function waitForCardExitAnimation(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setTimeout(resolve, CARD_EXIT_ANIMATION_MS);
      });
    });
  });
}

export function cardExitMotionClass(isExiting: boolean): string {
  if (!isExiting) return '';
  return 'transition-[opacity,transform] ease-out opacity-0 scale-[0.97] motion-reduce:transition-none';
}

export function cardExitMotionStyle(
  isExiting: boolean,
): { transitionDuration: string } | undefined {
  if (!isExiting) return undefined;
  return { transitionDuration: `${CARD_EXIT_ANIMATION_MS}ms` };
}

export function compareColumnExitMotionClass(isExiting: boolean): string {
  if (!isExiting) return '';
  return 'transition-[opacity,transform] ease-out opacity-0 scale-[0.95] motion-reduce:transition-none';
}

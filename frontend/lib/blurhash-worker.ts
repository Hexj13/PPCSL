import { blurhashToDataURL } from './utils/blurhash';

type InMsg = { id: number; hash: string };
type OutMsg = { id: number; dataUrl?: string };

const scope = self as unknown as {
  onmessage: ((event: MessageEvent<InMsg>) => void) | null;
  postMessage: (data: OutMsg) => void;
};

scope.onmessage = (event: MessageEvent<InMsg>) => {
  const { id, hash } = event.data;
  try {
    const dataUrl = blurhashToDataURL(hash);
    scope.postMessage({ id, dataUrl });
  } catch {
    scope.postMessage({ id, dataUrl: undefined });
  }
};

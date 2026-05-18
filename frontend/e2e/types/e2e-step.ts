export type E2EStep = {
  name: string;
  action: () => Promise<void>;
};

declare module 'sns-validator' {
  class MessageValidator {
    validate(
      hash: string | Record<string, unknown>,
      cb: (err: Error | null, message?: Record<string, unknown>) => void,
    ): void;
  }
  export = MessageValidator;
}

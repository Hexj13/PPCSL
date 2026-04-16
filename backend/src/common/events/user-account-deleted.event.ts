export class UserAccountDeletedEvent {
  static readonly eventName = 'user.account.deleted';

  constructor(public readonly userId: string) {}
}

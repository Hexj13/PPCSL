import type { Currency } from '../../../common/types';

const VALID_CURRENCIES: Currency[] = ['EUR', 'MDL'];
const MIN_AMOUNT = 0;
const MAX_AMOUNT = 999_999_999;

export class Price {
  constructor(
    readonly amount: number,
    readonly currency: Currency,
  ) {
    if (amount < MIN_AMOUNT || amount > MAX_AMOUNT) {
      throw new Error('Invalid price');
    }
    if (!VALID_CURRENCIES.includes(currency)) {
      throw new Error('Invalid currency');
    }
  }

  equals(other: Price): boolean {
    return this.amount === other.amount && this.currency === other.currency;
  }

  toString(): string {
    return `${this.amount} ${this.currency}`;
  }
}

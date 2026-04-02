export const PROMOTION_HISTORY_WRITER = Symbol('PROMOTION_HISTORY_WRITER');

export interface IPromotionHistoryWriter {
  create(params: {
    listing_id: string;
    user_id: string;
    listing_title: string;
    started_at: Date;
    ended_at: null;
    days: number | null;
    promotion_source: 'duration' | 'partner_balance' | 'admin_unlimited';
  }): Promise<void>;
  updateEndDateForListing(listingId: string): Promise<void>;
}

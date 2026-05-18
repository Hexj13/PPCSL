import type { Request } from 'express';

import type { UserType } from './types';

declare global {
  namespace Express {
    interface Request {
      user?: User;
      requestId?: string;
    }
    interface User {
      id: string;
      email?: string;
      type?: UserType;
      phoneVerified?: boolean;
    }
  }
}

export type AuthenticatedRequest = Request & { user: Express.User };

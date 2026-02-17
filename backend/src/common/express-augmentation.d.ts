import type { Request } from 'express';

import type { UserType } from './types';

declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
    interface User {
      id: string;
      email?: string;
      type?: UserType;
    }
  }
}

export type AuthenticatedRequest = Request & { user: Express.User };

import { RefreshToken } from '../auth/entities/refresh-token.entity';
import { REFRESH_TOKEN_ROTATION_GRACE_MS } from '../auth/infrastructure/services/refresh-token.service';
import { hashRefreshToken } from '../auth/infrastructure/utils/refresh-token-hash.utils';
import { AppDataSource } from '../data-source';

export async function expireRotationGraceForToken(rawToken: string): Promise<void> {
  if (!AppDataSource.isInitialized) {
    await AppDataSource.initialize();
  }

  const tokenHash = hashRefreshToken(rawToken);
  const rotatedAt = new Date(Date.now() - REFRESH_TOKEN_ROTATION_GRACE_MS - 1_000);

  await AppDataSource.getRepository(RefreshToken).update(
    { token: tokenHash },
    { rotated_at: rotatedAt },
  );
}

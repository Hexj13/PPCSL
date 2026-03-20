import { requestJson } from '../cipauto-import/utils/http';

import type { Md999Config } from './types';

export interface GraphQLErrorShape {
  message: string;
  extensions?: Record<string, unknown>;
}

export interface GraphQLResponse<T> {
  data?: T;
  errors?: GraphQLErrorShape[];
}

export class GraphqlClient999 {
  constructor(private readonly config: Md999Config) {}

  async execute<T>(query: string, variables?: Record<string, unknown>): Promise<T> {
    const payload = JSON.stringify({ query, variables: variables ?? {} });
    const { data: envelope } = await requestJson<GraphQLResponse<T>>({
      url: this.config.graphqlUrl,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: payload,
      timeoutMs: this.config.requestTimeoutMs,
      retries: this.config.maxRetries,
    });

    if (envelope.errors?.length) {
      const msg = envelope.errors.map((e) => e.message).join('; ');
      throw new Error(`GraphQL errors: ${msg}`);
    }
    if (envelope.data === undefined || envelope.data === null) {
      throw new Error('GraphQL response missing data.');
    }
    return envelope.data;
  }
}

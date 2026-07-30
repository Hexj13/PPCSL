const DEFAULT_MAX_TIMEOUT_MS = 60_000;
const CLIENT_TIMEOUT_BUFFER_MS = 15_000;
const ERROR_SNIPPET_MAX = 200;

export function isCloudflareChallengeHtml(html: string): boolean {
  const lower = html.toLowerCase();
  return (
    lower.includes('just a moment') ||
    lower.includes('cf-chl') ||
    lower.includes('cdn-cgi/challenge-platform/h/') ||
    /cdn-cgi\/challenge-platform\/(?!scripts\/jsd(?:\/|$))/.test(lower)
  );
}

export function truncateErrorSnippet(text: string, max = ERROR_SNIPPET_MAX): string {
  const cleaned = text.replace(/\s+/g, ' ').trim();
  if (cleaned.length <= max) {
    return cleaned;
  }
  return `${cleaned.slice(0, max)}…`;
}

export interface FlareSolverrGetResult {
  status: number;
  response: string;
  userAgent?: string;
}

interface FlareSolverrApiResponse {
  status?: string;
  message?: string;
  solution?: {
    status?: number | string;
    response?: string;
    userAgent?: string;
  };
}

export class FlareSolverrClient {
  private readonly endpoint: string;

  constructor(baseUrl: string) {
    this.endpoint = normalizeFlareSolverrBaseUrl(baseUrl);
  }

  async createSession(sessionId: string): Promise<string> {
    const data = await this.post({
      cmd: 'sessions.create',
      session: sessionId,
    });
    if (data.status !== 'ok') {
      throw new Error(
        `FlareSolverr sessions.create failed: ${data.message ?? data.status ?? 'unknown'}`,
      );
    }
    return sessionId;
  }

  async destroySession(sessionId: string): Promise<void> {
    try {
      await this.post({
        cmd: 'sessions.destroy',
        session: sessionId,
      });
    } catch {
      // best-effort cleanup
    }
  }

  async requestGet(params: {
    url: string;
    session?: string;
    maxTimeout?: number;
  }): Promise<FlareSolverrGetResult> {
    const maxTimeout = params.maxTimeout ?? DEFAULT_MAX_TIMEOUT_MS;
    const data = await this.post(
      {
        cmd: 'request.get',
        url: params.url,
        session: params.session,
        maxTimeout,
      },
      maxTimeout + CLIENT_TIMEOUT_BUFFER_MS,
    );

    if (data.status !== 'ok') {
      throw new Error(
        `FlareSolverr request.get failed for ${params.url}: ${data.message ?? data.status ?? 'unknown'}`,
      );
    }

    const solution = data.solution;
    if (!solution) {
      throw new Error(`FlareSolverr request.get returned no solution for ${params.url}`);
    }

    const status = Number(solution.status);
    if (!Number.isFinite(status)) {
      throw new Error(`FlareSolverr request.get returned invalid status for ${params.url}`);
    }

    const response = typeof solution.response === 'string' ? solution.response : '';
    if (!response) {
      throw new Error(`FlareSolverr request.get returned empty response for ${params.url}`);
    }

    if (isCloudflareChallengeHtml(response)) {
      throw new Error(
        `Cloudflare challenge still present after FlareSolverr GET ${params.url}: ${truncateErrorSnippet(response)}`,
      );
    }

    return {
      status,
      response,
      userAgent: solution.userAgent,
    };
  }

  private async post(
    body: Record<string, unknown>,
    timeoutMs = DEFAULT_MAX_TIMEOUT_MS + CLIENT_TIMEOUT_BUFFER_MS,
  ): Promise<FlareSolverrApiResponse> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(`${this.endpoint}/v1`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      const text = await response.text();
      if (!response.ok) {
        throw new Error(
          `FlareSolverr HTTP ${response.status} POST ${this.endpoint}/v1: ${truncateErrorSnippet(text || response.statusText)}`,
        );
      }
      let data: FlareSolverrApiResponse;
      try {
        data = JSON.parse(text) as FlareSolverrApiResponse;
      } catch {
        throw new Error(
          `FlareSolverr returned non-JSON response: ${truncateErrorSnippet(text || 'empty')}`,
        );
      }
      return data;
    } finally {
      clearTimeout(timeout);
    }
  }
}

function normalizeFlareSolverrBaseUrl(raw: string): string {
  const trimmed = raw.trim().replace(/\/+$/, '');
  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    throw new Error(`Invalid CIPAUTO_FLARESOLVERR_URL: ${raw}`);
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error(`CIPAUTO_FLARESOLVERR_URL must use http or https: ${raw}`);
  }
  return trimmed;
}

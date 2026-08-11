import { resolveMd999Config } from '../999md-import/config';
import { PdpParser999 } from '../999md-import/parsers/pdp-parser';
import { resolveConfig as resolveAutooutletConfig } from '../autooutlet-import/config';
import { PdpParser as AutooutletPdpParser } from '../autooutlet-import/parsers/pdp-parser';
import { resolveConfig as resolveCipautoConfig } from '../cipauto-import/config';
import { CipautoHttpClient } from '../cipauto-import/http/cipauto-http-client';
import { PdpParser } from '../cipauto-import/parsers/pdp-parser';

import type { RuntimeEnv } from './kupito-import-types';
import type { ParsedPdpData } from './listing-types';
import {
  PARTNER_SOURCE_CODE_AUTOOUTLET,
  PARTNER_SOURCE_CODE_CIPAUTO,
  PARTNER_SOURCE_CODE_999MD,
} from './partner-source-codes';

export type PartnerCode = 'cipauto' | '999md' | 'autooutlet';

export type SourceCheckOutcome = 'active' | 'closed' | 'error';

export type PartnerRuntimeEnv = RuntimeEnv;

export interface SourceCheckResult {
  outcome: SourceCheckOutcome;
  sourceStatus?: string;
  sourceStatusReason?: string;
  detail?: string;
}

export interface PartnerSourceVerifier {
  readonly partner: PartnerCode;
  readonly partnerSourceCode: string;
  readonly reportsDir: string;
  start(): Promise<void>;
  close(): Promise<void>;
  checkUrl(url: string): Promise<SourceCheckResult>;
}

function classifyOutcome(parsed: ParsedPdpData): SourceCheckOutcome {
  if (parsed.sourceStatus === 'closed') {
    return 'closed';
  }
  return 'active';
}

function safeHost(value: string): string {
  try {
    const parsed = new URL(value);
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
      return '';
    }
    return parsed.host.toLowerCase().replace(/^www\./, '');
  } catch {
    return '';
  }
}

export function resolvePartnerSourceCode(partner: PartnerCode): string {
  if (partner === 'cipauto') {
    return PARTNER_SOURCE_CODE_CIPAUTO;
  }
  if (partner === '999md') {
    return PARTNER_SOURCE_CODE_999MD;
  }
  return PARTNER_SOURCE_CODE_AUTOOUTLET;
}

export function isPartnerCode(value: string): value is PartnerCode {
  return value === 'cipauto' || value === '999md' || value === 'autooutlet';
}

export function createPartnerSourceVerifier(
  partner: PartnerCode,
  env: PartnerRuntimeEnv,
): PartnerSourceVerifier {
  const configOptions = { requireAuth: false, requireImportSecret: false } as const;

  let reportsDir: string;
  let expectedHost: string;
  let cipautoHttp: CipautoHttpClient | null = null;
  let pdpCipauto: PdpParser | null = null;
  let pdp999: PdpParser999 | null = null;
  let pdpAutooutlet: AutooutletPdpParser | null = null;

  if (partner === 'cipauto') {
    const cfg = resolveCipautoConfig(env, configOptions);
    reportsDir = cfg.reportsDir;
    expectedHost = safeHost(cfg.cipautoBaseUrl);
    cipautoHttp = new CipautoHttpClient(cfg);
    pdpCipauto = new PdpParser(cfg, cipautoHttp);
  } else if (partner === '999md') {
    const cfg = resolveMd999Config(env, configOptions);
    reportsDir = cfg.reportsDir;
    expectedHost = safeHost(cfg.listingPathTemplate.replace('{{id}}', '1'));
    pdp999 = new PdpParser999(cfg);
  } else {
    const cfg = resolveAutooutletConfig(env, configOptions);
    reportsDir = cfg.reportsDir;
    expectedHost = safeHost(cfg.autooutletBaseUrl);
    pdpAutooutlet = new AutooutletPdpParser(cfg);
  }

  return {
    partner,
    partnerSourceCode: resolvePartnerSourceCode(partner),
    reportsDir,
    async start(): Promise<void> {
      if (cipautoHttp) {
        await cipautoHttp.start();
      }
    },
    async close(): Promise<void> {
      if (cipautoHttp) {
        await cipautoHttp.close();
      }
    },
    async checkUrl(url: string): Promise<SourceCheckResult> {
      const host = safeHost(url);
      if (!host || (expectedHost && host !== expectedHost)) {
        return {
          outcome: 'error',
          detail: `unexpected_host:${host || 'invalid_url'}`,
        };
      }
      try {
        let parsed: ParsedPdpData;
        if (pdpCipauto) {
          parsed = await pdpCipauto.parse(url);
        } else if (pdp999) {
          parsed = await pdp999.parse(url);
        } else if (pdpAutooutlet) {
          parsed = await pdpAutooutlet.parse(url);
        } else {
          throw new Error('Parser not initialized');
        }
        return {
          outcome: classifyOutcome(parsed),
          sourceStatus: parsed.sourceStatus,
          sourceStatusReason: parsed.sourceStatusReason,
        };
      } catch (error) {
        return {
          outcome: 'error',
          detail: String(error),
        };
      }
    },
  };
}

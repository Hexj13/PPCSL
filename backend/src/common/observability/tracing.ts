import { createRequire } from 'module';

const requireOtel = createRequire(__filename);

interface OtelSdk {
  start: () => void;
  shutdown: () => Promise<void>;
}

let sdk: OtelSdk | undefined;

export function initTracing(): void {
  const endpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT?.trim();
  if (!endpoint || sdk) {
    return;
  }

  try {
    const { NodeSDK } = requireOtel('@opentelemetry/sdk-node') as {
      NodeSDK: new (config: Record<string, unknown>) => OtelSdk;
    };
    const { getNodeAutoInstrumentations } = requireOtel(
      '@opentelemetry/auto-instrumentations-node',
    ) as { getNodeAutoInstrumentations: () => unknown };
    const { OTLPTraceExporter } = requireOtel('@opentelemetry/exporter-trace-otlp-http') as {
      OTLPTraceExporter: new (config: { url: string }) => unknown;
    };

    sdk = new NodeSDK({
      serviceName: process.env.OTEL_SERVICE_NAME ?? 'kupito-backend',
      traceExporter: new OTLPTraceExporter({ url: `${endpoint.replace(/\/$/, '')}/v1/traces` }),
      instrumentations: [getNodeAutoInstrumentations()],
    });
    sdk.start();

    const shutdown = () => {
      void sdk?.shutdown();
    };
    process.once('SIGTERM', shutdown);
    process.once('SIGINT', shutdown);
  } catch (error) {
    // Tracing must never block application startup.
    console.error('OpenTelemetry initialization failed:', error);
  }
}

initTracing();

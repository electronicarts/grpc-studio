// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import { NodeSDK } from '@opentelemetry/sdk-node'
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node'
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http'
import { ConsoleSpanExporter, TraceIdRatioBasedSampler } from '@opentelemetry/sdk-trace-base'
import type { TracingConfig } from '../config/schemas/observabilitySchema.js'
import logger from '../utils/logger.js'

const tracingLogger = logger.child({ module: 'tracing' })

let sdk: NodeSDK | null = null

export function initializeTracing(config: TracingConfig): void {
  if (!config.enabled) {
    tracingLogger.info('Distributed tracing disabled')
    return
  }

  // Configure exporter
  const exporter = config.exporter === 'otlp' && config.otlpEndpoint
    ? new OTLPTraceExporter({ url: config.otlpEndpoint })
    : new ConsoleSpanExporter()

  // Configure SDK with service name
  sdk = new NodeSDK({
    serviceName: config.serviceName || 'grpc-studio',
    traceExporter: exporter,
    instrumentations: [
      getNodeAutoInstrumentations({
        '@opentelemetry/instrumentation-fs': { enabled: false },  // Too noisy
        '@opentelemetry/instrumentation-http': {
          requestHook: (span, request) => {
            if ('headers' in request && request.headers) {
              const requestId = (request.headers as Record<string, unknown>)['x-request-id']
              if (requestId && typeof requestId === 'string') {
                span.setAttribute('http.request_id', requestId)
              }
            }
          },
        },
      }),
    ],
    sampler: config.sampleRate === 1.0
      ? undefined  // Default always-on sampler
      : new TraceIdRatioBasedSampler(config.sampleRate),
  })

  sdk.start()
  tracingLogger.info('Distributed tracing initialized', {
    serviceName: config.serviceName,
    exporter: config.exporter,
    sampleRate: config.sampleRate,
  })
}

export async function shutdownTracing(): Promise<void> {
  if (sdk) {
    await sdk.shutdown()
    tracingLogger.info('Tracing SDK shut down')
  }
}

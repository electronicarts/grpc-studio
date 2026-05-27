# Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

###
# gRPC Studio Backend Configuration Template
# This file is processed through Helm templating and mounted into the backend container.
###

# Server configuration
server:
  port: {{ .Values.backend.port }}
  host: {{ .Values.backend.server.host | quote }}
  environment: {{ .Values.backend.server.environment }}
  cors:
    enabled: {{ .Values.backend.server.cors.enabled }}
    origins:
      {{- toYaml .Values.backend.server.cors.origins | nindent 6 }}

# gRPC connection configuration
connection:
  mode: {{ .Values.connection.mode }}
  target:
    host: {{ .Values.connection.target.host }}
    port: {{ .Values.connection.target.port }}
  timeout:
    connect: {{ .Values.connection.timeout.connect }}
    request: {{ .Values.connection.timeout.request }}

  tls:
    verifyServerCert: {{ .Values.connection.tls.verifyServerCert }}
    {{- if .Values.connection.tls.serverName }}
    serverName: {{ .Values.connection.tls.serverName | quote }}
    {{- else }}
    serverName: ""
    {{- end }}

  {{- if eq .Values.connection.mode "mtls" }}
  mtls:
    clientCert: "/certs/{{ .Values.secrets.keys.cert }}"
    clientKey:  "/certs/{{ .Values.secrets.keys.key }}"
    {{- if .Values.secrets.keys.ca }}
    caCert: "/certs/{{ .Values.secrets.keys.ca }}"
    {{- end }}
  {{- end }}

# Authentication configuration
auth:
  defaultPlugin: {{ .Values.auth.defaultPlugin }}

  plugins:
    {{- if .Values.auth.bearerToken.enabled }}
    bearer-token:
      enabled: true
      description: "Static bearer token authentication"
      config:
        {{- if .Values.auth.bearerToken.secretRef }}
        secretRef: {{ .Values.auth.bearerToken.secretRef | quote }}
        {{- end }}
    {{- end }}

    {{- if .Values.auth.oauth2.enabled }}
    oauth2-client-credentials:
      enabled: true
      description: "OAuth2 client credentials flow (machine-to-machine)"
      config:
        tokenUrl: {{ .Values.auth.oauth2.tokenUrl | quote }}
        clientId: {{ .Values.auth.oauth2.clientId | quote }}
        {{- if .Values.auth.oauth2.clientSecretRef }}
        clientSecretRef: {{ .Values.auth.oauth2.clientSecretRef | quote }}
        {{- end }}
        scope: {{ .Values.auth.oauth2.scope | quote }}
        tokenCacheTimeMs: {{ .Values.auth.oauth2.tokenCacheTimeMs }}
        requestTimeoutMs: {{ .Values.auth.oauth2.requestTimeoutMs }}
        maxRetries: {{ .Values.auth.oauth2.maxRetries }}
        retryDelayMs: {{ .Values.auth.oauth2.retryDelayMs }}
        {{- if eq .Values.connection.mode "mtls" }}
        certPath: "/certs/{{ .Values.secrets.keys.cert }}"
        keyPath:  "/certs/{{ .Values.secrets.keys.key }}"
        {{- if .Values.secrets.keys.ca }}
        caPath: "/certs/{{ .Values.secrets.keys.ca }}"
        {{- end }}
        {{- end }}
    {{- end }}

# Logging configuration
logging:
  level: {{ .Values.app.logging.level }}
  format: {{ .Values.app.logging.format }}
  console:
    enabled: {{ .Values.app.logging.console.enabled }}
    colorize: {{ .Values.app.logging.console.colorize }}
  file:
    enabled: {{ .Values.app.logging.file.enabled }}

# Cache configuration
cache:
  schema:
    ttl: {{ .Values.app.cache.schema.ttl }}
    maxEntries: {{ .Values.app.cache.schema.maxEntries }}
  protoset:
    ttl: {{ .Values.app.cache.protoset.ttl }}
    maxEntries: {{ .Values.app.cache.protoset.maxEntries }}

# Health check configuration
health:
  enabled: {{ .Values.app.health.enabled }}
  endpoint: {{ .Values.app.health.endpoint | quote }}
  interval: {{ .Values.app.health.interval }}

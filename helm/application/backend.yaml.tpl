# Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

###
# gRPC Studio Backend Configuration Template
# This file is processed through Helm templating and mounted into the backend container.
###

server:
  port: {{ .Values.backend.port }}
  host: {{ .Values.backend.server.host | quote }}
  cors:
    enabled: {{ .Values.backend.server.cors.enabled }}
    {{- if .Values.backend.server.cors.origins }}
    origins:
      {{- toYaml .Values.backend.server.cors.origins | nindent 6 }}
    {{- end }}

client:
  mode: {{ .Values.connection.mode }}
  target:
    host: {{ .Values.connection.target.host | quote }}
    port: {{ .Values.connection.target.port }}
  rpc:
    unaryDeadlineMs: {{ .Values.connection.timeout.request }}
  {{- if eq .Values.connection.mode "tls" }}
  security:
    clientCertPath: ""
    clientKeyPath: ""
    caCertPath: ""
  {{- end }}
  {{- if eq .Values.connection.mode "mtls" }}
  security:
    clientCertPath: "/certs/{{ .Values.secrets.keys.cert }}"
    clientKeyPath: "/certs/{{ .Values.secrets.keys.key }}"
    {{- if .Values.secrets.keys.ca }}
    caCertPath: "/certs/{{ .Values.secrets.keys.ca }}"
    {{- else }}
    caCertPath: ""
    {{- end }}
  {{- end }}

auth:
  plugins:
    {{- if .Values.auth.bearerToken.enabled }}
    bearer-token:
      enabled: true
      config:
        {{- if .Values.auth.bearerToken.secretRef }}
        secretRef: {{ .Values.auth.bearerToken.secretRef | quote }}
        {{- end }}
    {{- end }}
    {{- if .Values.auth.oauth2.enabled }}
    oauth2-client-credentials:
      enabled: true
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
    {{- end }}
    {{- if and (not .Values.auth.bearerToken.enabled) (not .Values.auth.oauth2.enabled) }}
    {}
    {{- end }}

cache:
  reflection:
    ttlMs: {{ .Values.backend.cache.reflection.ttlMs | int64 }}
    maxEntries: {{ .Values.backend.cache.reflection.maxEntries | int64 }}

health:
  enabled: {{ .Values.app.health.enabled }}
  endpoint: {{ .Values.app.health.endpoint | quote }}

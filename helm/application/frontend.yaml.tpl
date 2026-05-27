# Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

###
# gRPC Studio Frontend Configuration Template
# This file is processed through Helm templating and mounted into the frontend container.
###

# API configuration
api:
  baseUrl: {{ .Values.ui.api.baseUrl | quote }}
  endpoints:
    config: {{ .Values.ui.api.endpoints.config | quote }}
    discover: {{ .Values.ui.api.endpoints.discover | quote }}
    invoke: {{ .Values.ui.api.endpoints.invoke | quote }}
    schema: {{ .Values.ui.api.endpoints.schema | quote }}
    health: {{ .Values.ui.api.endpoints.health | quote }}
    status: {{ .Values.ui.api.endpoints.status | quote }}
    generateCommand: {{ .Values.ui.api.endpoints.generateCommand | quote }}
  timeout: {{ .Values.ui.api.timeout }}

# UI authentication (controls access to the gRPC Studio web interface)
auth:
  enabled: {{ .Values.ui.auth.enabled }}
  provider: {{ .Values.ui.auth.provider | quote }}
  oidc:
    issuerUrl: {{ .Values.ui.auth.oidc.issuerUrl | quote }}
    clientId: {{ .Values.ui.auth.oidc.clientId | quote }}
    redirectUri: {{ .Values.ui.auth.oidc.redirectUri | quote }}
    scopes:
      {{- toYaml .Values.ui.auth.oidc.scopes | nindent 6 }}

# Proxy configuration (routes UI API calls to the backend)
proxy:
  enabled: {{ .Values.ui.proxy.enabled }}
  target: "http://{{ include "grpc-studio.backendServiceName" . }}:{{ .Values.backend.port }}"
  pathPrefix: {{ .Values.ui.proxy.pathPrefix | quote }}

# UI configuration
ui:
  theme:
    default: {{ .Values.ui.theme.default }}
    primary: {{ .Values.ui.theme.primary | quote }}

  forms:
    autoSave: {{ .Values.ui.forms.autoSave }}
    validateOnChange: {{ .Values.ui.forms.validateOnChange }}

  display:
    maxResponseSize: {{ .Values.ui.display.maxResponseSize | quote }}
    syntaxHighlighting: {{ .Values.ui.display.syntaxHighlighting }}
    lineNumbers: {{ .Values.ui.display.lineNumbers }}

# Security configuration
security:
  cors:
    enabled: {{ .Values.ui.security.cors.enabled }}
    allowedOrigins:
      {{- toYaml .Values.ui.security.cors.allowedOrigins | nindent 6 }}

# Feature flags
features:
  reflection: {{ .Values.ui.features.reflection }}
  protosets: {{ .Values.ui.features.protosets }}
  history: {{ .Values.ui.features.history }}
  export: {{ .Values.ui.features.export }}

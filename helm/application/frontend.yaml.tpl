# Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

###
# gRPC Studio Frontend Configuration Template
# This file is processed through Helm templating and mounted into the frontend container.
###

api:
  baseUrl: {{ .Values.ui.api.baseUrl | quote }}
  endpoints:
    config: {{ .Values.ui.api.endpoints.config | quote }}
    discover: {{ .Values.ui.api.endpoints.discover | quote }}
    invoke: {{ .Values.ui.api.endpoints.invoke | quote }}
    descriptorSet: "/api/grpc/descriptor-set"
    status: {{ .Values.ui.api.endpoints.status | quote }}
    health: {{ .Values.ui.api.endpoints.health | quote }}
  timeout: {{ .Values.ui.api.timeout }}

auth:
  enabled: {{ .Values.ui.auth.enabled }}
  {{- if .Values.ui.auth.enabled }}
  provider: {{ .Values.ui.auth.provider | quote }}
  {{- if eq .Values.ui.auth.provider "oidc" }}
  oidc:
    issuerUrl: {{ .Values.ui.auth.oidc.issuerUrl | quote }}
    clientId: {{ .Values.ui.auth.oidc.clientId | quote }}
    redirectUri: {{ .Values.ui.auth.oidc.redirectUri | quote }}
    scopes:
      {{- toYaml .Values.ui.auth.oidc.scopes | nindent 6 }}
  {{- end }}
  {{- end }}

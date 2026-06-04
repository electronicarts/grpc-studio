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
    descriptorSet: {{ .Values.ui.api.endpoints.descriptorSet | quote }}
    status: {{ .Values.ui.api.endpoints.status | quote }}
    health: {{ .Values.ui.api.endpoints.health | quote }}
  timeout: {{ .Values.ui.api.timeout }}
  {{- with .Values.ui.api.websocketTimeout }}
  websocketTimeout: {{ . }}
  {{- end }}

auth:
  enabled: {{ .Values.ui.auth.enabled }}
  {{- if .Values.ui.auth.enabled }}
  provider: {{ .Values.ui.auth.provider | quote }}
  {{- if eq .Values.ui.auth.provider "entra-id" }}
  entraId:
    tenantId: {{ .Values.ui.auth.entraId.tenantId | quote }}
    clientId: {{ .Values.ui.auth.entraId.clientId | quote }}
    {{- with .Values.ui.auth.entraId.redirectUri }}
    redirectUri: {{ . | quote }}
    {{- end }}
    scopes:
      {{- toYaml .Values.ui.auth.entraId.scopes | nindent 6 }}
    cloud: {{ .Values.ui.auth.entraId.cloud | quote }}
  {{- end }}
  {{- end }}

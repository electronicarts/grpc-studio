{{/*
Expand the name of the chart.
*/}}
{{- define "grpc-studio.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" -}}
{{- end }}

{{/*
Create a default fully qualified app name.
We truncate at 63 chars because some Kubernetes name fields are limited to this (by the DNS naming spec).
If release name contains chart name it will be used as a full name.
*/}}
{{- define "grpc-studio.fullname" -}}
{{- if .Values.fullnameOverride }}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- $name := default .Chart.Name .Values.nameOverride }}
{{- if contains $name .Release.Name }}
{{- .Release.Name | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- printf "%s-%s" .Release.Name $name | trunc 63 | trimSuffix "-" }}
{{- end }}
{{- end }}
{{- end }}

{{/*
Create chart name and version as used by the chart label.
*/}}
{{- define "grpc-studio.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Common labels
*/}}
{{- define "grpc-studio.labels" -}}
helm.sh/chart: {{ include "grpc-studio.chart" . }}
{{ include "grpc-studio.selectorLabels" . }}
{{- if .Chart.AppVersion }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end }}

{{/*
Selector labels
*/}}
{{- define "grpc-studio.selectorLabels" -}}
app.kubernetes.io/name: {{ include "grpc-studio.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}

{{/*
Backend component name
*/}}
{{- define "grpc-studio.backendName" -}}
{{- printf "%s-backend" (include "grpc-studio.fullname" .) -}}
{{- end }}

{{/*
Frontend component name
*/}}
{{- define "grpc-studio.frontendName" -}}
{{- printf "%s-frontend" (include "grpc-studio.fullname" .) -}}
{{- end }}

{{/*
Backend service name — can be overridden for use as the nginx upstream
*/}}
{{- define "grpc-studio.backendServiceName" -}}
{{- if .Values.backend.service.nameOverride }}
{{- .Values.backend.service.nameOverride -}}
{{- else }}
{{- include "grpc-studio.backendName" . -}}
{{- end }}
{{- end }}

{{/*
Frontend service name
*/}}
{{- define "grpc-studio.frontendServiceName" -}}
{{- include "grpc-studio.frontendName" . -}}
{{- end }}

{{/*
Secret name for client certificates
*/}}
{{- define "grpc-studio.secretName" -}}
{{- .Values.secrets.existingSecret -}}
{{- end }}

{{/*
Backend ConfigMap name
*/}}
{{- define "grpc-studio.backendConfigName" -}}
{{- printf "%s-config" (include "grpc-studio.backendName" .) -}}
{{- end }}

{{/*
Frontend ConfigMap name
*/}}
{{- define "grpc-studio.frontendConfigName" -}}
{{- printf "%s-config" (include "grpc-studio.frontendName" .) -}}
{{- end }}

{{/*
Create the name of the service account to use
*/}}
{{- define "grpc-studio.serviceAccountName" -}}
{{- if .Values.serviceAccount.create }}
{{- default (include "grpc-studio.fullname" .) .Values.serviceAccount.name }}
{{- else }}
{{- default "default" .Values.serviceAccount.name }}
{{- end }}
{{- end }}

{{/*
Returns true if a client certificate secret is configured
*/}}
{{- define "grpc-studio.hasCerts" -}}
{{- if .Values.secrets.existingSecret -}}
true
{{- end -}}
{{- end }}

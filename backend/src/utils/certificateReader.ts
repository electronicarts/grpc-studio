// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import { execFile } from 'child_process'
import { promisify } from 'util'
import type { CertificateMetadata } from '../types/index.js'

const execFileAsync = promisify(execFile)
const CERTIFICATE_METADATA_ARGS = [
  '-noout',
  '-enddate',
  '-startdate',
  '-subject',
] as const
const OPENSSL_BINARY = 'openssl'

export async function readCertificate(
  certPath: string,
  timeoutMs: number
): Promise<CertificateMetadata> {
  const { stdout } = await execFileAsync(
    OPENSSL_BINARY,
    ['x509', '-in', certPath, ...CERTIFICATE_METADATA_ARGS],
    { timeout: timeoutMs }
  )

  return parseOpenSslCertificateMetadata(stdout)
}

export function parseOpenSslCertificateMetadata(stdout: string): CertificateMetadata {
  const subject = parseCertificateValue(stdout, 'subject')
  const validFrom = parseCertificateDate(stdout, 'notBefore', 'start')
  const validTo = parseCertificateDate(stdout, 'notAfter', 'expiry')

  return {
    subject,
    validFrom: validFrom?.toISOString(),
    validTo: validTo?.toISOString(),
  }
}

function parseCertificateDate(stdout: string, field: string, label: string): Date | null {
  const raw = parseCertificateValue(stdout, field)
  if (!raw) return null

  const date = new Date(raw)

  if (Number.isNaN(date.getTime())) {
    throw new Error(`Could not parse certificate ${label} date`)
  }

  return date
}

function parseCertificateValue(stdout: string, field: string): string | null {
  const match = stdout.match(new RegExp(`^${field}=(.+)$`, 'm'))
  return match?.[1]?.trim() ?? null
}

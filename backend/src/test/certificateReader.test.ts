// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { parseOpensslX509Output } from '../utils/certificateUtils.js'
import { buildCertificateInfo, checkCertificateMetadata } from '../utils/certificateStatus.js'

const warnDaysCritical = 7
const warnDaysWarning = 30

describe('certificate metadata', () => {
  it('derives readable UI info from cached metadata', () => {
    const now = Date.parse('2026-01-01T00:00:00.000Z')
    const certInfo = parseOpensslX509Output(
      [
        'notAfter=Jan 11 00:00:00 2026 GMT',
        'notBefore=Dec 01 00:00:00 2025 GMT',
        'subject=CN=test',
      ].join('\n'),
    )

    // Convert to legacy format for buildCertificateInfo
    const metadata = {
      subject: certInfo?.subject,
      validFrom: certInfo?.validFrom.toISOString(),
      validTo: certInfo?.validTo.toISOString(),
    }

    const certificate = buildCertificateInfo(
      metadata,
      warnDaysCritical,
      warnDaysWarning,
      new Date(now)
    )

    const result = checkCertificateMetadata(metadata, now)

    assert.equal(certificate.status, 'warning')
    assert.equal(result.daysRemaining, 10)
    assert.equal(certificate.daysRemaining, 10)
    assert.equal(certificate.isExpiringSoon, true)
    assert.equal(certificate.isExpired, false)
  })

  it('formats expired certificate age', () => {
    const certInfo = parseOpensslX509Output(
      'notAfter=Jan 01 11:00:00 2026 GMT\nnotBefore=Dec 01 00:00:00 2025 GMT\nsubject=CN=test\nissuer=C=US'
    )
    const metadata = certInfo ? {
      subject: certInfo.subject,
      validFrom: certInfo.validFrom.toISOString(),
      validTo: certInfo.validTo.toISOString(),
    } : {}

    const result = checkCertificateMetadata(
      metadata,
      Date.parse('2026-01-01T12:00:00.000Z')
    )

    assert.equal(result.valid, false)
    assert.equal(result.error, 'mTLS certificate expired 1 hour ago')
  })

  it('returns no remaining time when expiry metadata is missing', () => {
    const certInfo = parseOpensslX509Output('subject=CN=test')
    // parseOpensslX509Output returns null when required fields are missing
    assert.equal(certInfo, null)

    const metadata = {}
    const result = checkCertificateMetadata(metadata)

    // Empty metadata produces "Could not read certificate metadata" error
    assert.deepEqual(result, {
      valid: false,
      error: 'Could not read certificate metadata',
    })
  })

  it('parses OpenSSL certificate output', () => {
    const certInfo = parseOpensslX509Output(
      [
        'notAfter=Jan 11 00:00:00 2026 GMT',
        'notBefore=Dec 01 00:00:00 2025 GMT',
        'subject=CN=test',
        'issuer=C=US, O=Test',
      ].join('\n')
    )

    assert.ok(certInfo)
    assert.equal(certInfo.subject, 'CN=test')
    assert.equal(certInfo.issuer, 'C=US, O=Test')
    assert.equal(certInfo.validFrom.toISOString(), '2025-12-01T00:00:00.000Z')
    assert.equal(certInfo.validTo.toISOString(), '2026-01-11T00:00:00.000Z')
    assert.ok(typeof certInfo.daysRemaining === 'number')
  })

  it('turns empty metadata into unreadable certificate info', () => {
    const certificate = buildCertificateInfo({}, warnDaysCritical, warnDaysWarning)
    const result = checkCertificateMetadata({})

    assert.deepEqual(certificate, {
      status: 'unreadable',
      error: 'Could not read certificate metadata',
    })
    assert.deepEqual(result, {
      valid: false,
      error: 'Could not read certificate metadata',
    })
  })
})

// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import * as certificateReader from '../utils/certificateReader.js'
import { buildCertificateInfo, checkCertificateMetadata } from '../utils/certificateStatus.js'

const warnDaysCritical = 7
const warnDaysWarning = 30

describe('certificate metadata', () => {
  it('derives readable UI info from cached metadata', () => {
    const now = Date.parse('2026-01-01T00:00:00.000Z')
    const metadata = certificateReader.parseOpenSslCertificateMetadata(
      [
        'notAfter=Jan 11 00:00:00 2026 GMT',
        'notBefore=Dec 01 00:00:00 2025 GMT',
        'subject=CN=test',
      ].join('\n'),
    )

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
    const metadata = certificateReader.parseOpenSslCertificateMetadata('notAfter=Jan 01 11:00:00 2026 GMT')
    const result = checkCertificateMetadata(
      metadata,
      Date.parse('2026-01-01T12:00:00.000Z')
    )

    assert.equal(result.valid, false)
    assert.equal(result.subject, 'Unknown')
    assert.equal(result.error, 'mTLS certificate expired 1 hour ago')
  })

  it('returns no remaining time when expiry metadata is missing', () => {
    const metadata = certificateReader.parseOpenSslCertificateMetadata('subject=CN=test')
    const result = checkCertificateMetadata(metadata)

    assert.deepEqual(result, {
      valid: false,
      error: 'Could not read certificate expiry date',
    })
  })

  it('parses OpenSSL certificate output', () => {
    const metadata = certificateReader.parseOpenSslCertificateMetadata(
      [
        'notAfter=Jan 11 00:00:00 2026 GMT',
        'notBefore=Dec 01 00:00:00 2025 GMT',
        'subject=CN=test',
      ].join('\n')
    )

    assert.deepEqual(metadata, {
      subject: 'CN=test',
      validFrom: '2025-12-01T00:00:00.000Z',
      validTo: '2026-01-11T00:00:00.000Z',
    })
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

// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import { execFile, spawn } from 'child_process';
import { promisify } from 'util';
import logger from './logger.js';

const execFileAsync = promisify(execFile);
const certLogger = logger.child({ module: 'certificate-utils' });

// Hostnames/IPs only — no shell metacharacters. Guards against injection even though
// host/port originate from admin-controlled config today.
const HOST_RE = /^[a-zA-Z0-9._-]+$/;

const OPENSSL_MAX_OUTPUT_BYTES = 1024 * 1024; // 1MB

/**
 * Spawn `openssl` with the given args (no shell), optionally writing `input` to stdin,
 * and resolve with its stdout. Resolves regardless of exit code (openssl s_client can
 * exit non-zero after emitting a usable cert); rejects only on spawn error, timeout, or
 * output overflow.
 */
function runOpenssl(args: string[], timeoutMs: number, input: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn('openssl', args, { stdio: ['pipe', 'pipe', 'pipe'] });

    let stdout = '';
    let stderr = '';
    let overflowed = false;
    let settled = false;

    const finish = (fn: () => void) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      fn();
    };

    const timer = setTimeout(() => {
      child.kill('SIGKILL');
      finish(() => reject(new Error(`openssl ${args[0]} timed out after ${timeoutMs} ms`)));
    }, timeoutMs);

    child.stdout.on('data', (chunk: Buffer) => {
      if (stdout.length + chunk.length > OPENSSL_MAX_OUTPUT_BYTES) {
        overflowed = true;
        child.kill('SIGKILL');
        return;
      }
      stdout += chunk.toString('utf8');
    });
    child.stderr.on('data', (chunk: Buffer) => {
      stderr += chunk.toString('utf8');
    });

    child.on('error', (err) => finish(() => reject(err)));
    child.on('close', () => {
      finish(() => {
        if (overflowed) {
          reject(new Error(`openssl ${args[0]} output exceeded ${OPENSSL_MAX_OUTPUT_BYTES} bytes`));
          return;
        }
        // openssl s_client can exit non-zero even after printing a usable certificate,
        // so we resolve with whatever it produced and let the caller decide whether the
        // output is parseable. stderr is surfaced only for debugging.
        if (stderr) {
          certLogger.debug('openssl stderr output', { command: args[0], stderr: stderr.slice(0, 200) });
        }
        resolve(stdout);
      });
    });

    child.stdin.on('error', () => {
      // Ignore EPIPE if openssl closes stdin early; the close handler decides the outcome.
    });
    child.stdin.end(input);
  });
}

/**
 * Common certificate metadata structure
 */
export interface CertificateMetadata {
  subject: string;
  issuer: string;
  validFrom: Date;
  validTo: Date;
  daysRemaining: number;
}

/**
 * Parse OpenSSL x509 text output into structured metadata
 *
 * Handles output format:
 * notBefore=Jun 26 00:00:00 2026 GMT
 * notAfter=Sep 24 23:59:59 2026 GMT
 * subject=CN=example.com
 * issuer=C=US, O=DigiCert Inc, CN=DigiCert CA
 */
export function parseOpensslX509Output(stdout: string): CertificateMetadata | null {
  const lines = stdout.split('\n');
  let notBefore: string | null = null;
  let notAfter: string | null = null;
  let subject: string | null = null;
  let issuer: string | null = null;

  for (const line of lines) {
    if (line.startsWith('notBefore=')) {
      notBefore = line.substring('notBefore='.length).trim();
    } else if (line.startsWith('notAfter=')) {
      notAfter = line.substring('notAfter='.length).trim();
    } else if (line.startsWith('subject=')) {
      subject = line.substring('subject='.length).trim();
    } else if (line.startsWith('issuer=')) {
      issuer = line.substring('issuer='.length).trim();
    }
  }

  // Validate required fields
  if (!notBefore || !notAfter || !subject) {
    certLogger.warn('Incomplete certificate data from openssl', {
      hasNotBefore: !!notBefore,
      hasNotAfter: !!notAfter,
      hasSubject: !!subject,
    });
    return null;
  }

  // Parse dates (OpenSSL format: "Jun 26 00:00:00 2026 GMT")
  const validFrom = new Date(notBefore);
  const validTo = new Date(notAfter);

  if (isNaN(validFrom.getTime()) || isNaN(validTo.getTime())) {
    certLogger.warn('Failed to parse certificate dates', {
      notBefore,
      notAfter,
    });
    return null;
  }

  // Calculate days remaining
  const now = new Date();
  const daysRemaining = Math.floor((validTo.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  return {
    subject: subject || 'Unknown',
    issuer: issuer || 'Unknown',
    validFrom,
    validTo,
    daysRemaining,
  };
}

/**
 * Extract certificate metadata from a remote server using OpenSSL s_client
 *
 * @param host - Server hostname
 * @param port - Server port
 * @param timeoutMs - Timeout in milliseconds (default: 10000)
 * @returns Certificate metadata or null if extraction fails
 */
export async function extractRemoteServerCertificate(
  host: string,
  port: number,
  timeoutMs = 10000
): Promise<CertificateMetadata | null> {
  // Reject anything that isn't a plain hostname/IP or a valid port. This prevents
  // shell/argument injection and fails closed on malformed config.
  if (!HOST_RE.test(host) || !Number.isInteger(port) || port < 1 || port > 65535) {
    certLogger.warn('Refusing to extract certificate for invalid host/port', { host, port });
    return null;
  }

  try {
    certLogger.debug('Extracting remote certificate via openssl s_client', { host, port });

    // Fetch the server's certificate chain (no shell — args passed as an array), then
    // pipe the PEM into `openssl x509` to parse dates/subject/issuer. Splitting these
    // into two spawned processes (rather than one interpolated shell string) removes the
    // injection surface entirely.
    const pem = await runOpenssl(
      ['s_client', '-connect', `${host}:${port}`, '-servername', host, '-showcerts'],
      timeoutMs,
      '' // s_client needs stdin closed to stop waiting for input
    );

    if (!pem || pem.trim().length === 0) {
      certLogger.debug('No certificate output from openssl s_client', { host, port });
      return null;
    }

    const stdout = await runOpenssl(
      ['x509', '-noout', '-dates', '-subject', '-issuer'],
      timeoutMs,
      pem
    );

    if (!stdout || stdout.trim().length === 0) {
      certLogger.debug('No certificate output from openssl x509', { host, port });
      return null;
    }

    const certInfo = parseOpensslX509Output(stdout);

    if (certInfo) {
      certLogger.info('Successfully extracted remote certificate', {
        host,
        port,
        daysRemaining: certInfo.daysRemaining,
      });
    }

    return certInfo;
  } catch (error) {
    certLogger.debug('Failed to extract remote certificate', {
      host,
      port,
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

/**
 * Read certificate metadata from a local file using OpenSSL x509
 *
 * @param certPath - Path to certificate file
 * @param timeoutMs - Timeout in milliseconds (default: 5000)
 * @returns Certificate metadata or null if reading fails
 */
export async function readLocalCertificateFile(
  certPath: string,
  timeoutMs = 5000
): Promise<CertificateMetadata | null> {
  try {
    certLogger.debug('Reading local certificate file', { certPath });

    const { stdout } = await execFileAsync(
      'openssl',
      ['x509', '-in', certPath, '-noout', '-dates', '-subject', '-issuer'],
      { timeout: timeoutMs }
    );

    const certInfo = parseOpensslX509Output(stdout);

    if (certInfo) {
      certLogger.info('Successfully read local certificate', {
        certPath,
        daysRemaining: certInfo.daysRemaining,
      });
    }

    return certInfo;
  } catch (error) {
    certLogger.warn('Failed to read local certificate', {
      certPath,
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

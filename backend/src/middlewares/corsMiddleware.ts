// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

/**
 * CORS Middleware
 * Cross-Origin Resource Sharing configuration
 */

import type { Request, Response, NextFunction } from 'express';
import {
  DEFAULT_ALLOWED_ORIGINS,
  evaluateOriginPolicy,
  validateOriginPolicy,
  type OriginPolicyOptions,
} from '../security/originPolicy.js';
import { sendError } from '../utils/responseHelpers.js';

const DEFAULT_METHODS = 'GET, POST, PUT, DELETE, OPTIONS';
const DEFAULT_HEADERS = [
  'Origin',
  'X-Requested-With',
  'Content-Type',
  'Accept',
  'Authorization',
  'X-User-Id',
  'X-User-Email',
  'X-User-Name',
].join(', ');

/**
 * Create a CORS middleware with explicit options.
 * Wildcard origins are only allowed when credentials is false.
 *
 * @param {object} [options]
 * @param {string[]} [options.origins]     - Allowed origins
 * @param {boolean}  [options.credentials] - Set Access-Control-Allow-Credentials
 * @param {boolean}  [options.strict]      - Reject non-matching origins with 403
 * @returns {Function} Express middleware
 */
interface CorsOptions {
  enabled?: boolean;
  origins?: string[];
  credentials?: boolean;
  strict?: boolean;
}

export const createCors = ({
  enabled = true,
  origins = DEFAULT_ALLOWED_ORIGINS,
  credentials = true,
  strict = false,
}: CorsOptions = {}) => {
  validateOriginPolicy({ enabled, origins, credentials });

  return (req: Request, res: Response, next: NextFunction): void => {
    const origin = req.headers.origin;
    const decision = evaluateOriginPolicy(origin, {
      enabled,
      origins,
      credentials,
      allowMissingOrigin: !strict,
    });

    if (origin && decision.allowed && enabled) {
      res.header('Access-Control-Allow-Origin', origin);
      res.header('Vary', 'Origin');
      res.header('Access-Control-Allow-Methods', DEFAULT_METHODS);
      res.header('Access-Control-Allow-Headers', DEFAULT_HEADERS);

      if (credentials) {
        res.header('Access-Control-Allow-Credentials', 'true');
      }
    }

    if (req.method === 'OPTIONS') {
      if (!decision.allowed) {
        sendError(req, res, 403, 'CORS_VIOLATION', decision.reason || 'CORS policy violation');
        return;
      }
      res.sendStatus(204);
      return;
    }

    if (strict && !decision.allowed) {
      sendError(req, res, 403, 'CORS_VIOLATION', decision.reason || 'CORS policy violation');
      return;
    }

    next();
  };
};

/**
 * Permissive CORS — allows listed origins with credentials.
 * @param {string[]|OriginPolicyOptions} options
 */
export const cors = (options: string[] | OriginPolicyOptions = DEFAULT_ALLOWED_ORIGINS) =>
  createCors({
    ...(Array.isArray(options) ? { origins: options } : options),
    credentials: true,
    strict: false,
  });

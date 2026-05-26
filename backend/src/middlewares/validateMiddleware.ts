// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import type { Request, Response, NextFunction } from 'express';
import { METHOD_KINDS, type MethodKind } from '@grpc-studio/shared';
import { AppError } from '../errors/AppError.js';

type Validator = (value: unknown) => true | string;
type ValidatorSchema = Record<string, Validator>;
interface ValidateSchemas {
  body?: ValidatorSchema;
  params?: ValidatorSchema;
  query?: ValidatorSchema;
}

const METHOD_KIND_SET = new Set<MethodKind>(METHOD_KINDS);

export function validate(schemas: ValidateSchemas) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const targets = [
      { key: 'body',   data: req.body   },
      { key: 'params', data: req.params },
      { key: 'query',  data: req.query  },
    ];

    for (const { key, data } of targets) {
      const schema = (schemas as Record<string, ValidatorSchema | undefined>)[key];
      if (!schema) continue;

      const errors: string[] = [];
      for (const [field, validator] of Object.entries(schema) as [string, Validator][]) {
        const result = validator(data?.[field]);
        if (result !== true) {
          errors.push(`${key}.${field}: ${result}`);
        }
      }

      if (errors.length > 0) {
        return next(new AppError(errors.join('; '), 400, 'VALIDATION_ERROR'));
      }
    }

    next();
  };
}

export const isNonEmptyString = (label = 'value'): Validator =>
  (v) => (typeof v === 'string' && v.trim().length > 0) ? true : `${label} must be a non-empty string`;

export const isMethodKind = (label = 'value'): Validator =>
  (v) => typeof v === 'string' && METHOD_KIND_SET.has(v as MethodKind) ? true : `${label} must be a valid method kind`;

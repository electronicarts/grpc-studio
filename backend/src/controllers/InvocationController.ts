// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import type { Request, Response } from 'express';
import grpcMethodInvokerService from '../services/grpcMethodInvokerService.js';
import { sendSuccess } from '../utils/responseHelpers.js';
import { AppError } from '../errors/AppError.js';
import logger from '../utils/logger.js';
import { MethodKind, type InvokeUnaryRequest, type InvokeUnaryResponse } from '@grpc-studio/shared';

const controllerLogger = logger.child({ controller: 'invocation' });

export async function invoke(req: Request, res: Response) {
  // body validation enforced by validate() middleware on this route
  const { target, service: serviceName, method: methodName, methodKind, data = {} } = req.body as InvokeUnaryRequest;

  if (methodKind !== MethodKind.UNARY) {
    throw new AppError('HTTP invocation only supports unary methods', 400, 'VALIDATION_ERROR');
  }

  if (!target) {
    throw new AppError('Target is required', 400, 'VALIDATION_ERROR');
  }

  controllerLogger.info('Invoking method', {
    target,
    service: serviceName,
    method: methodName,
    userId: req.userContext?.userId,
  });

  const result = await grpcMethodInvokerService.invokeUnary(target, serviceName, methodName, data);

  if (!result.success) {
    throw new AppError(result.error ?? 'Method invocation failed', 400, 'METHOD_ERROR');
  }

  controllerLogger.info('Method invocation successful', { target, service: serviceName, method: methodName });
  const responseBody: InvokeUnaryResponse = result;
  sendSuccess(res, responseBody);
}

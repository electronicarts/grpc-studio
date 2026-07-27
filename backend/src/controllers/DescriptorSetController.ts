// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import type { Request, Response } from 'express';
import descriptorSetService from '../services/descriptorSetService.js';
import { sendSuccess } from '../utils/responseHelpers.js';
import { AppError } from '../errors/AppError.js';
import logger from '../utils/logger.js';
import type { DescriptorSetRequest, DescriptorSetResponse } from '@grpc-studio/shared';

const controllerLogger = logger.child({ controller: 'descriptor-set' });

export async function getDescriptorSet(req: Request, res: Response) {
  const { target, messageType }: DescriptorSetRequest = req.body;

  if (!target) {
    throw new AppError('Target is required', 400, 'VALIDATION_ERROR');
  }

  controllerLogger.info('Loading descriptor set', { target, messageType });

  const descriptorSetBase64 = await descriptorSetService.getDescriptorSetBase64(target, messageType);
  const responseBody: DescriptorSetResponse = { messageType, descriptorSetBase64 };
  sendSuccess(res, responseBody);
}

// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import type { Request, Response } from 'express';
import descriptorSetService from '../services/descriptorSetService.js';
import { sendSuccess } from '../utils/responseHelpers.js';
import logger from '../utils/logger.js';
import type { DescriptorSetRequest, DescriptorSetResponse } from '@grpc-studio/shared';

const controllerLogger = logger.child({ controller: 'descriptor-set' });

export async function getDescriptorSet(req: Request, res: Response) {
  const { messageType }: DescriptorSetRequest = req.body;
  controllerLogger.info('Loading descriptor set', { messageType });

  const descriptorSetBase64 = await descriptorSetService.getDescriptorSetBase64(messageType);
  const responseBody: DescriptorSetResponse = { messageType, descriptorSetBase64 };
  sendSuccess(res, responseBody);
}

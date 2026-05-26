// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

// Protobuf descriptor types — all schema work is done directly with these.
export type { DescField, DescMessage, DescEnum, DescOneof, DescEnumValue } from '@bufbuild/protobuf'

// ApiMethod / ApiService are the HTTP wire format and serve as the canonical
// frontend types too — no separate GrpcMethod / GrpcService needed.
export type { ApiMethod as GrpcMethod, ApiService as GrpcService } from '@grpc-studio/shared'


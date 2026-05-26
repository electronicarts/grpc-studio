# gRPC Boundary

This folder has two transport owners:

- `reflection/` uses `@grpc/grpc-js` and `grpc-js-reflection-client`. It owns service listing and `FileDescriptorSet` fetching.
- `connect/` uses `@connectrpc/connect-node`. It owns dynamic method invocation with reflected Buf descriptors.

Code outside this folder should usually enter through `ReflectionSchemaRepository` for descriptors or `GrpcMethodInvokerService` for calls.

// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import { useEffect, useRef, useCallback, useState } from 'react';
import { getConfig, isConfigLoaded } from '../../../config';
import { getUserHeaders } from '../../../lib/headers/headerManager';
import { wsLogger } from '../../../utils/debugLogger';
import { getWebSocketUrl, startHeartbeat, scheduleReconnect, waitForConnection } from '../utils/wsConnectionHelpers';
import { dispatchWebSocketMessage } from '../utils/wsMessageDispatcher';
import { useWebSocketCallbackRefs } from './useWebSocketCallbackRefs';
import type { InvokeStreamClientMessage, InvokeStreamStartPayload, JsonValue } from '@grpc-studio/shared';
import type { GrpcWebSocketHandle, UseGrpcWebSocketOptions } from './grpcWebSocketTypes';

const MAX_RECONNECT_ATTEMPTS = 10;
const DEFAULT_WEBSOCKET_TIMEOUT_MS = 5000;

export type { GrpcStreamMessage, GrpcWebSocketHandle, UseGrpcWebSocketOptions } from './grpcWebSocketTypes';

export function useGrpcWebSocket(options: UseGrpcWebSocketOptions = {}): GrpcWebSocketHandle {
  const wsRef = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);

  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const heartbeatIntervalRef = useRef<ReturnType<typeof setInterval>>();
  const reconnectAttemptsRef = useRef(0);
  const shouldReconnectRef = useRef(true);
  const callbacks = useWebSocketCallbackRefs(options);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;
    if (heartbeatIntervalRef.current) clearInterval(heartbeatIntervalRef.current);

    const ws = new WebSocket(getWebSocketUrl());
    wsRef.current = ws;

    ws.onopen = () => {
      wsLogger.debug('WebSocket connected');
      setIsConnected(true);
      reconnectAttemptsRef.current = 0;
      callbacks.onOpenRef.current?.();
      heartbeatIntervalRef.current = startHeartbeat(ws);
    };

    ws.onmessage = (event) => {
      dispatchWebSocketMessage(event, {
        onResponse: callbacks.onResponseRef.current,
        onError: callbacks.onErrorRef.current,
        onComplete: callbacks.onCompleteRef.current,
      }, setIsStreaming);
    };

    ws.onerror = (error) => {
      wsLogger.error('WebSocket error:', error);
      callbacks.onErrorRef.current?.('WebSocket connection error');
    };

    ws.onclose = (event) => {
      wsLogger.debug('WebSocket closed', event.code, event.reason);
      setIsConnected(false);
      setIsStreaming(false);
      callbacks.onCloseRef.current?.();
      if (heartbeatIntervalRef.current) clearInterval(heartbeatIntervalRef.current);

      if (shouldReconnectRef.current) {
        reconnectAttemptsRef.current += 1;
        reconnectTimeoutRef.current = scheduleReconnect(
          reconnectAttemptsRef.current,
          MAX_RECONNECT_ATTEMPTS,
          connect,
          () => callbacks.onErrorRef.current?.('Connection lost. Please refresh the page.'),
        ) ?? undefined;
      }
    };
  }, [callbacks]);

  const close = useCallback(() => {
    shouldReconnectRef.current = false;
    if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
    if (heartbeatIntervalRef.current) clearInterval(heartbeatIntervalRef.current);
    if (wsRef.current) {
      wsRef.current.close(1000, 'Client closing connection');
      wsRef.current = null;
    }
    setIsConnected(false);
    setIsStreaming(false);
  }, []);

  useEffect(() => () => { close(); }, [close]);

  const send = useCallback((message: InvokeStreamClientMessage) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    } else {
      wsLogger.error('WebSocket not connected');
      callbacks.onErrorRef.current?.('WebSocket not connected');
    }
  }, [callbacks.onErrorRef]);

  const start = useCallback((payload: InvokeStreamStartPayload) => {
    const sendStart = () => {
      const userHeaders = { ...payload.userHeaders, ...getUserHeaders() };
      const startPayload = Object.keys(userHeaders).length > 0
        ? { ...payload, userHeaders }
        : payload;

      send({ type: 'start', payload: startPayload });
      setIsStreaming(true);
      wsLogger.debug('Start message sent');
    };

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      sendStart();
    } else {
      connect();
      const wsTimeout = isConfigLoaded()
        ? (getConfig().api?.websocketTimeout ?? DEFAULT_WEBSOCKET_TIMEOUT_MS)
        : DEFAULT_WEBSOCKET_TIMEOUT_MS;
      waitForConnection(
        wsRef,
        wsTimeout,
        sendStart,
        () => {
          wsLogger.error('WebSocket connection timeout');
          callbacks.onErrorRef.current?.('Failed to connect to WebSocket');
        },
      );
    }
  }, [callbacks.onErrorRef, connect, send]);

  const sendData = useCallback((data: JsonValue) => {
    send({ type: 'data', payload: data });
  }, [send]);

  const endStream = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      send({ type: 'end' });
    }
  }, [send]);

  const cancel = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      send({ type: 'cancel' });
      setIsStreaming(false);
    }
  }, [send]);

  return { start, sendData, endStream, cancel, close, isConnected, isStreaming };
}

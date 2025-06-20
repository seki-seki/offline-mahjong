import { useState, useEffect, useCallback, useRef } from 'react';
import { P2PManager } from './P2PManager';
import { 
  MessageType, 
  PlayerInfo, 
  ConnectionStatus,
  MessageHandler 
} from './types';
import { BaseError, getUserFriendlyMessage } from '../utils/errors';
import { logger } from '../utils/logger';

export interface P2PState {
  isConnected: boolean;
  peerId: string;
  isHost: boolean;
  players: PlayerInfo[];
  connectionStatus: ConnectionStatus[];
  error: string | null;
}

export interface UseP2PReturn {
  state: P2PState;
  error: string | null;
  initialize: (peerId?: string) => Promise<void>;
  connectToPeer: (peerId: string) => Promise<void>;
  sendMessage: (type: MessageType, data: any, targetPeerId?: string) => void;
  broadcastMessage: (type: MessageType, data: any) => void;
  on: (type: MessageType, handler: MessageHandler) => void;
  off: (type: MessageType, handler: MessageHandler) => void;
  destroy: () => void;
}

export function useP2P(): UseP2PReturn {
  const [state, setState] = useState<P2PState>({
    isConnected: false,
    peerId: '',
    isHost: false,
    players: [],
    connectionStatus: [],
    error: null
  });

  const managerRef = useRef<P2PManager | null>(null);

  // Initialize P2P connection
  const initialize = useCallback(async (peerId?: string) => {
    try {
      setState(prev => ({ ...prev, error: null }));
      
      const manager = new P2PManager({
        maxPlayers: 4,
        reconnectTimeout: 30000,
        pingInterval: 5000
      });
      
      const id = await manager.initialize(peerId);
      managerRef.current = manager;

      setState(prev => ({
        ...prev,
        isConnected: true,
        peerId: id,
        isHost: manager.getIsHost()
      }));

      // Setup internal event handlers
      setupEventHandlers(manager);
      
    } catch (error) {
      const err = error as any;
      logger.error('P2P initialization failed', err);
      const errorMessage = err instanceof BaseError 
        ? getUserFriendlyMessage(err)
        : err instanceof Error 
        ? err.message 
        : 'P2P接続の初期化に失敗しました';
        
      setState(prev => ({
        ...prev,
        error: errorMessage
      }));
      throw error;
    }
  }, []);

  // Connect to another peer
  const connectToPeer = useCallback(async (peerId: string) => {
    if (!managerRef.current) {
      throw new Error('P2P not initialized');
    }

    try {
      setState(prev => ({ ...prev, error: null }));
      await managerRef.current.connectToPeer(peerId);
    } catch (error) {
      const err = error as any;
      logger.error('Failed to connect to peer', err, { peerId });
      const errorMessage = err instanceof BaseError 
        ? getUserFriendlyMessage(err)
        : err instanceof Error 
        ? err.message 
        : 'ピアへの接続に失敗しました';
        
      setState(prev => ({
        ...prev,
        error: errorMessage
      }));
      throw error;
    }
  }, []);

  // Send message
  const sendMessage = useCallback((type: MessageType, data: any, targetPeerId?: string) => {
    if (!managerRef.current) {
      logger.error('P2P not initialized');
      return;
    }
    try {
      managerRef.current.sendMessage(type, data, targetPeerId);
    } catch (error) {
      const err = error as any;
      logger.error('Failed to send message', err, { type, targetPeerId });
      const errorMessage = err instanceof BaseError 
        ? getUserFriendlyMessage(err)
        : 'メッセージの送信に失敗しました';
      setState(prev => ({ ...prev, error: errorMessage }));
    }
  }, []);

  // Broadcast message
  const broadcastMessage = useCallback((type: MessageType, data: any) => {
    if (!managerRef.current) {
      console.error('P2P not initialized');
      return;
    }
    managerRef.current.broadcastMessage(type, data);
  }, []);

  // Register event handler
  const on = useCallback((type: MessageType, handler: MessageHandler) => {
    if (!managerRef.current) {
      console.error('P2P not initialized');
      return;
    }
    managerRef.current.on(type, handler);
  }, []);

  // Unregister event handler
  const off = useCallback((type: MessageType, handler: MessageHandler) => {
    if (!managerRef.current) {
      console.error('P2P not initialized');
      return;
    }
    managerRef.current.off(type, handler);
  }, []);

  // Setup internal event handlers
  const setupEventHandlers = (manager: P2PManager) => {
    // Update players list
    const updatePlayers = () => {
      setState(prev => ({
        ...prev,
        players: manager.getPlayers()
      }));
    };

    // Update connection status
    const updateConnectionStatus = () => {
      setState(prev => ({
        ...prev,
        connectionStatus: manager.getConnectionStatus()
      }));
    };

    // Handle player join
    manager.on(MessageType.PLAYER_JOIN, () => {
      updatePlayers();
      updateConnectionStatus();
    });

    // Handle player disconnect
    manager.on(MessageType.PLAYER_DISCONNECT, () => {
      updatePlayers();
      updateConnectionStatus();
    });

    // Handle player reconnect
    manager.on(MessageType.PLAYER_RECONNECT, () => {
      updatePlayers();
      updateConnectionStatus();
    });

    // Handle connection status updates
    manager.on(MessageType.CONNECTION_STATUS, () => {
      updatePlayers();
      updateConnectionStatus();
    });

    // Update status periodically
    const statusInterval = setInterval(() => {
      updateConnectionStatus();
    }, 1000);

    // Store interval for cleanup
    (manager as any)._statusInterval = statusInterval;
  };

  // Destroy P2P connection
  const destroy = useCallback(() => {
    if (managerRef.current) {
      // Clear status interval
      const interval = (managerRef.current as any)._statusInterval;
      if (interval) {
        clearInterval(interval);
      }
      
      managerRef.current.destroy();
      managerRef.current = null;
      
      setState({
        isConnected: false,
        peerId: '',
        isHost: false,
        players: [],
        connectionStatus: [],
        error: null
      });
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      destroy();
    };
  }, [destroy]);

  return {
    state: {
      isConnected: state.isConnected,
      peerId: state.peerId,
      isHost: state.isHost,
      players: state.players,
      connectionStatus: state.connectionStatus,
      error: state.error
    },
    error: state.error,
    initialize,
    connectToPeer,
    sendMessage,
    broadcastMessage,
    on,
    off,
    destroy
  };
}
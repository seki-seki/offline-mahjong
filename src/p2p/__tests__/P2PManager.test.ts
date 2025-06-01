import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { P2PManager } from '../P2PManager';
import { MessageType, P2PMessage } from '../types';
import Peer from 'peerjs';

// Mock PeerJS
vi.mock('peerjs', () => {
  const mockPeer = vi.fn();
  const mockDataConnection = vi.fn();
  
  mockDataConnection.prototype.send = vi.fn();
  mockDataConnection.prototype.close = vi.fn();
  mockDataConnection.prototype.on = vi.fn();
  
  mockPeer.prototype.on = vi.fn();
  mockPeer.prototype.destroy = vi.fn();
  mockPeer.prototype.reconnect = vi.fn();
  
  return { default: mockPeer };
});

describe('P2PManager', () => {
  let p2pManager: P2PManager;
  let mockPeerInstance: any;
  let mockConnections: Map<string, any>;

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();
    mockConnections = new Map();
    
    // Setup mock peer instance
    mockPeerInstance = {
      on: vi.fn((event: string, callback: Function) => {
        if (event === 'open') {
          // Simulate peer opening with test ID
          setTimeout(() => callback('test-peer-id'), 0);
        }
        return mockPeerInstance;
      }),
      destroy: vi.fn(),
      reconnect: vi.fn(),
      disconnected: false,
      destroyed: false,
      id: 'test-peer-id'
    };
    
    (Peer as any).mockImplementation(() => mockPeerInstance);
    
    p2pManager = new P2PManager({
      maxPlayers: 4,
      reconnectTimeout: 1000,
      pingInterval: 1000,
      messageTimeout: 1000
    });
  });

  afterEach(() => {
    p2pManager.destroy();
  });

  describe('initialize', () => {
    it('should initialize as host when no peerId provided', async () => {
      const peerId = await p2pManager.initialize();
      
      expect(peerId).toBe('test-peer-id');
      expect(p2pManager.getPeerId()).toBe('test-peer-id');
      expect(p2pManager.getIsHost()).toBe(true);
    });

    it('should initialize as client when peerId provided', async () => {
      const peerId = await p2pManager.initialize('host-peer-id');
      
      expect(peerId).toBe('test-peer-id');
      expect(p2pManager.getPeerId()).toBe('test-peer-id');
      expect(p2pManager.getIsHost()).toBe(false);
    });

    it('should handle connection events', async () => {
      await p2pManager.initialize();
      
      const onCallback = mockPeerInstance.on.mock.calls.find(
        (call: any[]) => call[0] === 'connection'
      );
      expect(onCallback).toBeDefined();
    });
  });

  describe('connectToPeer', () => {
    beforeEach(async () => {
      await p2pManager.initialize();
    });

    it('should establish connection to peer', async () => {
      const mockConnection = {
        on: vi.fn((event: string, callback: Function) => {
          if (event === 'open') {
            setTimeout(() => callback(), 0);
          }
          return mockConnection;
        }),
        open: true,
        peer: 'remote-peer-id',
        send: vi.fn(),
        close: vi.fn()
      };

      mockPeerInstance.connect = vi.fn().mockReturnValue(mockConnection);

      await p2pManager.connectToPeer('remote-peer-id');
      
      expect(mockPeerInstance.connect).toHaveBeenCalledWith('remote-peer-id');
    });

    it('should reject if connection fails', async () => {
      const mockConnection = {
        on: vi.fn((event: string, callback: Function) => {
          if (event === 'error') {
            setTimeout(() => callback(new Error('Connection failed')), 0);
          }
          return mockConnection;
        }),
        open: false,
        peer: 'remote-peer-id'
      };

      mockPeerInstance.connect = vi.fn().mockReturnValue(mockConnection);

      await expect(p2pManager.connectToPeer('remote-peer-id')).rejects.toThrow('Connection failed');
    });
  });

  describe('message handling', () => {
    let mockConnection: any;

    beforeEach(async () => {
      await p2pManager.initialize();
      
      mockConnection = {
        on: vi.fn(),
        open: true,
        peer: 'remote-peer-id',
        send: vi.fn(),
        close: vi.fn()
      };
    });

    it('should register and call message handlers', async () => {
      const handler = vi.fn();
      p2pManager.on(MessageType.GAME_STATE_UPDATE, handler);

      // Simulate receiving a message
      const message: P2PMessage = {
        type: MessageType.GAME_STATE_UPDATE,
        senderId: 'remote-peer-id',
        timestamp: Date.now(),
        data: { test: 'data' }
      };

      // Access private method through prototype
      const handleMessage = (p2pManager as any).handleMessage.bind(p2pManager);
      handleMessage(message, 'remote-peer-id');

      expect(handler).toHaveBeenCalledWith(message, 'remote-peer-id');
    });

    it('should handle PING messages with PONG response', async () => {
      mockPeerInstance.connect = vi.fn().mockReturnValue(mockConnection);
      await p2pManager.connectToPeer('remote-peer-id');

      const pingMessage: P2PMessage = {
        type: MessageType.PING,
        senderId: 'remote-peer-id',
        timestamp: Date.now(),
        data: { timestamp: Date.now() }
      };

      // Get data handler from connection setup
      const dataHandler = mockConnection.on.mock.calls.find(
        (call: any[]) => call[0] === 'data'
      )?.[1];

      // Simulate receiving ping
      dataHandler(pingMessage);

      // Check that PONG was sent
      expect(mockConnection.send).toHaveBeenCalledWith(
        expect.objectContaining({
          type: MessageType.PONG,
          senderId: 'test-peer-id'
        })
      );
    });
  });

  describe('broadcasting', () => {
    let mockConnection1: any;
    let mockConnection2: any;

    beforeEach(async () => {
      await p2pManager.initialize();
      
      mockConnection1 = {
        on: vi.fn((event: string, callback: Function) => {
          if (event === 'open') callback();
          return mockConnection1;
        }),
        open: true,
        peer: 'peer-1',
        send: vi.fn(),
        close: vi.fn()
      };

      mockConnection2 = {
        on: vi.fn((event: string, callback: Function) => {
          if (event === 'open') callback();
          return mockConnection2;
        }),
        open: true,
        peer: 'peer-2',
        send: vi.fn(),
        close: vi.fn()
      };

      mockPeerInstance.connect = vi.fn()
        .mockReturnValueOnce(mockConnection1)
        .mockReturnValueOnce(mockConnection2);

      await p2pManager.connectToPeer('peer-1');
      await p2pManager.connectToPeer('peer-2');
    });

    it('should broadcast message to all connected peers', () => {
      const testData = { action: 'test' };
      p2pManager.broadcastMessage(MessageType.GAME_ACTION, testData);

      expect(mockConnection1.send).toHaveBeenCalledWith(
        expect.objectContaining({
          type: MessageType.GAME_ACTION,
          data: testData,
          senderId: 'test-peer-id'
        })
      );

      expect(mockConnection2.send).toHaveBeenCalledWith(
        expect.objectContaining({
          type: MessageType.GAME_ACTION,
          data: testData,
          senderId: 'test-peer-id'
        })
      );
    });

    it('should exclude specified peers from broadcast', () => {
      const testData = { action: 'test' };
      p2pManager.broadcastMessage(MessageType.GAME_ACTION, testData, ['peer-1']);

      expect(mockConnection1.send).not.toHaveBeenCalled();
      expect(mockConnection2.send).toHaveBeenCalledWith(
        expect.objectContaining({
          type: MessageType.GAME_ACTION,
          data: testData
        })
      );
    });
  });

  describe('connection status', () => {
    beforeEach(async () => {
      await p2pManager.initialize();
    });

    it('should return connection status for all peers', async () => {
      const mockConnection = {
        on: vi.fn((event: string, callback: Function) => {
          if (event === 'open') callback();
          return mockConnection;
        }),
        open: true,
        peer: 'peer-1',
        send: vi.fn(),
        close: vi.fn()
      };

      mockPeerInstance.connect = vi.fn().mockReturnValue(mockConnection);
      await p2pManager.connectToPeer('peer-1');

      const status = p2pManager.getConnectionStatus();
      
      expect(status).toHaveLength(1);
      expect(status[0]).toMatchObject({
        playerId: 'peer-1',
        isConnected: true
      });
    });

    it('should check if fully connected based on max players', async () => {
      // Create connections for 3 other players (total 4 with self)
      for (let i = 1; i <= 3; i++) {
        const mockConnection = {
          on: vi.fn((event: string, callback: Function) => {
            if (event === 'open') callback();
            return mockConnection;
          }),
          open: true,
          peer: `peer-${i}`,
          send: vi.fn(),
          close: vi.fn()
        };

        mockPeerInstance.connect = vi.fn().mockReturnValue(mockConnection);
        await p2pManager.connectToPeer(`peer-${i}`);
      }

      expect(p2pManager.isFullyConnected()).toBe(true);
    });
  });

  describe('cleanup', () => {
    it('should properly destroy all resources', async () => {
      await p2pManager.initialize();
      
      const mockConnection = {
        on: vi.fn((event: string, callback: Function) => {
          if (event === 'open') callback();
          return mockConnection;
        }),
        open: true,
        peer: 'peer-1',
        send: vi.fn(),
        close: vi.fn()
      };

      mockPeerInstance.connect = vi.fn().mockReturnValue(mockConnection);
      await p2pManager.connectToPeer('peer-1');

      p2pManager.destroy();

      expect(mockConnection.close).toHaveBeenCalled();
      expect(mockPeerInstance.destroy).toHaveBeenCalled();
    });
  });
});
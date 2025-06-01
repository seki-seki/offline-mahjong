import Peer, { DataConnection } from 'peerjs';
import { 
  MessageType, 
  P2PMessage, 
  PlayerInfo, 
  ConnectionStatus,
  MessageHandler,
  P2PConfig 
} from './types';

export class P2PManager {
  private peer: Peer | null = null;
  private connections: Map<string, DataConnection> = new Map();
  private messageHandlers: Map<MessageType, MessageHandler[]> = new Map();
  private players: Map<string, PlayerInfo> = new Map();
  private myId: string = '';
  private isHost: boolean = false;
  private config: P2PConfig;
  private pingIntervals: Map<string, ReturnType<typeof setInterval>> = new Map();
  private messageSequence: number = 0;
  private reconnectAttempts: Map<string, number> = new Map();

  constructor(config?: Partial<P2PConfig>) {
    this.config = {
      maxPlayers: 4,
      reconnectTimeout: 30000,
      pingInterval: 5000,
      messageTimeout: 10000,
      ...config
    };
  }

  // Initialize as host or join existing game
  async initialize(peerId?: string): Promise<string> {
    return new Promise((resolve, reject) => {
      try {
        // Use provided ID or generate new one
        this.peer = peerId ? new Peer(peerId) : new Peer();
        
        this.peer.on('open', (id) => {
          this.myId = id;
          this.isHost = !peerId;
          console.log(`P2P initialized with ID: ${id}`);
          resolve(id);
        });

        this.peer.on('connection', (conn) => {
          this.handleIncomingConnection(conn);
        });

        this.peer.on('error', (err) => {
          console.error('Peer error:', err);
          reject(err);
        });

        this.peer.on('disconnected', () => {
          console.warn('Disconnected from signaling server');
          this.attemptReconnect();
        });

      } catch (error) {
        reject(error);
      }
    });
  }

  // Connect to another peer
  async connectToPeer(peerId: string): Promise<void> {
    if (!this.peer) throw new Error('P2P not initialized');
    if (this.connections.has(peerId)) return;

    return new Promise((resolve, reject) => {
      const conn = this.peer!.connect(peerId, {
        reliable: true,
        serialization: 'json'
      });

      conn.on('open', () => {
        this.setupConnection(conn);
        resolve();
      });

      conn.on('error', (err) => {
        console.error(`Connection error with ${peerId}:`, err);
        reject(err);
      });

      // Timeout for connection
      setTimeout(() => {
        if (!conn.open) {
          conn.close();
          reject(new Error(`Connection timeout for peer ${peerId}`));
        }
      }, this.config.messageTimeout);
    });
  }

  // Handle incoming connections
  private handleIncomingConnection(conn: DataConnection) {
    conn.on('open', () => {
      this.setupConnection(conn);
      // Send current player list to new connection
      this.sendMessage(MessageType.CONNECTION_STATUS, {
        players: Array.from(this.players.values()),
        myInfo: this.getMyPlayerInfo()
      }, conn.peer);
    });
  }

  // Setup connection handlers
  private setupConnection(conn: DataConnection) {
    const peerId = conn.peer;
    this.connections.set(peerId, conn);
    
    // Start ping interval
    const pingInterval = setInterval(() => {
      this.sendMessage(MessageType.PING, { timestamp: Date.now() }, peerId);
    }, this.config.pingInterval);
    this.pingIntervals.set(peerId, pingInterval);

    conn.on('data', (data: any) => {
      this.handleMessage(data, peerId);
    });

    conn.on('close', () => {
      this.handleDisconnection(peerId);
    });

    conn.on('error', (err) => {
      console.error(`Connection error with ${peerId}:`, err);
    });

    // Add player info
    const playerInfo: PlayerInfo = {
      id: peerId,
      name: `Player ${this.players.size + 1}`,
      position: this.players.size,
      isReady: false,
      isConnected: true
    };
    this.players.set(peerId, playerInfo);

    // Notify about new player
    this.broadcastMessage(MessageType.PLAYER_JOIN, playerInfo, [peerId]);
  }

  // Handle disconnection
  private handleDisconnection(peerId: string) {
    console.log(`Peer ${peerId} disconnected`);
    
    // Clear ping interval
    const interval = this.pingIntervals.get(peerId);
    if (interval) {
      clearInterval(interval);
      this.pingIntervals.delete(peerId);
    }

    // Update player status
    const player = this.players.get(peerId);
    if (player) {
      player.isConnected = false;
      this.broadcastMessage(MessageType.PLAYER_DISCONNECT, { playerId: peerId });
    }

    this.connections.delete(peerId);
    
    // Attempt reconnection
    this.scheduleReconnection(peerId);
  }

  // Schedule reconnection attempt
  private scheduleReconnection(peerId: string) {
    const attempts = this.reconnectAttempts.get(peerId) || 0;
    if (attempts >= 3) {
      console.log(`Max reconnection attempts reached for ${peerId}`);
      return;
    }

    setTimeout(async () => {
      try {
        await this.connectToPeer(peerId);
        this.reconnectAttempts.delete(peerId);
        console.log(`Reconnected to ${peerId}`);
      } catch (err) {
        this.reconnectAttempts.set(peerId, attempts + 1);
        this.scheduleReconnection(peerId);
      }
    }, Math.min(5000 * (attempts + 1), this.config.reconnectTimeout));
  }

  // Attempt to reconnect to signaling server
  private attemptReconnect() {
    if (!this.peer || this.peer.destroyed) return;
    
    setTimeout(() => {
      if (this.peer && !this.peer.disconnected) return;
      this.peer!.reconnect();
    }, 5000);
  }

  // Send message to specific peer or broadcast
  sendMessage(type: MessageType, data: any, targetPeerId?: string): void {
    const message: P2PMessage = {
      type,
      senderId: this.myId,
      timestamp: Date.now(),
      data,
      sequence: this.messageSequence++
    };

    if (targetPeerId) {
      const conn = this.connections.get(targetPeerId);
      if (conn && conn.open) {
        conn.send(message);
      }
    } else {
      this.broadcastMessage(type, data);
    }
  }

  // Broadcast message to all connected peers
  broadcastMessage(type: MessageType, data: any, excludePeers: string[] = []): void {
    const message: P2PMessage = {
      type,
      senderId: this.myId,
      timestamp: Date.now(),
      data,
      sequence: this.messageSequence++
    };

    this.connections.forEach((conn, peerId) => {
      if (conn.open && !excludePeers.includes(peerId)) {
        conn.send(message);
      }
    });
  }

  // Handle incoming messages
  private handleMessage(message: P2PMessage, peerId: string) {
    // Handle system messages
    switch (message.type) {
      case MessageType.PING:
        this.sendMessage(MessageType.PONG, { 
          timestamp: message.data.timestamp,
          responseTime: Date.now()
        }, peerId);
        return;
        
      case MessageType.PONG:
        const latency = Date.now() - message.data.timestamp;
        console.log(`Latency with ${peerId}: ${latency}ms`);
        return;
        
      case MessageType.CONNECTION_STATUS:
        // Update player list
        if (message.data.players) {
          message.data.players.forEach((player: PlayerInfo) => {
            if (player.id !== this.myId) {
              this.players.set(player.id, player);
            }
          });
        }
        break;
    }

    // Call registered handlers
    const handlers = this.messageHandlers.get(message.type) || [];
    handlers.forEach(handler => {
      try {
        handler(message, peerId);
      } catch (error) {
        console.error(`Error in message handler for ${message.type}:`, error);
      }
    });
  }

  // Register message handler
  on(type: MessageType, handler: MessageHandler): void {
    const handlers = this.messageHandlers.get(type) || [];
    handlers.push(handler);
    this.messageHandlers.set(type, handlers);
  }

  // Remove message handler
  off(type: MessageType, handler: MessageHandler): void {
    const handlers = this.messageHandlers.get(type) || [];
    const index = handlers.indexOf(handler);
    if (index > -1) {
      handlers.splice(index, 1);
    }
  }


  // Get my player info
  getMyPlayerInfo(): PlayerInfo {
    return {
      id: this.myId,
      name: `Player ${this.isHost ? 1 : this.players.size + 1}`,
      position: this.isHost ? 0 : this.players.size,
      isReady: true,
      isConnected: true
    };
  }

  // Get connection status
  getConnectionStatus(): ConnectionStatus[] {
    return Array.from(this.connections.entries()).map(([peerId, conn]) => ({
      playerId: peerId,
      isConnected: conn.open,
      lastSeen: Date.now()
    }));
  }

  // Check if all players are connected
  isFullyConnected(): boolean {
    return this.connections.size === this.config.maxPlayers - 1 &&
           Array.from(this.connections.values()).every(conn => conn.open);
  }

  // Destroy P2P manager
  destroy(): void {
    // Clear all intervals
    this.pingIntervals.forEach(interval => clearInterval(interval));
    this.pingIntervals.clear();

    // Close all connections
    this.connections.forEach(conn => conn.close());
    this.connections.clear();

    // Destroy peer
    if (this.peer) {
      this.peer.destroy();
      this.peer = null;
    }

    // Clear data
    this.players.clear();
    this.messageHandlers.clear();
    this.reconnectAttempts.clear();
  }

  // Get peer ID
  getPeerId(): string {
    return this.myId;
  }

  // Check if this peer is the host
  getIsHost(): boolean {
    return this.isHost;
  }

  // Get local peer ID
  getLocalPeerId(): string {
    return this.myId;
  }

  // Get all players
  getPlayers(): PlayerInfo[] {
    const allPlayers = [this.getMyPlayerInfo()];
    this.players.forEach(player => allPlayers.push(player));
    return allPlayers;
  }
}
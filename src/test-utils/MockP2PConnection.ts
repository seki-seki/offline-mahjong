import { EventEmitter } from 'events';
import { P2PMessage, MessageType } from '../p2p/types';

export class MockDataConnection extends EventEmitter {
  public peer: string;
  public open: boolean = false;
  private messageQueue: P2PMessage[] = [];
  private partner: MockDataConnection | null = null;

  constructor(peer: string) {
    super();
    this.peer = peer;
  }

  connect(partner: MockDataConnection) {
    this.partner = partner;
    this.open = true;
    partner.open = true;
    
    // Emit open event
    setTimeout(() => {
      this.emit('open');
      partner.emit('open');
    }, 0);
  }

  send(data: P2PMessage) {
    if (!this.open || !this.partner) {
      throw new Error('Connection not open');
    }

    // Simulate network delay
    setTimeout(() => {
      this.partner!.emit('data', data);
    }, Math.random() * 50);
  }

  close() {
    if (this.partner) {
      this.open = false;
      this.partner.open = false;
      this.emit('close');
      this.partner.emit('close');
    }
  }

  simulateError(error: Error) {
    this.emit('error', error);
  }
}

export class MockPeer extends EventEmitter {
  public id: string;
  public disconnected: boolean = false;
  public destroyed: boolean = false;
  private connections: Map<string, MockDataConnection> = new Map();
  private static instances: Map<string, MockPeer> = new Map();

  constructor(id?: string) {
    super();
    this.id = id || `mock-peer-${Math.random().toString(36).substr(2, 9)}`;
    MockPeer.instances.set(this.id, this);
    
    // Simulate peer opening
    setTimeout(() => {
      this.emit('open', this.id);
    }, 0);
  }

  connect(peerId: string): MockDataConnection {
    const remotePeer = MockPeer.instances.get(peerId);
    if (!remotePeer) {
      throw new Error(`Peer ${peerId} not found`);
    }

    const localConn = new MockDataConnection(peerId);
    const remoteConn = new MockDataConnection(this.id);
    
    this.connections.set(peerId, localConn);
    remotePeer.connections.set(this.id, remoteConn);
    
    // Establish bidirectional connection
    localConn.connect(remoteConn);
    
    // Emit connection event on remote peer
    setTimeout(() => {
      remotePeer.emit('connection', remoteConn);
    }, 10);
    
    return localConn;
  }

  destroy() {
    this.destroyed = true;
    this.connections.forEach(conn => conn.close());
    this.connections.clear();
    MockPeer.instances.delete(this.id);
    this.emit('close');
  }

  reconnect() {
    this.disconnected = false;
    this.emit('open', this.id);
  }

  disconnect() {
    this.disconnected = true;
    this.emit('disconnected');
  }

  static clearAll() {
    MockPeer.instances.forEach(peer => peer.destroy());
    MockPeer.instances.clear();
  }

  static getInstance(id: string): MockPeer | undefined {
    return MockPeer.instances.get(id);
  }
}

export class MockP2PManager {
  private peerId: string;
  private connections: Map<string, MockDataConnection> = new Map();
  private messageHandlers: Map<MessageType, ((msg: P2PMessage, peerId: string) => void)[]> = new Map();
  private isHost: boolean;
  private sequenceNumber: number = 0;

  constructor(peerId?: string) {
    this.peerId = peerId || `mock-${Math.random().toString(36).substr(2, 9)}`;
    this.isHost = !peerId;
  }

  async initialize(peerId?: string): Promise<string> {
    if (peerId) {
      this.peerId = `client-${Math.random().toString(36).substr(2, 9)}`;
      this.isHost = false;
    }
    return this.peerId;
  }

  async connectToPeer(peerId: string): Promise<void> {
    const conn = new MockDataConnection(peerId);
    this.connections.set(peerId, conn);
    
    conn.on('data', (message: P2PMessage) => {
      const handlers = this.messageHandlers.get(message.type) || [];
      handlers.forEach(handler => handler(message, peerId));
    });
    
    // Simulate successful connection
    conn.open = true;
    conn.emit('open');
  }

  sendMessage(type: MessageType, data: any, targetPeerId?: string): void {
    const message: P2PMessage = {
      type,
      senderId: this.peerId,
      timestamp: Date.now(),
      data,
      sequence: this.sequenceNumber++
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

  broadcastMessage(type: MessageType, data: any, excludePeers: string[] = []): void {
    const message: P2PMessage = {
      type,
      senderId: this.peerId,
      timestamp: Date.now(),
      data,
      sequence: this.sequenceNumber++
    };

    this.connections.forEach((conn, peerId) => {
      if (conn.open && !excludePeers.includes(peerId)) {
        conn.send(message);
      }
    });
  }

  on(type: MessageType, handler: (msg: P2PMessage, peerId: string) => void): void {
    const handlers = this.messageHandlers.get(type) || [];
    handlers.push(handler);
    this.messageHandlers.set(type, handlers);
  }

  getPeerId(): string {
    return this.peerId;
  }

  getIsHost(): boolean {
    return this.isHost;
  }

  getConnections(): Map<string, MockDataConnection> {
    return this.connections;
  }

  simulateMessage(type: MessageType, data: any, fromPeer: string = 'remote-peer'): void {
    const message: P2PMessage = {
      type,
      senderId: fromPeer,
      timestamp: Date.now(),
      data
    };
    
    const handlers = this.messageHandlers.get(type) || [];
    handlers.forEach(handler => handler(message, fromPeer));
  }

  destroy(): void {
    this.connections.forEach(conn => conn.close());
    this.connections.clear();
    this.messageHandlers.clear();
  }
}
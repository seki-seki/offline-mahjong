import { useState, useEffect } from 'react';
import { useP2P } from '../p2p/useP2P';
import { MessageType } from '../p2p/types';

export function P2PConnection() {
  const p2p = useP2P();
  const [connectPeerId, setConnectPeerId] = useState('');
  const [message, setMessage] = useState('');
  const [receivedMessages, setReceivedMessages] = useState<string[]>([]);
  const [isInitializing, setIsInitializing] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);

  // Setup message handlers
  useEffect(() => {
    if (!p2p.isConnected) return;

    const handleGameMessage = (msg: any) => {
      setReceivedMessages(prev => [...prev, `${msg.senderId}: ${JSON.stringify(msg.data)}`]);
    };

    // Listen for various message types
    p2p.on(MessageType.GAME_STATE_UPDATE, handleGameMessage);
    p2p.on(MessageType.PLAYER_JOIN, (msg) => {
      setReceivedMessages(prev => [...prev, `Player joined: ${msg.data.name}`]);
    });
    p2p.on(MessageType.PLAYER_DISCONNECT, (msg) => {
      setReceivedMessages(prev => [...prev, `Player disconnected: ${msg.data.playerId}`]);
    });

    return () => {
      p2p.off(MessageType.GAME_STATE_UPDATE, handleGameMessage);
    };
  }, [p2p.isConnected]);

  const handleInitialize = async () => {
    setIsInitializing(true);
    try {
      await p2p.initialize();
    } catch (error) {
      console.error('Failed to initialize:', error);
    } finally {
      setIsInitializing(false);
    }
  };

  const handleJoinGame = async () => {
    if (!connectPeerId.trim()) return;
    
    setIsConnecting(true);
    try {
      await p2p.initialize();
      await p2p.connectToPeer(connectPeerId.trim());
    } catch (error) {
      console.error('Failed to join game:', error);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleConnect = async () => {
    if (!connectPeerId.trim()) return;
    
    setIsConnecting(true);
    try {
      await p2p.connectToPeer(connectPeerId.trim());
      setConnectPeerId('');
    } catch (error) {
      console.error('Failed to connect:', error);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleSendMessage = () => {
    if (!message.trim()) return;
    
    p2p.broadcastMessage(MessageType.GAME_STATE_UPDATE, { message });
    setReceivedMessages(prev => [...prev, `You: ${message}`]);
    setMessage('');
  };

  const copyPeerId = () => {
    navigator.clipboard.writeText(p2p.peerId);
  };

  if (!p2p.isConnected) {
    return (
      <div style={{ padding: '20px' }}>
        <h2>P2P Connection</h2>
        <div style={{ marginBottom: '20px' }}>
          <button 
            onClick={handleInitialize} 
            disabled={isInitializing}
            style={{ marginRight: '10px' }}
          >
            {isInitializing ? 'Initializing...' : 'Create New Game'}
          </button>
          
          <div style={{ marginTop: '10px' }}>
            <input
              type="text"
              placeholder="Enter host Peer ID to join"
              value={connectPeerId}
              onChange={(e) => setConnectPeerId(e.target.value)}
              style={{ marginRight: '10px', padding: '5px' }}
              data-testid="connect-peer-id"
            />
            <button 
              onClick={handleJoinGame}
              disabled={!connectPeerId.trim() || isConnecting}
              data-testid="connect-button"
            >
              {isConnecting ? 'Joining...' : 'Join Game'}
            </button>
          </div>
        </div>
        
        {p2p.error && (
          <div style={{ color: 'red', marginTop: '10px' }}>
            Error: {p2p.error}
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={{ padding: '20px' }}>
      <h2>P2P Connection Status</h2>
      
      <div style={{ marginBottom: '20px' }}>
        <div>
          <strong>Your Peer ID:</strong> <span data-testid="peer-id">{p2p.peerId}</span>
          <button onClick={copyPeerId} style={{ marginLeft: '10px' }}>
            Copy
          </button>
        </div>
        <div><strong>Role:</strong> {p2p.isHost ? 'Host' : 'Client'}</div>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <h3>Connected Players <span data-testid="connected-players">{p2p.players.length + 1} / 4</span></h3>
        <ul data-testid="player-list">
          <li>You (Position: {p2p.isHost ? 0 : p2p.players.length})</li>
          {p2p.players.map(player => (
            <li key={player.id}>
              {player.name} - Position: {player.position}
              {player.isConnected ? ' ✓' : ' ✗'}
            </li>
          ))}
        </ul>
      </div>

      {p2p.players.length < 3 && (
        <div style={{ marginBottom: '20px' }}>
          <h3>Add Player</h3>
          <input
            type="text"
            placeholder="Enter Peer ID"
            value={connectPeerId}
            onChange={(e) => setConnectPeerId(e.target.value)}
            style={{ marginRight: '10px', padding: '5px' }}
          />
          <button 
            onClick={handleConnect}
            disabled={!connectPeerId.trim() || isConnecting}
          >
            {isConnecting ? 'Connecting...' : 'Connect'}
          </button>
        </div>
      )}

      <div style={{ marginBottom: '20px' }}>
        <h3>Send Test Message</h3>
        <input
          type="text"
          placeholder="Enter message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
          style={{ marginRight: '10px', padding: '5px' }}
          data-testid="test-message-input"
        />
        <button onClick={handleSendMessage} data-testid="send-test-message">
          Broadcast
        </button>
      </div>

      <div>
        <h3>Messages</h3>
        <div 
          data-testid="received-messages"
          style={{ 
            border: '1px solid #ccc', 
            padding: '10px', 
            height: '200px', 
            overflowY: 'auto',
            backgroundColor: '#f5f5f5'
          }}
        >
          {receivedMessages.map((msg, index) => (
            <div key={index}>{msg}</div>
          ))}
        </div>
      </div>

      {p2p.error && (
        <div style={{ color: 'red', marginTop: '10px' }}>
          Error: {p2p.error}
        </div>
      )}
    </div>
  );
}
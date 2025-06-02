import React, { useState, useEffect, useCallback } from 'react';
import { useP2P } from '../../p2p/useP2P';
import { MessageType, P2PMessage } from '../../p2p/types';
import './GameLobby.css';

interface GameLobbyProps {
  onGameStart: () => void;
}

export const GameLobby: React.FC<GameLobbyProps> = ({ onGameStart }) => {
  const { p2p, isHost, connectionStatus, players, sendMessage, createGame, joinGame, peerId } = useP2P();
  const [roomCode, setRoomCode] = useState<string>('');
  const [inputRoomCode, setInputRoomCode] = useState<string>('');
  const [isCreatingRoom, setIsCreatingRoom] = useState(false);
  const [isJoiningRoom, setIsJoiningRoom] = useState(false);
  const [gameMode, setGameMode] = useState<'4-player' | '3-player'>('4-player');
  const [error, setError] = useState<string>('');

  // Generate room code from peer ID
  const generateRoomCode = (peerId: string): string => {
    // Simple hash function to create a short code
    let hash = 0;
    for (let i = 0; i < peerId.length; i++) {
      const char = peerId.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    const code = Math.abs(hash).toString(36).substring(0, 6).toUpperCase();
    return code.padEnd(6, '0');
  };

  // Store room code mapping
  useEffect(() => {
    if (isHost && peerId) {
      const code = generateRoomCode(peerId);
      setRoomCode(code);
      // Store mapping in localStorage for persistence
      localStorage.setItem(`roomCode:${code}`, peerId);
    }
  }, [isHost, peerId]);

  // Handle room creation
  const createRoom = useCallback(async () => {
    setIsCreatingRoom(true);
    setError('');
    try {
      await createGame();
    } catch (err) {
      setError('Failed to create room');
      console.error(err);
    }
    setIsCreatingRoom(false);
  }, [createGame]);

  // Handle room joining
  const joinRoom = useCallback(async () => {
    if (!inputRoomCode.trim()) {
      setError('Please enter a room code');
      return;
    }

    setIsJoiningRoom(true);
    setError('');
    
    try {
      // Try to get peer ID from localStorage first
      const storedPeerId = localStorage.getItem(`roomCode:${inputRoomCode.toUpperCase()}`);
      
      if (storedPeerId) {
        await joinGame(storedPeerId);
      } else {
        // If not found, try using the code as peer ID directly
        // This is a fallback for backward compatibility
        await joinGame(inputRoomCode);
      }
    } catch (err) {
      setError('Failed to join room. Please check the room code.');
      console.error(err);
    }
    setIsJoiningRoom(false);
  }, [joinGame, inputRoomCode]);

  // Handle ready toggle
  const toggleReady = useCallback(() => {
    const currentPlayer = players.find(p => p.id === peerId);
    if (currentPlayer && p2p) {
      const newReadyState = !currentPlayer.isReady;
      p2p.updatePlayerReady(peerId, newReadyState);
      sendMessage(MessageType.PLAYER_READY, {
        playerId: peerId,
        isReady: newReadyState
      });
    }
  }, [players, p2p, sendMessage, peerId]);

  // Check if all players are ready
  const allPlayersReady = players.length >= (gameMode === '3-player' ? 3 : 4) && 
                         players.every(p => p.isReady);

  // Handle game start (host only)
  const startGame = useCallback(() => {
    if (isHost && allPlayersReady) {
      sendMessage(MessageType.GAME_STATE_UPDATE, {
        gameStarted: true,
        gameMode
      });
      onGameStart();
    }
  }, [isHost, allPlayersReady, gameMode, sendMessage, onGameStart]);

  // Listen for game start message (non-host players)
  useEffect(() => {
    const handleMessage = (message: P2PMessage) => {
      if (message.type === MessageType.GAME_STATE_UPDATE && message.data.gameStarted) {
        onGameStart();
      }
    };

    p2p?.on(MessageType.GAME_STATE_UPDATE, handleMessage);
    return () => p2p?.off(MessageType.GAME_STATE_UPDATE, handleMessage);
  }, [p2p, onGameStart]);

  // Copy room code to clipboard
  const copyRoomCode = () => {
    navigator.clipboard.writeText(roomCode);
  };

  // Render based on connection state
  if (!p2p) {
    return <div className="game-lobby loading">Initializing...</div>;
  }

  if (!isHost && !connectionStatus) {
    // Not connected - show create/join options
    return (
      <div className="game-lobby">
        <h1>オフライン麻雀</h1>
        <div className="lobby-options">
          <button 
            className="create-room-btn"
            onClick={createRoom}
            disabled={isCreatingRoom}
          >
            {isCreatingRoom ? '作成中...' : 'ルームを作成'}
          </button>
          
          <div className="join-room-section">
            <input
              type="text"
              placeholder="ルームコードを入力"
              value={inputRoomCode}
              onChange={(e) => setInputRoomCode(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && joinRoom()}
              maxLength={10}
            />
            <button 
              className="join-room-btn"
              onClick={joinRoom}
              disabled={isJoiningRoom || !inputRoomCode.trim()}
            >
              {isJoiningRoom ? '接続中...' : '参加'}
            </button>
          </div>
          
          {error && <div className="error-message">{error}</div>}
        </div>
      </div>
    );
  }

  // Connected - show lobby
  return (
    <div className="game-lobby connected">
      <h1>ゲームロビー</h1>
      
      {isHost && (
        <div className="room-info">
          <h2>ルームコード: {roomCode}</h2>
          <button className="copy-btn" onClick={copyRoomCode}>コピー</button>
        </div>
      )}

      <div className="player-list">
        <h3>プレイヤー ({players.length}/{gameMode === '3-player' ? 3 : 4})</h3>
        {players.map((player, index) => (
          <div key={player.id} className={`player-item ${player.isReady ? 'ready' : ''}`}>
            <span className="player-name">
              {player.name || `プレイヤー ${index + 1}`}
              {player.id === peerId && ' (あなた)'}
              {player.isHost && ' 👑'}
            </span>
            <span className="player-status">
              {player.isReady ? '準備完了' : '準備中'}
            </span>
          </div>
        ))}
      </div>

      {isHost && (
        <div className="game-settings">
          <h3>ゲーム設定</h3>
          <div className="game-mode-selector">
            <label>
              <input
                type="radio"
                value="4-player"
                checked={gameMode === '4-player'}
                onChange={(e) => setGameMode(e.target.value as '4-player')}
                disabled={players.length > 3}
              />
              4人打ち
            </label>
            <label>
              <input
                type="radio"
                value="3-player"
                checked={gameMode === '3-player'}
                onChange={(e) => setGameMode(e.target.value as '3-player')}
                disabled={players.length > 3}
              />
              3人打ち
            </label>
          </div>
        </div>
      )}

      <div className="lobby-actions">
        <button 
          className={`ready-btn ${players.find(p => p.id === peerId)?.isReady ? 'ready' : ''}`}
          onClick={toggleReady}
        >
          {players.find(p => p.id === peerId)?.isReady ? '準備解除' : '準備完了'}
        </button>

        {isHost && (
          <button 
            className="start-game-btn"
            onClick={startGame}
            disabled={!allPlayersReady}
          >
            {allPlayersReady ? 'ゲーム開始' : `準備待ち (${players.filter(p => p.isReady).length}/${players.length})`}
          </button>
        )}
      </div>

      {!isHost && allPlayersReady && (
        <div className="waiting-message">ホストがゲームを開始するのを待っています...</div>
      )}
    </div>
  );
};
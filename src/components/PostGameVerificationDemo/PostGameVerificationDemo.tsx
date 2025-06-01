import React, { useState } from 'react';
import { PostGameVerificationManager } from '../../game/PostGameVerificationManager';
import PostGameVerification from '../PostGameVerification/PostGameVerification';
import { 
  GameState,
  PlayerID,
  ActionType,
  SpecificGameAction
} from '../../types/game';
import { PlayerPosition } from '../../types/player';
import { PlayerKeys } from '../../types';
import './PostGameVerificationDemo.css';

const PostGameVerificationDemo: React.FC = () => {
  const [showVerification, setShowVerification] = useState(false);
  const [postGameVerificationManager, setPostGameVerificationManager] = useState<PostGameVerificationManager | null>(null);
  const [currentPlayerId] = useState<PlayerID>('player-1');
  const [demoState, setDemoState] = useState<'idle' | 'gameEnded'>('idle');

  const startVerificationDemo = async () => {
    // Create mock game state
    const mockGameState: GameState = {
      id: 'demo-game',
      phase: 'finished',
      round: 1,
      honba: 0,
      riichiBets: 0,
      currentPlayerIndex: 0,
      currentTurnStartTime: Date.now(),
      players: [
        {
          id: 'player-1',
          name: 'Player 1',
          position: 'east' as PlayerPosition,
          hand: [],
          discards: [],
          melds: [],
          riichi: false,
          points: 25000,
          connectionId: 'conn-1'
        },
        {
          id: 'player-2',
          name: 'Player 2',
          position: 'south' as PlayerPosition,
          hand: [],
          discards: [],
          melds: [],
          riichi: false,
          points: 25000,
          connectionId: 'conn-2'
        },
        {
          id: 'player-3',
          name: 'Player 3',
          position: 'west' as PlayerPosition,
          hand: [],
          discards: [],
          melds: [],
          riichi: false,
          points: 25000,
          connectionId: 'conn-3'
        },
        {
          id: 'player-4',
          name: 'Player 4',
          position: 'north' as PlayerPosition,
          hand: [],
          discards: [],
          melds: [],
          riichi: false,
          points: 25000,
          connectionId: 'conn-4'
        }
      ],
      wall: [],
      dora: [],
      uraDora: [],
      deadWall: [],
      pendingActions: [],
      endCondition: 'draw',
      turnTimeLimit: 30000
    };

    // Create mock player keys
    const mockPlayerKeys = new Map<PlayerID, PlayerKeys>();
    
    // For demo, we'll use mock keys
    for (const player of mockGameState.players) {
      // Store mock keys in localStorage for the demo
      const mockPrivateKey = { kty: 'RSA', key_ops: ['decrypt'] };
      const mockPublicKey = { kty: 'RSA', key_ops: ['encrypt'] };
      
      localStorage.setItem(
        `game-demo-game-player-${player.id}-privateKey`,
        btoa(JSON.stringify(mockPrivateKey))
      );
      localStorage.setItem(
        `game-demo-game-player-${player.id}-publicKey`,
        btoa(JSON.stringify(mockPublicKey))
      );
      
      // Note: In real implementation, these would be actual CryptoKey objects
      mockPlayerKeys.set(player.id, {
        playerId: player.id,
        publicKey: {} as CryptoKey,
        privateKey: {} as JsonWebKey
      });
    }

    // Create mock verification data
    const mockActions: SpecificGameAction[] = [
      {
        id: 'action-1',
        type: ActionType.GAME_START,
        playerId: 'system',
        timestamp: Date.now() - 300000,
        data: {
          players: mockGameState.players.map(p => p.id)
        },
        signature: 'mock-signature-1'
      },
      {
        id: 'action-2',
        type: ActionType.DRAW,
        playerId: 'player-1',
        timestamp: Date.now() - 250000,
        data: {
          tileIndex: 0,
          encryptedTile: 'encrypted-tile-data'
        },
        signature: 'mock-signature-2'
      },
      {
        id: 'action-3',
        type: ActionType.DISCARD,
        playerId: 'player-1',
        timestamp: Date.now() - 240000,
        data: {
          tileIndex: 0,
          tile: '1m'
        },
        signature: 'mock-signature-3'
      }
    ];

    const mockVerificationData = {
      actions: mockActions,
      players: mockGameState.players.map(p => ({
        playerId: p.id,
        publicKey: 'mock-public-key'
      })),
      initialDeck: Array(136).fill(0).map((_, i) => `encrypted-tile-${i}`)
    };

    // Create encrypted deck
    const mockEncryptedDeck = Array(136).fill(0).map((_, i) => `encrypted-tile-${i}`);

    // Initialize verification manager
    const verificationManager = new PostGameVerificationManager('demo-game');
    verificationManager.initialize(
      mockVerificationData,
      mockGameState,
      mockEncryptedDeck,
      mockPlayerKeys
    );

    setPostGameVerificationManager(verificationManager);
    setDemoState('gameEnded');
    setShowVerification(true);
  };

  const resetDemo = () => {
    setShowVerification(false);
    setPostGameVerificationManager(null);
    setDemoState('idle');
    
    // Clean up localStorage
    for (let i = 1; i <= 4; i++) {
      localStorage.removeItem(`game-demo-game-player-player-${i}-privateKey`);
      localStorage.removeItem(`game-demo-game-player-player-${i}-publicKey`);
    }
  };

  return (
    <div className="post-game-verification-demo">
      <h2>Post-Game Verification Demo</h2>
      
      {demoState === 'idle' && (
        <div className="demo-intro">
          <p>
            This demo shows the post-game verification system where all players 
            reveal their private keys after the game ends to verify the game's integrity.
          </p>
          <button onClick={startVerificationDemo} className="start-demo-button">
            Start Verification Demo
          </button>
        </div>
      )}

      {demoState === 'gameEnded' && (
        <div className="demo-status">
          <p>Game has ended. Post-game verification is now available.</p>
          <button onClick={resetDemo} className="reset-button">
            Reset Demo
          </button>
        </div>
      )}

      {showVerification && postGameVerificationManager && (
        <PostGameVerification
          gameId="demo-game"
          currentPlayerId={currentPlayerId}
          onClose={() => setShowVerification(false)}
          verificationManager={postGameVerificationManager}
        />
      )}
    </div>
  );
};

export default PostGameVerificationDemo;
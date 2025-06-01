import { describe, it, expect } from 'vitest';
import { GameSession } from '../GameSession';

describe('GameSession', () => {
  it('should add players and generate key pairs', async () => {
    const session = new GameSession();
    
    const player1 = await session.addPlayer('p1', 'Alice');
    await session.addPlayer('p2', 'Bob');
    
    expect(player1.keyPair).toBeDefined();
    expect(player1.exportedPublicKey).toBeDefined();
    expect(session.getPlayers()).toHaveLength(2);
  });

  it('should not allow more than 4 players', async () => {
    const session = new GameSession();
    
    await session.addPlayer('p1', 'Alice');
    await session.addPlayer('p2', 'Bob');
    await session.addPlayer('p3', 'Charlie');
    await session.addPlayer('p4', 'David');
    
    await expect(session.addPlayer('p5', 'Eve')).rejects.toThrow('Game session is full');
  });

  it('should initialize and encrypt deck with 4 players', async () => {
    const session = new GameSession();
    
    // Add 4 players
    await session.addPlayer('p1', 'Alice');
    await session.addPlayer('p2', 'Bob');
    await session.addPlayer('p3', 'Charlie');
    await session.addPlayer('p4', 'David');
    
    // Initialize deck
    const deck = await session.initializeDeck();
    
    expect(deck).toHaveLength(136); // Full mahjong tile set
    expect(deck[0].encryptedData).toHaveLength(4); // 4 layers of encryption
  });

  it('should shuffle deck for each player', async () => {
    const session = new GameSession();
    
    // Add 4 players
    await session.addPlayer('p1', 'Alice');
    await session.addPlayer('p2', 'Bob');
    await session.addPlayer('p3', 'Charlie');
    await session.addPlayer('p4', 'David');
    
    // Initialize deck
    await session.initializeDeck();
    const originalDeck = [...session.getEncryptedDeck()];
    
    // Player 2 shuffles
    await session.playerShuffleDeck('p2');
    const shuffledDeck = session.getEncryptedDeck();
    
    // Check that deck is shuffled (very unlikely to be in same order)
    let differentOrder = false;
    for (let i = 0; i < originalDeck.length; i++) {
      if (originalDeck[i].id !== shuffledDeck[i].id) {
        differentOrder = true;
        break;
      }
    }
    
    expect(differentOrder).toBe(true);
    expect(shuffledDeck).toHaveLength(136);
  });

  it('should correctly distribute initial tiles', async () => {
    const session = new GameSession();
    
    // Add 4 players
    await session.addPlayer('p1', 'East');
    await session.addPlayer('p2', 'South');
    await session.addPlayer('p3', 'West');
    await session.addPlayer('p4', 'North');
    
    // Get hand indices
    const eastHand = session.getPlayerHandIndices(0);
    const southHand = session.getPlayerHandIndices(1);
    const westHand = session.getPlayerHandIndices(2);
    const northHand = session.getPlayerHandIndices(3);
    
    expect(eastHand).toHaveLength(14); // East gets 14 tiles
    expect(southHand).toHaveLength(13);
    expect(westHand).toHaveLength(13);
    expect(northHand).toHaveLength(13);
    
    // Check no overlap
    const allIndices = [...eastHand, ...southHand, ...westHand, ...northHand];
    const uniqueIndices = new Set(allIndices);
    expect(uniqueIndices.size).toBe(53); // Total initial tiles distributed
  });

  it('should decrypt tiles correctly', async () => {
    const session = new GameSession();
    
    // Add 4 players
    await session.addPlayer('p1', 'Alice');
    await session.addPlayer('p2', 'Bob');
    await session.addPlayer('p3', 'Charlie');
    await session.addPlayer('p4', 'David');
    
    // Initialize deck
    await session.initializeDeck();
    
    // Try to decrypt first tile using helper method (in real game, would need all players' cooperation)
    const decryptedTile = await session.decryptTileWithAllKeys(0);
    
    // Check it's a valid tile
    const validTilePattern = /^([1-9][mps]|[ESWNBGR])$/;
    expect(decryptedTile).toMatch(validTilePattern);
  });
});
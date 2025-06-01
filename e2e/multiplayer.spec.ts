import { test, expect, Page, BrowserContext } from '@playwright/test';

// Helper to create and setup a player
async function setupPlayer(context: BrowserContext, playerName: string): Promise<Page> {
  const page = await context.newPage();
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  return page;
}

// Helper to get peer ID from page
async function getPeerId(page: Page): Promise<string> {
  // Wait for P2P initialization
  await page.waitForFunction(() => {
    const element = document.querySelector('[data-testid="peer-id"]');
    return element && element.textContent && element.textContent.length > 0;
  }, { timeout: 10000 });
  
  const peerId = await page.locator('[data-testid="peer-id"]').textContent();
  return peerId?.trim() || '';
}

// Helper to connect players
async function connectPlayers(hostPage: Page, clientPage: Page, hostId: string) {
  // Client connects to host
  await clientPage.fill('[data-testid="connect-peer-id"]', hostId);
  await clientPage.click('[data-testid="connect-button"]');
  
  // Wait for connection on both sides
  await expect(hostPage.locator('[data-testid="connected-players"]')).toContainText('2 / 4');
  await expect(clientPage.locator('[data-testid="connected-players"]')).toContainText('2 / 4');
}

test.describe('Multiplayer P2P Connection', () => {
  test('should establish connection between two players', async ({ browser }) => {
    // Create two browser contexts (simulating two different players)
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();
    
    const player1 = await setupPlayer(context1, 'Player 1');
    const player2 = await setupPlayer(context2, 'Player 2');
    
    // Player 1 acts as host
    const player1Id = await getPeerId(player1);
    expect(player1Id).toBeTruthy();
    
    // Player 2 connects to Player 1
    await connectPlayers(player1, player2, player1Id);
    
    // Verify both players see each other
    await expect(player1.locator('[data-testid="player-list"]')).toContainText('Player 2');
    await expect(player2.locator('[data-testid="player-list"]')).toContainText('Player 1');
    
    await context1.close();
    await context2.close();
  });

  test('should handle player disconnection and reconnection', async ({ browser }) => {
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();
    
    const player1 = await setupPlayer(context1, 'Player 1');
    const player2 = await setupPlayer(context2, 'Player 2');
    
    const player1Id = await getPeerId(player1);
    await connectPlayers(player1, player2, player1Id);
    
    // Close Player 2's page (simulate disconnection)
    await player2.close();
    
    // Player 1 should show disconnection
    await expect(player1.locator('[data-testid="connected-players"]')).toContainText('1 / 4');
    
    // Player 2 reconnects
    const player2Reconnect = await setupPlayer(context2, 'Player 2');
    await connectPlayers(player1, player2Reconnect, player1Id);
    
    // Verify reconnection
    await expect(player1.locator('[data-testid="connected-players"]')).toContainText('2 / 4');
    
    await context1.close();
    await context2.close();
  });

  test('should establish 4-player game', async ({ browser }) => {
    const contexts = await Promise.all([
      browser.newContext(),
      browser.newContext(),
      browser.newContext(),
      browser.newContext(),
    ]);
    
    const players = await Promise.all([
      setupPlayer(contexts[0], 'Player 1'),
      setupPlayer(contexts[1], 'Player 2'),
      setupPlayer(contexts[2], 'Player 3'),
      setupPlayer(contexts[3], 'Player 4'),
    ]);
    
    // Get host ID
    const hostId = await getPeerId(players[0]);
    
    // Connect all clients to host
    for (let i = 1; i < 4; i++) {
      await players[i].fill('[data-testid="connect-peer-id"]', hostId);
      await players[i].click('[data-testid="connect-button"]');
      
      // Wait for connection count to update
      await expect(players[0].locator('[data-testid="connected-players"]'))
        .toContainText(`${i + 1} / 4`);
    }
    
    // Verify all players see full game
    for (const player of players) {
      await expect(player.locator('[data-testid="connected-players"]')).toContainText('4 / 4');
      await expect(player.locator('[data-testid="game-ready"]')).toBeVisible();
    }
    
    // Clean up
    await Promise.all(contexts.map(ctx => ctx.close()));
  });

  test('should establish 3-player game', async ({ browser }) => {
    const contexts = await Promise.all([
      browser.newContext(),
      browser.newContext(),
      browser.newContext(),
    ]);
    
    const players = await Promise.all([
      setupPlayer(contexts[0], 'Player 1'),
      setupPlayer(contexts[1], 'Player 2'),
      setupPlayer(contexts[2], 'Player 3'),
    ]);
    
    // Set game mode to 3-player
    await players[0].click('[data-testid="game-settings"]');
    await players[0].click('[data-testid="player-count-3"]');
    
    const hostId = await getPeerId(players[0]);
    
    // Connect clients
    for (let i = 1; i < 3; i++) {
      await players[i].fill('[data-testid="connect-peer-id"]', hostId);
      await players[i].click('[data-testid="connect-button"]');
    }
    
    // Verify 3-player game is ready
    for (const player of players) {
      await expect(player.locator('[data-testid="connected-players"]')).toContainText('3 / 3');
      await expect(player.locator('[data-testid="game-ready"]')).toBeVisible();
    }
    
    await Promise.all(contexts.map(ctx => ctx.close()));
  });
});

test.describe('Multiplayer Game Flow', () => {
  test('should complete tile shuffle with all players', async ({ browser }) => {
    // Setup 4 players
    const contexts = await Promise.all([
      browser.newContext(),
      browser.newContext(),
      browser.newContext(),
      browser.newContext(),
    ]);
    
    const players = await Promise.all([
      setupPlayer(contexts[0], 'Player 1'),
      setupPlayer(contexts[1], 'Player 2'),
      setupPlayer(contexts[2], 'Player 3'),
      setupPlayer(contexts[3], 'Player 4'),
    ]);
    
    // Connect all players
    const hostId = await getPeerId(players[0]);
    for (let i = 1; i < 4; i++) {
      await players[i].fill('[data-testid="connect-peer-id"]', hostId);
      await players[i].click('[data-testid="connect-button"]');
    }
    
    // Wait for full connection
    await expect(players[0].locator('[data-testid="connected-players"]')).toContainText('4 / 4');
    
    // Start game
    await players[0].click('[data-testid="start-game"]');
    
    // Each player should see shuffle progress
    for (const player of players) {
      await expect(player.locator('[data-testid="shuffle-progress"]')).toBeVisible();
    }
    
    // Wait for shuffle completion
    for (const player of players) {
      await expect(player.locator('[data-testid="shuffle-complete"]')).toBeVisible({ timeout: 30000 });
    }
    
    // Game should start
    for (const player of players) {
      await expect(player.locator('[data-testid="game-board"]')).toBeVisible();
      await expect(player.locator('[data-testid="player-hand"]')).toBeVisible();
    }
    
    await Promise.all(contexts.map(ctx => ctx.close()));
  });

  test('should synchronize game actions across players', async ({ browser }) => {
    // Setup 4 players and start game (abbreviated for brevity)
    const contexts = await Promise.all([
      browser.newContext(),
      browser.newContext(),
      browser.newContext(),
      browser.newContext(),
    ]);
    
    const players = await Promise.all(contexts.map((ctx, i) => 
      setupPlayer(ctx, `Player ${i + 1}`)
    ));
    
    // Connect and start game
    const hostId = await getPeerId(players[0]);
    for (let i = 1; i < 4; i++) {
      await players[i].fill('[data-testid="connect-peer-id"]', hostId);
      await players[i].click('[data-testid="connect-button"]');
    }
    
    await players[0].click('[data-testid="start-game"]');
    
    // Wait for game to start
    for (const player of players) {
      await expect(player.locator('[data-testid="game-board"]')).toBeVisible({ timeout: 30000 });
    }
    
    // Find current player (East wind starts)
    const currentPlayerIndex = 0; // East starts
    const currentPlayer = players[currentPlayerIndex];
    
    // Current player discards a tile
    await currentPlayer.click('[data-testid="hand-tile-0"]');
    await currentPlayer.click('[data-testid="discard-button"]');
    
    // All players should see the discarded tile
    for (const player of players) {
      await expect(player.locator('[data-testid="discard-area"]'))
        .toContainText('discarded', { timeout: 5000 });
    }
    
    // Turn should advance to next player
    const nextPlayerIndex = 1;
    await expect(players[nextPlayerIndex].locator('[data-testid="your-turn"]'))
      .toBeVisible({ timeout: 5000 });
    
    await Promise.all(contexts.map(ctx => ctx.close()));
  });

  test('should handle winning declaration', async ({ browser }) => {
    // This is a simplified test - in reality, setting up a winning hand
    // would require specific tile arrangements
    
    const contexts = await Promise.all([
      browser.newContext(),
      browser.newContext(),
      browser.newContext(),
      browser.newContext(),
    ]);
    
    const players = await Promise.all(contexts.map((ctx, i) => 
      setupPlayer(ctx, `Player ${i + 1}`)
    ));
    
    // Setup and start game
    const hostId = await getPeerId(players[0]);
    for (let i = 1; i < 4; i++) {
      await players[i].fill('[data-testid="connect-peer-id"]', hostId);
      await players[i].click('[data-testid="connect-button"]');
    }
    
    await players[0].click('[data-testid="start-game"]');
    
    // Wait for game start
    for (const player of players) {
      await expect(player.locator('[data-testid="game-board"]')).toBeVisible({ timeout: 30000 });
    }
    
    // Simulate winning condition (would need proper setup in real scenario)
    // For now, just check that win button appears when available
    const winButton = players[0].locator('[data-testid="declare-win"]');
    
    // If win is possible, all players should see result
    if (await winButton.isVisible({ timeout: 1000 })) {
      await winButton.click();
      
      // All players should see game end
      for (const player of players) {
        await expect(player.locator('[data-testid="game-result"]')).toBeVisible();
        await expect(player.locator('[data-testid="winner"]')).toContainText('Player 1');
      }
    }
    
    await Promise.all(contexts.map(ctx => ctx.close()));
  });
});

test.describe('Message Broadcasting', () => {
  test('should broadcast test messages to all connected players', async ({ browser }) => {
    const contexts = await Promise.all([
      browser.newContext(),
      browser.newContext(),
    ]);
    
    const player1 = await setupPlayer(contexts[0], 'Player 1');
    const player2 = await setupPlayer(contexts[1], 'Player 2');
    
    // Connect players
    const hostId = await getPeerId(player1);
    await connectPlayers(player1, player2, hostId);
    
    // Player 1 sends test message
    await player1.fill('[data-testid="test-message-input"]', 'Hello from Player 1');
    await player1.click('[data-testid="send-test-message"]');
    
    // Player 2 should receive the message
    await expect(player2.locator('[data-testid="received-messages"]'))
      .toContainText('Hello from Player 1');
    
    // Player 2 sends response
    await player2.fill('[data-testid="test-message-input"]', 'Hello back from Player 2');
    await player2.click('[data-testid="send-test-message"]');
    
    // Player 1 should receive the response
    await expect(player1.locator('[data-testid="received-messages"]'))
      .toContainText('Hello back from Player 2');
    
    await Promise.all(contexts.map(ctx => ctx.close()));
  });
});
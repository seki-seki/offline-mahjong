import React, { useState } from 'react';
import { createPlayer, performFullShuffle, ShuffleManager } from '../crypto';
import { generateFullTileSet } from '../game/tiles';
import { PlayerKeys, EncryptedDeck } from '../types';

export const ShuffleDemo: React.FC = () => {
  const [players, setPlayers] = useState<PlayerKeys[]>([]);
  const [shuffleManager, setShuffleManager] = useState<ShuffleManager | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [finalDeck, setFinalDeck] = useState<EncryptedDeck | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const initializePlayers = () => {
    setIsProcessing(true);
    const newPlayers = [
      createPlayer('Player1'),
      createPlayer('Player2'),
      createPlayer('Player3'),
      createPlayer('Player4')
    ];
    setPlayers(newPlayers);
    
    const tiles = generateFullTileSet();
    const manager = new ShuffleManager(newPlayers);
    manager.initializeDeck(tiles);
    setShuffleManager(manager);
    setCurrentStep(0);
    setFinalDeck(null);
    setIsProcessing(false);
  };

  const performNextShuffle = () => {
    if (!shuffleManager || shuffleManager.isShuffleComplete()) return;
    
    setIsProcessing(true);
    const currentPlayer = shuffleManager.getCurrentPlayer();
    console.log(`${currentPlayer.playerId} is shuffling and encrypting...`);
    
    const updatedDeck = shuffleManager.performCurrentPlayerShuffle();
    setCurrentStep(currentStep + 1);
    
    if (shuffleManager.isShuffleComplete()) {
      setFinalDeck(updatedDeck);
      console.log('Shuffle complete!', updatedDeck);
    }
    setIsProcessing(false);
  };

  const performFullShuffleDemo = () => {
    setIsProcessing(true);
    const newPlayers = [
      createPlayer('Player1'),
      createPlayer('Player2'),
      createPlayer('Player3'),
      createPlayer('Player4')
    ];
    setPlayers(newPlayers);
    
    const deck = performFullShuffle(newPlayers);
    setFinalDeck(deck);
    setCurrentStep(4);
    setIsProcessing(false);
  };

  return (
    <div style={{ padding: '20px' }}>
      <h2>暗号シャッフルシステムデモ</h2>
      
      <div style={{ marginBottom: '20px' }}>
        <button onClick={initializePlayers} disabled={isProcessing}>
          プレイヤーを初期化
        </button>
        {' '}
        <button onClick={performFullShuffleDemo} disabled={isProcessing}>
          一括シャッフル実行
        </button>
      </div>

      {players.length > 0 && (
        <div>
          <h3>プレイヤー情報</h3>
          <ul>
            {players.map((player, index) => (
              <li key={player.playerId}>
                {player.playerId}: 公開鍵生成済み
                {currentStep > index && ' ✓ シャッフル完了'}
              </li>
            ))}
          </ul>
        </div>
      )}

      {shuffleManager && !finalDeck && (
        <div style={{ marginTop: '20px' }}>
          <h3>シャッフル進行状況</h3>
          <p>現在のステップ: {currentStep + 1}/4</p>
          <p>次のプレイヤー: {shuffleManager.getCurrentPlayer().playerId}</p>
          <button onClick={performNextShuffle} disabled={isProcessing || shuffleManager.isShuffleComplete()}>
            次のシャッフルを実行
          </button>
        </div>
      )}

      {finalDeck && (
        <div style={{ marginTop: '20px' }}>
          <h3>シャッフル完了</h3>
          <p>総牌数: {finalDeck.tiles.length}</p>
          <p>暗号化レイヤー数: {finalDeck.encryptionOrder.length}</p>
          <p>シャッフル履歴: {finalDeck.shuffleHistory.length}回</p>
          
          <h4>暗号化順序:</h4>
          <ol>
            {finalDeck.encryptionOrder.map((playerId, index) => (
              <li key={index}>{playerId}</li>
            ))}
          </ol>
          
          <h4>シャッフル履歴:</h4>
          <ul>
            {finalDeck.shuffleHistory.map((record, index) => (
              <li key={index}>
                {record.playerId} - {new Date(record.timestamp).toLocaleTimeString()}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};
import React, { useState, useEffect } from 'react';
import { 
  PostGameVerificationState, 
  KeyDisclosureRequest,
  PlayerID 
} from '../../types/game';
import { PostGameVerificationManager } from '../../game/PostGameVerificationManager';
import './PostGameVerification.css';

interface PostGameVerificationProps {
  gameId: string;
  currentPlayerId: PlayerID;
  onClose: () => void;
  verificationManager: PostGameVerificationManager;
}

const PostGameVerification: React.FC<PostGameVerificationProps> = ({
  gameId,
  currentPlayerId,
  onClose,
  verificationManager
}) => {
  const [verificationState, setVerificationState] = useState<PostGameVerificationState>(
    verificationManager.getState()
  );
  const [hasSubmittedKey, setHasSubmittedKey] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const handleStateChange = (newState: PostGameVerificationState) => {
      setVerificationState(newState);
    };

    verificationManager.on('state-changed', handleStateChange);
    
    return () => {
      verificationManager.off('state-changed', handleStateChange);
    };
  }, [verificationManager]);

  const handleSubmitKey = async () => {
    if (hasSubmittedKey || isSubmitting) return;
    
    setIsSubmitting(true);
    
    try {
      // In a real implementation, this would get the actual private key from secure storage
      const privateKey = localStorage.getItem(`game-${gameId}-player-${currentPlayerId}-privateKey`);
      const publicKey = localStorage.getItem(`game-${gameId}-player-${currentPlayerId}-publicKey`);
      
      if (!privateKey || !publicKey) {
        throw new Error('Keys not found in storage');
      }

      const request: KeyDisclosureRequest = {
        gameId,
        playerId: currentPlayerId,
        publicKey,
        privateKey,
        timestamp: Date.now(),
        signature: '' // Would be properly signed in real implementation
      };

      await verificationManager.submitKeyDisclosure(request);
      setHasSubmittedKey(true);
    } catch (error) {
      console.error('Failed to submit key:', error);
      alert('Failed to submit key for verification');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderKeyCollection = () => {
    const hasCurrentPlayerSubmitted = verificationState.collectedKeys[currentPlayerId] !== undefined;

    return (
      <div className="key-collection">
        <h3>Key Disclosure Phase</h3>
        <p>{verificationState.currentStep}</p>
        
        <div className="key-status">
          {hasCurrentPlayerSubmitted || hasSubmittedKey ? (
            <div className="key-submitted">
              ✓ Your key has been submitted
            </div>
          ) : (
            <div className="key-pending">
              <p>Please submit your private key to enable game verification</p>
              <button 
                onClick={handleSubmitKey}
                disabled={isSubmitting}
                className="submit-key-button"
              >
                {isSubmitting ? 'Submitting...' : 'Submit My Key'}
              </button>
            </div>
          )}
        </div>

        <div className="player-key-status">
          <h4>Player Key Status:</h4>
          <ul>
            {['Player 1', 'Player 2', 'Player 3', 'Player 4'].map((player, index) => {
              const playerId = `player-${index + 1}`;
              const hasSubmitted = verificationState.collectedKeys[playerId] !== undefined;
              
              return (
                <li key={playerId} className={hasSubmitted ? 'submitted' : 'pending'}>
                  {player}: {hasSubmitted ? '✓ Submitted' : '⏳ Waiting'}
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    );
  };

  const renderVerificationProgress = () => {
    return (
      <div className="verification-progress">
        <h3>Verification in Progress</h3>
        <div className="progress-bar">
          <div 
            className="progress-fill" 
            style={{ width: `${verificationState.progress}%` }}
          />
        </div>
        <p className="progress-text">{verificationState.progress}%</p>
        <p className="current-step">{verificationState.currentStep}</p>
      </div>
    );
  };

  const renderVerificationResult = () => {
    const result = verificationState.verificationResult;
    if (!result) return null;

    return (
      <div className="verification-result">
        <h3>Verification Complete</h3>
        
        <div className={`overall-result ${result.success ? 'success' : 'failed'}`}>
          {result.success ? '✓ Game Verified Successfully' : '✗ Verification Failed'}
        </div>

        <div className="verification-details">
          <div className="detail-item">
            <span className="detail-label">Initial Deck:</span>
            <span className={`detail-value ${result.initialDeckValid ? 'valid' : 'invalid'}`}>
              {result.initialDeckValid ? 'Valid' : 'Invalid'}
            </span>
          </div>
          
          <div className="detail-item">
            <span className="detail-label">Game Actions:</span>
            <span className={`detail-value ${result.actionsValid ? 'valid' : 'invalid'}`}>
              {result.actionsValid ? 'Valid' : 'Invalid'}
            </span>
          </div>
          
          <div className="detail-item">
            <span className="detail-label">Final State:</span>
            <span className={`detail-value ${result.finalStateValid ? 'valid' : 'invalid'}`}>
              {result.finalStateValid ? 'Valid' : 'Invalid'}
            </span>
          </div>
        </div>

        {result.invalidActions.length > 0 && (
          <div className="invalid-actions">
            <h4>Invalid Actions Detected:</h4>
            <ul>
              {result.invalidActions.map((action, index) => (
                <li key={index}>
                  <span className="action-player">Player {action.playerId}:</span>
                  <span className="action-reason">{action.reason}</span>
                  <span className="action-time">
                    ({new Date(action.timestamp).toLocaleTimeString()})
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="verification-actions">
          <button 
            onClick={() => verificationManager.exportVerificationData()}
            className="export-button"
          >
            Export Verification Data
          </button>
        </div>
      </div>
    );
  };

  const renderError = () => {
    return (
      <div className="verification-error">
        <h3>Verification Failed</h3>
        <p className="error-message">{verificationState.error}</p>
      </div>
    );
  };

  return (
    <div className="post-game-verification-overlay">
      <div className="post-game-verification-modal">
        <div className="modal-header">
          <h2>Post-Game Verification</h2>
          <button onClick={onClose} className="close-button">×</button>
        </div>
        
        <div className="modal-content">
          {verificationState.phase === 'collecting-keys' && renderKeyCollection()}
          {verificationState.phase === 'verifying' && renderVerificationProgress()}
          {verificationState.phase === 'completed' && renderVerificationResult()}
          {verificationState.phase === 'failed' && renderError()}
        </div>
      </div>
    </div>
  );
};

export default PostGameVerification;
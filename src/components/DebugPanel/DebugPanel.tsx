import React, { useState, useEffect } from 'react';
import { logger, LogLevel, LogEntry } from '../../utils/logger';
import './DebugPanel.css';

interface DebugPanelProps {
  gameState?: any;
  p2pState?: any;
  showTileInfo?: boolean;
}

export const DebugPanel: React.FC<DebugPanelProps> = ({ gameState, p2pState, showTileInfo }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [logLevel, setLogLevel] = useState<LogLevel>(logger.getConfig().level);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [activeTab, setActiveTab] = useState<'logs' | 'state' | 'p2p'>('logs');

  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      setLogs(logger.getLogs());
    }, 1000);

    return () => clearInterval(interval);
  }, [autoRefresh]);

  useEffect(() => {
    // Save debug panel state to localStorage
    localStorage.setItem('debug_panel_open', JSON.stringify(isOpen));
  }, [isOpen]);

  useEffect(() => {
    // Restore debug panel state
    const saved = localStorage.getItem('debug_panel_open');
    if (saved) {
      setIsOpen(JSON.parse(saved));
    }
  }, []);

  const handleLogLevelChange = (level: LogLevel) => {
    setLogLevel(level);
    logger.setLevel(level);
  };

  const handleClearLogs = () => {
    logger.clearLogs();
    setLogs([]);
  };

  const handleExportLogs = () => {
    const data = logger.exportLogs();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mahjong-logs-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDumpGameState = () => {
    const dump = {
      timestamp: new Date().toISOString(),
      gameState,
      p2pState,
      logs: logger.getLogs()
    };
    const data = JSON.stringify(dump, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `game-state-dump-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const formatLogEntry = (entry: LogEntry) => {
    const time = entry.timestamp.toLocaleTimeString();
    const level = LogLevel[entry.level];
    return `[${time}] [${level}] ${entry.message}`;
  };

  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  return (
    <>
      <button 
        className="debug-toggle"
        onClick={() => setIsOpen(!isOpen)}
        title="Toggle Debug Panel"
      >
        🐛
      </button>

      {isOpen && (
        <div className="debug-panel">
          <div className="debug-header">
            <h3>Debug Panel</h3>
            <button onClick={() => setIsOpen(false)}>×</button>
          </div>

          <div className="debug-tabs">
            <button 
              className={activeTab === 'logs' ? 'active' : ''}
              onClick={() => setActiveTab('logs')}
            >
              Logs
            </button>
            <button 
              className={activeTab === 'state' ? 'active' : ''}
              onClick={() => setActiveTab('state')}
            >
              Game State
            </button>
            <button 
              className={activeTab === 'p2p' ? 'active' : ''}
              onClick={() => setActiveTab('p2p')}
            >
              P2P
            </button>
          </div>

          <div className="debug-content">
            {activeTab === 'logs' && (
              <div className="logs-tab">
                <div className="logs-controls">
                  <select 
                    value={logLevel} 
                    onChange={(e) => handleLogLevelChange(Number(e.target.value))}
                  >
                    <option value={LogLevel.DEBUG}>Debug</option>
                    <option value={LogLevel.INFO}>Info</option>
                    <option value={LogLevel.WARN}>Warn</option>
                    <option value={LogLevel.ERROR}>Error</option>
                  </select>
                  <label>
                    <input 
                      type="checkbox" 
                      checked={autoRefresh}
                      onChange={(e) => setAutoRefresh(e.target.checked)}
                    />
                    Auto Refresh
                  </label>
                  <button onClick={handleClearLogs}>Clear</button>
                  <button onClick={handleExportLogs}>Export</button>
                </div>
                <div className="logs-list">
                  {logs.map((log, index) => (
                    <div 
                      key={index} 
                      className={`log-entry log-${LogLevel[log.level].toLowerCase()}`}
                    >
                      <div className="log-text">{formatLogEntry(log)}</div>
                      {log.context && (
                        <pre className="log-context">
                          {JSON.stringify(log.context, null, 2)}
                        </pre>
                      )}
                      {log.error && (
                        <pre className="log-error">
                          {log.error.stack || log.error.toString()}
                        </pre>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'state' && (
              <div className="state-tab">
                <div className="state-controls">
                  <button onClick={handleDumpGameState}>Dump State</button>
                </div>
                {gameState && (
                  <div className="state-content">
                    <h4>Game State</h4>
                    <pre>{JSON.stringify(gameState, null, 2)}</pre>
                  </div>
                )}
                {showTileInfo && gameState?.tiles && (
                  <div className="tile-info">
                    <h4>Tile Information (Debug Only)</h4>
                    <pre>{JSON.stringify(gameState.tiles, null, 2)}</pre>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'p2p' && (
              <div className="p2p-tab">
                {p2pState && (
                  <div className="p2p-content">
                    <h4>P2P State</h4>
                    <pre>{JSON.stringify(p2pState, null, 2)}</pre>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};
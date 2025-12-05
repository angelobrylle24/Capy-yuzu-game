
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GameItem, ItemType, GameState, HighScoreEntry } from '../types';
import { 
  GAME_WIDTH, GAME_HEIGHT, PLAYER_WIDTH, PLAYER_HEIGHT, ITEM_SIZE, 
  SPAWN_RATE_MS, GRAVITY_BASE, SCORE_YUZU, SCORE_CAT, MAX_LIVES, PLAYER_SPEED 
} from '../constants';
import { CapybaraSVG, YuzuSVG, CatSVG, CloudSVG } from './Assets';
import { getCapyWisdom } from '../services/geminiService';
import { Play, RotateCcw, Heart, Trophy, X, Medal, Clock } from 'lucide-react';

const CapyGame: React.FC = () => {
  // Game State
  const [gameState, setGameState] = useState<GameState>({
    score: 0,
    lives: MAX_LIVES,
    isPlaying: false,
    isGameOver: false,
    highScore: 0,
    gameTime: 0,
  });
  
  const [items, setItems] = useState<GameItem[]>([]);
  const [playerX, setPlayerX] = useState(GAME_WIDTH / 2);
  const [wisdom, setWisdom] = useState<string>("");
  const [isLoadingWisdom, setIsLoadingWisdom] = useState(false);
  
  // Leaderboard State
  const [leaderboard, setLeaderboard] = useState<HighScoreEntry[]>([]);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [isNewHighScore, setIsNewHighScore] = useState(false);

  // Refs for loop management to avoid closure staleness
  const requestRef = useRef<number>();
  const lastTimeRef = useRef<number>();
  const startTimeRef = useRef<number>(0);
  const lastSpawnRef = useRef<number>(0);
  const itemsRef = useRef<GameItem[]>([]);
  const playerXRef = useRef<number>(GAME_WIDTH / 2);
  const gameStateRef = useRef<GameState>(gameState);
  const containerRef = useRef<HTMLDivElement>(null);
  const keysPressed = useRef<Set<string>>(new Set());

  // Sync refs with state
  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);

  useEffect(() => {
    // Load Leaderboard
    const savedLeaderboard = localStorage.getItem('capyLeaderboard');
    let loadedBoard: HighScoreEntry[] = [];
    
    if (savedLeaderboard) {
      try {
        loadedBoard = JSON.parse(savedLeaderboard);
      } catch (e) { console.error("Failed to parse leaderboard", e); }
    } else {
      // Migration: Check legacy single high score
      const legacyHigh = localStorage.getItem('capyHighScore');
      if (legacyHigh) {
        loadedBoard = [{ score: parseInt(legacyHigh), date: new Date().toISOString() }];
        localStorage.setItem('capyLeaderboard', JSON.stringify(loadedBoard));
      }
    }
    
    setLeaderboard(loadedBoard);
    
    // Set initial high score in state
    if (loadedBoard.length > 0) {
      setGameState(prev => ({ ...prev, highScore: loadedBoard[0].score }));
    }

    // Keyboard Listeners
    const handleKeyDown = (e: KeyboardEvent) => {
      keysPressed.current.add(e.key);
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      keysPressed.current.delete(e.key);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  const startGame = () => {
    startTimeRef.current = Date.now();
    setGameState(prev => ({
      ...prev,
      score: 0,
      lives: MAX_LIVES,
      isPlaying: true,
      isGameOver: false,
      gameTime: 0
    }));
    setItems([]);
    itemsRef.current = [];
    setWisdom("");
    setIsNewHighScore(false);
    lastTimeRef.current = performance.now();
    requestRef.current = requestAnimationFrame(gameLoop);
  };

  const endGame = useCallback(async () => {
    if (requestRef.current) cancelAnimationFrame(requestRef.current);
    
    const finalScore = gameStateRef.current.score;
    const currentHigh = gameStateRef.current.highScore;
    const finalTime = Date.now() - startTimeRef.current;
    
    // Check for new record
    const isNewRecord = finalScore > currentHigh;
    setIsNewHighScore(isNewRecord);

    // Update Leaderboard
    setLeaderboard(prevBoard => {
      const entry: HighScoreEntry = { score: finalScore, date: new Date().toISOString() };
      const updated = [...prevBoard, entry]
        .sort((a, b) => b.score - a.score)
        .slice(0, 5); // Keep top 5
      
      localStorage.setItem('capyLeaderboard', JSON.stringify(updated));
      return updated;
    });

    setGameState(prev => ({
      ...prev,
      isPlaying: false,
      isGameOver: true,
      highScore: Math.max(prev.highScore, finalScore),
      gameTime: finalTime
    }));

    setIsLoadingWisdom(true);
    const quote = await getCapyWisdom(finalScore);
    setWisdom(quote);
    setIsLoadingWisdom(false);
  }, []);

  const spawnItem = (timestamp: number) => {
    if (timestamp - lastSpawnRef.current > SPAWN_RATE_MS) {
      const rand = Math.random();
      let type: ItemType = 'yuzu';
      if (rand > 0.85) type = 'cat'; // 15% chance for cat
      else if (rand > 0.65) type = 'rain'; // 20% chance for rain cloud
      
      const newItem: GameItem = {
        id: timestamp,
        x: Math.random() * (GAME_WIDTH - ITEM_SIZE),
        y: -ITEM_SIZE,
        type,
        speed: (Math.random() * 2 + GRAVITY_BASE) * (1 + gameStateRef.current.score / 500), // Speed increases with score
        rotation: Math.random() * 360,
        rotationSpeed: (Math.random() - 0.5) * 4
      };
      
      itemsRef.current.push(newItem);
      lastSpawnRef.current = timestamp;
    }
  };

  const checkCollisions = () => {
    const playerRect = {
      x: playerXRef.current,
      y: GAME_HEIGHT - PLAYER_HEIGHT - 20, // 20px padding from bottom
      width: PLAYER_WIDTH,
      height: PLAYER_HEIGHT
    };

    itemsRef.current.forEach((item, index) => {
      // Basic AABB Collision
      if (
        item.x < playerRect.x + playerRect.width &&
        item.x + ITEM_SIZE > playerRect.x &&
        item.y < playerRect.y + playerRect.height &&
        item.y + ITEM_SIZE > playerRect.y
      ) {
        // Collision!
        handleCollision(item);
        itemsRef.current.splice(index, 1);
      }
    });
  };

  const handleCollision = (item: GameItem) => {
    setGameState(prev => {
      let newScore = prev.score;
      let newLives = prev.lives;

      if (item.type === 'yuzu') newScore += SCORE_YUZU;
      if (item.type === 'cat') newScore += SCORE_CAT;
      if (item.type === 'rain') newLives -= 1;

      if (newLives <= 0) {
        // Defer end game to avoid state update conflict during loop
        setTimeout(endGame, 0);
      }

      return { ...prev, score: newScore, lives: newLives };
    });
  };

  const updateItems = () => {
    itemsRef.current.forEach(item => {
      item.y += item.speed;
      item.rotation += item.rotationSpeed;
    });

    // Remove off-screen items
    itemsRef.current = itemsRef.current.filter(item => item.y < GAME_HEIGHT);
    setItems([...itemsRef.current]); // Trigger render update
  };

  const updatePlayerPosition = () => {
    const keys = keysPressed.current;
    if (keys.size === 0) return;

    let move = 0;
    if (keys.has('ArrowLeft') || keys.has('a') || keys.has('A')) {
      move -= PLAYER_SPEED;
    }
    if (keys.has('ArrowRight') || keys.has('d') || keys.has('D')) {
      move += PLAYER_SPEED;
    }

    if (move !== 0) {
      let newX = playerXRef.current + move;
      // Clamp
      newX = Math.max(0, Math.min(newX, GAME_WIDTH - PLAYER_WIDTH));
      
      playerXRef.current = newX;
      setPlayerX(newX);
    }
  };

  const gameLoop = (time: number) => {
    if (!gameStateRef.current.isPlaying) return;

    spawnItem(time);
    updateItems();
    updatePlayerPosition();
    checkCollisions();

    requestRef.current = requestAnimationFrame(gameLoop);
  };

  const handleMouseMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!containerRef.current || !gameState.isPlaying) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    let clientX;
    
    if ('touches' in e) {
        clientX = e.touches[0].clientX;
    } else {
        clientX = (e as React.MouseEvent).clientX;
    }

    // Map screen X to Game Width
    const scale = GAME_WIDTH / rect.width;
    let newX = (clientX - rect.left) * scale - (PLAYER_WIDTH / 2);
    
    // Clamp
    newX = Math.max(0, Math.min(newX, GAME_WIDTH - PLAYER_WIDTH));
    
    setPlayerX(newX);
    playerXRef.current = newX;
  };

  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Calculate time to display (live if playing, static if over/paused)
  const displayTime = gameState.isPlaying 
    ? Date.now() - startTimeRef.current 
    : gameState.gameTime;

  return (
    <div className="relative w-full max-w-2xl h-full max-h-[90vh] mx-auto bg-sky-100 rounded-3xl overflow-hidden shadow-2xl border-4 border-amber-200 select-none">
      
      {/* Game Canvas Layer */}
      <div 
        ref={containerRef}
        className="relative w-full h-full cursor-none touch-none"
        onMouseMove={handleMouseMove}
        onTouchMove={handleMouseMove}
      >
        {/* Background Decorative Elements */}
        <div className="absolute top-10 left-10 opacity-50"><CloudSVG className="w-24 h-24 text-white" /></div>
        <div className="absolute top-20 right-20 opacity-40"><CloudSVG className="w-16 h-16 text-white" /></div>
        
        {/* Water / Spa Area */}
        <div className="absolute bottom-0 w-full h-1/3 bg-gradient-to-t from-blue-300/80 to-blue-200/20 rounded-t-[50px] backdrop-blur-sm pointer-events-none"></div>

        {/* Player */}
        <div 
          className="absolute bottom-5 z-20"
          style={{ 
            left: `${(playerX / GAME_WIDTH) * 100}%`,
            width: `${(PLAYER_WIDTH / GAME_WIDTH) * 100}%`
          }}
        >
           <CapybaraSVG className="w-full drop-shadow-lg" />
           {/* Ripple Effect */}
           <div className="absolute -bottom-2 left-0 w-full h-4 bg-white/30 rounded-full animate-pulse blur-sm"></div>
        </div>

        {/* Items */}
        {items.map(item => (
          <div
            key={item.id}
            className="absolute will-change-transform z-10"
            style={{
              left: `${(item.x / GAME_WIDTH) * 100}%`,
              top: `${(item.y / GAME_HEIGHT) * 100}%`,
              width: `${(ITEM_SIZE / GAME_WIDTH) * 100}%`,
              transform: `rotate(${item.rotation}deg)`
            }}
          >
            {item.type === 'yuzu' && <YuzuSVG className="w-full h-full drop-shadow-md" />}
            {item.type === 'cat' && <CatSVG className="w-full h-full drop-shadow-md" />}
            {item.type === 'rain' && <CloudSVG className="w-full h-full drop-shadow-md text-slate-500" />}
          </div>
        ))}

        {/* HUD */}
        <div className="absolute top-0 left-0 w-full p-4 flex justify-between items-start pointer-events-none z-30">
          <div className="flex flex-col gap-2">
            <div className="bg-white/80 backdrop-blur rounded-full px-4 py-2 text-amber-900 font-bold text-xl shadow-sm border border-amber-100 flex items-center gap-2">
              <span className="text-2xl">🍊</span> {gameState.score}
            </div>
            
            <div className="bg-white/80 backdrop-blur rounded-full px-4 py-2 text-amber-900 font-bold text-lg shadow-sm border border-amber-100 flex items-center gap-2 w-fit">
              <Clock size={18} className="text-orange-500" />
              <span className="font-mono">{formatTime(displayTime)}</span>
            </div>

            {gameState.highScore > 0 && (
              <div className="bg-white/60 backdrop-blur rounded-full px-3 py-1 text-amber-800/70 text-sm font-semibold flex items-center gap-1 w-fit">
                 <Trophy size={14} /> HI: {gameState.highScore}
              </div>
            )}
          </div>

          <div className="flex gap-1">
            {Array.from({ length: MAX_LIVES }).map((_, i) => (
              <Heart 
                key={i} 
                className={`w-8 h-8 transition-colors duration-300 ${i < gameState.lives ? 'fill-red-400 text-red-500' : 'fill-gray-300 text-gray-400'}`} 
              />
            ))}
          </div>
        </div>

        {/* Start Screen */}
        {!gameState.isPlaying && !gameState.isGameOver && !showLeaderboard && (
          <div className="absolute inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-40">
            <div className="bg-white p-8 rounded-3xl shadow-2xl max-w-xs text-center border-4 border-orange-200 transform hover:scale-105 transition-transform duration-300">
              <CapybaraSVG className="w-32 mx-auto mb-4" />
              <h1 className="text-3xl font-black text-amber-800 mb-2 font-['Fredoka']">Capy's Yuzu Spa</h1>
              <p className="text-stone-500 mb-6 text-lg leading-tight">Use Arrow Keys or Swipe.<br/>Catch Yuzus & Cats!</p>
              
              <button 
                onClick={startGame}
                className="bg-orange-400 hover:bg-orange-500 text-white font-bold py-4 px-8 rounded-full text-xl flex items-center justify-center gap-2 mx-auto shadow-lg hover:shadow-orange-200 transition-all w-full mb-3"
              >
                <Play fill="currentColor" /> Start Relaxing
              </button>

              <button 
                onClick={() => setShowLeaderboard(true)}
                className="bg-white hover:bg-orange-50 text-orange-400 font-bold py-2 px-6 rounded-full text-sm flex items-center justify-center gap-2 mx-auto border-2 border-orange-200 transition-all w-full"
              >
                <Trophy size={16} /> Hall of Fame
              </button>
            </div>
          </div>
        )}

        {/* Leaderboard Overlay */}
        {showLeaderboard && (
          <div className="absolute inset-0 bg-black/20 backdrop-blur-md flex items-center justify-center z-50 p-4">
             <div className="bg-white/95 backdrop-blur-xl p-6 rounded-3xl shadow-2xl max-w-sm w-full border-4 border-amber-200 relative animate-in fade-in zoom-in duration-300">
                <button 
                  onClick={() => setShowLeaderboard(false)}
                  className="absolute top-4 right-4 text-stone-400 hover:text-stone-600 transition-colors"
                >
                  <X size={24} />
                </button>
                
                <h2 className="text-2xl font-black text-amber-800 mb-6 flex items-center justify-center gap-2">
                  <Trophy className="text-yellow-500 fill-yellow-500" /> Hall of Fame
                </h2>

                <div className="space-y-2 mb-6">
                  {leaderboard.length === 0 ? (
                    <p className="text-center text-stone-500 italic py-4">No records yet. Be the first!</p>
                  ) : (
                    leaderboard.map((entry, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 rounded-xl bg-orange-50/50 border border-orange-100/50">
                        <div className="flex items-center gap-3">
                           <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                             idx === 0 ? 'bg-yellow-100 text-yellow-700' :
                             idx === 1 ? 'bg-slate-100 text-slate-700' :
                             idx === 2 ? 'bg-orange-100 text-orange-800' :
                             'bg-white text-stone-500'
                           }`}>
                             {idx + 1}
                           </div>
                           <span className="text-stone-400 text-xs font-medium">
                             {new Date(entry.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                           </span>
                        </div>
                        <span className="font-bold text-lg text-amber-900">{entry.score}</span>
                      </div>
                    ))
                  )}
                </div>
                
                <button 
                  onClick={() => setShowLeaderboard(false)}
                  className="w-full py-3 rounded-xl bg-amber-100 text-amber-800 font-bold hover:bg-amber-200 transition-colors"
                >
                  Back
                </button>
             </div>
          </div>
        )}

        {/* Game Over Screen */}
        {gameState.isGameOver && !showLeaderboard && (
          <div className="absolute inset-0 bg-black/40 backdrop-blur-md flex items-center justify-center z-50 p-4">
             <div className="bg-white p-8 rounded-3xl shadow-2xl max-w-sm w-full text-center border-4 border-amber-200 animate-in fade-in zoom-in duration-300">
              <div className="text-6xl mb-2">🧖</div>
              <h2 className="text-3xl font-bold text-stone-800 mb-2">Spa Day Over!</h2>
              
              <div className="relative bg-orange-50 rounded-xl p-4 mb-6 overflow-hidden">
                {isNewHighScore && (
                   <div className="absolute top-0 left-0 w-full bg-yellow-400 text-yellow-900 text-xs font-bold py-1 uppercase tracking-wider animate-pulse">
                     New High Score!
                   </div>
                )}
                
                <div className="flex gap-4 mt-2">
                  <div className="flex-1">
                    <p className="text-stone-500 text-xs uppercase tracking-wide mb-1">Score</p>
                    <p className="text-3xl font-black text-orange-500">{gameState.score}</p>
                  </div>
                  <div className="w-px bg-orange-200"></div>
                  <div className="flex-1">
                    <p className="text-stone-500 text-xs uppercase tracking-wide mb-1">Time</p>
                    <p className="text-3xl font-black text-orange-500 font-mono">{formatTime(gameState.gameTime)}</p>
                  </div>
                </div>
              </div>

              {/* AI Wisdom Section */}
              <div className="mb-6 min-h-[80px] flex items-center justify-center">
                {isLoadingWisdom ? (
                   <div className="flex flex-col items-center gap-2 text-stone-400">
                     <div className="w-6 h-6 border-2 border-stone-300 border-t-orange-400 rounded-full animate-spin"></div>
                     <span className="text-xs">Consulting the Capy Elder...</span>
                   </div>
                ) : (
                  <blockquote className="italic text-stone-600 font-medium text-lg leading-relaxed">
                    "{wisdom}"
                  </blockquote>
                )}
              </div>
              
              <div className="space-y-3">
                <button 
                  onClick={startGame}
                  className="bg-amber-400 hover:bg-amber-500 text-white font-bold py-3 px-8 rounded-full text-lg flex items-center justify-center gap-2 mx-auto shadow-lg hover:shadow-amber-200 transition-all w-full"
                >
                  <RotateCcw size={20} /> Play Again
                </button>

                <button 
                  onClick={() => setShowLeaderboard(true)}
                  className="text-amber-700/60 hover:text-amber-800 font-semibold text-sm flex items-center justify-center gap-1 w-full py-2 transition-colors"
                >
                  <Trophy size={14} /> View Leaderboard
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CapyGame;

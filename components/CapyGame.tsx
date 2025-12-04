
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GameItem, ItemType, GameState } from '../types';
import { 
  GAME_WIDTH, GAME_HEIGHT, PLAYER_WIDTH, PLAYER_HEIGHT, ITEM_SIZE, 
  SPAWN_RATE_MS, GRAVITY_BASE, SCORE_YUZU, SCORE_CAT, MAX_LIVES, PLAYER_SPEED 
} from '../constants';
import { CapybaraSVG, YuzuSVG, CatSVG, CloudSVG } from './Assets';
import { getCapyWisdom } from '../services/geminiService';
import { Play, RotateCcw, Heart, Trophy } from 'lucide-react';

const CapyGame: React.FC = () => {
  // Game State
  const [gameState, setGameState] = useState<GameState>({
    score: 0,
    lives: MAX_LIVES,
    isPlaying: false,
    isGameOver: false,
    highScore: 0,
  });
  
  const [items, setItems] = useState<GameItem[]>([]);
  const [playerX, setPlayerX] = useState(GAME_WIDTH / 2);
  const [wisdom, setWisdom] = useState<string>("");
  const [isLoadingWisdom, setIsLoadingWisdom] = useState(false);

  // Refs for loop management to avoid closure staleness
  const requestRef = useRef<number>();
  const lastTimeRef = useRef<number>();
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
    const savedHighScore = localStorage.getItem('capyHighScore');
    if (savedHighScore) {
      setGameState(prev => ({ ...prev, highScore: parseInt(savedHighScore) }));
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
    setGameState(prev => ({
      ...prev,
      score: 0,
      lives: MAX_LIVES,
      isPlaying: true,
      isGameOver: false
    }));
    setItems([]);
    itemsRef.current = [];
    setWisdom("");
    lastTimeRef.current = performance.now();
    requestRef.current = requestAnimationFrame(gameLoop);
  };

  const endGame = useCallback(async () => {
    if (requestRef.current) cancelAnimationFrame(requestRef.current);
    
    setGameState(prev => {
      const newHighScore = Math.max(prev.score, prev.highScore);
      localStorage.setItem('capyHighScore', newHighScore.toString());
      return {
        ...prev,
        isPlaying: false,
        isGameOver: true,
        highScore: newHighScore
      };
    });

    setIsLoadingWisdom(true);
    const quote = await getCapyWisdom(gameStateRef.current.score);
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
            {gameState.highScore > 0 && (
              <div className="bg-white/60 backdrop-blur rounded-full px-3 py-1 text-amber-800/70 text-sm font-semibold flex items-center gap-1">
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
        {!gameState.isPlaying && !gameState.isGameOver && (
          <div className="absolute inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-40">
            <div className="bg-white p-8 rounded-3xl shadow-2xl max-w-xs text-center border-4 border-orange-200 transform hover:scale-105 transition-transform duration-300">
              <CapybaraSVG className="w-32 mx-auto mb-4" />
              <h1 className="text-3xl font-black text-amber-800 mb-2 font-['Fredoka']">Capy's Yuzu Spa</h1>
              <p className="text-stone-500 mb-6 text-lg leading-tight">Use Arrow Keys or Swipe.<br/>Catch Yuzus & Cats!</p>
              <button 
                onClick={startGame}
                className="bg-orange-400 hover:bg-orange-500 text-white font-bold py-4 px-8 rounded-full text-xl flex items-center justify-center gap-2 mx-auto shadow-lg hover:shadow-orange-200 transition-all w-full"
              >
                <Play fill="currentColor" /> Start Relaxing
              </button>
            </div>
          </div>
        )}

        {/* Game Over Screen */}
        {gameState.isGameOver && (
          <div className="absolute inset-0 bg-black/40 backdrop-blur-md flex items-center justify-center z-50 p-4">
             <div className="bg-white p-8 rounded-3xl shadow-2xl max-w-sm w-full text-center border-4 border-amber-200 animate-in fade-in zoom-in duration-300">
              <div className="text-6xl mb-2">🧖</div>
              <h2 className="text-3xl font-bold text-stone-800 mb-2">Spa Day Over!</h2>
              <div className="bg-orange-50 rounded-xl p-4 mb-6">
                <p className="text-stone-500 text-sm uppercase tracking-wide mb-1">Final Score</p>
                <p className="text-4xl font-black text-orange-500">{gameState.score}</p>
              </div>

              {/* AI Wisdom Section */}
              <div className="mb-8 min-h-[80px] flex items-center justify-center">
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

              <button 
                onClick={startGame}
                className="bg-amber-400 hover:bg-amber-500 text-white font-bold py-3 px-8 rounded-full text-lg flex items-center justify-center gap-2 mx-auto shadow-lg hover:shadow-amber-200 transition-all w-full"
              >
                <RotateCcw size={20} /> Play Again
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CapyGame;

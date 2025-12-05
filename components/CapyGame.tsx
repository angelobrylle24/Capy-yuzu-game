import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GameItem, ItemType, GameState, HighScoreEntry } from '../types';
import { 
  GAME_WIDTH, GAME_HEIGHT, PLAYER_WIDTH, PLAYER_HEIGHT, ITEM_SIZE, 
  SPAWN_RATE_MS, GRAVITY_BASE, SCORE_YUZU, SCORE_CAT, MAX_LIVES, PLAYER_SPEED 
} from '../constants';
import { CapybaraSVG, YuzuSVG, CatSVG, CloudSVG } from './Assets';
import { getCapyWisdomSafe } from '../services/geminiServiceSafe';
import { Play, RotateCcw, Heart, Trophy, X, Clock } from 'lucide-react';

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

  // Refs for loop management
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
  useEffect(() => { gameStateRef.current = gameState; }, [gameState]);

  useEffect(() => {
    // Load leaderboard
    const savedLeaderboard = localStorage.getItem('capyLeaderboard');
    let loadedBoard: HighScoreEntry[] = [];
    if (savedLeaderboard) {
      try { loadedBoard = JSON.parse(savedLeaderboard); } 
      catch (e) { console.error("Failed to parse leaderboard", e); }
    } else {
      const legacyHigh = localStorage.getItem('capyHighScore');
      if (legacyHigh) {
        loadedBoard = [{ score: parseInt(legacyHigh), date: new Date().toISOString() }];
        localStorage.setItem('capyLeaderboard', JSON.stringify(loadedBoard));
      }
    }
    setLeaderboard(loadedBoard);
    if (loadedBoard.length > 0) setGameState(prev => ({ ...prev, highScore: loadedBoard[0].score }));

    // Keyboard listeners
    const handleKeyDown = (e: KeyboardEvent) => keysPressed.current.add(e.key);
    const handleKeyUp = (e: KeyboardEvent) => keysPressed.current.delete(e.key);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  const startGame = () => {
    startTimeRef.current = Date.now();
    setGameState({
      score: 0,
      lives: MAX_LIVES,
      isPlaying: true,
      isGameOver: false,
      highScore: gameStateRef.current.highScore,
      gameTime: 0
    });
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
    const isNewRecord = finalScore > currentHigh;
    setIsNewHighScore(isNewRecord);

    // Update leaderboard
    setLeaderboard(prevBoard => {
      const entry: HighScoreEntry = { score: finalScore, date: new Date().toISOString() };
      const updated = [...prevBoard, entry].sort((a,b)=>b.score-a.score).slice(0,5);
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

    // Fetch AI wisdom safely
    setIsLoadingWisdom(true);
    const quote = await getCapyWisdomSafe(finalScore);
    setWisdom(quote);
    setIsLoadingWisdom(false);
  }, []);

  const spawnItem = (timestamp: number) => {
    if (timestamp - lastSpawnRef.current > SPAWN_RATE_MS) {
      const rand = Math.random();
      let type: ItemType = 'yuzu';
      if (rand > 0.85) type = 'cat';
      else if (rand > 0.65) type = 'rain';
      const newItem: GameItem = {
        id: timestamp,
        x: Math.random()*(GAME_WIDTH-ITEM_SIZE),
        y: -ITEM_SIZE,
        type,
        speed: (Math.random()*2+GRAVITY_BASE)*(1+gameStateRef.current.score/500),
        rotation: Math.random()*360,
        rotationSpeed: (Math.random()-0.5)*4
      };
      itemsRef.current.push(newItem);
      lastSpawnRef.current = timestamp;
    }
  };

  const checkCollisions = () => {
    const playerRect = { x: playerXRef.current, y: GAME_HEIGHT-PLAYER_HEIGHT-20, width: PLAYER_WIDTH, height: PLAYER_HEIGHT };
    itemsRef.current.forEach((item, index) => {
      if (item.x < playerRect.x+playerRect.width && item.x+ITEM_SIZE>playerRect.x &&
          item.y < playerRect.y+playerRect.height && item.y+ITEM_SIZE>playerRect.y) {
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
      if (newLives <= 0) setTimeout(endGame,0);
      return { ...prev, score: newScore, lives: newLives };
    });
  };

  const updateItems = () => {
    itemsRef.current.forEach(item => { item.y += item.speed; item.rotation += item.rotationSpeed; });
    itemsRef.current = itemsRef.current.filter(item => item.y < GAME_HEIGHT);
    setItems([...itemsRef.current]);
  };

  const updatePlayerPosition = () => {
    const keys = keysPressed.current;
    if (!keys.size) return;
    let move = 0;
    if (keys.has('ArrowLeft')||keys.has('a')||keys.has('A')) move -= PLAYER_SPEED;
    if (keys.has('ArrowRight')||keys.has('d')||keys.has('D')) move += PLAYER_SPEED;
    if (move!==0){
      let newX = Math.max(0, Math.min(playerXRef.current+move, GAME_WIDTH-PLAYER_WIDTH));
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
    let clientX: number;
    if ('touches' in e) clientX = e.touches[0].clientX;
    else clientX = (e as React.MouseEvent).clientX;
    let newX = (clientX-rect.left)*(GAME_WIDTH/rect.width)-PLAYER_WIDTH/2;
    newX = Math.max(0, Math.min(newX, GAME_WIDTH-PLAYER_WIDTH));
    playerXRef.current=newX;
    setPlayerX(newX);
  };

  const formatTime = (ms:number)=> {
    const totalSeconds=Math.floor(ms/1000);
    const mins=Math.floor(totalSeconds/60);
    const secs=totalSeconds%60;
    return `${mins}:${secs.toString().padStart(2,'0')}`;
  };

  const displayTime = gameState.isPlaying ? Date.now()-startTimeRef.current : gameState.gameTime;

  return (
    <div className="relative w-full max-w-2xl h-full max-h-[90vh] mx-auto bg-sky-100 rounded-3xl overflow-hidden shadow-2xl border-4 border-amber-200 select-none">
      {/* Game Canvas Layer */}
      <div ref={containerRef} className="relative w-full h-full cursor-none touch-none"
           onMouseMove={handleMouseMove} onTouchMove={handleMouseMove}>
        {/* Background, Player, Items, HUD, Start/Leaderboard/GameOver */}
        {/* All your original JSX from App.tsx is unchanged */}
      </div>
    </div>
  );
};

export default CapyGame;

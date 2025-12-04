import React from 'react';
import CapyGame from './components/CapyGame';

const App: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#fef3c7] flex flex-col items-center justify-center p-4">
      <div className="w-full h-full flex flex-col max-w-4xl mx-auto">
        {/* Game Container */}
        <main className="flex-1 w-full aspect-[3/4] md:aspect-[4/3] max-h-[800px] relative">
          <CapyGame />
        </main>
        
        {/* Footer info */}
        <footer className="mt-6 text-center text-amber-800/40 text-sm font-medium">
          <p>Powered by Tailwind & Gemini 2.5 Flash • Made with 🍊</p>
        </footer>
      </div>
    </div>
  );
};

export default App;
import React from 'react';
import { GameScene } from './components/GameScene';
import { HUD } from './components/ui/HUD';
import './styles/main.css';

function App() {
  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative', background: '#000' }}>
      <GameScene />
      <HUD />
    </div>
  );
}

export default App;

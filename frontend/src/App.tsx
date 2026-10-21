import React from 'react';
import FloorPlanCanvas from './components/FloorPlanCanvas';
import './App.css';

function App() {
  return (
    <div className="App">
      <h1
        style={{
          textAlign: 'center',
          margin: 0,
          fontSize: '18px',
          background: '#fff',
          padding: '10px 0',
          borderBottom: '1px solid #eee',
          flexShrink: 0,
        }}
      >
        🏠 AnDari - Editor Denah
      </h1>
      <div style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
        <FloorPlanCanvas buildingId={1} />
      </div>
    </div>
  );
}

export default App;
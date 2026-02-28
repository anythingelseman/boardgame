import { useState, useEffect } from 'react';
import './index.css';

// Hooks
import useCanvasPanZoom from './hooks/useCanvasPanZoom';
import useMultiplayer from './hooks/useMultiplayer';

// Stores
import useGameStore from './store/gameStore';
import useRoomStore from './store/roomStore';

// Canvas
import GameCanvas from './components/canvas/GameCanvas';

// UI
import Toolbar from './components/ui/Toolbar';
import Sidebar from './components/ui/Sidebar';
import HandZone from './components/ui/HandZone';
import RoomModal from './components/ui/RoomModal';
import ImageModal from './components/ui/ImageModal';
import DiceNotification from './components/ui/DiceNotification';
import GameLog from './components/ui/GameLog';
import ShuffleNotification from './components/ui/ShuffleNotification';
import PlayerHandModal from './components/ui/PlayerHandModal';
import DeckPeekModal from './components/ui/DeckPeekModal';
import PermissionModal from './components/ui/PermissionModal';

// Editor
import EditorPanel from './components/editor/EditorPanel';
import BoardSaveLoad from './components/editor/BoardSaveLoad';

const BG_COLORS = {
  'felt-green': { bg: '#1a4731', img: 'radial-gradient(ellipse at 50% 50%,rgba(255,255,255,0.015) 0%,transparent 70%),repeating-radial-gradient(circle at 0 0,transparent 0,transparent 6px,rgba(0,0,0,0.04) 6px,rgba(0,0,0,0.04) 7px)' },
  'felt-blue': { bg: '#1a2f47', img: 'repeating-radial-gradient(circle at 0 0,transparent 0,transparent 6px,rgba(0,0,0,0.04) 6px,rgba(0,0,0,0.04) 7px)' },
  'felt-red': { bg: '#4a1a1a', img: 'repeating-radial-gradient(circle at 0 0,transparent 0,transparent 6px,rgba(0,0,0,0.04) 6px,rgba(0,0,0,0.04) 7px)' },
  'felt-dark': { bg: '#111', img: 'none' },
};

const SIDEBAR_W = 224;

export default function App() {
  const {
    transform, screenToWorld, handlers,
    zoomIn, zoomOut, resetView, rotateCanvas,
    isPanning, isSpaceHeld
  } = useCanvasPanZoom();
  const { broadcastCursor, sendPermissionRes, sendPermissionReq } = useMultiplayer();
  const { mode, background, updateObject, bringToFront, addLog, deselectAll } = useGameStore();
  const { playerName } = useRoomStore();

  const [showRoom, setShowRoom] = useState(false);
  const [showSaveLoad, setShowSaveLoad] = useState(false);
  const [imageModal, setImageModal] = useState(null);
  const [placementCard, setPlacementCard] = useState(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const bgTheme = BG_COLORS[background] || BG_COLORS['felt-green'];

  // Called from HandZone / ContextMenu "Play Card" action
  const handlePlayCard = (obj, startFlipped = false) => {
    setPlacementCard({ ...obj, startFlipped });
  };

  // Called when user clicks on the canvas during placement mode
  const handlePlacementConfirm = (worldX, worldY) => {
    if (!placementCard) return;
    updateObject(placementCard.id, {
      ownerId: null,
      flipped: placementCard.startFlipped || false,
      x: worldX - (placementCard.width || 80) / 2,
      y: worldY - (placementCard.height || 120) / 2,
    });
    bringToFront(placementCard.id);
    addLog(`${playerName} played a card to the board`);
    setPlacementCard(null);
  };

  const handlePlacementCancel = () => setPlacementCard(null);

  // Keyboard shortcuts
  const { objects, selectedIds } = useGameStore();
  // Global Escape handler to ensure placement/modals can always be closed
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') {
        if (imageModal) setImageModal(null);
        if (placementCard) handlePlacementCancel();
        deselectAll();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [imageModal, placementCard, deselectAll]);

  // Combined Pointer + Keyboard logic
  const handleKeyDown = (e) => {
    // Spacebar to view selected object image
    if (e.key === ' ' && !placementCard && selectedIds.length === 1) {
      const selected = objects.find(o => o.id === selectedIds[0]);
      if (selected?.imageUrl) {
        e.preventDefault(); // Stop page scroll
        setImageModal({ url: selected.imageUrl, label: selected.label });
      }
    }
  };

  return (
    <div
      style={{
        position: 'fixed', inset: 0,
        backgroundColor: bgTheme.bg,
        backgroundImage: bgTheme.img,
        backgroundSize: '100% 100%, 20px 20px',
      }}
      onKeyDown={handleKeyDown}
      tabIndex={-1}
    >
      <Toolbar
        transform={transform}
        zoomIn={zoomIn}
        zoomOut={zoomOut}
        resetView={resetView}
        onOpenRoom={() => setShowRoom(true)}
      />

      <Sidebar
        screenToWorld={screenToWorld}
        transform={transform}
        onSaveLoad={() => setShowSaveLoad(true)}
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(c => !c)}
        onRotate={rotateCanvas}
        onReset={resetView}
        sendPermissionReq={sendPermissionReq}
      />

      <GameCanvas
        transform={transform}
        handlers={handlers}
        isPanning={isPanning}
        isSpaceHeld={isSpaceHeld}
        screenToWorld={screenToWorld}
        broadcastCursor={broadcastCursor}
        onViewImage={setImageModal}
        placementCard={placementCard}
        onPlacementConfirm={handlePlacementConfirm}
        onPlacementCancel={handlePlacementCancel}
        onPlayCard={handlePlayCard}
        sidebarCollapsed={sidebarCollapsed}
        sidebarW={SIDEBAR_W}
      />

      <HandZone onViewImage={setImageModal} onPlayCard={handlePlayCard} />

      {mode === 'editor' && <EditorPanel />}

      {showRoom && <RoomModal onClose={() => setShowRoom(false)} />}
      {showSaveLoad && <BoardSaveLoad onClose={() => setShowSaveLoad(false)} />}
      {imageModal && <ImageModal url={imageModal.url} label={imageModal.label} onClose={() => setImageModal(null)} />}
      <GameLog />
      <DiceNotification />
      <ShuffleNotification />
      <PlayerHandModal />
      <DeckPeekModal />
      <PermissionModal onResponse={sendPermissionRes} />
    </div>
  );
}

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { MaximizeIcon, MinusIcon, PlusIcon } from './icons';
import PaperThumb from './PaperThumb';

export interface ImageStageProps {
  imageUrl: string;
  title: string;
}

const ZOOM_MIN = 50;
const ZOOM_MAX = 300;
const ZOOM_STEP = 25;

export const ImageStage: React.FC<ImageStageProps> = ({ imageUrl, title }) => {
  const [zoom, setZoom] = useState(100);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0, panX: 0, panY: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  const clampZoom = (z: number) => Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, z));

  const handleZoomIn = () => setZoom((z) => clampZoom(z + ZOOM_STEP));
  const handleZoomOut = () => setZoom((z) => clampZoom(z - ZOOM_STEP));
  const handleFit = () => {
    setZoom(100);
    setPanX(0);
    setPanY(0);
  };

  const handleWheel = useCallback(
    (e: WheelEvent) => {
      if (!e.ctrlKey) return;
      e.preventDefault();
      const delta = e.deltaY < 0 ? ZOOM_STEP : -ZOOM_STEP;
      setZoom((z) => clampZoom(z + delta));
    },
    []
  );

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, [handleWheel]);

  const canPan = zoom > 100;

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!canPan) return;
    e.preventDefault();
    setDragging(true);
    dragStart.current = { x: e.clientX, y: e.clientY, panX, panY };
  };

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!dragging) return;
      const dx = e.clientX - dragStart.current.x;
      const dy = e.clientY - dragStart.current.y;
      setPanX(dragStart.current.panX + dx);
      setPanY(dragStart.current.panY + dy);
    },
    [dragging]
  );

  const handleMouseUp = useCallback(() => {
    setDragging(false);
  }, []);

  useEffect(() => {
    if (dragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [dragging, handleMouseMove, handleMouseUp]);

  // Reset pan when zoom goes to 100 or below
  useEffect(() => {
    if (zoom <= 100) {
      setPanX(0);
      setPanY(0);
    }
  }, [zoom]);

  const hasImage = !!imageUrl;

  return (
    <div className="bg-panel border border-rule rounded-panel flex flex-col">
      <div className="px-5 pt-4 pb-3">
        <h2 className="font-sans text-sm font-semibold text-ink">Original page</h2>
      </div>

      <div
        ref={containerRef}
        className={`relative mx-4 mb-3 overflow-hidden rounded-sm border border-rule bg-inset flex items-center justify-center ${
          canPan ? (dragging ? 'cursor-grabbing' : 'cursor-grab') : ''
        }`}
        style={{ minHeight: '320px' }}
        onMouseDown={handleMouseDown}
      >
        {hasImage ? (
          <img
            src={imageUrl}
            alt={title}
            draggable={false}
            className="select-none"
            style={{
              transform: `scale(${zoom / 100}) translate(${panX / (zoom / 100)}px, ${panY / (zoom / 100)}px)`,
              transformOrigin: 'center center',
              maxWidth: '100%',
              maxHeight: '500px',
              objectFit: 'contain',
            }}
          />
        ) : (
          <div className="w-full max-w-[280px] p-6">
            <PaperThumb />
          </div>
        )}
      </div>

      {/* Zoom controls */}
      <div className="flex items-center gap-2 px-5 pb-4 pt-1">
        <button
          type="button"
          onClick={handleZoomOut}
          disabled={zoom <= ZOOM_MIN}
          className="inline-flex items-center justify-center w-8 h-8 rounded-btn border border-rule bg-panel hover:bg-inset text-ink disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
          aria-label="Zoom out"
        >
          <MinusIcon width={14} height={14} />
        </button>
        <span className="font-mono text-sm text-muted w-10 text-center select-none">{zoom}%</span>
        <button
          type="button"
          onClick={handleZoomIn}
          disabled={zoom >= ZOOM_MAX}
          className="inline-flex items-center justify-center w-8 h-8 rounded-btn border border-rule bg-panel hover:bg-inset text-ink disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
          aria-label="Zoom in"
        >
          <PlusIcon width={14} height={14} />
        </button>
        <div className="w-px h-5 bg-rule mx-1" />
        <button
          type="button"
          onClick={handleFit}
          className="inline-flex items-center justify-center gap-1.5 px-3 h-8 rounded-btn border border-rule bg-panel hover:bg-inset text-ink font-sans text-sm font-medium cursor-pointer transition-colors"
        >
          <MaximizeIcon width={14} height={14} />
          <span>Fit</span>
        </button>
      </div>
    </div>
  );
};

export default ImageStage;

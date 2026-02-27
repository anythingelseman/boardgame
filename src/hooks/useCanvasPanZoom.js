import { useState, useRef, useCallback } from 'react';

const ZOOM_MIN = 0.1;
const ZOOM_MAX = 3;
const ZOOM_STEP = 0.1;

export default function useCanvasPanZoom() {
    const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
    const isPanning = useRef(false);
    const panStart = useRef({ x: 0, y: 0 });
    const spaceHeld = useRef(false);

    const screenToWorld = useCallback((sx, sy, t = null) => {
        const { x, y, scale } = t || transform;
        return { x: (sx - x) / scale, y: (sy - y) / scale };
    }, [transform]);

    const worldToScreen = useCallback((wx, wy) => {
        const { x, y, scale } = transform;
        return { x: wx * scale + x, y: wy * scale + y };
    }, [transform]);

    const onWheel = useCallback((e) => {
        e.preventDefault();
        const rect = e.currentTarget.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        setTransform(prev => {
            const delta = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP;
            const newScale = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, prev.scale + delta));
            const ratio = newScale / prev.scale;
            return {
                x: mouseX - ratio * (mouseX - prev.x),
                y: mouseY - ratio * (mouseY - prev.y),
                scale: newScale,
            };
        });
    }, []);

    const onKeyDown = useCallback((e) => {
        if (e.code === 'Space') { spaceHeld.current = true; e.preventDefault(); }
    }, []);

    const onKeyUp = useCallback((e) => {
        if (e.code === 'Space') spaceHeld.current = false;
    }, []);

    // Pan triggers:
    //   • Right-click drag  (button === 2)  ← main pan method
    //   • Middle-click drag (button === 1)   ← alternative
    //   • Space + left-drag                  ← design-tool style
    // 
    // Note: right-click on objects calls e.stopPropagation() in DraggableObject,
    // so only empty canvas area receives right-click pointer events here.
    const onPointerDown = useCallback((e) => {
        const shouldPan = e.button === 2 || e.button === 1 || (e.button === 0 && spaceHeld.current);
        if (shouldPan) {
            isPanning.current = true;
            panStart.current = { x: e.clientX - transform.x, y: e.clientY - transform.y };
            e.preventDefault(); // suppress native context menu on right drag
        }
    }, [transform]);

    const onPointerMove = useCallback((e) => {
        if (!isPanning.current) return;
        setTransform(prev => ({
            ...prev,
            x: e.clientX - panStart.current.x,
            y: e.clientY - panStart.current.y,
        }));
    }, []);

    const onPointerUp = useCallback(() => {
        isPanning.current = false;
    }, []);

    const zoomIn = () => setTransform(prev => ({ ...prev, scale: Math.min(ZOOM_MAX, prev.scale + ZOOM_STEP * 2) }));
    const zoomOut = () => setTransform(prev => ({ ...prev, scale: Math.max(ZOOM_MIN, prev.scale - ZOOM_STEP * 2) }));
    const resetView = () => setTransform({ x: 0, y: 0, scale: 1 });

    return {
        transform,
        screenToWorld,
        worldToScreen,
        isPanning: () => isPanning.current,
        isSpaceHeld: () => spaceHeld.current,
        handlers: { onWheel, onPointerDown, onPointerMove, onPointerUp, onKeyDown, onKeyUp },
        zoomIn,
        zoomOut,
        resetView,
    };
}

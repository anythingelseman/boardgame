import { useState, useEffect, useCallback } from 'react';

export default function useContextMenu() {
    const [menu, setMenu] = useState(null); // { x, y, objectId }

    const open = useCallback((e, objectId) => {
        e.preventDefault();
        e.stopPropagation();
        setMenu({ x: e.clientX, y: e.clientY, objectId });
    }, []);

    const close = useCallback(() => setMenu(null), []);

    useEffect(() => {
        if (!menu) return;
        const handleClick = () => close();
        const handleKey = (e) => { if (e.key === 'Escape') close(); };
        window.addEventListener('click', handleClick);
        window.addEventListener('keydown', handleKey);
        return () => {
            window.removeEventListener('click', handleClick);
            window.removeEventListener('keydown', handleKey);
        };
    }, [menu, close]);

    return { menu, open, close };
}

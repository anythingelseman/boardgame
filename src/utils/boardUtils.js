export const serializeBoard = (objects, meta = {}) => {
    return JSON.stringify({
        version: 1,
        name: meta.name || 'Untitled Board',
        background: meta.background || 'felt-green',
        created: new Date().toISOString(),
        objects: objects.map(obj => ({ ...obj, ownerId: null })), // strip ownership on save
    }, null, 2);
};

export const deserializeBoard = (jsonStr) => {
    try {
        const data = JSON.parse(jsonStr);
        if (!data.version || !Array.isArray(data.objects)) throw new Error('Invalid board file');
        return data;
    } catch (e) {
        console.error('Board load error:', e);
        return null;
    }
};

export const getSavedBoards = () => {
    try {
        return JSON.parse(localStorage.getItem('boardgame_saved') || '[]');
    } catch {
        return [];
    }
};

export const saveBoard = (name, objects, meta = {}) => {
    const boards = getSavedBoards();
    const existing = boards.findIndex(b => b.name === name);
    const board = {
        name,
        background: meta.background || 'felt-green',
        saved: new Date().toISOString(),
        objects: objects.map(obj => ({ ...obj, ownerId: null })),
    };
    if (existing >= 0) boards[existing] = board;
    else boards.push(board);
    localStorage.setItem('boardgame_saved', JSON.stringify(boards));
};

export const deleteSavedBoard = (name) => {
    const boards = getSavedBoards().filter(b => b.name !== name);
    localStorage.setItem('boardgame_saved', JSON.stringify(boards));
};

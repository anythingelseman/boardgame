import { useEffect } from 'react';

export default function ImageModal({ url, label, onClose }) {
    // Close on Escape key
    useEffect(() => {
        const handle = (e) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', handle);
        return () => window.removeEventListener('keydown', handle);
    }, [onClose]);

    return (
        <div
            className="fixed inset-0 flex items-center justify-center z-9999"
            style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(6px)' }}
            onClick={onClose}
        >
            <div
                className="relative flex flex-col items-center gap-4 p-4"
                onClick={(e) => e.stopPropagation()} // don't close when clicking the image
            >
                {/* Close button */}
                <button
                    onClick={onClose}
                    className="absolute -top-2 -right-2 z-10 w-8 h-8 rounded-full bg-stone-800 border border-white/20 text-stone-300 hover:text-white hover:bg-stone-700 flex items-center justify-center text-sm transition-colors shadow-lg"
                >
                    ✕
                </button>

                {/* Image */}
                <div
                    className="rounded-xl overflow-hidden shadow-2xl border border-white/10"
                    style={{ maxWidth: '80vw', maxHeight: '80vh' }}
                >
                    <img
                        src={url}
                        alt={label}
                        draggable={false}
                        style={{
                            maxWidth: '80vw',
                            maxHeight: '80vh',
                            objectFit: 'contain',
                            display: 'block',
                        }}
                    />
                </div>

                {/* Label */}
                {label && (
                    <div className="text-stone-300 text-sm font-semibold tracking-wide select-none">
                        {label}
                    </div>
                )}
                <div className="text-stone-600 text-xs select-none">Click outside or press Esc to close</div>
            </div>
        </div>
    );
}

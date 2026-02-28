import { createPortal } from 'react-dom';
import useGameStore from '../../store/gameStore';

export default function PermissionModal({ onResponse }) {
    const { pendingPermissionReq, setPendingPermission, waitingForPermission, setWaitingForPermission } = useGameStore();

    if (!pendingPermissionReq && !waitingForPermission) return null;

    // Incoming Request
    if (pendingPermissionReq) {
        const { fromName, type } = pendingPermissionReq;
        const actionLabel = type === 'VIEW_HAND' ? 'view your hand' : 'steal a random card from you';

        const handleAction = (approved) => {
            onResponse(pendingPermissionReq.fromId, pendingPermissionReq.requestId, approved);
            setPendingPermission(null);
        };

        return createPortal(
            <div className="fixed inset-0 z-10001 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }}>
                <div className="bg-stone-900 border-2 border-amber-500/50 rounded-2xl p-6 max-w-sm w-full shadow-2xl animate-in zoom-in-95 duration-200">
                    <div className="text-center">
                        <div className="w-16 h-16 bg-amber-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-amber-500/20">
                            <span className="text-3xl">{type === 'VIEW_HAND' ? '👁️' : '🎰'}</span>
                        </div>
                        <h3 className="text-xl font-bold text-white mb-2">Permission Request</h3>
                        <p className="text-stone-300 text-sm mb-6">
                            <span className="text-amber-400 font-bold">{fromName}</span> wants to {actionLabel}.
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => handleAction(true)}
                                className="flex-1 py-2.5 bg-green-600 hover:bg-green-500 text-white rounded-xl font-bold transition-colors shadow-lg"
                            >
                                Approve
                            </button>
                            <button
                                onClick={() => handleAction(false)}
                                className="flex-1 py-2.5 bg-stone-700 hover:bg-stone-600 text-white rounded-xl font-bold transition-colors"
                            >
                                Deny
                            </button>
                        </div>
                    </div>
                </div>
            </div>,
            document.body
        );
    }

    // Outgoing Request (Waiting)
    if (waitingForPermission) {
        return createPortal(
            <div className="fixed inset-0 z-10001 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.4)' }}>
                <div className="bg-stone-900 border border-white/10 rounded-2xl p-6 max-w-sm w-full shadow-2xl animate-pulse">
                    <div className="text-center">
                        <div className="w-12 h-12 border-4 border-amber-500/20 border-t-amber-500 rounded-full animate-spin mx-auto mb-4" />
                        <h3 className="text-lg font-bold text-white mb-2">Waiting for Permission</h3>
                        <p className="text-stone-400 text-sm mb-4">
                            Asking <span className="text-amber-400">{waitingForPermission.toName}</span> for permission...
                        </p>
                        <button
                            onClick={() => setWaitingForPermission(null)}
                            className="text-stone-500 hover:text-red-400 text-xs font-medium uppercase tracking-widest transition-colors underline decoration-dotted"
                        >
                            Cancel Request
                        </button>
                    </div>
                </div>
            </div>,
            document.body
        );
    }

    return null;
}

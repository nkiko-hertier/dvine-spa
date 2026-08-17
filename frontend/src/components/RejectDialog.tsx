import { useState } from 'react';
import { Trash2 } from 'lucide-react';

export function RejectDialog({ onCancel, onConfirm, pending }: { onCancel: () => void; onConfirm: (reason: string) => void; pending: boolean }) {
  const [reason, setReason] = useState('');
  return (
    <div className="modal-layer">
      <div className="modal-card" role="dialog" aria-modal="true">
        <div className="modal-icon danger">
          <Trash2 size={18} />
        </div>
        <h2 className="display">Reject this request?</h2>
        <p>This removes it from the active queue. A short reason helps keep the record clear.</p>
        <label className="field-label">
          Reason <textarea data-testid="input-rejection-reason" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="For example, requested time is unavailable" />
        </label>
        <div className="modal-actions">
          <button data-testid="button-cancel-rejection" className="button button-outline" onClick={onCancel}>
            Keep request
          </button>
          <button data-testid="button-confirm-rejection" className="button button-danger" disabled={!reason.trim() || pending} onClick={() => onConfirm(reason.trim())}>
            {pending ? 'Rejecting…' : 'Reject request'}
          </button>
        </div>
      </div>
    </div>
  );
}

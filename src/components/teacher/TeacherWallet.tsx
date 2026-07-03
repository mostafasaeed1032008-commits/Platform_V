import React, { useEffect, useState } from "react";
import { Check, X, AlertCircle, RefreshCw, Wallet, Calendar, User, Clipboard, Clock } from "lucide-react";
import { WalletTransaction } from "../../types";

export const TeacherWallet: React.FC = () => {
  const [pendingTx, setPendingTx] = useState<WalletTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Rejection modal state
  const [selectedTxId, setSelectedTxId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);

  // Iframe-safe notification and confirmation states
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [confirmModal, setConfirmModal] = useState<{
    txId: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(prev => prev?.message === message ? null : prev);
    }, 4000);
  };

  useEffect(() => {
    fetchPendingRequests();
  }, []);

  const fetchPendingRequests = () => {
    setLoading(true);
    fetch("/api/wallet/approvals", {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`
      }
    })
      .then(res => {
        if (!res.ok) throw new Error("Failed to fetch pending wallet requests");
        return res.json();
      })
      .then(data => {
        setPendingTx(data);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  };

  const handleApprove = (txId: string) => {
    setConfirmModal({
      txId,
      message: "Confirm point top-up approval? This will immediately credit points to the student's balance.",
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/wallet/approvals/${txId}/approve`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`
            }
          });

          if (!res.ok) throw new Error("Failed to approve transaction");
          showToast("Top-up request approved successfully!", "success");
          fetchPendingRequests();
        } catch (err: any) {
          showToast(err.message || "Failed to approve point conversion", "error");
        } finally {
          setConfirmModal(null);
        }
      }
    });
  };

  const handleOpenRejectModal = (txId: string) => {
    setSelectedTxId(txId);
    setRejectionReason("");
    setIsRejectModalOpen(true);
  };

  const handleReject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTxId) return;

    try {
      const res = await fetch(`/api/wallet/approvals/${selectedTxId}/reject`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`
        },
        body: JSON.stringify({ reason: rejectionReason })
      });

      if (!res.ok) throw new Error("Failed to reject transaction");

      setIsRejectModalOpen(false);
      setSelectedTxId(null);
      showToast("Top-up request successfully rejected.", "success");
      fetchPendingRequests();
    } catch (err: any) {
      showToast(err.message || "Failed to reject transaction", "error");
    }
  };

  const formatDate = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString() + " " + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (e) {
      return isoString;
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-slate-900 tracking-tight">Manual Payments Desk</h1>
          <p className="text-slate-500 text-sm mt-1">Review and approve manual Vodafone Cash wallet top-ups submitted by students.</p>
        </div>
        <button
          onClick={fetchPendingRequests}
          className="flex items-center gap-1.5 px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 border border-indigo-100 rounded-xl text-xs font-bold cursor-pointer transition-all"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl flex items-center gap-2">
          <AlertCircle size={20} className="shrink-0" />
          <span>Error loading manual payments: {error}</span>
        </div>
      )}

      {/* Loading state */}
      {loading ? (
        <div className="flex items-center justify-center min-h-[300px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>
      ) : pendingTx.length === 0 ? (
        <div className="text-center py-16 bg-white border border-slate-200 rounded-2xl">
          <Wallet className="mx-auto text-slate-300 mb-4" size={48} />
          <h3 className="font-display font-bold text-slate-700 text-lg">Payments Queue Cleared</h3>
          <p className="text-slate-400 text-sm max-w-sm mx-auto mt-2">
            No pending Vodafone Cash point requests exist at this time. All submissions have been approved or rejected.
          </p>
        </div>
      ) : (
        /* Requests Cards / Table */
        <div className="space-y-4">
          {pendingTx.map(tx => (
            <div
              key={tx.id}
              className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs hover:shadow-sm transition-all flex flex-col lg:flex-row justify-between lg:items-center gap-6"
            >
              {/* Left Side: Student and Transaction Info */}
              <div className="space-y-4 lg:space-y-0 lg:flex lg:items-center lg:gap-8 flex-1">
                {/* Student identification */}
                <div className="space-y-1 shrink-0 w-64">
                  <span className="text-[10px] uppercase font-bold text-indigo-500 tracking-wider">Student Profile</span>
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 bg-slate-100 border border-slate-200 rounded-full flex items-center justify-center font-bold text-slate-600 text-sm">
                      {tx.reference_note.charAt(0) || "S"}
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-800 text-sm">{(tx as any).student_name || "Unknown"}</h4>
                      <p className="text-[11px] text-slate-400">{(tx as any).student_email || "Not specified"}</p>
                    </div>
                  </div>
                </div>

                {/* Amount */}
                <div className="space-y-1 shrink-0 w-40">
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Requested Points</span>
                  <h3 className="text-xl font-display font-bold text-slate-800 flex items-baseline gap-1">
                    {tx.points_amount}
                    <span className="text-xs text-slate-400 font-normal">pts</span>
                  </h3>
                </div>

                {/* Date & Time */}
                <div className="space-y-1 shrink-0 w-44">
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Request Date</span>
                  <p className="text-xs text-slate-600 flex items-center gap-1">
                    <Clock size={13} className="text-slate-400" />
                    {formatDate(tx.created_at)}
                  </p>
                </div>

                {/* Reference note (screenshot info / numbers) */}
                <div className="space-y-1 flex-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Reference Info / Note</span>
                  <div className="bg-slate-50 border border-slate-100 rounded-xl p-2.5 text-xs text-slate-600 italic font-medium break-words">
                    {tx.reference_note}
                  </div>
                </div>
              </div>

              {/* Right Side: Approval Actions */}
              <div className="flex items-center gap-2 lg:border-l lg:border-slate-100 lg:pl-6 pt-4 lg:pt-0 shrink-0 justify-end">
                <button
                  onClick={() => handleOpenRejectModal(tx.id)}
                  className="flex items-center gap-1.5 px-4 py-2.5 border border-slate-200 text-slate-500 hover:text-rose-600 hover:border-rose-100 hover:bg-rose-50 font-bold rounded-xl text-xs cursor-pointer transition-all"
                >
                  <X size={15} /> Reject
                </button>
                <button
                  onClick={() => handleApprove(tx.id)}
                  className="flex items-center gap-1.5 px-4.5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs cursor-pointer transition-all shadow-sm"
                >
                  <Check size={15} /> Approve
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Rejection Reason Modal */}
      {isRejectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-md overflow-hidden animate-slide-up">
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-lg font-display font-bold text-slate-900">Decline Top-Up Request</h3>
              <button
                onClick={() => setIsRejectModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-semibold cursor-pointer"
              >
                Close
              </button>
            </div>

            <form onSubmit={handleReject} className="p-6 space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                  Rejection Reason (Optional)
                </label>
                <textarea
                  rows={3}
                  placeholder="e.g. Invalid reference code. Please upload a clear screenshot of the Vodafone Cash confirmation SMS."
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm"
                />
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsRejectModalOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:text-slate-800 text-sm font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl transition-all shadow-sm cursor-pointer"
                >
                  Decline Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Iframe-Safe Confirmation Modal */}
      {confirmModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-md overflow-hidden p-6 space-y-6 animate-scale-in">
            <div className="space-y-2">
              <h3 className="text-lg font-display font-bold text-slate-900">Confirm Action</h3>
              <p className="text-sm text-slate-600 leading-relaxed">{confirmModal.message}</p>
            </div>
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setConfirmModal(null)}
                className="px-4 py-2 text-slate-600 hover:text-slate-800 font-bold text-sm cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmModal.onConfirm}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded-xl cursor-pointer shadow-md hover:shadow-lg transition-all"
              >
                Confirm Approve
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Iframe-Safe Toast Alerts */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-[200] max-w-sm w-full bg-white border border-slate-200 shadow-2xl rounded-2xl p-4 flex items-start gap-3 animate-slide-up">
          <div className={`p-1.5 rounded-lg shrink-0 ${toast.type === "success" ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"}`}>
            {toast.type === "success" ? <Check size={16} /> : <X size={16} />}
          </div>
          <div className="flex-1 text-xs font-semibold text-slate-800 leading-relaxed mt-0.5">
            {toast.message}
          </div>
          <button onClick={() => setToast(null)} className="text-slate-400 hover:text-slate-600 text-xs shrink-0 font-bold">
            Close
          </button>
        </div>
      )}
    </div>
  );
};

import React, { useState, useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { THEME_CONFIG, getPlatformSettings } from "../../theme.config";
import { 
  Coins, 
  Clock, 
  CheckCircle, 
  XCircle, 
  ShoppingBag, 
  ArrowUpRight, 
  HelpCircle, 
  Info, 
  Copy, 
  Check, 
  AlertCircle 
} from "lucide-react";
import { motion } from "motion/react";

interface StudentWalletProps {
  onRefreshBalance: () => void;
}

export const StudentWallet: React.FC<StudentWalletProps> = ({ onRefreshBalance }) => {
  const { token } = useAuth();
  const [balance, setBalance] = useState<number>(0);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Form states
  const [pointsToRequest, setPointsToRequest] = useState<string>("");
  const [referenceNote, setReferenceNote] = useState<string>("");
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Copied alert state
  const [copied, setCopied] = useState<boolean>(false);

  // Generate a mock unique reference code for instruction validation
  const [uniqueRefCode, setUniqueRefCode] = useState<string>("");

  useEffect(() => {
    fetchWalletData();
    // Generate a secure, unique reference for the student to include in their transfer notes
    setUniqueRefCode(`REF-${Math.floor(100000 + Math.random() * 900000)}`);
  }, [token]);

  const fetchWalletData = () => {
    setLoading(true);
    fetch("/api/wallet/balance", {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load wallet metrics");
        return res.json();
      })
      .then((data) => {
        setBalance(data.current_balance || 0);
        setTransactions(data.transactions || []);
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  };

  const copyVodafoneNumber = () => {
    const num = getPlatformSettings().vodafoneCashNumber || "01012345678";
    navigator.clipboard.writeText(num);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleTopupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pointsToRequest || !referenceNote) {
      setErrorMsg("Please enter points amount and reference notes/screenshot links");
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await fetch("/api/wallet/topup", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          points: pointsToRequest,
          reference_note: `${referenceNote} (Included Reference: ${uniqueRefCode})`
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to submit topup request");
      }

      // Success
      setSuccessMsg("Top-up request successfully submitted for teacher review!");
      setPointsToRequest("");
      setReferenceNote("");
      // Refresh local balance metrics
      fetchWalletData();
      onRefreshBalance();
      // Re-generate a new reference code for subsequent transfers
      setUniqueRefCode(`REF-${Math.floor(100000 + Math.random() * 900000)}`);
    } catch (err: any) {
      setErrorMsg(err.message || "An error occurred.");
    } finally {
      setSubmitting(false);
    }
  };

  // Convert points to EGP (Example standard rate: 1 Point = 1 EGP or customized as requested)
  const egpCost = pointsToRequest ? Number(pointsToRequest) : 0;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-slate-500 font-medium text-xs mt-4">Loading your digital wallet...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-display font-bold text-2xl text-slate-800">My Financial Wallet</h1>
        <p className="text-xs text-slate-500">Track point ledgers, purchase course contents, and request secure manual topups.</p>
      </div>

      {/* Grid: Balance Card & Vodafone Cash Instructions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Card: Points Balance */}
        <div className="lg:col-span-1 bg-gradient-to-br from-indigo-600 to-indigo-800 rounded-3xl p-6 text-white shadow-lg relative overflow-hidden flex flex-col justify-between h-56">
          <div className="absolute -right-10 -bottom-10 w-44 h-44 bg-white/5 rounded-full blur-xl"></div>
          
          <div className="space-y-1 z-10">
            <span className="text-[10px] uppercase font-bold text-indigo-100 tracking-wider flex items-center gap-1">
              <Coins size={12} /> Points Balance
            </span>
            <h2 className="font-display font-black text-3xl sm:text-4xl tracking-tight">
              {balance.toLocaleString()} <span className="text-xs font-normal text-indigo-100">pts</span>
            </h2>
          </div>

          <div className="bg-white/10 p-3 rounded-2xl border border-white/10 text-[11px] leading-relaxed z-10 backdrop-blur-xs">
            <span className="font-bold flex items-center gap-1"><Info size={12} className="shrink-0 text-amber-300" /> Exchange Rate</span>
            <span>1 Point is equivalent to 1 EGP. Use points to unlock exams and premium lessons.</span>
          </div>
        </div>

        {/* Right Cards: Vodafone Cash Guide & Quick transfer info */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-xs flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <h3 className="font-display font-bold text-slate-800 text-sm flex items-center gap-1.5 uppercase tracking-wider">
              <span className="w-2.5 h-2.5 rounded-full bg-red-600"></span> Vodafone Cash Top-Up Desk
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Transfer the exact EGP amount to the merchant wallet below. Once done, submit the form with your transfer screenshot reference, wallet phone number, and transaction time.
            </p>
          </div>

          {/* Copyable Vodafone Number & reference */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl space-y-1">
              <span className="text-[9px] font-bold text-slate-400 block uppercase tracking-widest">Vodafone Wallet Number</span>
              <div className="flex items-center justify-between">
                <span className="font-mono font-bold text-slate-800 text-sm">
                  {getPlatformSettings().vodafoneCashNumber || "01012345678"}
                </span>
                <button
                  onClick={copyVodafoneNumber}
                  className="p-1.5 bg-white border border-slate-200 text-indigo-600 hover:text-indigo-800 rounded-lg cursor-pointer transition-all shadow-xs"
                >
                  {copied ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                </button>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl space-y-1">
              <span className="text-[9px] font-bold text-slate-400 block uppercase tracking-widest">Your Unique Transfer Reference</span>
              <div className="flex items-center justify-between">
                <span className="font-mono font-bold text-indigo-700 text-sm">{uniqueRefCode}</span>
                <span className="text-[10px] text-slate-400 font-semibold bg-white border border-slate-100 px-1.5 py-0.5 rounded-md">Include in form</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Grid: Ledger History vs Form Submission */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Topup Form */}
        <div className="lg:col-span-1 bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-xs space-y-5">
          <div className="space-y-1">
            <h3 className="font-display font-bold text-slate-800 text-sm">Request Balance Addition</h3>
            <p className="text-[10px] text-slate-400 uppercase tracking-widest">PENDING MANUAL REVIEW</p>
          </div>

          <form onSubmit={handleTopupSubmit} className="space-y-4">
            {/* Points Request Input */}
            <div className="space-y-1.5">
              <label className={THEME_CONFIG.classes.label}>Desired Points Amount</label>
              <div className="relative">
                <Coins className="absolute left-3 top-3 text-slate-400 w-4 h-4" />
                <input
                  type="number"
                  min="5"
                  placeholder="e.g. 100"
                  value={pointsToRequest}
                  onChange={(e) => setPointsToRequest(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-xs"
                  required
                />
              </div>
              {egpCost > 0 && (
                <div className="text-[10px] font-semibold text-slate-500 pt-0.5">
                  Cost to Transfer: <span className="text-indigo-600 font-bold">{egpCost} EGP</span>
                </div>
              )}
            </div>

            {/* Reference Screenshot link / Note */}
            <div className="space-y-1.5">
              <label className={THEME_CONFIG.classes.label}>Transfer Reference Details</label>
              <textarea
                rows={3}
                placeholder="e.g., Sent 100 EGP from wallet 01099988877. Transaction ID: 887261."
                value={referenceNote}
                onChange={(e) => setReferenceNote(e.target.value)}
                className="w-full p-3 bg-white border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-xs"
                required
              ></textarea>
            </div>

            {successMsg && (
              <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl text-emerald-700 text-xs flex items-start gap-1.5 leading-relaxed">
                <CheckCircle size={14} className="shrink-0 mt-0.5 text-emerald-600" />
                <span>{successMsg}</span>
              </div>
            )}

            {errorMsg && (
              <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl text-rose-700 text-xs flex items-start gap-1.5 leading-relaxed">
                <AlertCircle size={14} className="shrink-0 mt-0.5 text-rose-600" />
                <span>{errorMsg}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-all disabled:opacity-50 text-xs uppercase tracking-wider shadow-sm cursor-pointer"
            >
              {submitting ? "Submitting Ledger..." : "Submit Receipt Info"}
            </button>
          </form>
        </div>

        {/* Transaction History Logs */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-xs">
          <div className="p-5 border-b border-slate-100 bg-slate-50/50">
            <h3 className="font-display font-bold text-slate-800 text-sm">Ledger Activity</h3>
            <p className="text-[10px] text-slate-400 uppercase tracking-widest">STATEMENT & LOGS</p>
          </div>

          <div className="divide-y divide-slate-100">
            {transactions.map((tx) => {
              const isTopup = tx.type.startsWith("topup");
              const isApproved = tx.type === "topup_approved";
              const isPending = tx.type === "topup_pending";
              const isRejected = tx.type === "topup_rejected";

              return (
                <div key={tx.id} className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-start gap-3.5">
                    {/* Status Icon */}
                    <div className="mt-1 shrink-0">
                      {isApproved && <CheckCircle size={20} className="text-emerald-500 fill-emerald-50" />}
                      {isPending && <Clock size={20} className="text-amber-500 fill-amber-50" />}
                      {isRejected && <XCircle size={20} className="text-rose-500 fill-rose-50" />}
                      {tx.type === "course_purchase" && <ShoppingBag size={20} className="text-indigo-600 fill-indigo-50" />}
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-800">
                          {tx.type === "course_purchase" ? "Course Unlocked" : "Points Top-up"}
                        </span>
                        {/* Custom status pill */}
                        {isPending && (
                          <span className="text-[9px] font-bold bg-amber-50 border border-amber-100 text-amber-700 px-2 py-0.5 rounded-full uppercase">
                            Pending Review
                          </span>
                        )}
                        {isApproved && (
                          <span className="text-[9px] font-bold bg-emerald-50 border border-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full uppercase">
                            Approved
                          </span>
                        )}
                        {isRejected && (
                          <span className="text-[9px] font-bold bg-rose-50 border border-rose-100 text-rose-700 px-2 py-0.5 rounded-full uppercase">
                            Rejected
                          </span>
                        )}
                      </div>

                      <p className="text-[11px] text-slate-500 max-w-sm leading-relaxed font-mono">
                        {tx.reference_note}
                      </p>

                      {isRejected && tx.rejection_reason && (
                        <div className="text-[11px] text-rose-600 font-bold bg-rose-50/50 p-2 rounded-lg border border-rose-100">
                          Reason: {tx.rejection_reason}
                        </div>
                      )}

                      <span className="text-[10px] text-slate-400 block font-semibold">
                        {new Date(tx.created_at).toLocaleString()}
                      </span>
                    </div>
                  </div>

                  {/* Points amount tag */}
                  <div className="text-right shrink-0">
                    <span className={`text-sm font-extrabold flex items-center gap-1 justify-end ${
                      isApproved ? "text-emerald-600" :
                      tx.type === "course_purchase" ? "text-rose-600" : "text-slate-500"
                    }`}>
                      {tx.type === "course_purchase" ? "-" : "+"}
                      {tx.points_amount.toLocaleString()} <span className="text-[10px] font-bold text-slate-400">pts</span>
                    </span>
                  </div>
                </div>
              );
            })}

            {transactions.length === 0 && (
              <div className="p-8 text-center text-xs text-slate-400 font-medium">
                No past transactions recorded in your ledger yet.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

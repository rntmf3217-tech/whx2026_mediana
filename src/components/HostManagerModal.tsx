import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X, Plus, Trash2, Check, Lock } from "lucide-react";
import { cn } from "../lib/utils";
import { hostAdmin, HostAdminError, type HostRecord } from "../lib/hosts";

// Admin-page dialog to add / edit / deactivate / delete meeting hosts.
// Every change goes through /api/hosts, which checks a server-only password;
// the password is kept for this browser tab only.

const PASSWORD_KEY = "hostAdminPassword";

function readStoredPassword() {
  try { return sessionStorage.getItem(PASSWORD_KEY) || ""; } catch { return ""; }
}
function storePassword(value: string | null) {
  try {
    if (value) sessionStorage.setItem(PASSWORD_KEY, value);
    else sessionStorage.removeItem(PASSWORD_KEY);
  } catch { /* storage unavailable — the password just won't be remembered */ }
}

interface HostManagerModalProps {
  onClose: () => void;
  onChanged: () => void; // refresh the Meeting With dropdowns
}

export function HostManagerModal({ onClose, onChanged }: HostManagerModalProps) {
  const [password, setPassword] = useState(readStoredPassword);
  const [passwordInput, setPasswordInput] = useState("");
  const [unlocked, setUnlocked] = useState(false);
  const [hosts, setHosts] = useState<HostRecord[]>([]);
  const [drafts, setDrafts] = useState<Record<string, { name: string; email: string }>>({});
  const [newHost, setNewHost] = useState({ name: "", email: "" });
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async (pw: string) => {
    setError("");
    try {
      const data = await hostAdmin(pw, { op: "list" });
      setHosts(data.hosts ?? []);
      setPassword(pw);
      storePassword(pw);
      setUnlocked(true);
    } catch (e) {
      if (e instanceof HostAdminError && e.status === 401) {
        storePassword(null);
        setUnlocked(false);
        setError("비밀번호가 맞지 않습니다.");
      } else {
        setError(e instanceof Error ? e.message : String(e));
      }
    }
  }, []);

  // Reuse the password entered earlier in this tab
  useEffect(() => {
    const stored = readStoredPassword();
    if (stored) load(stored);
  }, [load]);

  const run = async (key: string, action: () => Promise<unknown>) => {
    setBusy(key);
    setError("");
    try {
      await action();
      // Drop only this row's unsaved edits; other rows keep theirs
      setDrafts(prev => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
      await load(password);
      onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  };

  const draftOf = (h: HostRecord) => drafts[h.id] ?? { name: h.name, email: h.email };
  const isDirty = (h: HostRecord) => {
    const d = draftOf(h);
    return d.name.trim() !== h.name || d.email.trim() !== h.email;
  };

  const handleSave = (h: HostRecord) => {
    const d = draftOf(h);
    const renamed = d.name.trim() !== h.name;
    if (renamed && h.assigned > 0 &&
        !confirm(`"${h.name}"에게 배정된 예약 ${h.assigned}건의 담당자 이름도 "${d.name.trim()}"(으)로 바뀝니다. 계속할까요?`)) {
      return;
    }
    run(h.id, () => hostAdmin(password, { op: "update", id: h.id, name: d.name, email: d.email }));
  };

  const handleDelete = (h: HostRecord) => {
    const message = h.assigned > 0
      ? `"${h.name}"에게 배정된 예약이 ${h.assigned}건 있습니다.\n삭제하면 이 예약들의 담당자 알림 메일이 더 이상 가지 않습니다.\n목록에서만 빼려면 "사용"을 끄세요.\n\n그래도 삭제할까요?`
      : `"${h.name}"을(를) 삭제할까요?`;
    if (!confirm(message)) return;
    run(h.id, () => hostAdmin(password, { op: "delete", id: h.id }));
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    run("new", async () => {
      await hostAdmin(password, { op: "create", name: newHost.name, email: newHost.email });
      setNewHost({ name: "", email: "" });
    });
  };

  const inputClass = "w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:border-brand-cyan focus:outline-none";

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="host-manager-title">
      <div className="bg-[#0F1A33] border border-white/10 rounded-2xl w-full max-w-3xl flex flex-col max-h-[85dvh] shadow-2xl">
        <div className="p-6 border-b border-white/10 flex justify-between items-center shrink-0">
          <h2 id="host-manager-title" className="text-xl font-bold text-white">담당자 관리</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-full" aria-label="Close">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6">
          {error && (
            <div className="px-4 py-3 rounded-lg bg-brand-red/10 border border-brand-red/20 text-brand-red text-sm">{error}</div>
          )}

          {!unlocked ? (
            <form
              onSubmit={(e) => { e.preventDefault(); load(passwordInput); }}
              className="space-y-4 max-w-sm mx-auto py-6"
            >
              <div className="flex items-center gap-2 text-slate-300 text-sm">
                <Lock className="w-4 h-4" /> 담당자 관리 비밀번호를 입력하세요.
              </div>
              <input
                type="password"
                autoFocus
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                className={inputClass}
                aria-label="담당자 관리 비밀번호"
              />
              <button type="submit" disabled={!passwordInput} className="w-full px-4 py-2.5 bg-brand-cyan/10 text-brand-cyan border border-brand-cyan/20 rounded-xl hover:bg-brand-cyan/20 transition-all text-sm font-bold disabled:opacity-50">
                확인
              </button>
            </form>
          ) : (
            <>
              <p className="text-slate-400 text-sm">
                "사용"을 끄면 Meeting With 선택 목록에서만 빠지고, 이미 배정된 예약과 알림 메일은 그대로 유지됩니다.
              </p>

              <div className="space-y-3">
                {hosts.map(h => {
                  const d = draftOf(h);
                  return (
                    <div key={h.id} className={cn("grid grid-cols-1 md:grid-cols-[1fr_1.6fr_auto_auto] gap-3 items-center p-3 rounded-xl border border-white/5", h.active ? "bg-white/5" : "bg-white/[0.02] opacity-60")}>
                      <input
                        value={d.name}
                        onChange={(e) => setDrafts(prev => ({ ...prev, [h.id]: { ...d, name: e.target.value } }))}
                        className={inputClass}
                        aria-label="이름"
                      />
                      <input
                        type="email"
                        value={d.email}
                        onChange={(e) => setDrafts(prev => ({ ...prev, [h.id]: { ...d, email: e.target.value } }))}
                        className={inputClass}
                        aria-label="이메일"
                      />
                      <label className="flex items-center gap-2 text-sm text-slate-300 whitespace-nowrap cursor-pointer">
                        <input
                          type="checkbox"
                          checked={h.active}
                          disabled={busy !== null}
                          onChange={(e) => run(h.id, () => hostAdmin(password, { op: "update", id: h.id, active: e.target.checked }))}
                          className="accent-brand-cyan w-4 h-4"
                        />
                        사용
                        <span className="text-slate-500 text-xs">· 배정 {h.assigned}</span>
                      </label>
                      <div className="flex gap-2 justify-end">
                        <button
                          onClick={() => handleSave(h)}
                          disabled={!isDirty(h) || busy !== null}
                          className="p-2 rounded-lg text-brand-cyan hover:bg-brand-cyan/10 disabled:opacity-30 disabled:hover:bg-transparent"
                          title="저장"
                          aria-label={`${h.name} 저장`}
                        >
                          <Check className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => handleDelete(h)}
                          disabled={busy !== null}
                          className="p-2 rounded-lg text-slate-400 hover:text-brand-red hover:bg-brand-red/10 disabled:opacity-30"
                          title="삭제"
                          aria-label={`${h.name} 삭제`}
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-[1fr_1.6fr_auto] gap-3 items-center p-3 rounded-xl border border-dashed border-white/15">
                <input
                  placeholder="이름 (예: Marc)"
                  value={newHost.name}
                  onChange={(e) => setNewHost({ ...newHost, name: e.target.value })}
                  className={inputClass}
                  aria-label="새 담당자 이름"
                />
                <input
                  type="email"
                  placeholder="이메일"
                  value={newHost.email}
                  onChange={(e) => setNewHost({ ...newHost, email: e.target.value })}
                  className={inputClass}
                  aria-label="새 담당자 이메일"
                />
                <button
                  type="submit"
                  disabled={!newHost.name.trim() || !newHost.email.trim() || busy !== null}
                  className="flex items-center justify-center gap-2 px-4 py-2 bg-brand-cyan/10 text-brand-cyan border border-brand-cyan/20 rounded-lg hover:bg-brand-cyan/20 transition-all text-sm font-bold disabled:opacity-50 whitespace-nowrap"
                >
                  <Plus className="w-4 h-4" /> 담당자 추가
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

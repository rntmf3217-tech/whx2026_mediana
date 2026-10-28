// Client for /api/hosts — the meeting host (Meeting With) directory.

export interface HostName {
  name: string;
  active: boolean;
}

export interface HostRecord extends HostName {
  id: string;
  email: string;
  sort_order: number;
  assigned: number; // bookings (all editions) currently assigned to this host
}

// Names only, no emails. Returns null when the directory isn't available
// (e.g. server key not configured yet) so callers can fall back to the edition's list.
export async function fetchHostNames(): Promise<HostName[] | null> {
  try {
    const res = await fetch("/api/hosts");
    if (!res.ok) return null;
    const data = await res.json();
    return Array.isArray(data.hosts) ? data.hosts : null;
  } catch {
    return null;
  }
}

export class HostAdminError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

type HostOp =
  | { op: "list" }
  | { op: "create"; name: string; email: string; active?: boolean }
  | { op: "update"; id: string; name?: string; email?: string; active?: boolean }
  | { op: "delete"; id: string };

export async function hostAdmin(password: string, body: HostOp): Promise<{ hosts?: HostRecord[] }> {
  const res = await fetch("/api/hosts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password, ...body }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new HostAdminError(data.error || `Request failed (${res.status})`, res.status);
  return data;
}

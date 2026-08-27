import { adminStats, getUser, listUsers, recentAuditLogs } from "@iw3h/db";
import SignInGate from "@/components/SignInGate";
import { auth } from "@/lib/auth";
import { db } from "@/lib/turso";

export const dynamic = "force-dynamic";

export default async function Dashboard() {
  const session = await auth.getSession();
  if (!session.address) return <SignInGate reason="signin" />;

  // RBAC di server component: role dibaca segar dari DB setiap request.
  const user = await getUser(db, session.address);
  if (user?.role !== "admin") return <SignInGate reason="forbidden" />;

  const [stats, users, logs] = await Promise.all([
    adminStats(db),
    listUsers(db, 50),
    recentAuditLogs(db, 20),
  ]);

  return (
    <main>
      <h1>Backoffice IW3H</h1>
      <p>
        Masuk sebagai <code>{user.address}</code>
      </p>

      <div className="stats">
        <div className="stat">
          <b>{stats.users}</b>
          <span>Users</span>
        </div>
        <div className="stat">
          <b>{stats.registrations}</b>
          <span>Registrasi</span>
        </div>
        <div className="stat">
          <b>{stats.projects}</b>
          <span>Projects</span>
        </div>
        <div className="stat">
          <b>{stats.scores}</b>
          <span>Skor juri</span>
        </div>
      </div>

      <h2>Users terbaru</h2>
      <table>
        <thead>
          <tr>
            <th>Address</th>
            <th>Username</th>
            <th>Role</th>
            <th>Bergabung</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.address}>
              <td>
                <code>{u.address}</code>
              </td>
              <td>{u.username ?? "—"}</td>
              <td>{u.role}</td>
              <td>{u.createdAt}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2>Audit log</h2>
      <table>
        <thead>
          <tr>
            <th>Waktu</th>
            <th>Aktor</th>
            <th>Aksi</th>
            <th>Target</th>
          </tr>
        </thead>
        <tbody>
          {logs.length === 0 && (
            <tr>
              <td colSpan={4}>Belum ada aksi tercatat.</td>
            </tr>
          )}
          {logs.map((l) => (
            <tr key={l.id}>
              <td>{l.createdAt}</td>
              <td>
                <code>{l.actorAddress}</code>
              </td>
              <td>{l.action}</td>
              <td>{l.target ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}

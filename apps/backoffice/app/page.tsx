import {
  adminStats,
  getCurrentHackathon,
  getUser,
  listAllProjects,
  listUsers,
  recentAuditLogs,
} from "@iw3h/db";
import PhaseControl from "@/components/PhaseControl";
import ProjectActions from "@/components/ProjectActions";
import RoleSelect from "@/components/RoleSelect";
import SignInGate from "@/components/SignInGate";
import { auth } from "@/lib/auth";
import { db } from "@/lib/turso";

export const dynamic = "force-dynamic";

const short = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`;

export default async function Dashboard() {
  const session = await auth.getSession();
  if (!session.address) return <SignInGate reason="signin" />;

  // RBAC di server component: role dibaca segar dari DB setiap request.
  const user = await getUser(db, session.address);
  if (user?.role !== "admin") return <SignInGate reason="forbidden" />;

  const hackathon = await getCurrentHackathon(db);
  const [stats, users, logs, projects] = await Promise.all([
    adminStats(db),
    listUsers(db, 100),
    recentAuditLogs(db, 25),
    hackathon ? listAllProjects(db, hackathon.id) : Promise.resolve([]),
  ]);

  return (
    <main>
      <h1>Backoffice IW3H</h1>
      <p>
        Masuk sebagai <code>{short(user.address)}</code>
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

      {hackathon && (
        <>
          <h2>Fase hackathon</h2>
          <p>
            {hackathon.name} · fase sekarang: <b>{hackathon.status}</b>
          </p>
          <PhaseControl current={hackathon.status} />
        </>
      )}

      <h2>Projects ({projects.length})</h2>
      <table>
        <thead>
          <tr>
            <th>Nama</th>
            <th>Tim / Solo</th>
            <th>Tracks</th>
            <th>Status</th>
            <th>Aksi</th>
          </tr>
        </thead>
        <tbody>
          {projects.length === 0 && (
            <tr>
              <td colSpan={5}>Belum ada project.</td>
            </tr>
          )}
          {projects.map((p) => (
            <tr key={p.id} className={p.status === "disqualified" ? "dq" : ""}>
              <td>{p.name}</td>
              <td>{p.team ? p.team.name : "Solo"}</td>
              <td>{p.trackIds.join(", ")}</td>
              <td>{p.status}</td>
              <td>
                <ProjectActions id={p.id} status={p.status} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2>Users ({users.length})</h2>
      <table>
        <thead>
          <tr>
            <th>Address</th>
            <th>Username</th>
            <th>Role</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.address}>
              <td>
                <code>{short(u.address)}</code>
              </td>
              <td>{u.username ?? "—"}</td>
              <td>
                <RoleSelect address={u.address} role={u.role} />
              </td>
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
                <code>{short(l.actorAddress)}</code>
              </td>
              <td>{l.action}</td>
              <td>{l.target ? short(l.target) : "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}

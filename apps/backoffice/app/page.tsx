import {
  adminStats,
  getCurrentHackathon,
  getUser,
  listAllProjects,
  listJudgeAssignments,
  listPrizes,
  listTracks,
  listUsers,
  listWinners,
  projectRankings,
  recentAuditLogs,
} from "@iw3h/db";
import JudgeTracks from "@/components/JudgeTracks";
import PhaseControl from "@/components/PhaseControl";
import ProjectActions from "@/components/ProjectActions";
import RoleSelect from "@/components/RoleSelect";
import SignInGate from "@/components/SignInGate";
import WinnerPicker from "@/components/WinnerPicker";
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
  const [stats, users, logs, projects, rankings, prizes, winners, tracks, judgeAssign] =
    await Promise.all([
      adminStats(db),
      listUsers(db, 100),
      recentAuditLogs(db, 25),
      hackathon ? listAllProjects(db, hackathon.id) : Promise.resolve([]),
      hackathon ? projectRankings(db, hackathon.id) : Promise.resolve([]),
      hackathon ? listPrizes(db, hackathon.id) : Promise.resolve([]),
      listWinners(db),
      hackathon ? listTracks(db, hackathon.id) : Promise.resolve([]),
      hackathon ? listJudgeAssignments(db, hackathon.id) : Promise.resolve([]),
    ]);
  const judges = users.filter((u) => u.role === "judge" || u.role === "admin");
  const tracksOf = (addr: string) =>
    judgeAssign.filter((a) => a.judgeAddress === addr).map((a) => a.trackId);
  const winnerOf = (prizeId: string) =>
    winners.find((w) => w.prizeId === prizeId)?.projectId ?? null;
  const rankOptions = rankings.map((r) => ({
    projectId: r.projectId,
    name: r.name,
    avgScore: r.avgScore,
  }));

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

      <h2>Assign juri → track</h2>
      <table>
        <thead>
          <tr>
            <th>Juri</th>
            <th>Track dinilai (kosong = semua)</th>
          </tr>
        </thead>
        <tbody>
          {judges.length === 0 && (
            <tr>
              <td colSpan={2}>Belum ada user ber-role juri. Set role di tabel Users.</td>
            </tr>
          )}
          {judges.map((j) => (
            <tr key={j.address}>
              <td>
                {j.username ?? <code>{short(j.address)}</code>} <small>({j.role})</small>
              </td>
              <td>
                <JudgeTracks
                  judgeAddress={j.address}
                  tracks={tracks.map((t) => ({ id: t.id, name: t.name }))}
                  assigned={tracksOf(j.address)}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2>Ranking penjurian</h2>
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>Project</th>
            <th>Skor rata-rata</th>
            <th>Jumlah juri</th>
          </tr>
        </thead>
        <tbody>
          {rankings.length === 0 && (
            <tr>
              <td colSpan={4}>Belum ada skor.</td>
            </tr>
          )}
          {rankings.map((r, i) => (
            <tr key={r.projectId}>
              <td>{i + 1}</td>
              <td>{r.name}</td>
              <td>{r.judges > 0 ? r.avgScore.toFixed(2) : "—"}</td>
              <td>{r.judges}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2>Pemenang</h2>
      <table>
        <thead>
          <tr>
            <th>Prize</th>
            <th>Project pemenang</th>
          </tr>
        </thead>
        <tbody>
          {prizes.length === 0 && (
            <tr>
              <td colSpan={2}>Belum ada prize dikonfigurasi.</td>
            </tr>
          )}
          {prizes.map((pz) => (
            <tr key={pz.id}>
              <td>
                {pz.name}
                {pz.amountUsd ? ` · $${pz.amountUsd.toLocaleString()}` : ""}
              </td>
              <td>
                <WinnerPicker prizeId={pz.id} current={winnerOf(pz.id)} options={rankOptions} />
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

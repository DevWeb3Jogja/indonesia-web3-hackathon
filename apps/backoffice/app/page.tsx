import {
  adminStats,
  getCurrentHackathon,
  getUser,
  listCriteria,
  listJudgeAssignments,
  listPrizes,
  listTracks,
  listUsers,
  listWinners,
  projectRankings,
} from "@iw3h/db";
import AuditPanel from "@/components/AuditPanel";
import ConfigEditor from "@/components/ConfigEditor";
import HackathonSettings from "@/components/HackathonSettings";
import JudgeTracks from "@/components/JudgeTracks";
import PhaseControl from "@/components/PhaseControl";
import ProjectsPanel from "@/components/ProjectsPanel";
import SignInGate from "@/components/SignInGate";
import UsersPanel from "@/components/UsersPanel";
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
  const [stats, users, rankings, prizes, winners, tracks, criteria, judgeAssign] =
    await Promise.all([
      adminStats(db),
      listUsers(db, 100), // hanya untuk daftar juri (subset kecil)
      hackathon ? projectRankings(db, hackathon.id) : Promise.resolve([]),
      hackathon ? listPrizes(db, hackathon.id) : Promise.resolve([]),
      listWinners(db),
      hackathon ? listTracks(db, hackathon.id) : Promise.resolve([]),
      hackathon ? listCriteria(db, hackathon.id) : Promise.resolve([]),
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
  const trackOptions = tracks.map((t) => ({ value: t.id, label: t.name }));

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

          <h2>Setting edisi</h2>
          <HackathonSettings current={hackathon as unknown as Record<string, unknown>} />

          <h2>Konfigurasi</h2>
          <ConfigEditor
            title="Tracks"
            endpoint="/api/admin/tracks"
            items={tracks}
            fields={[
              { key: "code", label: "Kode" },
              { key: "name", label: "Nama" },
              { key: "description", label: "Deskripsi" },
              { key: "sort", label: "Urutan", type: "number" },
            ]}
          />
          <ConfigEditor
            title="Kriteria penilaian"
            endpoint="/api/admin/criteria"
            items={criteria}
            fields={[
              { key: "name", label: "Nama" },
              { key: "weight", label: "Bobot", type: "number" },
              { key: "description", label: "Deskripsi" },
              { key: "sort", label: "Urutan", type: "number" },
            ]}
          />
          <ConfigEditor
            title="Prizes"
            endpoint="/api/admin/prizes"
            items={prizes}
            fields={[
              { key: "name", label: "Nama" },
              { key: "amountUsd", label: "Nilai (USD)", type: "number" },
              { key: "sponsor", label: "Sponsor" },
              { key: "trackId", label: "Track", type: "select", options: trackOptions },
              { key: "sort", label: "Urutan", type: "number" },
            ]}
          />
        </>
      )}

      <h2>Projects</h2>
      <ProjectsPanel />

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

      <h2>Users</h2>
      <UsersPanel />

      <h2>Audit log</h2>
      <AuditPanel />
    </main>
  );
}

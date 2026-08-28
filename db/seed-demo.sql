-- Data demo untuk testing galeri/detail (bukan produksi). Idempotent.
-- Buka fase submission supaya submit bisa dites.
UPDATE hackathons SET status = 'submission' WHERE id = 'iw3h-2026';

-- Users (builder)
INSERT OR IGNORE INTO users (address, username, bio, github_url) VALUES
  ('0xA1a000000000000000000000000000000000d001', 'rani.eth', 'Solidity + AI', 'https://github.com/rani'),
  ('0xA2a000000000000000000000000000000000d002', 'budi_dev', 'Fullstack web3', 'https://github.com/budi'),
  ('0xA3a000000000000000000000000000000000d003', 'sari.build', 'Product & design', 'https://github.com/sari'),
  ('0xA4a000000000000000000000000000000000d004', 'dimas', 'Smart contract eng', 'https://github.com/dimas'),
  ('0xA5a000000000000000000000000000000000d005', 'putri.w', 'Frontend & UX', 'https://github.com/putri'),
  ('0xA6a000000000000000000000000000000000d006', 'agus.node', 'Backend & infra', 'https://github.com/agus');

-- Teams
INSERT OR IGNORE INTO teams (id, hackathon_id, name, invite_code, leader_address) VALUES
  ('team_demo_a', 'iw3h-2026', 'Nusantara Labs', 'NUSA2026', '0xA2a000000000000000000000000000000000d002'),
  ('team_demo_b', 'iw3h-2026', 'Garuda Finance', 'GRD88888', '0xA4a000000000000000000000000000000000d004'),
  ('team_demo_c', 'iw3h-2026', 'Rimba Play', 'RIMBA777', '0xA6a000000000000000000000000000000000d006');
INSERT OR IGNORE INTO team_members (team_id, address, role) VALUES
  ('team_demo_a', '0xA2a000000000000000000000000000000000d002', 'leader'),
  ('team_demo_a', '0xA3a000000000000000000000000000000000d003', 'member'),
  ('team_demo_b', '0xA4a000000000000000000000000000000000d004', 'leader'),
  ('team_demo_b', '0xA5a000000000000000000000000000000000d005', 'member'),
  ('team_demo_c', '0xA6a000000000000000000000000000000000d006', 'leader');

-- Projects: 2 per track (mix solo/tim). logo = DiceBear (reliable, no key).
-- Track AI Agents
INSERT OR IGNORE INTO projects (id, hackathon_id, team_id, submitter_address, name, tagline, problem_statement, solution, description, github_url, demo_url, demo_video_url, logo_url, contract_address, network, status, submitted_at) VALUES
  ('proj_demo_1', 'iw3h-2026', NULL, '0xA1a000000000000000000000000000000000d001', 'AgentForge', 'Bikin AI agent on-chain tanpa ngoding', 'Bikin agent otonom di web3 masih butuh skill Solidity + ML yang langka.', 'No-code builder yang men-deploy agent ke BNB Chain lewat template siap pakai.', '## AgentForge\nDrag-and-drop **AI agent** builder. Contoh use case: auto-rebalance, sniping, market making.\n\n- Template siap pakai\n- Deploy 1-klik ke opBNB\n- Guardrail on-chain', 'https://github.com/rani/agentforge', 'https://agentforge.demo', 'https://youtube.com/watch?v=dQw4w9WgXcQ', 'https://api.dicebear.com/9.x/shapes/svg?seed=agentforge&backgroundColor=066377', '0x1111111111111111111111111111111111111111', 'opbnb', 'submitted', datetime('now','-3 days')),
  ('proj_demo_2', 'iw3h-2026', 'team_demo_a', '0xA2a000000000000000000000000000000000d002', 'AutoTrader AI', 'Copilot trading yang belajar dari on-chain data', 'Retail trader kalah cepat dari bot; sinyal manual telat.', 'Agent yang membaca mempool + oracle, kasih sinyal & eksekusi via smart account.', '## AutoTrader AI\nCopilot yang menggabungkan **LLM** + data on-chain real-time.\n\n```mermaid\ngraph LR\nMempool-->Agent\nOracle-->Agent\nAgent-->SmartAccount\n```', 'https://github.com/nusantara/autotrader', 'https://autotrader.demo', 'https://youtube.com/watch?v=dQw4w9WgXcQ', 'https://api.dicebear.com/9.x/shapes/svg?seed=autotrader&backgroundColor=4bbdf0', '0x2222222222222222222222222222222222222222', 'bsc', 'submitted', datetime('now','-2 days'));

-- Track Finance & Commerce
INSERT OR IGNORE INTO projects (id, hackathon_id, team_id, submitter_address, name, tagline, problem_statement, solution, description, github_url, demo_url, demo_video_url, logo_url, contract_address, network, status, submitted_at) VALUES
  ('proj_demo_3', 'iw3h-2026', NULL, '0xA3a000000000000000000000000000000000d003', 'PayStream', 'Gaji streaming per-detik pakai stablecoin', 'Pekerja gig nunggu payday; cash flow tersendat.', 'Streaming payroll: dana mengalir per detik, bisa ditarik kapan saja.', '## PayStream\nStreaming **payroll** di BNB Chain. Employer top-up sekali, dana mengalir otomatis.', 'https://github.com/sari/paystream', 'https://paystream.demo', 'https://youtube.com/watch?v=dQw4w9WgXcQ', 'https://api.dicebear.com/9.x/shapes/svg?seed=paystream&backgroundColor=185b7b', '0x3333333333333333333333333333333333333333', 'bsc', 'submitted', datetime('now','-4 days')),
  ('proj_demo_4', 'iw3h-2026', 'team_demo_b', '0xA4a000000000000000000000000000000000d004', 'YieldNest', 'Agregator yield satu-klik untuk pemula', 'DeFi yield ribet: banyak protokol, risiko IL, gas mahal.', 'Vault pintar yang auto-route ke strategi terbaik dengan proteksi risiko.', '## YieldNest\nAuto-compounding vault + dashboard risiko yang ramah pemula.', 'https://github.com/garuda/yieldnest', 'https://yieldnest.demo', 'https://youtube.com/watch?v=dQw4w9WgXcQ', 'https://api.dicebear.com/9.x/shapes/svg?seed=yieldnest&backgroundColor=066377', '0x4444444444444444444444444444444444444444', 'bsc', 'submitted', datetime('now','-1 days'));

-- Track Consumer Apps
INSERT OR IGNORE INTO projects (id, hackathon_id, team_id, submitter_address, name, tagline, problem_statement, solution, description, github_url, demo_url, demo_video_url, logo_url, contract_address, network, status, submitted_at) VALUES
  ('proj_demo_5', 'iw3h-2026', NULL, '0xA5a000000000000000000000000000000000d005', 'SocialFi Hub', 'Sosial media yang bayar kreator langsung', 'Kreator kecil dapat remah dari platform terpusat.', 'Tip & subscription on-chain, kreator terima 97% langsung ke wallet.', '## SocialFi Hub\nFeed sosial dengan **tip** & langganan on-chain, tanpa perantara.', 'https://github.com/putri/socialfi', 'https://socialfi.demo', 'https://youtube.com/watch?v=dQw4w9WgXcQ', 'https://api.dicebear.com/9.x/shapes/svg?seed=socialfi&backgroundColor=4bbdf0', '0x5555555555555555555555555555555555555555', 'opbnb', 'submitted', datetime('now','-5 days')),
  ('proj_demo_6', 'iw3h-2026', 'team_demo_c', '0xA6a000000000000000000000000000000000d006', 'GameVault', 'Aset game portabel lintas judul', 'Item game terkunci di satu judul; nggak ada kepemilikan nyata.', 'Standar item NFT yang bisa dipakai lintas game partner.', '## GameVault\nInventory NFT lintas-game + marketplace ringan di opBNB.', 'https://github.com/rimba/gamevault', 'https://gamevault.demo', 'https://youtube.com/watch?v=dQw4w9WgXcQ', 'https://api.dicebear.com/9.x/shapes/svg?seed=gamevault&backgroundColor=185b7b', '0x6666666666666666666666666666666666666666', 'opbnb', 'submitted', datetime('now'));

-- project_tracks
INSERT OR IGNORE INTO project_tracks (project_id, track_id) VALUES
  ('proj_demo_1', 'ai-agents'),
  ('proj_demo_2', 'ai-agents'),
  ('proj_demo_3', 'finance-commerce'),
  ('proj_demo_4', 'finance-commerce'),
  ('proj_demo_5', 'consumer-apps'),
  ('proj_demo_6', 'consumer-apps');

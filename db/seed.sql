-- Seed edisi 2026. Idempotent — aman dijalankan ulang.
INSERT OR IGNORE INTO hackathons (id, slug, name, year, status)
  VALUES ('iw3h-2026', 'indonesia-web3-hackathon-2026', 'Indonesia Web3 Hackathon', 2026, 'registration');
INSERT OR IGNORE INTO tracks (id, hackathon_id, code, name, sort) VALUES
  ('ai-agents', 'iw3h-2026', 'T1', 'AI Agents', 1),
  ('finance-commerce', 'iw3h-2026', 'T2', 'Finance & Commerce', 2),
  ('consumer-apps', 'iw3h-2026', 'T3', 'Consumer Apps', 3);
INSERT OR IGNORE INTO criteria (id, hackathon_id, name, weight, sort) VALUES
  ('technicality', 'iw3h-2026', 'Technicality', 1, 1),
  ('originality', 'iw3h-2026', 'Originality', 1, 2),
  ('practicality', 'iw3h-2026', 'Practicality', 1, 3),
  ('usability', 'iw3h-2026', 'Usability', 1, 4),
  ('wow', 'iw3h-2026', 'Wow Factor', 1, 5);

/** Halaman maintenance self-contained (dipakai proxy saat MAINTENANCE_MODE=1).
 *  HTML+CSS inline — tak butuh aset lain supaya tetap tampil saat situs ditutup. */
export const MAINTENANCE_HTML = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>Under maintenance — Indonesia Web3 Hackathon</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:-apple-system,"Helvetica Neue",Arial,sans-serif;min-height:100vh;display:flex;align-items:center;justify-content:center;
    background:radial-gradient(circle at 12% 8%,rgba(240,205,95,.14) 0%,transparent 38%),linear-gradient(180deg,#0A0A0B 0%,#0A0A0B 60%,#181206 100%);
    background-color:#0A0A0B;color:#fff;padding:24px;position:relative;overflow:hidden}
  .grid{position:absolute;inset:0;background-image:linear-gradient(rgba(255,255,255,.03) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.03) 1px,transparent 1px);background-size:56px 56px}
  .card{position:relative;z-index:1;max-width:520px;text-align:center}
  .mark{width:64px;height:64px;margin:0 auto 28px;border-radius:16px;background:linear-gradient(145deg,#F3BA2F,#B8860B);display:flex;align-items:center;justify-content:center;transform:rotate(45deg)}
  .mark span{transform:rotate(-45deg);font-weight:900;font-size:28px;color:#0A0A0B}
  .eyebrow{font-size:12px;font-weight:700;letter-spacing:.26em;text-transform:uppercase;color:#F0D07A;margin-bottom:16px}
  h1{font-size:40px;line-height:1.05;font-weight:800;letter-spacing:-.02em;margin-bottom:18px}
  p{font-size:17px;line-height:1.6;color:rgba(255,255,255,.65)}
  .foot{margin-top:32px;font-size:13px;color:rgba(255,255,255,.4)}
</style>
</head>
<body>
  <div class="grid"></div>
  <div class="card">
    <div class="mark"><span>W3</span></div>
    <div class="eyebrow">Indonesia Web3 Hackathon</div>
    <h1>We&rsquo;ll be right back</h1>
    <p>The site is down for scheduled maintenance. Please check back in a little while &mdash; your submissions and data are safe.</p>
    <div class="foot">Sedang pemeliharaan &middot; coba lagi beberapa saat lagi.</div>
  </div>
</body>
</html>`;

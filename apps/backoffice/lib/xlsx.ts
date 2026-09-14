import ExcelJS from "exceljs";

/**
 * Bangun .xlsx TERFORMAT: baris header bold di atas latar gelap + di-freeze +
 * auto-filter, lebar kolom otomatis dari isi (dibatasi). Balikan Buffer.
 */
export async function buildXlsx(
  sheetName: string,
  headers: string[],
  rows: unknown[][]
): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "IW3H Backoffice";
  wb.created = new Date();
  const ws = wb.addWorksheet(sheetName.slice(0, 31), {
    views: [{ state: "frozen", ySplit: 1 }],
  });

  ws.columns = headers.map((h, i) => {
    let maxLen = h.length;
    for (const r of rows) {
      const l = String(r[i] ?? "").length;
      if (l > maxLen) maxLen = l;
    }
    return { header: h, width: Math.min(Math.max(maxLen + 2, 10), 60) };
  });

  const header = ws.getRow(1);
  header.font = { bold: true, color: { argb: "FFFFFFFF" } };
  header.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF111827" } };
  header.alignment = { vertical: "middle" };
  header.height = 20;

  for (const r of rows) ws.addRow(r);

  ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: headers.length } };

  const buf = await wb.xlsx.writeBuffer();
  return Buffer.from(buf);
}

export function xlsxResponse(filename: string, buf: Buffer): Response {
  const stamp = new Date().toISOString().slice(0, 10);
  return new Response(new Uint8Array(buf), {
    headers: {
      "content-type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "content-disposition": `attachment; filename="${filename}-${stamp}.xlsx"`,
    },
  });
}

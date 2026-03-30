// plugins/index.js
// Each plugin returns { title, content } or throws on failure

// ── PLUGIN 1: Google Docs / Sheets ──────────────────────────────────────────
// Uses the public export URL pattern — no OAuth needed for public docs.
// For private docs, user must share link first.
export async function importGoogleDoc(url) {
  // Convert share URL to export URL
  let exportUrl = url;

  // Google Docs: /document/d/ID/edit -> /document/d/ID/export?format=txt
  const docsMatch = url.match(/\/document\/d\/([a-zA-Z0-9_-]+)/);
  if (docsMatch) {
    exportUrl = `https://docs.google.com/document/d/${docsMatch[1]}/export?format=txt`;
  }

  // Google Sheets: /spreadsheets/d/ID/edit -> /spreadsheets/d/ID/export?format=csv
  const sheetsMatch = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
  if (sheetsMatch) {
    exportUrl = `https://docs.google.com/spreadsheets/d/${sheetsMatch[1]}/export?format=csv`;
  }

  const res = await fetch(exportUrl);
  if (!res.ok) throw new Error("Could not fetch. Make sure the doc is set to 'Anyone with the link can view'.");
  const text = await res.text();

  const title = url.includes('spreadsheets') ? 'Google Sheet' : 'Google Doc';
  return { title, content: text.slice(0, 12000) }; // cap at ~12k chars
}

// ── PLUGIN 2: Coursera / Udemy Course Page ───────────────────────────────────
// Scrapes the course title and description from the public page via CORS proxy.
export async function importCourseLink(url) {
  const isCoursera = url.includes('coursera.org');
  const isUdemy = url.includes('udemy.com');

  if (!isCoursera && !isUdemy) {
    throw new Error("URL must be a Coursera or Udemy course page.");
  }

  // Use allorigins CORS proxy to fetch public page text
  const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;
  const res = await fetch(proxyUrl);
  if (!res.ok) throw new Error("Could not fetch course page.");
  const json = await res.json();
  const html = json.contents || '';

  // Extract title
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  const rawTitle = titleMatch ? titleMatch[1].replace(/ \| (Coursera|Udemy).*/, '').trim() : 'Course';

  // Extract meta description
  const descMatch = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i)
    || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']description["']/i);
  const description = descMatch ? descMatch[1] : '';

  // Extract og:description as fallback
  const ogMatch = html.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i);
  const ogDesc = ogMatch ? ogMatch[1] : '';

  const content = `Course: ${rawTitle}\n\n${description || ogDesc || 'No description found. The mentor will teach this topic from its own knowledge.'}\n\nSource: ${url}`;
  return { title: rawTitle, content };
}

// ── PLUGIN 3: Excel / CSV Upload ─────────────────────────────────────────────
// Reads a local file object. Caller passes a File from <input type="file">.
export async function importExcelOrCSV(file) {
  const name = file.name;
  const isCSV = name.endsWith('.csv');
  const isExcel = name.endsWith('.xlsx') || name.endsWith('.xls');

  if (!isCSV && !isExcel) throw new Error("Please upload a .csv, .xlsx, or .xls file.");

  if (isCSV) {
    const text = await file.text();
    return { title: name, content: text.slice(0, 12000) };
  }

  // Excel: use SheetJS (xlsx) loaded from CDN via dynamic import workaround
  const XLSX = await import('xlsx');
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const csv = XLSX.utils.sheet_to_csv(sheet);
  return { title: name, content: csv.slice(0, 12000) };
}

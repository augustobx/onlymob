export type ICLData = {
  fecha: string;
  valor: number;
  origen: 'api' | 'csv' | 'cache' | 'fallback';
  timestamp: number;
};

let cache: ICLData | null = null;
const CACHE_TTL = 1000 * 60 * 60 * 2;
const FALLBACK_CACHE_TTL = 1000 * 60 * 5;
const EXTERNAL_TIMEOUT_MS = 1500;
const DEFAULT_BCRA_SERIES_URL = 'https://api.bcra.gob.ar/estadisticas/v4.0/monetarias/7988';

function seriesUrl() {
  return process.env.BCRA_API_BASE_URL || DEFAULT_BCRA_SERIES_URL;
}

function normalizeApiRows(data: any): Array<{ fecha: string; valor: number }> {
  const rows = data?.results || data?.data || [];
  if (!Array.isArray(rows)) return [];
  return rows
    .map((row: any) => ({ fecha: String(row?.fecha || ''), valor: Number(row?.valor) }))
    .filter((row: { fecha: string; valor: number }) => row.fecha && Number.isFinite(row.valor) && row.valor > 0)
    .sort((a: { fecha: string }, b: { fecha: string }) => a.fecha.localeCompare(b.fecha));
}

async function fetchOfficialRange(desde?: string, hasta?: string): Promise<Array<{ fecha: string; valor: number }>> {
  try {
    const params = new URLSearchParams();
    if (desde) params.set('desde', desde);
    if (hasta) params.set('hasta', hasta);
    params.set('limit', '3000');
    const url = `${seriesUrl()}?${params.toString()}`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'OnlyMob/1.0', 'Accept-Language': 'es-AR' },
      next: { revalidate: 3600 },
      signal: AbortSignal.timeout(EXTERNAL_TIMEOUT_MS),
    });
    if (!res.ok) return [];
    return normalizeApiRows(await res.json());
  } catch {
    return [];
  }
}

export async function fetchICLFromAPI(): Promise<ICLData | null> {
  try {
    const customLatestUrl = process.env.BCRA_API_URL;
    let rows: Array<{ fecha: string; valor: number }> = [];

    if (customLatestUrl) {
      const res = await fetch(customLatestUrl, {
        headers: { 'User-Agent': 'OnlyMob/1.0', 'Accept-Language': 'es-AR' },
        next: { revalidate: 3600 },
        signal: AbortSignal.timeout(EXTERNAL_TIMEOUT_MS),
      });
      if (res.ok) rows = normalizeApiRows(await res.json());
    } else {
      rows = await fetchOfficialRange();
    }

    const latest = rows.at(-1);
    if (!latest) return null;
    return { ...latest, origen: 'api', timestamp: Date.now() };
  } catch {
    return null;
  }
}

export async function fetchICLFromCSV(): Promise<ICLData | null> {
  try {
    const url = process.env.BCRA_CSV_URL || 'https://www.bcra.gob.ar/Downloads/CSV/7988_Indice_para_Contratos_de_Locacion.csv';
    const res = await fetch(url, {
      headers: { 'User-Agent': 'OnlyMob/1.0' },
      next: { revalidate: 3600 },
      signal: AbortSignal.timeout(EXTERNAL_TIMEOUT_MS),
    });

    if (!res.ok) return null;
    const text = await res.text();
    const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean).reverse();

    for (const line of lines) {
      const clean = line.replace(/["\uFEFF]/g, '');
      const parts = clean.includes(';') ? clean.split(';') : clean.split(',');
      if (parts.length < 2) continue;

      const fecha = parts[0].trim();
      const valorStr = parts[1].trim().replace(/\./g, '').replace(',', '.');
      const valor = Number.parseFloat(valorStr);
      if (fecha && Number.isFinite(valor) && valor > 0) {
        return { fecha, valor, origen: 'csv', timestamp: Date.now() };
      }
    }
    return null;
  } catch {
    return null;
  }
}

function isoDate(value: Date) {
  return value.toISOString().slice(0, 10);
}

export async function getOfficialICLAtOrBefore(value: Date): Promise<ICLData | null> {
  const target = new Date(value);
  if (Number.isNaN(target.getTime())) return null;
  const from = new Date(target);
  from.setDate(from.getDate() - 20);
  const rows = await fetchOfficialRange(isoDate(from), isoDate(target));
  const latest = rows.filter((row) => row.fecha <= isoDate(target)).at(-1);
  return latest ? { ...latest, origen: 'api', timestamp: Date.now() } : null;
}

export async function getLatestOfficialICL(): Promise<ICLData | null> {
  const result = await fetchICLFromAPI();
  return result?.origen === 'api' ? result : null;
}

export async function getLatestICL(): Promise<ICLData> {
  if (cache) {
    const ttl = cache.origen === 'fallback' ? FALLBACK_CACHE_TTL : CACHE_TTL;
    if (Date.now() - cache.timestamp < ttl) return cache;
  }

  const fromApi = await fetchICLFromAPI();
  if (fromApi) {
    cache = fromApi;
    return fromApi;
  }

  const fromCsv = await fetchICLFromCSV();
  if (fromCsv) {
    cache = fromCsv;
    return fromCsv;
  }

  cache = {
    fecha: new Date().toISOString().split('T')[0],
    valor: 24.85,
    origen: 'fallback',
    timestamp: Date.now(),
  };
  return cache;
}

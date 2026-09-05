export type ICLData = {
  fecha: string;
  valor: number;
  origen: 'api' | 'csv' | 'cache' | 'fallback';
  timestamp: number;
};

let cache: ICLData | null = null;
const CACHE_TTL = 1000 * 60 * 60 * 2; // 2 hours
const FALLBACK_CACHE_TTL = 1000 * 60 * 5; // 5 minutes
const EXTERNAL_TIMEOUT_MS = 800;

export async function fetchICLFromAPI(): Promise<ICLData | null> {
  try {
    const url = process.env.BCRA_API_URL || 'https://api.bcra.gob.ar/estadisticas/v3.0/Monetarias/7988?limit=1';
    const res = await fetch(url, {
      headers: { 'User-Agent': 'OnlyMob/1.0' },
      next: { revalidate: 3600 },
      signal: AbortSignal.timeout(EXTERNAL_TIMEOUT_MS),
    });

    if (!res.ok) return null;
    const data = await res.json();
    const arr = data.results || data.data;
    if (!Array.isArray(arr) || arr.length === 0) return null;

    const latest = arr[arr.length - 1];
    if (!latest?.fecha || latest?.valor === undefined) return null;

    return {
      fecha: latest.fecha,
      valor: parseFloat(latest.valor),
      origen: 'api',
      timestamp: Date.now(),
    };
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
    const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean).reverse();

    for (const line of lines) {
      const clean = line.replace(/["\uFEFF]/g, '');
      const parts = clean.includes(';') ? clean.split(';') : clean.split(',');
      if (parts.length < 2) continue;

      const fecha = parts[0].trim();
      const valorStr = parts[1].trim().replace(/\./g, '').replace(',', '.');
      const valor = parseFloat(valorStr);

      if (fecha && !isNaN(valor) && valor > 0) {
        return {
          fecha,
          valor,
          origen: 'csv',
          timestamp: Date.now(),
        };
      }
    }
    return null;
  } catch {
    return null;
  }
}

export async function getLatestICL(): Promise<ICLData> {
  if (cache) {
    const ttl = cache.origen === 'fallback' ? FALLBACK_CACHE_TTL : CACHE_TTL;
    if (Date.now() - cache.timestamp < ttl) return cache;
  }

  // 1. Try official API with a strict timeout so the dashboard never waits on BCRA.
  const fromApi = await fetchICLFromAPI();
  if (fromApi) {
    cache = fromApi;
    return fromApi;
  }

  // 2. Try CSV fallback with the same bounded wait.
  const fromCsv = await fetchICLFromCSV();
  if (fromCsv) {
    cache = fromCsv;
    return fromCsv;
  }

  // 3. Cache the safe fallback briefly to avoid retrying both external endpoints on every navigation.
  cache = {
    fecha: new Date().toISOString().split('T')[0],
    valor: 24.85,
    origen: 'fallback',
    timestamp: Date.now(),
  };
  return cache;
}

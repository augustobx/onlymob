export type ICLData = {
  fecha: string;
  valor: number;
  origen: 'api' | 'csv' | 'cache' | 'fallback';
  timestamp: number;
};

let cache: ICLData | null = null;
const CACHE_TTL = 1000 * 60 * 60 * 2; // 2 hours

export async function fetchICLFromAPI(): Promise<ICLData | null> {
  try {
    const url = process.env.BCRA_API_URL || 'https://api.bcra.gob.ar/estadisticas/v3.0/Monetarias/7988?limit=1';
    const res = await fetch(url, {
      headers: { 'User-Agent': 'OnlyMob/1.0' },
      next: { revalidate: 3600 },
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
  if (cache && Date.now() - cache.timestamp < CACHE_TTL) {
    return cache;
  }

  // 1. Try official API
  const fromApi = await fetchICLFromAPI();
  if (fromApi) {
    cache = fromApi;
    return fromApi;
  }

  // 2. Try CSV fallback
  const fromCsv = await fetchICLFromCSV();
  if (fromCsv) {
    cache = fromCsv;
    return fromCsv;
  }

  // 3. Fallback to latest known historical value if both external calls fail
  return {
    fecha: new Date().toISOString().split('T')[0],
    valor: 24.85, // Reference safe fallback
    origen: 'fallback',
    timestamp: Date.now(),
  };
}

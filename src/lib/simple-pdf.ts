import 'server-only';

function latin1Safe(value: string) {
  return value
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/[–—]/g, '-')
    .replace(/…/g, '...')
    .replace(/[•·]/g, '-')
    .replace(/[\u0100-\uFFFF]/g, (char) => char.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^\x00-\xFF]/g, '?'));
}

function escapePdfText(value: string) {
  return latin1Safe(value).replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}

function wrapLine(line: string, maxChars = 88) {
  if (!line.trim()) return [''];
  const words = line.split(/\s+/);
  const lines: string[] = [];
  let current = '';

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length <= maxChars) {
      current = candidate;
      continue;
    }
    if (current) lines.push(current);
    if (word.length <= maxChars) {
      current = word;
    } else {
      for (let index = 0; index < word.length; index += maxChars) {
        lines.push(word.slice(index, index + maxChars));
      }
      current = '';
    }
  }

  if (current) lines.push(current);
  return lines;
}

function paginate(text: string, linesPerPage = 48) {
  const lines = text.replace(/\r\n/g, '\n').split('\n').flatMap((line) => wrapLine(line));
  const pages: string[][] = [];
  for (let index = 0; index < lines.length; index += linesPerPage) {
    pages.push(lines.slice(index, index + linesPerPage));
  }
  return pages.length ? pages : [['']];
}

export function buildTextPdf(title: string, body: string) {
  const text = `${title}\n\n${body}`;
  const pages = paginate(text);
  const pageRefs = pages.map((_, index) => 4 + index * 2);
  const objects = new Map<number, Buffer>();

  objects.set(1, Buffer.from('<< /Type /Catalog /Pages 2 0 R >>', 'latin1'));
  objects.set(2, Buffer.from(`<< /Type /Pages /Kids [${pageRefs.map((ref) => `${ref} 0 R`).join(' ')}] /Count ${pages.length} >>`, 'latin1'));
  objects.set(3, Buffer.from('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>', 'latin1'));

  pages.forEach((lines, index) => {
    const pageRef = 4 + index * 2;
    const contentRef = pageRef + 1;
    const commands = [
      'BT',
      '/F1 11 Tf',
      '14 TL',
      '50 790 Td',
      ...lines.map((line) => `(${escapePdfText(line)}) Tj T*`),
      'ET',
    ].join('\n');
    const stream = Buffer.from(commands, 'latin1');

    objects.set(pageRef, Buffer.from(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R >> >> /Contents ${contentRef} 0 R >>`, 'latin1'));
    objects.set(contentRef, Buffer.concat([
      Buffer.from(`<< /Length ${stream.length} >>\nstream\n`, 'latin1'),
      stream,
      Buffer.from('\nendstream', 'latin1'),
    ]));
  });

  const maxObject = Math.max(...objects.keys());
  const chunks: Buffer[] = [Buffer.from('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n', 'latin1')];
  const offsets = new Array<number>(maxObject + 1).fill(0);
  let offset = chunks[0].length;

  for (let id = 1; id <= maxObject; id += 1) {
    const object = objects.get(id);
    if (!object) continue;
    offsets[id] = offset;
    const prefix = Buffer.from(`${id} 0 obj\n`, 'latin1');
    const suffix = Buffer.from('\nendobj\n', 'latin1');
    chunks.push(prefix, object, suffix);
    offset += prefix.length + object.length + suffix.length;
  }

  const xrefOffset = offset;
  const xrefLines = [`xref`, `0 ${maxObject + 1}`, '0000000000 65535 f '];
  for (let id = 1; id <= maxObject; id += 1) {
    xrefLines.push(`${String(offsets[id]).padStart(10, '0')} 00000 n `);
  }
  const trailer = `${xrefLines.join('\n')}\ntrailer\n<< /Size ${maxObject + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;
  chunks.push(Buffer.from(trailer, 'latin1'));

  return Buffer.concat(chunks);
}

/**
 * Convierte un número monetario a texto en español (ej: 280000 -> "DOSCIENTOS OCHENTA MIL PESOS")
 */
function unidades(num: number): string {
  switch (num) {
    case 1: return 'UN';
    case 2: return 'DOS';
    case 3: return 'TRES';
    case 4: return 'CUATRO';
    case 5: return 'CINCO';
    case 6: return 'SEIS';
    case 7: return 'SIETE';
    case 8: return 'OCHO';
    case 9: return 'NUEVE';
    default: return '';
  }
}

function decenasY(strSin: string, numUnidades: number): string {
  if (numUnidades > 0) return `${strSin} Y ${unidades(numUnidades)}`;
  return strSin;
}

function decenas(num: number): string {
  const dec = Math.floor(num / 10);
  const uni = num - dec * 10;

  switch (dec) {
    case 1:
      switch (uni) {
        case 0: return 'DIEZ';
        case 1: return 'ONCE';
        case 2: return 'DOCE';
        case 3: return 'TRECE';
        case 4: return 'CATORCE';
        case 5: return 'QUINCE';
        default: return `DIECI${unidades(uni)}`;
      }
    case 2:
      if (uni === 0) return 'VEINTE';
      return `VEINTI${unidades(uni)}`;
    case 3: return decenasY('TREINTA', uni);
    case 4: return decenasY('CUARENTA', uni);
    case 5: return decenasY('CINCUENTA', uni);
    case 6: return decenasY('SESENTA', uni);
    case 7: return decenasY('SETENTA', uni);
    case 8: return decenasY('OCHENTA', uni);
    case 9: return decenasY('NOVENTA', uni);
    case 0: return unidades(uni);
    default: return '';
  }
}

function centenas(num: number): string {
  const cen = Math.floor(num / 100);
  const dec = num - cen * 100;

  switch (cen) {
    case 1:
      if (dec > 0) return `CIENTO ${decenas(dec)}`;
      return 'CIEN';
    case 2: return `DOSCIENTOS ${decenas(dec)}`.trim();
    case 3: return `TRESCIENTOS ${decenas(dec)}`.trim();
    case 4: return `CUATROCIENTOS ${decenas(dec)}`.trim();
    case 5: return `QUINIENTOS ${decenas(dec)}`.trim();
    case 6: return `SEISCIENTOS ${decenas(dec)}`.trim();
    case 7: return `SETECIENTOS ${decenas(dec)}`.trim();
    case 8: return `OCHOCIENTOS ${decenas(dec)}`.trim();
    case 9: return `NOVECIENTOS ${decenas(dec)}`.trim();
    default: return decenas(dec);
  }
}

function seccion(num: number, divisor: number, strSingular: string, strPlural: string): string {
  const cientos = Math.floor(num / divisor);
  const resto = num - cientos * divisor;
  let letras = '';

  if (cientos > 0) {
    if (cientos > 1) {
      letras = `${centenas(cientos)} ${strPlural}`;
    } else {
      letras = strSingular;
    }
  }

  if (resto > 0) {
    letras += '';
  }

  return letras;
}

function miles(num: number): string {
  const divisor = 1000;
  const cientos = Math.floor(num / divisor);
  const resto = num - cientos * divisor;

  const strMiles = seccion(num, divisor, 'UN MIL', 'MIL');
  const strCentenas = centenas(resto);

  if (strMiles === '') return strCentenas;
  return `${strMiles} ${strCentenas}`.trim();
}

function millones(num: number): string {
  const divisor = 1000000;
  const cientos = Math.floor(num / divisor);
  const resto = num - cientos * divisor;

  const strMillones = seccion(num, divisor, 'UN MILLON', 'MILLONES');
  const strMiles = miles(resto);

  if (strMillones === '') return strMiles;
  return `${strMillones} ${strMiles}`.trim();
}

export function numberToWords(amount: number | string): string {
  const num = typeof amount === 'number' ? amount : parseFloat(String(amount || 0));
  if (isNaN(num) || num === 0) return 'CERO PESOS';

  const enteroyDecimal = num.toFixed(2).split('.');
  const enteros = parseInt(enteroyDecimal[0], 10);
  const centavos = enteroyDecimal[1];

  let res = millones(enteros).trim();
  if (enteros === 1) {
    res += ' PESO';
  } else {
    res += ' PESOS';
  }

  if (centavos && centavos !== '00') {
    res += ` CON ${centavos}/100`;
  }

  return res;
}

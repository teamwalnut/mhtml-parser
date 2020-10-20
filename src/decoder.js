module.exports = (encoding, body) => {
  switch (encoding) {
    case 'base64':
      return btoa(body)
    case 'quoted-printable':
      return convertQuotedPrintable(body);
    case '8bit':
    case '7bit':
    case 'binary':
      return body;
    default:
      throw new Error(`Unknown encoding ${encoding}body: ${body}`);
  }
};

const EQUALS = '='.charCodeAt(0);
const CR = '\r'.charCodeAt(0);
const LF = '\n'.charCodeAt(0);
const D = 'D'.charCodeAt(0);
const THREE = '3'.charCodeAt(0);

function translate(c) {
  switch (c) {
    case 48: return 0;
    case 49: return 1;
    case 50: return 2;
    case 51: return 3;
    case 52: return 4;
    case 53: return 5;
    case 54: return 6;
    case 55: return 7;
    case 56: return 8;
    case 57: return 9;
    case 65: return 10;
    case 66: return 11;
    case 67: return 12;
    case 68: return 13;
    case 69: return 14;
    case 70: return 15;
    default: return -1;
  };
}


function convertQuotedPrintable(body) {
  const len = body.length;
  const decoded = new Uint8Array(len); // at most this big

  let j = 0;
  const runTo = len - 3;
  for (let i = 0; i < runTo; i++) {
    while (i < runTo && (decoded[j++] = body[i++]) !== EQUALS);
    if (i >= runTo) break;
    // We are dealing with a '=xx' sequence.
    const upper = body[i];
    const lower = body[++i];

    // fast path for =3D
    if (upper === THREE && lower === D) {
      continue;
    }
    if (upper === CR && lower === LF) {
      j--;
      continue;
    }
    if (upper === LF) {
      // windows chrome does invalid encoding with \n and not \r\n
      i--;
      j--;
      continue;
    }
    const upperTranslated = translate(upper);
    const lowerTranslated = translate(lower);
    if ((upperTranslated | lowerTranslated) & 128) {
      // invalid seq
      decoded[j++] = upper;
      decoded[j++] = lower;
      continue;
    }
    const shifted = upperTranslated << 4;
    decoded[j - 1] = shifted | lowerTranslated;
  }
  for (let i = runTo; i < len; i++) {
    decoded[j++] = body[i];
  }
  return decoded.slice(0, j);
}

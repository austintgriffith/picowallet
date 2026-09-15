// Blockies identicons, the reference algorithm from github.com/ethereum/blockies, kept quirk for
// quirk (32-bit int ops mixed with Numbers; rand() returns [0, 2)). The wallet firmware carries a
// pixel-exact port (firmware/blockies.py); the two must draw the same picture for the same seed,
// because the person compares the wallet's blockie of the digest with the website's.

export type BlockieOpts = { seed: string; size?: number };
export type Blockie = { size: number; data: number[]; color: string; bgcolor: string; spotcolor: string };

const randseed = [0, 0, 0, 0];

function seedrand(seed: string) {
  for (let i = 0; i < 4; i++) randseed[i] = 0;
  for (let i = 0; i < seed.length; i++) {
    randseed[i % 4] = (randseed[i % 4] << 5) - randseed[i % 4] + seed.charCodeAt(i);
  }
}

function rand() {
  const t = randseed[0] ^ (randseed[0] << 11);
  randseed[0] = randseed[1];
  randseed[1] = randseed[2];
  randseed[2] = randseed[3];
  randseed[3] = randseed[3] ^ (randseed[3] >> 19) ^ t ^ (t >> 8);
  return (randseed[3] >>> 0) / ((1 << 31) >>> 0);
}

function createColor() {
  const h = Math.floor(rand() * 360);
  const s = rand() * 60 + 40 + "%";
  const l = (rand() + rand() + rand() + rand()) * 25 + "%";
  return `hsl(${h},${s},${l})`;
}

function createImageData(size: number) {
  const dataWidth = Math.ceil(size / 2);
  const mirrorWidth = size - dataWidth;
  const data: number[] = [];
  for (let y = 0; y < size; y++) {
    let row: number[] = [];
    for (let x = 0; x < dataWidth; x++) row[x] = Math.floor(rand() * 2.3);
    const r = row.slice(0, mirrorWidth);
    r.reverse();
    row = row.concat(r);
    for (let i = 0; i < row.length; i++) data.push(row[i]);
  }
  return data;
}

/** The picture for a seed: cell values (0 background, 1 colour, else spot colour) and colours. */
export function blockie({ seed, size = 8 }: BlockieOpts): Blockie {
  seedrand(seed);
  const color = createColor();
  const bgcolor = createColor();
  const spotcolor = createColor();
  return { size, data: createImageData(size), color, bgcolor, spotcolor };
}

/** Paint a blockie on a canvas, `scale` px per cell. */
export function renderBlockie(canvas: HTMLCanvasElement, seed: string, scale: number, size = 8) {
  const b = blockie({ seed, size });
  canvas.width = canvas.height = size * scale;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.fillStyle = b.bgcolor;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  for (let i = 0; i < b.data.length; i++) {
    if (!b.data[i]) continue;
    ctx.fillStyle = b.data[i] === 1 ? b.color : b.spotcolor;
    ctx.fillRect((i % size) * scale, Math.floor(i / size) * scale, scale, scale);
  }
}

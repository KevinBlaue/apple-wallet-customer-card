import { PNG } from 'pngjs';

const BACKGROUND = [30, 64, 175, 255] as const;
const FOREGROUND = [255, 255, 255, 255] as const;

export function createCardIcon(size: number): Buffer {
  if (!Number.isInteger(size) || size < 16) {
    throw new Error('Icon size must be an integer of at least 16 pixels');
  }

  const image = new PNG({ width: size, height: size });
  const inset = Math.max(3, Math.round(size * 0.2));
  const border = Math.max(1, Math.round(size * 0.08));

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const insideCard = x >= inset && x < size - inset && y >= inset && y < size - inset;
      const onBorder =
        insideCard &&
        (x < inset + border ||
          x >= size - inset - border ||
          y < inset + border ||
          y >= size - inset - border);
      const color = onBorder ? FOREGROUND : BACKGROUND;
      const offset = (size * y + x) * 4;
      image.data[offset] = color[0];
      image.data[offset + 1] = color[1];
      image.data[offset + 2] = color[2];
      image.data[offset + 3] = color[3];
    }
  }

  return PNG.sync.write(image);
}

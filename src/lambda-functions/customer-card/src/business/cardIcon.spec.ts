import { PNG } from 'pngjs';
import { createCardIcon } from './cardIcon';

describe('card icon', () => {
  test('creates a valid square PNG in memory', () => {
    const icon = PNG.sync.read(createCardIcon(29));
    expect(icon).toMatchObject({ width: 29, height: 29 });
  });

  test.each([15, 20.5])('rejects unsupported icon size %s', (size) => {
    expect(() => createCardIcon(size)).toThrow('integer of at least 16');
  });
});

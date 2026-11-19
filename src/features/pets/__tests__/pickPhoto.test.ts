import { extensionFor } from '../logic/pickPhoto';

describe('extensionFor', () => {
  it('prefers the mime type', () => {
    expect(extensionFor('image/png', 'file:///x/abc')).toBe('png');
    expect(extensionFor('image/jpeg', 'file:///x/abc.png')).toBe('jpg');
  });

  it('falls back to the file name, then jpg', () => {
    expect(extensionFor(undefined, 'file:///x/abc.WEBP')).toBe('webp');
    expect(extensionFor(null, 'content://media/42')).toBe('jpg');
  });
});

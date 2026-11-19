import { fireEvent, render, screen } from '@testing-library/react-native';

import { Button } from '../Button';

describe('Button', () => {
  it('renders its label and handles presses', async () => {
    const onPress = jest.fn();
    await render(<Button label="Save pet" onPress={onPress} />);
    await fireEvent.press(screen.getByRole('button', { name: 'Save pet' }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('does not fire when disabled', async () => {
    const onPress = jest.fn();
    await render(<Button label="Save pet" onPress={onPress} disabled />);
    await fireEvent.press(screen.getByRole('button', { name: 'Save pet' }));
    expect(onPress).not.toHaveBeenCalled();
  });
});

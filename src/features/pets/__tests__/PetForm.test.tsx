import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { PetForm } from '../components/PetForm';

// eslint-disable-next-line @typescript-eslint/no-require-imports
jest.mock('@/core/ui/components/DateTimeField', () => require('@/test/mockDateTimeField'));

describe('PetForm', () => {
  it('shows inline errors and does not submit when required fields are missing', async () => {
    const onSubmit = jest.fn();
    await render(<PetForm submitLabel="Save pet" onSubmit={onSubmit} pickPhoto={jest.fn()} />);

    await fireEvent.press(screen.getByRole('button', { name: 'Save pet' }));

    expect(await screen.findByText('Enter a name')).toBeTruthy();
    expect(screen.getByText('Choose dog or cat')).toBeTruthy();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('submits cleaned values with the picked photo', async () => {
    const onSubmit = jest.fn().mockResolvedValue(undefined);
    const pickPhoto = jest.fn().mockResolvedValue({ kind: 'pick', uri: 'file:///tmp/p.jpg', extension: 'jpg' });
    await render(<PetForm submitLabel="Save pet" onSubmit={onSubmit} pickPhoto={pickPhoto} />);

    await fireEvent.changeText(screen.getByLabelText('Name'), '  Milo ');
    await fireEvent.press(screen.getByRole('radio', { name: 'Cat' }));
    await fireEvent.changeText(screen.getByLabelText('Breed'), 'Siamese');
    await fireEvent.press(screen.getByRole('button', { name: 'Add photo' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Save pet' }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    const [values, photo] = onSubmit.mock.calls[0];
    expect(values).toMatchObject({ name: 'Milo', species: 'cat', breed: 'Siamese', birthDate: null, notes: null });
    expect(photo).toEqual({ kind: 'pick', uri: 'file:///tmp/p.jpg', extension: 'jpg' });
  });

  it('keeps the typed values and shows a retry message when saving fails', async () => {
    const onSubmit = jest.fn().mockRejectedValue(new Error('disk full'));
    await render(<PetForm submitLabel="Save pet" onSubmit={onSubmit} pickPhoto={jest.fn()} />);

    await fireEvent.changeText(screen.getByLabelText('Name'), 'Bella');
    await fireEvent.press(screen.getByRole('radio', { name: 'Dog' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Save pet' }));

    expect(await screen.findByText('Could not save. Your details are still here; please try again.')).toBeTruthy();
    expect(screen.getByLabelText('Name').props.value).toBe('Bella');
  });

  it('hides approximate age once a birth date is typed', async () => {
    await render(<PetForm submitLabel="Save" onSubmit={jest.fn()} pickPhoto={jest.fn()} />);
    expect(screen.getByLabelText('Approximate age')).toBeTruthy();
    await fireEvent.changeText(screen.getByLabelText('Birth date'), '2022-04-01');
    expect(screen.queryByLabelText('Approximate age')).toBeNull();
  });
});

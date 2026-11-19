import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { CareForm } from '../components/CareForm';
import { careInputSchema, careValuesFromEvent } from '../logic/careSchema';

// eslint-disable-next-line @typescript-eslint/no-require-imports
jest.mock('@/core/ui/components/DateTimeField', () => require('@/test/mockDateTimeField'));

const ONE_PET = [{ id: 'p1', name: 'Bella' }];
const TWO_PETS = [...ONE_PET, { id: 'p2', name: 'Milo' }];

describe('CareForm', () => {
  it('picks the only pet automatically and saves a one-off grooming task', async () => {
    const onSubmit = jest.fn().mockResolvedValue(undefined);
    await render(<CareForm pets={ONE_PET} initialValues={{ date: '2026-11-20' }} submitLabel="Save reminder" onSubmit={onSubmit} />);

    expect(screen.queryByRole('radiogroup', { name: 'Pet' })).toBeNull();
    await fireEvent.press(screen.getByRole('button', { name: 'Save reminder' }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    const parsed = careInputSchema.parse(onSubmit.mock.calls[0][0]);
    expect(parsed).toMatchObject({ petId: 'p1', type: 'grooming', title: 'Grooming', startLocal: '2026-11-20T00:00', hasExplicitTime: false, recurrence: { kind: 'none' }, alertLeadMin: 0 });
  });

  it('asks which pet when there are several', async () => {
    const onSubmit = jest.fn();
    await render(<CareForm pets={TWO_PETS} submitLabel="Save reminder" onSubmit={onSubmit} />);

    await fireEvent.press(screen.getByRole('button', { name: 'Save reminder' }));
    expect(await screen.findByText('Choose a pet')).toBeTruthy();
    expect(onSubmit).not.toHaveBeenCalled();

    await fireEvent.press(screen.getByRole('radio', { name: 'Milo' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Save reminder' }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0][0].petId).toBe('p2');
  });

  it('follows the type with a default title and turns on a time for vet visits', async () => {
    const onSubmit = jest.fn().mockResolvedValue(undefined);
    await render(<CareForm pets={ONE_PET} initialValues={{ date: '2026-11-25' }} submitLabel="Save" onSubmit={onSubmit} />);

    await fireEvent.press(screen.getByRole('radio', { name: 'Vet visit' }));
    expect(screen.getByLabelText('Title').props.value).toBe('Vet visit');
    await fireEvent.changeText(screen.getByLabelText('Time'), '14:30');
    await fireEvent.press(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(careInputSchema.parse(onSubmit.mock.calls[0][0])).toMatchObject({ type: 'vet_visit', title: 'Vet visit', startLocal: '2026-11-25T14:30', hasExplicitTime: true });
  });

  it('keeps a title the owner typed when the type changes', async () => {
    await render(<CareForm pets={ONE_PET} submitLabel="Save" onSubmit={jest.fn()} />);
    await fireEvent.changeText(screen.getByLabelText('Title'), 'Nail trim');
    await fireEvent.press(screen.getByRole('radio', { name: 'Flea and tick' }));
    expect(screen.getByLabelText('Title').props.value).toBe('Nail trim');
  });

  it('shows the medication disclaimer and never suggests a dose', async () => {
    await render(<CareForm pets={ONE_PET} submitLabel="Save" onSubmit={jest.fn()} />);
    expect(screen.queryByText(/never suggests doses/)).toBeNull();
    await fireEvent.press(screen.getByRole('radio', { name: 'Medication reminder' }));
    expect(screen.getByText(/never suggests doses/)).toBeTruthy();
  });

  it('validates the custom repeat interval', async () => {
    const onSubmit = jest.fn().mockResolvedValue(undefined);
    await render(<CareForm pets={ONE_PET} submitLabel="Save" onSubmit={onSubmit} />);

    await fireEvent.press(screen.getByRole('radio', { name: 'Every N days' }));
    await fireEvent.changeText(screen.getByLabelText('Repeat every (days)'), '1');
    await fireEvent.press(screen.getByRole('button', { name: 'Save' }));
    expect(await screen.findByText('Enter a number of days from 2 to 365')).toBeTruthy();
    expect(onSubmit).not.toHaveBeenCalled();

    await fireEvent.changeText(screen.getByLabelText('Repeat every (days)'), '21');
    await fireEvent.press(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(careInputSchema.parse(onSubmit.mock.calls[0][0]).recurrence).toEqual({ kind: 'interval', days: 21 });
  });

  it('explains when alerts arrive for all-day tasks and hides it when alerts are off', async () => {
    await render(<CareForm pets={ONE_PET} submitLabel="Save" onSubmit={jest.fn()} />);
    expect(screen.getByText('Alerts for all-day tasks come at 9:00 AM.')).toBeTruthy();
    await fireEvent.press(screen.getByRole('radio', { name: 'No alert' }));
    expect(screen.queryByText('Alerts for all-day tasks come at 9:00 AM.')).toBeNull();
  });

  it('keeps the values and shows a retry message when saving fails', async () => {
    const onSubmit = jest.fn().mockRejectedValue(new Error('disk full'));
    await render(<CareForm pets={ONE_PET} submitLabel="Save" onSubmit={onSubmit} />);
    await fireEvent.changeText(screen.getByLabelText('Title'), 'Brush coat');
    await fireEvent.press(screen.getByRole('button', { name: 'Save' }));
    expect(await screen.findByText(/Could not save/)).toBeTruthy();
    expect(screen.getByLabelText('Title').props.value).toBe('Brush coat');
  });

  it('round-trips a saved event back into the form for editing', async () => {
    const event = {
      petId: 'p1',
      type: 'medication' as const,
      title: 'Heartworm pill',
      startLocal: '2026-11-01T18:00',
      hasExplicitTime: true,
      recurrence: { kind: 'interval' as const, days: 30 },
      alertLeadMin: 15,
      notes: 'With food',
    };
    const values = careValuesFromEvent(event, '2026-12-01');
    expect(values).toMatchObject({ date: '2026-12-01', time: '18:00', repeat: 'interval', intervalDays: '30', alert: '15', notes: 'With food' });

    const onSubmit = jest.fn().mockResolvedValue(undefined);
    await render(<CareForm pets={ONE_PET} initialValues={values} submitLabel="Save changes" onSubmit={onSubmit} />);
    expect(screen.getByLabelText('Title').props.value).toBe('Heartworm pill');
    await fireEvent.press(screen.getByRole('button', { name: 'Save changes' }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(careInputSchema.parse(onSubmit.mock.calls[0][0])).toMatchObject({ startLocal: '2026-12-01T18:00', recurrence: { kind: 'interval', days: 30 }, alertLeadMin: 15, notes: 'With food' });
  });
});

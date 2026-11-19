import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';

import { RecoverableFileError } from '@/features/documents/logic/pickFile';

import { VaccinationForm } from '../components/VaccinationForm';
import { offerDueReminder } from '../offerDueReminder';

// eslint-disable-next-line @typescript-eslint/no-require-imports
jest.mock('@/core/ui/components/DateTimeField', () => require('@/test/mockDateTimeField'));
jest.mock('expo-document-picker', () => ({}));
jest.mock('expo-image-picker', () => ({}));
const mockReplace = jest.fn();
jest.mock('expo-router', () => ({ router: { replace: (...a: unknown[]) => mockReplace(...a) } }));

const PETS = [{ id: 'p1', name: 'Bella' }];
const PDF = { uri: 'file:///cache/cert.pdf', name: 'cert.pdf', mimeType: 'application/pdf', size: 1000 };

describe('VaccinationForm', () => {
  it('saves a vaccine with no next due date and no certificate', async () => {
    const onSubmit = jest.fn().mockResolvedValue(undefined);
    await render(<VaccinationForm pets={PETS} initialValues={{ administeredOn: '2026-03-01' }} submitLabel="Save vaccination" onSubmit={onSubmit} />);

    await fireEvent.changeText(screen.getByLabelText('Vaccine'), 'Rabies');
    await fireEvent.press(screen.getByRole('button', { name: 'Save vaccination' }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0][0]).toMatchObject({ petId: 'p1', vaccineName: 'Rabies', administeredOn: '2026-03-01', nextDueOn: '' });
    expect(onSubmit.mock.calls[0][1]).toEqual({ kind: 'keep' });
  });

  it('blocks a future date given and points to reminders instead', async () => {
    const onSubmit = jest.fn();
    await render(<VaccinationForm pets={PETS} submitLabel="Save" onSubmit={onSubmit} />);
    await fireEvent.changeText(screen.getByLabelText('Vaccine'), 'Rabies');
    await fireEvent.changeText(screen.getByLabelText('Date given'), '2999-01-01');
    await fireEvent.press(screen.getByRole('button', { name: 'Save' }));
    expect(await screen.findByDisplayValue(/Add a care reminder for an upcoming vaccination/)).toBeTruthy();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('attaches a picked certificate and can remove it again', async () => {
    const onSubmit = jest.fn().mockResolvedValue(undefined);
    const pickFile = jest.fn().mockResolvedValue(PDF);
    await render(<VaccinationForm pets={PETS} initialValues={{ vaccineName: 'DHPP', administeredOn: '2026-03-01' }} submitLabel="Save" onSubmit={onSubmit} pickFile={pickFile} />);

    await fireEvent.press(screen.getByRole('button', { name: 'Choose file' }));
    expect(pickFile).toHaveBeenCalledWith('files');
    expect(await screen.findByText('cert.pdf')).toBeTruthy();

    await fireEvent.press(screen.getByRole('button', { name: 'Remove certificate' }));
    expect(screen.queryByText('cert.pdf')).toBeNull();

    await fireEvent.press(screen.getByRole('button', { name: 'Take photo' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0][1]).toEqual({ kind: 'pick', file: PDF });
  });

  it('shows a recoverable message when the camera is not allowed', async () => {
    const pickFile = jest.fn().mockRejectedValue(new RecoverableFileError('PawCare needs camera access to take a photo.'));
    await render(<VaccinationForm pets={PETS} submitLabel="Save" onSubmit={jest.fn()} pickFile={pickFile} />);
    await fireEvent.press(screen.getByRole('button', { name: 'Take photo' }));
    expect(await screen.findByText('PawCare needs camera access to take a photo.')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Choose file' })).toBeTruthy();
  });

  it('unlinks an existing certificate when removed', async () => {
    const onSubmit = jest.fn().mockResolvedValue(undefined);
    await render(
      <VaccinationForm pets={PETS} existingCertificate="Rabies certificate" initialValues={{ vaccineName: 'Rabies', administeredOn: '2026-03-01' }} submitLabel="Save" onSubmit={onSubmit} />,
    );
    expect(screen.getByText('Rabies certificate')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Remove certificate' }));
    expect(screen.getByText(/stays in this pet/)).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0][1]).toEqual({ kind: 'remove' });
  });

  it('shows the file problem from the save step and keeps the form', async () => {
    const onSubmit = jest.fn().mockRejectedValue(new RecoverableFileError('This PDF looks damaged and cannot be opened. Please choose another file.'));
    await render(<VaccinationForm pets={PETS} initialValues={{ vaccineName: 'Rabies', administeredOn: '2026-03-01' }} submitLabel="Save" onSubmit={onSubmit} />);
    await fireEvent.press(screen.getByRole('button', { name: 'Save' }));
    expect(await screen.findByText(/This PDF looks damaged/)).toBeTruthy();
    expect(screen.getByLabelText('Vaccine').props.value).toBe('Rabies');
  });
});

describe('offerDueReminder', () => {
  beforeEach(() => {
    mockReplace.mockClear();
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  });
  afterEach(() => jest.restoreAllMocks());

  it('does nothing extra without a future next due date', () => {
    const done = jest.fn();
    offerDueReminder('p1', 'Rabies', null, done);
    offerDueReminder('p1', 'Rabies', '2020-01-01', done);
    expect(done).toHaveBeenCalledTimes(2);
    expect(Alert.alert).not.toHaveBeenCalled();
  });

  it('asks first, and only opens a prefilled reminder when the owner agrees', () => {
    const done = jest.fn();
    offerDueReminder('p1', 'Rabies', '2999-03-01', done);
    const buttons = (Alert.alert as jest.Mock).mock.calls[0][2] as { text: string; onPress: () => void }[];
    expect(mockReplace).not.toHaveBeenCalled();

    buttons.find((b) => b.text === 'Not now')!.onPress();
    expect(done).toHaveBeenCalled();
    expect(mockReplace).not.toHaveBeenCalled();

    buttons.find((b) => b.text === 'Add reminder')!.onPress();
    expect(mockReplace).toHaveBeenCalledWith({ pathname: '/care/new', params: { petId: 'p1', type: 'custom', title: 'Rabies due', date: '2999-03-01' } });
  });
});

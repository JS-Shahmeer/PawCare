import { router } from 'expo-router';
import { Alert } from 'react-native';

import { formatDay } from '@/lib/format';
import { todayIso } from '@/lib/dates';

import { dueReminderTitle } from './logic/vaccinationSchema';

/**
 * After saving a next due date, asks whether to add a reminder for it. Vaccination records
 * and reminders stay separate, so nothing is created or changed without the owner's yes (PC-02).
 * Calls `done` when the owner declines or there is nothing to offer.
 */
export function offerDueReminder(petId: string, vaccineName: string, nextDueOn: string | null, done: () => void): void {
  if (!nextDueOn || nextDueOn < todayIso()) {
    done();
    return;
  }
  Alert.alert('Add a reminder?', `Get a reminder for ${vaccineName} on ${formatDay(nextDueOn)}.`, [
    { text: 'Not now', style: 'cancel', onPress: done },
    {
      text: 'Add reminder',
      onPress: () =>
        router.replace({ pathname: '/care/new', params: { petId, type: 'custom', title: dueReminderTitle(vaccineName), date: nextDueOn } }),
    },
  ]);
}

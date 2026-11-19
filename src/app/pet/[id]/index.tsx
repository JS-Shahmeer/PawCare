import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { resolveStoredUri } from '@/core/files/storage';
import { Avatar, Button, Card, EmptyState, Text } from '@/core/ui/components';
import { usePalette } from '@/core/ui/theme';
import { radius, spacing } from '@/core/ui/tokens';
import { CareEventRow } from '@/features/care/components/CareEventRow';
import { useCareEventsForPet } from '@/features/care/repo';
import { DocumentRow } from '@/features/documents/components/DocumentRow';
import { useDocumentsForPet } from '@/features/documents/repo';
import { VaccinationRow } from '@/features/vaccinations/components/VaccinationRow';
import { useVaccinationsForPet } from '@/features/vaccinations/repo';
import { todayIso } from '@/lib/dates';
import { ageText, deleteImpactMessage, petSubtitle } from '@/features/pets/logic/describePet';
import { deletePet, getDeleteImpact, usePet } from '@/features/pets/repo';

const SEX_LABEL: Record<string, string> = { female: 'Female', male: 'Male', unknown: 'Sex unknown' };

function Fact({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <View style={styles.fact}>
      <Text variant="label" tone="muted">
        {label}
      </Text>
      <Text>{value}</Text>
    </View>
  );
}

export default function PetDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { pet, loaded } = usePet(id);
  const care = useCareEventsForPet(id);
  const vax = useVaccinationsForPet(id);
  const docs = useDocumentsForPet(id);
  const [now] = useState(() => Date.now());
  const [today] = useState(() => todayIso());
  const p = usePalette();

  if (!loaded) return null;
  if (!pet) {
    return (
      <SafeAreaView style={[styles.root, { backgroundColor: p.ground, padding: spacing.xl }]}>
        <EmptyState icon="paw" title="Pet not found" message="This pet may have been deleted." actionLabel="Back to pets" onAction={() => router.replace('/pets')} />
      </SafeAreaView>
    );
  }

  function confirmDelete() {
    if (!pet) return;
    const message = deleteImpactMessage(pet.name, getDeleteImpact(pet.id));
    Alert.alert(`Delete ${pet.name}?`, message, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          try {
            deletePet(pet.id);
            router.replace('/pets');
          } catch {
            Alert.alert('Could not delete', 'Nothing was removed. Please try again.');
          }
        },
      },
    ]);
  }

  const isCat = pet.species === 'cat';

  return (
    <SafeAreaView edges={['bottom']} style={[styles.root, { backgroundColor: p.ground }]}>
      <Stack.Screen options={{ title: '' }} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.hero, { backgroundColor: isCat ? p.primaryTint : p.accentTint }]}>
          <Avatar uri={pet.photoPath ? resolveStoredUri(pet.photoPath) : null} label={pet.name} size={84} tone={isCat ? 'teal' : 'coral'} />
          <View style={styles.heroText}>
            <Text variant="display" accessibilityRole="header" numberOfLines={2}>
              {pet.name}
            </Text>
            <Text tone="muted" style={{ fontSize: 14 }}>
              {petSubtitle(pet)}
            </Text>
          </View>
        </View>

        <Card style={styles.card}>
          <Text variant="title">Profile</Text>
          <Fact label="Species" value={isCat ? 'Cat' : 'Dog'} />
          <Fact label="Breed" value={pet.breed} />
          <Fact label="Birth date" value={pet.birthDate} />
          <Fact label="Age" value={ageText(pet)} />
          <Fact label="Sex" value={pet.sex ? SEX_LABEL[pet.sex] ?? pet.sex : null} />
          <Fact label="Notes" value={pet.notes} />
        </Card>

        <View style={styles.section}>
          <Text variant="title" accessibilityRole="header">
            Vaccinations
          </Text>
          {vax.loaded && vax.vaccinations.length === 0 ? (
            <Text tone="muted">No vaccination records yet. Add vaccines from your vet&apos;s records.</Text>
          ) : (
            vax.vaccinations.map((v) => <VaccinationRow key={v.id} vaccination={v} today={today} />)
          )}
          <Button label="Add vaccination" variant="secondary" onPress={() => router.push({ pathname: '/vaccination/new', params: { petId: pet.id } })} />
        </View>

        <View style={styles.section}>
          <Text variant="title" accessibilityRole="header">
            Care and visits
          </Text>
          {care.loaded && care.events.length === 0 ? (
            <Text tone="muted">No reminders yet. Add grooming, medication, flea and tick care or a vet visit.</Text>
          ) : (
            care.events.map((e) => <CareEventRow key={e.id} event={e} overrides={care.overrides.filter((o) => o.eventId === e.id)} now={now} />)
          )}
          <View style={styles.actions}>
            <Button style={styles.flex} label="Add reminder" variant="secondary" onPress={() => router.push({ pathname: '/care/new', params: { petId: pet.id } })} />
            <Button style={styles.flex} label="Add vet visit" variant="secondary" onPress={() => router.push({ pathname: '/care/new', params: { petId: pet.id, type: 'vet_visit' } })} />
          </View>
        </View>

        <View style={styles.section}>
          <Text variant="title" accessibilityRole="header">
            Documents
          </Text>
          {docs.loaded && docs.documents.length === 0 ? (
            <Text tone="muted">Keep certificates, lab results and receipts here. They stay on this phone.</Text>
          ) : (
            docs.documents.map((d) => <DocumentRow key={d.id} doc={d} />)
          )}
          <Button label="Add document" variant="secondary" onPress={() => router.push({ pathname: '/document/new', params: { petId: pet.id } })} />
        </View>

        <Button label="Edit profile" variant="secondary" onPress={() => router.push({ pathname: '/pet/[id]/edit', params: { id: pet.id } })} />
        <Button label={`Delete ${pet.name}`} variant="destructive" onPress={confirmDelete} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { padding: spacing.xl - 4, gap: spacing.lg, paddingBottom: spacing.xxl * 2 },
  hero: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg, padding: spacing.xl - 4, borderRadius: radius.sheet },
  heroText: { flex: 1, gap: 4 },
  card: { gap: spacing.md },
  fact: { gap: 2 },
  section: { gap: spacing.sm + 2 },
  actions: { flexDirection: 'row', gap: spacing.sm },
  flex: { flex: 1 },
});

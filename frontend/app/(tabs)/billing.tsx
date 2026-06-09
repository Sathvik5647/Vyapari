import {
  View, Text, StyleSheet, SafeAreaView, Platform, StatusBar,
  ScrollView, TouchableOpacity
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Colors } from '../../constants/theme';

const theme = Colors.light;

export default function BillingScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>Billing</Text>
        <Text style={styles.subtitle}>Your recent bills & transactions</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Empty state */}
        <View style={styles.emptyCard}>
          <View style={styles.emptyIconBox}>
            <MaterialIcons name="receipt-long" size={48} color={theme.primary} />
          </View>
          <Text style={styles.emptyTitle}>No Bills Yet</Text>
          <Text style={styles.emptyBody}>
            Bills you generate from your store will appear here.
          </Text>
          <TouchableOpacity
            style={styles.cta}
            onPress={() => router.push('/(tabs)/vendor')}
          >
            <MaterialIcons name="storefront" size={18} color={theme.onPrimary} />
            <Text style={styles.ctaText}>Go to My Store</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: theme.surface,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.outlineVariant,
  },
  title: {
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    fontSize: 28,
    color: theme.onSurface,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontFamily: 'PlusJakartaSans_400Regular',
    fontSize: 14,
    color: theme.onSurfaceVariant,
    marginTop: 4,
  },
  content: {
    flex: 1,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyCard: {
    alignItems: 'center',
    padding: 32,
    borderRadius: 20,
    backgroundColor: theme.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: theme.outlineVariant,
    width: '100%',
    gap: 12,
    marginTop: 60,
  },
  emptyIconBox: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: theme.primaryContainer + '30',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  emptyTitle: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 22,
    color: theme.onSurface,
  },
  emptyBody: {
    fontFamily: 'PlusJakartaSans_400Regular',
    fontSize: 14,
    color: theme.onSurfaceVariant,
    textAlign: 'center',
    lineHeight: 20,
  },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: theme.primary,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 8,
  },
  ctaText: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 15,
    color: theme.onPrimary,
  },
});

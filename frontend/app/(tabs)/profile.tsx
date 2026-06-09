import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Alert, ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { Colors } from '../../constants/theme';
import { useAuth } from '../../context/AuthContext';
import { becomeVendor } from '../../utils/auth';

const theme = Colors.light;

// ── Guest screen (not logged in) ─────────────────────────────
function GuestProfile() {
  const router = useRouter();
  return (
    <View style={styles.guestContainer}>
      <View style={styles.guestIconBox}>
        <MaterialIcons name="person-outline" size={52} color={theme.primary} />
      </View>
      <Text style={styles.guestTitle}>Discover Vyapari</Text>
      <Text style={styles.guestBody}>
        You can browse local stores and navigate the map without an account.{'\n\n'}
        Log in or create an account to generate bills, manage your store, and more.
      </Text>
      <TouchableOpacity
        style={[styles.primaryBtn, { backgroundColor: theme.primary }]}
        onPress={() => router.push('/vendor-setup')}
      >
        <MaterialIcons name="login" size={18} color={theme.onPrimary} />
        <Text style={[styles.primaryBtnText, { color: theme.onPrimary }]}>Log In / Sign Up</Text>
      </TouchableOpacity>
      <Text style={styles.guestHint}>No account needed to explore</Text>
    </View>
  );
}

// ── Vendor upgrade prompt ─────────────────────────────────────
function BecomeVendorCard({ onUpgrade }: { onUpgrade: () => void }) {
  const [busy, setBusy] = useState(false);

  const handleUpgrade = async () => {
    Alert.alert(
      'Become a Vendor?',
      'This will upgrade your account so you can create a store, manage inventory, and generate bills.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Yes, Become Vendor',
          onPress: async () => {
            try {
              setBusy(true);
              await becomeVendor();
              onUpgrade();
            } catch (e: any) {
              Alert.alert('Error', e.message);
            } finally {
              setBusy(false);
            }
          },
        },
      ],
    );
  };

  return (
    <View style={styles.vendorCard}>
      <View style={styles.vendorCardLeft}>
        <MaterialIcons name="storefront" size={28} color={theme.primary} />
        <View style={{ flex: 1 }}>
          <Text style={styles.vendorCardTitle}>Open Your Store</Text>
          <Text style={styles.vendorCardSub}>Sell locally with Vyapari</Text>
        </View>
      </View>
      <TouchableOpacity
        style={styles.vendorBtn}
        onPress={handleUpgrade}
        disabled={busy}
      >
        {busy
          ? <ActivityIndicator size="small" color={theme.onPrimary} />
          : <Text style={styles.vendorBtnText}>Upgrade</Text>
        }
      </TouchableOpacity>
    </View>
  );
}

// ── Main Profile screen ───────────────────────────────────────
export default function ProfileScreen() {
  const router = useRouter();
  const { user, loading, refresh, logout } = useAuth();

  const handleLogout = () => {
    Alert.alert('Log Out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log Out', style: 'destructive',
        onPress: async () => {
          await logout();
          // Stay on profile — it will show the guest screen
        },
      },
    ]);
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.safe, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </SafeAreaView>
    );
  }

  if (!user) {
    return (
      <SafeAreaView style={styles.safe}>
        <GuestProfile />
      </SafeAreaView>
    );
  }

  const isVendor = user.role === 'vendor';

  const accountSection = [
    { icon: 'email', label: 'Email', value: user.email },
    { icon: 'badge', label: 'Role', value: isVendor ? '🏪 Vendor' : '👤 Customer' },
  ];

  const appSection = [
    { icon: 'info-outline', label: 'App Version', value: '2.0.0' },
    { icon: 'logout', label: 'Log Out', danger: true, onPress: handleLogout },
  ];

  const vendorSection = isVendor ? [
    { icon: 'storefront', label: 'My Store', onPress: () => router.push('/(tabs)/vendor') },
    { icon: 'inventory-2', label: 'Inventory', onPress: () => router.push('/(tabs)/vendor') },
    { icon: 'receipt-long', label: 'Bills', onPress: () => router.push('/(tabs)/billing') },
  ] : [];

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <View style={[styles.avatar, { backgroundColor: isVendor ? theme.primaryContainer + '50' : theme.secondaryContainer + '50' }]}>
          <MaterialIcons
            name={isVendor ? "storefront" : "person"}
            size={32}
            color={isVendor ? theme.primary : theme.secondary}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>{isVendor ? 'Vendor' : 'Customer'}</Text>
          <Text style={styles.headerEmail} numberOfLines={1}>{user.email}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Become Vendor card — only for customers */}
        {!isVendor && (
          <BecomeVendorCard onUpgrade={() => refresh()} />
        )}

        {/* Vendor actions */}
        {isVendor && vendorSection.length > 0 && (
          <Section title="My Store" items={vendorSection} />
        )}

        <Section title="Account" items={accountSection} />
        <Section title="App" items={appSection} />

        <Text style={styles.footer}>Vyapari · FastAPI + MySQL</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

type RowItem = {
  icon: string;
  label: string;
  value?: string;
  danger?: boolean;
  onPress?: () => void;
};

function Section({ title, items }: { title: string; items: RowItem[] }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.card}>
        {items.map((item, idx) => (
          <TouchableOpacity
            key={item.label}
            style={[
              styles.row,
              idx < items.length - 1 && { borderBottomWidth: 1, borderBottomColor: theme.outlineVariant },
            ]}
            onPress={item.onPress}
            disabled={!item.onPress}
            activeOpacity={item.onPress ? 0.6 : 1}
          >
            <View style={[styles.iconBox, { backgroundColor: item.danger ? '#FDEAEA' : theme.surfaceContainerHigh }]}>
              <MaterialIcons
                name={item.icon as any}
                size={20}
                color={item.danger ? '#D32F2F' : theme.primary}
              />
            </View>
            <Text style={[styles.rowLabel, item.danger && { color: '#D32F2F' }]}>{item.label}</Text>
            <View style={{ flex: 1 }} />
            {item.value
              ? <Text style={styles.rowValue}>{item.value}</Text>
              : item.onPress ? <MaterialIcons name="chevron-right" size={20} color={theme.outline} /> : null
            }
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.surface },

  // ── Guest ─────────────────────────────────────────────────
  guestContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 16,
  },
  guestIconBox: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: theme.primaryContainer + '25',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  guestTitle: {
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    fontSize: 26,
    color: theme.onSurface,
    textAlign: 'center',
  },
  guestBody: {
    fontFamily: 'PlusJakartaSans_400Regular',
    fontSize: 15,
    color: theme.onSurfaceVariant,
    textAlign: 'center',
    lineHeight: 22,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 8,
  },
  primaryBtnText: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 16,
  },
  guestHint: {
    fontFamily: 'PlusJakartaSans_400Regular',
    fontSize: 12,
    color: theme.outline,
    textAlign: 'center',
  },

  // ── Become Vendor card ─────────────────────────────────────
  vendorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: theme.primary + '40',
    backgroundColor: theme.primaryContainer + '15',
    gap: 12,
    marginBottom: 4,
  },
  vendorCardLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  vendorCardTitle: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 15,
    color: theme.onSurface,
  },
  vendorCardSub: {
    fontFamily: 'PlusJakartaSans_400Regular',
    fontSize: 12,
    color: theme.onSurfaceVariant,
  },
  vendorBtn: {
    backgroundColor: theme.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    minWidth: 80,
    alignItems: 'center',
  },
  vendorBtnText: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 13,
    color: theme.onPrimary,
  },

  // ── Logged in ─────────────────────────────────────────────
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    padding: 24,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: theme.outlineVariant,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    fontSize: 20,
    color: theme.onSurface,
  },
  headerEmail: {
    fontFamily: 'PlusJakartaSans_400Regular',
    fontSize: 13,
    color: theme.onSurfaceVariant,
    marginTop: 2,
  },
  content: { padding: 20, paddingBottom: 120, gap: 20 },
  section: { gap: 8 },
  sectionTitle: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 11,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: theme.onSurfaceVariant,
    paddingHorizontal: 4,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.outlineVariant,
    backgroundColor: theme.surfaceContainerLowest,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 14,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowLabel: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 15,
    color: theme.onSurface,
  },
  rowValue: {
    fontFamily: 'PlusJakartaSans_400Regular',
    fontSize: 13,
    color: theme.onSurfaceVariant,
    maxWidth: 180,
    textAlign: 'right',
  },
  footer: {
    fontFamily: 'PlusJakartaSans_400Regular',
    fontSize: 12,
    color: theme.outline,
    textAlign: 'center',
    marginTop: 8,
  },
});

import {
  StyleSheet, View, Text, TextInput, TouchableOpacity,
  Platform, StatusBar, ActivityIndicator,
  KeyboardAvoidingView, ScrollView, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { logIn, signUp, UserRole } from '../../utils/auth';
import { apiClient } from '../../utils/apiClient';
import { useAuth } from '../../context/AuthContext';
import { Colors } from '../../constants/theme';

const theme = Colors.light;
type Tab = 'login' | 'signup';

export default function VendorAuth() {
  const [tab, setTab] = useState<Tab>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [selectedRole, setSelectedRole] = useState<UserRole>('customer');
  const [loading, setLoading] = useState(false);

  const router = useRouter();
  const { refresh } = useAuth();

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      Alert.alert('Missing fields', 'Please enter your email and password.');
      return;
    }
    try {
      setLoading(true);
      const user = await logIn(email.trim().toLowerCase(), password);
      await refresh();

      if (user.role === 'vendor') {
        // Check if vendor already has a store
        try {
          await apiClient.get('/api/stores/mine');
          router.replace('/(tabs)/vendor');
        } catch {
          router.push('/vendor-setup/details');
        }
      } else {
        // Customer — just go to the map
        router.replace('/(tabs)');
      }
    } catch (e: any) {
      Alert.alert('Login failed', e.message || 'Invalid email or password.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async () => {
    if (!email.trim() || !password) {
      Alert.alert('Missing fields', 'Please enter your email and a password.');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Weak password', 'Password must be at least 6 characters.');
      return;
    }
    try {
      setLoading(true);
      await signUp(email.trim().toLowerCase(), password, selectedRole);
      await refresh();

      if (selectedRole === 'vendor') {
        router.push('/vendor-setup/details');
      } else {
        router.replace('/(tabs)');
      }
    } catch (e: any) {
      Alert.alert('Sign up failed', e.message || 'Could not create account.');
    } finally {
      setLoading(false);
    }
  };

  const submit = () => (tab === 'login' ? handleLogin() : handleSignUp());

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Brand */}
          <View style={styles.brandRow}>
            <View style={[styles.logoCircle, { backgroundColor: theme.primary }]}>
              <Ionicons name="storefront" size={32} color="#FFF" />
            </View>
            <Text style={[styles.brandName, { color: theme.onSurface }]}>Vyapari</Text>
            <Text style={[styles.brandSub, { color: theme.onSurfaceVariant }]}>
              Connecting local vendors to their community
            </Text>
          </View>

          {/* Tab Switcher */}
          <View style={[styles.tabBar, { backgroundColor: theme.surfaceContainerHigh, borderColor: theme.outlineVariant }]}>
            {(['login', 'signup'] as Tab[]).map(t => (
              <TouchableOpacity
                key={t}
                style={[styles.tabBtn, tab === t && { backgroundColor: theme.surfaceContainerLowest }]}
                onPress={() => setTab(t)}
              >
                <Text style={[
                  styles.tabBtnText,
                  { color: tab === t ? theme.primary : theme.onSurfaceVariant, fontWeight: tab === t ? '700' : '500' }
                ]}>
                  {t === 'login' ? 'Log In' : 'Sign Up'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Card */}
          <View style={[styles.card, { backgroundColor: theme.surfaceContainerLowest, borderColor: theme.outlineVariant }]}>
            {/* Email */}
            <Text style={[styles.label, { color: theme.onSurfaceVariant }]}>Email Address</Text>
            <View style={[styles.inputRow, { backgroundColor: theme.surfaceContainerLow, borderColor: theme.outlineVariant }]}>
              <Ionicons name="mail-outline" size={18} color={theme.onSurfaceVariant} style={{ marginLeft: 14 }} />
              <TextInput
                style={[styles.input, { color: theme.onSurface }]}
                placeholder="you@example.com"
                placeholderTextColor={theme.outline}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                value={email}
                onChangeText={setEmail}
              />
            </View>

            {/* Password */}
            <Text style={[styles.label, { color: theme.onSurfaceVariant }]}>Password</Text>
            <View style={[styles.inputRow, { backgroundColor: theme.surfaceContainerLow, borderColor: theme.outlineVariant }]}>
              <Ionicons name="lock-closed-outline" size={18} color={theme.onSurfaceVariant} style={{ marginLeft: 14 }} />
              <TextInput
                style={[styles.input, { color: theme.onSurface }]}
                placeholder={tab === 'signup' ? 'Choose a password (min. 6 chars)' : 'Your password'}
                placeholderTextColor={theme.outline}
                secureTextEntry={!showPw}
                value={password}
                onChangeText={setPassword}
              />
              <TouchableOpacity onPress={() => setShowPw(v => !v)} style={{ paddingHorizontal: 14 }}>
                <Ionicons name={showPw ? 'eye-off-outline' : 'eye-outline'} size={18} color={theme.onSurfaceVariant} />
              </TouchableOpacity>
            </View>

            {/* Role Picker — only on signup */}
            {tab === 'signup' && (
              <>
                <Text style={[styles.label, { color: theme.onSurfaceVariant, marginTop: 4 }]}>I am a...</Text>
                <View style={styles.roleRow}>
                  {([
                    { role: 'customer', icon: 'person-outline', label: 'Customer', sub: 'Browse & discover' },
                    { role: 'vendor', icon: 'storefront', label: 'Vendor', sub: 'Sell locally' },
                  ] as { role: UserRole; icon: string; label: string; sub: string }[]).map(option => (
                    <TouchableOpacity
                      key={option.role}
                      style={[
                        styles.roleCard,
                        {
                          borderColor: selectedRole === option.role ? theme.primary : theme.outlineVariant,
                          backgroundColor: selectedRole === option.role ? theme.primary + '10' : theme.surfaceContainerLowest,
                        },
                      ]}
                      onPress={() => setSelectedRole(option.role)}
                    >
                      <MaterialIcons
                        name={option.icon as any}
                        size={24}
                        color={selectedRole === option.role ? theme.primary : theme.onSurfaceVariant}
                      />
                      <Text style={[styles.roleLabel, { color: selectedRole === option.role ? theme.primary : theme.onSurface }]}>
                        {option.label}
                      </Text>
                      <Text style={[styles.roleSub, { color: theme.onSurfaceVariant }]}>{option.sub}</Text>
                      {selectedRole === option.role && (
                        <View style={styles.roleCheck}>
                          <MaterialIcons name="check-circle" size={16} color={theme.primary} />
                        </View>
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}

            {/* Submit */}
            <TouchableOpacity
              style={[styles.submitBtn, { backgroundColor: theme.primary, opacity: loading ? 0.7 : 1 }]}
              onPress={submit}
              disabled={loading}
            >
              {loading
                ? <ActivityIndicator color="#FFF" />
                : <Text style={styles.submitBtnText}>
                    {tab === 'login' ? 'Log In →' : 'Create Account →'}
                  </Text>
              }
            </TouchableOpacity>

            {/* Switch tab */}
            <TouchableOpacity
              style={{ marginTop: 16, alignItems: 'center' }}
              onPress={() => { setTab(tab === 'login' ? 'signup' : 'login'); setPassword(''); }}
            >
              <Text style={{ color: theme.onSurfaceVariant, fontFamily: 'PlusJakartaSans_400Regular', fontSize: 13 }}>
                {tab === 'login' ? "Don't have an account? " : 'Already have an account? '}
                <Text style={{ color: theme.primary, fontFamily: 'PlusJakartaSans_700Bold' }}>
                  {tab === 'login' ? 'Sign Up' : 'Log In'}
                </Text>
              </Text>
            </TouchableOpacity>
          </View>

          {/* Continue without account */}
          <TouchableOpacity
            style={styles.skipBtn}
            onPress={() => router.replace('/(tabs)')}
          >
            <Text style={[styles.skipText, { color: theme.onSurfaceVariant }]}>
              Continue without account →
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f4fafd' },
  scroll: { padding: 24, paddingBottom: 48 },

  brandRow: { alignItems: 'center', marginBottom: 32, marginTop: 16 },
  logoCircle: {
    width: 72, height: 72, borderRadius: 36,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 14,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35, shadowRadius: 12, elevation: 8,
  },
  brandName: { fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 28, letterSpacing: -0.5, marginBottom: 4 },
  brandSub: { fontFamily: 'PlusJakartaSans_400Regular', fontSize: 14, textAlign: 'center' },

  tabBar: { flexDirection: 'row', borderRadius: 14, borderWidth: 1, padding: 4, marginBottom: 20 },
  tabBtn: { flex: 1, paddingVertical: 10, borderRadius: 11, alignItems: 'center' },
  tabBtnText: { fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 15 },

  card: { borderRadius: 20, borderWidth: 1, padding: 24 },
  label: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 11, letterSpacing: 0.6, textTransform: 'uppercase', marginBottom: 8 },
  inputRow: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 12, borderWidth: 1, height: 52, marginBottom: 18,
  },
  input: { flex: 1, height: '100%', paddingHorizontal: 12, fontFamily: 'PlusJakartaSans_400Regular', fontSize: 15 },

  // Role picker
  roleRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  roleCard: {
    flex: 1,
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    borderWidth: 2,
    gap: 6,
    position: 'relative',
  },
  roleLabel: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 14 },
  roleSub: { fontFamily: 'PlusJakartaSans_400Regular', fontSize: 11, textAlign: 'center' },
  roleCheck: { position: 'absolute', top: 8, right: 8 },

  submitBtn: {
    height: 52, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center', marginTop: 4,
  },
  submitBtnText: { color: '#FFF', fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 16 },

  skipBtn: { alignItems: 'center', marginTop: 24 },
  skipText: { fontFamily: 'PlusJakartaSans_400Regular', fontSize: 14 },
});
import {
  StyleSheet, View, Text, TextInput, TouchableOpacity,
  SafeAreaView, Platform, StatusBar, ActivityIndicator,
  KeyboardAvoidingView, ScrollView, Alert,
} from 'react-native';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { logIn, signUp } from '../../utils/auth';
import { apiClient } from '../../utils/apiClient';
import { useVendorContext } from './_layout';
import { Colors } from '../../constants/theme';

const theme = Colors.light;
type Tab = 'login' | 'signup';

export default function VendorAuth() {
  const [tab, setTab] = useState<Tab>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  const router = useRouter();
  const { updateData } = useVendorContext();

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      Alert.alert('Missing fields', 'Please enter your email and password.');
      return;
    }
    try {
      setLoading(true);
      await logIn(email.trim().toLowerCase(), password);

      // Check if vendor already has a store
      try {
        await apiClient.get('/api/stores/mine');
        router.replace('/(tabs)/vendor');
      } catch {
        // 404 means no store yet
        router.push('/vendor-setup/details');
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
      await signUp(email.trim().toLowerCase(), password);
      router.push('/vendor-setup/details');
    } catch (e: any) {
      Alert.alert('Sign up failed', e.message || 'Could not create account.');
    } finally {
      setLoading(false);
    }
  };

  const submit = () => (tab === 'login' ? handleLogin() : handleSignUp());

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]}>
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
            <Text style={[styles.brandName, { color: theme.onSurface }]}>Vendor Portal</Text>
            <Text style={[styles.brandSub, { color: theme.onSurfaceVariant }]}>
              Manage your store, products & bills
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
              <Text style={{ color: theme.onSurfaceVariant, fontSize: 13 }}>
                {tab === 'login' ? "Don't have an account? " : 'Already have an account? '}
                <Text style={{ color: theme.primary, fontWeight: '700' }}>
                  {tab === 'login' ? 'Sign Up' : 'Log In'}
                </Text>
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 },
  scroll: { padding: 24, paddingBottom: 48 },

  brandRow: { alignItems: 'center', marginBottom: 32, marginTop: 24 },
  logoCircle: {
    width: 72, height: 72, borderRadius: 36,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 14,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35, shadowRadius: 12, elevation: 8,
  },
  brandName: { fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 26, letterSpacing: -0.5, marginBottom: 6 },
  brandSub: { fontFamily: 'PlusJakartaSans_400Regular', fontSize: 14, textAlign: 'center' },

  tabBar: { flexDirection: 'row', borderRadius: 14, borderWidth: 1, padding: 4, marginBottom: 20 },
  tabBtn: { flex: 1, paddingVertical: 10, borderRadius: 11, alignItems: 'center' },
  tabBtnText: { fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 15 },

  card: { borderRadius: 20, borderWidth: 1, padding: 24 },
  label: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 12, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 8 },
  inputRow: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 12, borderWidth: 1, height: 52, marginBottom: 18,
  },
  input: { flex: 1, height: '100%', paddingHorizontal: 12, fontFamily: 'PlusJakartaSans_400Regular', fontSize: 15 },
  submitBtn: {
    height: 52, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center', marginTop: 4,
  },
  submitBtnText: { color: '#FFF', fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 16, letterSpacing: 0.2 },
});
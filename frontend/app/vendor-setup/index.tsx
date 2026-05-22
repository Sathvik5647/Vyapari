import {
  StyleSheet, View, Text, TextInput, TouchableOpacity,
  SafeAreaView, Platform, StatusBar, ActivityIndicator,
  useColorScheme, KeyboardAvoidingView, ScrollView, Alert,
} from 'react-native';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../utils/supabase';
import { useVendorContext } from './_layout';

const PRIMARY = '#0F6E56';
type Tab = 'login' | 'signup';

export default function VendorAuth() {
  const [tab, setTab] = useState<Tab>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  const router = useRouter();
  const { updateData } = useVendorContext();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const colors = {
    bg:      isDark ? '#111'    : '#F8F9FA',
    card:    isDark ? '#1C1C1E' : '#FFFFFF',
    text:    isDark ? '#FFF'    : '#111',
    textDim: isDark ? '#888'    : '#666',
    border:  isDark ? '#333'    : '#E0E0E0',
    input:   isDark ? '#2A2A2A' : '#F5F5F5',
  };

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      Alert.alert('Missing fields', 'Please enter your email and password.');
      return;
    }
    try {
      setLoading(true);
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });
      if (error) throw error;

      // Check if vendor already has a store
      const { data: storeData } = await supabase
        .from('stores')
        .select('id')
        .eq('vendor_id', data.user.id)
        .maybeSingle();

      if (storeData) {
        router.replace('/(tabs)/vendor');
      } else {
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
      const { data, error } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
      });
      if (error) throw error;

      if (!data.session) {
        Alert.alert(
          'Check your email 📧',
          'We sent you a confirmation link. After verifying, come back and log in.',
          [{ text: 'OK', onPress: () => setTab('login') }]
        );
        return;
      }
      // Signed up + logged in — go to onboarding
      router.push('/vendor-setup/details');
    } catch (e: any) {
      Alert.alert('Sign up failed', e.message || 'Could not create account.');
    } finally {
      setLoading(false);
    }
  };

  const submit = () => (tab === 'login' ? handleLogin() : handleSignUp());

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Brand */}
          <View style={styles.brandRow}>
            <View style={styles.logoCircle}>
              <Ionicons name="storefront" size={32} color="#FFF" />
            </View>
            <Text style={[styles.brandName, { color: colors.text }]}>Vendor Portal</Text>
            <Text style={[styles.brandSub, { color: colors.textDim }]}>
              Manage your store, products & bills
            </Text>
          </View>

          {/* Tab Switcher */}
          <View style={[styles.tabBar, { backgroundColor: colors.input, borderColor: colors.border }]}>
            {(['login', 'signup'] as Tab[]).map(t => (
              <TouchableOpacity
                key={t}
                style={[styles.tabBtn, tab === t && { backgroundColor: colors.card }]}
                onPress={() => setTab(t)}
              >
                <Text style={[
                  styles.tabBtnText,
                  { color: tab === t ? PRIMARY : colors.textDim, fontWeight: tab === t ? '700' : '500' }
                ]}>
                  {t === 'login' ? 'Log In' : 'Sign Up'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Card */}
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>

            {/* Email */}
            <Text style={[styles.label, { color: colors.textDim }]}>Email Address</Text>
            <View style={[styles.inputRow, { backgroundColor: colors.input, borderColor: colors.border }]}>
              <Ionicons name="mail-outline" size={18} color={colors.textDim} style={{ marginLeft: 14 }} />
              <TextInput
                style={[styles.input, { color: colors.text }]}
                placeholder="you@example.com"
                placeholderTextColor="#AAA"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                value={email}
                onChangeText={setEmail}
              />
            </View>

            {/* Password */}
            <Text style={[styles.label, { color: colors.textDim }]}>Password</Text>
            <View style={[styles.inputRow, { backgroundColor: colors.input, borderColor: colors.border }]}>
              <Ionicons name="lock-closed-outline" size={18} color={colors.textDim} style={{ marginLeft: 14 }} />
              <TextInput
                style={[styles.input, { color: colors.text }]}
                placeholder={tab === 'signup' ? 'Choose a password (min. 6 chars)' : 'Your password'}
                placeholderTextColor="#AAA"
                secureTextEntry={!showPw}
                value={password}
                onChangeText={setPassword}
              />
              <TouchableOpacity onPress={() => setShowPw(v => !v)} style={{ paddingHorizontal: 14 }}>
                <Ionicons name={showPw ? 'eye-off-outline' : 'eye-outline'} size={18} color={colors.textDim} />
              </TouchableOpacity>
            </View>

            {/* Submit */}
            <TouchableOpacity
              style={[styles.submitBtn, { opacity: loading ? 0.7 : 1 }]}
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
              <Text style={{ color: colors.textDim, fontSize: 13 }}>
                {tab === 'login' ? "Don't have an account? " : 'Already have an account? '}
                <Text style={{ color: PRIMARY, fontWeight: '700' }}>
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
    backgroundColor: PRIMARY, alignItems: 'center', justifyContent: 'center',
    marginBottom: 14,
    shadowColor: PRIMARY, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35, shadowRadius: 12, elevation: 8,
  },
  brandName: { fontSize: 26, fontWeight: '800', letterSpacing: -0.5, marginBottom: 6 },
  brandSub: { fontSize: 14, textAlign: 'center' },

  tabBar: { flexDirection: 'row', borderRadius: 14, borderWidth: 1, padding: 4, marginBottom: 20 },
  tabBtn: { flex: 1, paddingVertical: 10, borderRadius: 11, alignItems: 'center' },
  tabBtnText: { fontSize: 15 },

  card: { borderRadius: 20, borderWidth: 1, padding: 24 },
  label: { fontSize: 12, fontWeight: '700', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 8 },
  inputRow: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 12, borderWidth: 1, height: 52, marginBottom: 18,
  },
  input: { flex: 1, height: '100%', paddingHorizontal: 12, fontSize: 15 },
  submitBtn: {
    backgroundColor: PRIMARY, height: 52, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center', marginTop: 4,
  },
  submitBtnText: { color: '#FFF', fontSize: 16, fontWeight: '800', letterSpacing: 0.2 },
});
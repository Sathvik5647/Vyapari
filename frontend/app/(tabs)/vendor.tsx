import {
  StyleSheet, View, Text, ScrollView, TouchableOpacity,
  SafeAreaView, Platform, StatusBar, ActivityIndicator,
  Modal, TextInput, Alert, KeyboardAvoidingView, useColorScheme, Image
} from 'react-native';
import { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../utils/supabase';
import { Audio } from 'expo-av';
import * as ImagePicker from 'expo-image-picker';
import { ML_API } from '../../utils/api';

const PRIMARY = '#0F6E56';

export default function VendorScreen() {
  const [store, setStore] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  // ── Add Product Modal ──────────────────────────────────────
  const [showAddModal, setShowAddModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPrice, setNewPrice] = useState('');
  const [newUnit, setNewUnit] = useState('');
  const [addingProduct, setAddingProduct] = useState(false);

  // ── ML States ──────────────────────────────────────────────
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [isProcessingML, setIsProcessingML] = useState(false);
  const [mlStatusText, setMlStatusText] = useState('');

  // ── Edit Product State ─────────────────────────────────────
  const [editProduct, setEditProduct] = useState<any>(null);
  const [editName, setEditName] = useState('');
  const [editPrice, setEditPrice] = useState('');

  const colors = {
    bg: isDark ? '#111' : '#F8F9FA',
    card: isDark ? '#1C1C1E' : '#FFFFFF',
    text: isDark ? '#FFF' : '#111',
    textDim: isDark ? '#999' : '#666',
    border: isDark ? '#333' : '#E8E8E8',
    input: isDark ? '#2A2A2A' : '#F5F5F5',
  };

  useEffect(() => { fetchVendorData(); }, []);

  const fetchVendorData = async () => {
    try {
      setLoading(true);
      const { data: userAuth } = await supabase.auth.getUser();
      const vendorId = userAuth.user?.id;
      if (!vendorId) { setLoading(false); return; }

      const { data: storeData } = await supabase
        .from('stores').select('*').eq('vendor_id', vendorId).single();

      if (storeData) {
        setStore(storeData);
        const { data: productData } = await supabase
          .from('products').select('*').eq('store_id', storeData.id).order('name');
        setProducts(productData || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // ── ML Handlers ────────────────────────────────────────────

  /** Tap once to START, tap again to STOP and process. */
  const handleVoiceToggle = async () => {
    if (recording) {
      // ── STOP ──
      await stopRecordingAndProcess();
    } else {
      // ── START ──
      await beginRecording();
    }
  };

  const beginRecording = async () => {
    // 1. Quick connectivity check first so we fail fast
    setIsProcessingML(true);
    setMlStatusText('Checking ML server...');
    const alive = await ML_API.ping();
    setIsProcessingML(false);
    setMlStatusText('');
    if (!alive) {
      Alert.alert(
        'ML Server Unreachable 🚫',
        `Cannot connect to ${process.env.EXPO_PUBLIC_FASTAPI_URL || 'FastAPI'}.

1. Start FastAPI:  uvicorn main:app --host 0.0.0.0 --port 8000
2. Make sure your phone and PC are on the same WiFi.
3. Confirm EXPO_PUBLIC_FASTAPI_URL is your PC’s local IP (e.g. http://192.168.x.x:8000).`
      );
      return;
    }

    // 2. Mic permission
    const perm = await Audio.requestPermissionsAsync();
    if (perm.status !== 'granted') {
      Alert.alert('Permission Denied', 'Microphone access is needed for voice input.');
      return;
    }

    // 3. Clean up any stale recording
    if (recording) {
      try { await recording.stopAndUnloadAsync(); } catch (_) {}
      setRecording(null);
    }

    try {
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const { recording: rec } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      setRecording(rec);
    } catch (err: any) {
      Alert.alert('Mic Error', err.message || 'Could not start microphone.');
    }
  };

  const stopRecordingAndProcess = async () => {
    if (!recording) return;
    const rec = recording;
    setRecording(null);
    try {
      await rec.stopAndUnloadAsync();
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false });
      const uri = rec.getURI();
      if (!uri) { Alert.alert('Error', 'No audio recorded.'); return; }

      setIsProcessingML(true);
      setMlStatusText('Transcribing audio...');
      const transcript = await ML_API.transcribeAudio(uri, 'en');
      console.log('Transcript:', transcript.text);
      if (!transcript.text.trim()) {
        Alert.alert('Nothing heard', 'Could not detect speech. Please try again.');
        return;
      }

      setMlStatusText('Extracting product info...');
      const parsed = await ML_API.parseProduct(transcript.text);
      console.log('Parsed:', parsed);

      if (parsed.name) setNewName(parsed.name);
      if (parsed.price) setNewPrice(String(parsed.price));
      if (parsed.unit) setNewUnit(parsed.unit);
    } catch (error: any) {
      Alert.alert('Voice Error', error.message || 'Something went wrong.');
    } finally {
      setIsProcessingML(false);
      setMlStatusText('');
    }
  };

  const handleTakeAPhoto = async () => {
    // Quick connectivity check
    const alive = await ML_API.ping();
    if (!alive) {
      Alert.alert(
        'ML Server Unreachable 🚫',
        'Start FastAPI with:\n  uvicorn main:app --host 0.0.0.0 --port 8000'
      );
      return;
    }

    try {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (perm.status !== 'granted') {
        Alert.alert('Permission Denied', 'Camera access is needed to take product photos.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: 'images' as any, // avoids deprecated MediaTypeOptions warning
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
        base64: true,
      });

      if (!result.canceled && result.assets[0].base64) {
        setIsProcessingML(true);
        setMlStatusText('Identifying product...');
        const visionData = await ML_API.identifyProductBase64(result.assets[0].base64);
        console.log('Vision Data:', visionData);
        if (visionData.name) setNewName(visionData.name);
      }
    } catch (error: any) {
      Alert.alert('Camera Error', error.message || 'Could not process image.');
    } finally {
      setIsProcessingML(false);
      setMlStatusText('');
    }
  };


  // ── Standard Handlers ──────────────────────────────────────

  const handleAddProduct = async () => {
    if (!newName.trim()) {
      Alert.alert('Missing info', 'Please enter a product name.');
      return;
    }
    try {
      setAddingProduct(true);
      // Price stored as plain numeric in Supabase, ₹ is only for display
      const priceNum = newPrice.trim() ? parseFloat(newPrice.trim().replace(/[^0-9.]/g, '')) : 0;
      const displayName = newUnit.trim() ? `${newName.trim()} (${newUnit.trim()})` : newName.trim();

      const { data, error } = await supabase
        .from('products')
        .insert({
          store_id: store.id,
          name: displayName,
          price: priceNum,
          is_in_stock: true,
        })
        .select()
        .single();

      if (error) throw error;
      setProducts(prev => [...prev, data]);
      setNewName(''); setNewPrice(''); setNewUnit('');
      setShowAddModal(false);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to add product');
    } finally {
      setAddingProduct(false);
    }
  };

  const handleEditProduct = async () => {
    if (!editName.trim()) return;
    try {
      const priceNum = editPrice.trim() ? parseFloat(editPrice.trim().replace(/[^0-9.]/g, '')) : 0;
      const { error } = await supabase
        .from('products')
        .update({ name: editName.trim(), price: priceNum })
        .eq('id', editProduct.id);
      if (error) throw error;
      setProducts(prev => prev.map(p =>
        p.id === editProduct.id ? { ...p, name: editName.trim(), price: priceNum } : p
      ));
      setEditProduct(null);
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  };

  const handleDeleteProduct = (product: any) => {
    Alert.alert('Delete product', `Remove "${product.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          await supabase.from('products').delete().eq('id', product.id);
          setProducts(prev => prev.filter(p => p.id !== product.id));
        }
      }
    ]);
  };

  const toggleStock = async (product: any) => {
    const newStatus = !product.is_in_stock;
    setProducts(prev => prev.map(p => p.id === product.id ? { ...p, is_in_stock: newStatus } : p));
    await supabase.from('products').update({ is_in_stock: newStatus }).eq('id', product.id);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setStore(null); setProducts([]);
  };

  // ── Loading ──────────────────────────────────────────────
  if (loading) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.bg, justifyContent: 'center' }]}>
        <ActivityIndicator size="large" color={PRIMARY} />
      </SafeAreaView>
    );
  }

  // ── Not onboarded ────────────────────────────────────────
  if (!store) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.bg, justifyContent: 'center', padding: 24 }]}>
        <Ionicons name="storefront-outline" size={64} color="#CCC" style={{ alignSelf: 'center', marginBottom: 20 }} />
        <Text style={[styles.noStoreTitle, { color: colors.text }]}>Vendor Portal</Text>
        <Text style={[styles.noStoreSub, { color: colors.textDim }]}>
          Set up your store to appear on the map and start receiving customers.
        </Text>
        <TouchableOpacity style={styles.ctaBtn} onPress={() => router.push('/vendor-setup/')}>
          <Text style={styles.ctaBtnText}>Set Up My Store</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const inStock = products.filter(p => p.is_in_stock).length;

  // ── Main Dashboard ───────────────────────────────────────
  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.bg }]}>
      <ScrollView
        contentContainerStyle={[styles.container, { paddingBottom: 120 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.headerLabel, { color: colors.textDim }]}>MANAGE STORE</Text>
            <Text style={[styles.storeTitle, { color: colors.text }]} numberOfLines={1}>{store.name}</Text>
            {store.location_text ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
                <Ionicons name="location-outline" size={12} color={colors.textDim} />
                <Text style={[styles.locationText, { color: colors.textDim }]}>{store.location_text}</Text>
              </View>
            ) : null}
          </View>
          <TouchableOpacity onPress={handleLogout} style={[styles.logoutBtn, { borderColor: colors.border }]}>
            <Ionicons name="log-out-outline" size={18} color={colors.textDim} />
          </TouchableOpacity>
        </View>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.statNum, { color: colors.text }]}>{products.length}</Text>
            <Text style={[styles.statLbl, { color: colors.textDim }]}>Products</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.statNum, { color: '#27AE60' }]}>{inStock}</Text>
            <Text style={[styles.statLbl, { color: colors.textDim }]}>In Stock</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.statNum, { color: '#E74C3C' }]}>{products.length - inStock}</Text>
            <Text style={[styles.statLbl, { color: colors.textDim }]}>Out of Stock</Text>
          </View>
        </View>

        {/* Bill Generation CTA */}
        <TouchableOpacity
          style={[styles.billCTA, { backgroundColor: PRIMARY }]}
          onPress={() => router.push({ pathname: '/vendor-bill', params: { storeId: store.id, storeName: store.name } })}
        >
          <Ionicons name="receipt-outline" size={20} color="#FFF" />
          <View style={{ flex: 1 }}>
            <Text style={styles.billCTATitle}>Generate Bill</Text>
            <Text style={styles.billCTASub}>Create & print / share with customer</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.7)" />
        </TouchableOpacity>

        {/* Products Section */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>My Products</Text>
          <TouchableOpacity
            style={[styles.addProductBtn, { backgroundColor: PRIMARY + '15', borderColor: PRIMARY + '44' }]}
            onPress={() => setShowAddModal(true)}
          >
            <Ionicons name="add" size={16} color={PRIMARY} />
            <Text style={[styles.addProductBtnText, { color: PRIMARY }]}>Add</Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.productsCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {products.length === 0 ? (
            <View style={styles.emptyProducts}>
              <Ionicons name="cube-outline" size={36} color="#CCC" />
              <Text style={[styles.emptyText, { color: colors.textDim }]}>No products yet</Text>
              <Text style={[styles.emptySubText, { color: colors.textDim }]}>Tap "Add" to add your first product</Text>
            </View>
          ) : (
            products.map((product, idx) => (
              <View
                key={product.id}
                style={[
                  styles.productRow,
                  { borderBottomWidth: idx < products.length - 1 ? 0.5 : 0, borderBottomColor: colors.border }
                ]}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[styles.productName, { color: colors.text }]}>{product.name}</Text>
                  <Text style={[styles.productPrice, { color: PRIMARY }]}>
                    {product.price != null ? `₹${product.price}` : '—'}
                  </Text>
                </View>

                {/* Stock toggle */}
                <TouchableOpacity
                  style={[
                    styles.stockBadge,
                    { backgroundColor: product.is_in_stock ? '#E8F8F1' : '#FEF0ED' }
                  ]}
                  onPress={() => toggleStock(product)}
                >
                  <View style={[styles.stockDot, { backgroundColor: product.is_in_stock ? '#27AE60' : '#E74C3C' }]} />
                  <Text style={[styles.stockText, { color: product.is_in_stock ? '#1A8A4A' : '#C0392B' }]}>
                    {product.is_in_stock ? 'In stock' : 'Out'}
                  </Text>
                </TouchableOpacity>

                {/* Edit */}
                <TouchableOpacity
                  style={styles.iconAction}
                  onPress={() => { setEditProduct(product); setEditName(product.name); setEditPrice(product.price != null ? String(product.price) : ''); }}
                >
                  <Ionicons name="pencil-outline" size={16} color={colors.textDim} />
                </TouchableOpacity>

                {/* Delete */}
                <TouchableOpacity style={styles.iconAction} onPress={() => handleDeleteProduct(product)}>
                  <Ionicons name="trash-outline" size={16} color="#E74C3C" />
                </TouchableOpacity>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      {/* ─── Add Product Modal ─────────────────────────────────── */}
      <Modal visible={showAddModal} transparent animationType="slide" onRequestClose={() => setShowAddModal(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setShowAddModal(false)} />
          <View style={[styles.modalSheet, { backgroundColor: colors.card }]}>
            <View style={styles.modalHandle} />
            
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Add Product</Text>
            </View>

            {/* AI Action Buttons */}
            <View style={styles.aiToolsContainer}>
              <TouchableOpacity
                style={[styles.aiBtn, recording ? styles.aiBtnActive : { backgroundColor: colors.input, borderColor: colors.border }]}
                onPress={handleVoiceToggle}
                disabled={isProcessingML}
              >
                <Ionicons name={recording ? "mic" : "mic-outline"} size={22} color={recording ? "#FFF" : PRIMARY} />
                <Text style={[styles.aiBtnText, { color: recording ? "#FFF" : PRIMARY }]}>
                  {recording ? "Tap to Stop ⏹" : "Tap to Record 🎙"}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.aiBtn, { backgroundColor: colors.input, borderColor: colors.border }]}
                onPress={handleTakeAPhoto}
                disabled={isProcessingML || !!recording}
              >
                <Ionicons name="camera-outline" size={22} color={PRIMARY} />
                <Text style={[styles.aiBtnText, { color: PRIMARY }]}>Scan Photo</Text>
              </TouchableOpacity>
            </View>

            {isProcessingML && (
              <View style={styles.mlLoading}>
                <ActivityIndicator size="small" color={PRIMARY} />
                <Text style={{ color: PRIMARY, fontSize: 13, fontWeight: '600' }}>{mlStatusText}</Text>
              </View>
            )}

            <Text style={[styles.inputLabel, { color: colors.textDim }]}>Product Name *</Text>
            <TextInput
              style={[styles.textInput, { backgroundColor: colors.input, color: colors.text, borderColor: colors.border }]}
              placeholder="e.g. Amul Butter 500g"
              placeholderTextColor="#AAA"
              value={newName}
              onChangeText={setNewName}
            />

            <View style={{ flexDirection: 'row', gap: 12 }}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.inputLabel, { color: colors.textDim }]}>Price (₹)</Text>
                <TextInput
                  style={[styles.textInput, { backgroundColor: colors.input, color: colors.text, borderColor: colors.border }]}
                  placeholder="e.g. 55"
                  placeholderTextColor="#AAA"
                  keyboardType="numeric"
                  value={newPrice}
                  onChangeText={setNewPrice}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.inputLabel, { color: colors.textDim }]}>Unit (optional)</Text>
                <TextInput
                  style={[styles.textInput, { backgroundColor: colors.input, color: colors.text, borderColor: colors.border }]}
                  placeholder="e.g. 500g, 1L"
                  placeholderTextColor="#AAA"
                  value={newUnit}
                  onChangeText={setNewUnit}
                />
              </View>
            </View>

            <View style={{ flexDirection: 'row', gap: 12, marginTop: 8 }}>
              <TouchableOpacity
                style={[styles.modalBtnSecondary, { borderColor: colors.border }]}
                onPress={() => { setShowAddModal(false); setNewName(''); setNewPrice(''); setNewUnit(''); }}
              >
                <Text style={[styles.modalBtnSecondaryText, { color: colors.textDim }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtnPrimary, { backgroundColor: PRIMARY, opacity: addingProduct || isProcessingML ? 0.7 : 1 }]}
                onPress={handleAddProduct}
                disabled={addingProduct || isProcessingML}
              >
                {addingProduct
                  ? <ActivityIndicator color="#FFF" size="small" />
                  : <Text style={styles.modalBtnPrimaryText}>Add Product</Text>
                }
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ─── Edit Product Modal ────────────────────────────────── */}
      <Modal visible={editProduct != null} transparent animationType="slide" onRequestClose={() => setEditProduct(null)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setEditProduct(null)} />
          <View style={[styles.modalSheet, { backgroundColor: colors.card }]}>
            <View style={styles.modalHandle} />
            <Text style={[styles.modalTitle, { color: colors.text }]}>Edit Product</Text>

            <Text style={[styles.inputLabel, { color: colors.textDim }]}>Product Name</Text>
            <TextInput
              style={[styles.textInput, { backgroundColor: colors.input, color: colors.text, borderColor: colors.border }]}
              value={editName}
              onChangeText={setEditName}
              autoFocus
            />

            <Text style={[styles.inputLabel, { color: colors.textDim }]}>Price (₹)</Text>
            <TextInput
              style={[styles.textInput, { backgroundColor: colors.input, color: colors.text, borderColor: colors.border }]}
              value={editPrice}
              onChangeText={setEditPrice}
              keyboardType="numeric"
            />

            <View style={{ flexDirection: 'row', gap: 12, marginTop: 8 }}>
              <TouchableOpacity
                style={[styles.modalBtnSecondary, { borderColor: colors.border }]}
                onPress={() => setEditProduct(null)}
              >
                <Text style={[styles.modalBtnSecondaryText, { color: colors.textDim }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtnPrimary, { backgroundColor: PRIMARY }]}
                onPress={handleEditProduct}
              >
                <Text style={styles.modalBtnPrimaryText}>Save Changes</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 },
  container: { padding: 16 },

  // Header
  header: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 20, gap: 12 },
  headerLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 4 },
  storeTitle: { fontSize: 26, fontWeight: '800', letterSpacing: -0.5 },
  locationText: { fontSize: 12 },
  logoutBtn: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, alignItems: 'center', justifyContent: 'center', marginTop: 8 },

  // Stats
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  statCard: { flex: 1, borderRadius: 14, borderWidth: 1, padding: 14, alignItems: 'center' },
  statNum: { fontSize: 26, fontWeight: '800', marginBottom: 2 },
  statLbl: { fontSize: 11, textAlign: 'center' },

  // Bill CTA
  billCTA: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, borderRadius: 16, marginBottom: 24 },
  billCTATitle: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  billCTASub: { color: 'rgba(255,255,255,0.75)', fontSize: 12, marginTop: 1 },

  // Products
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  sectionTitle: { fontSize: 17, fontWeight: '700' },
  addProductBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1 },
  addProductBtnText: { fontSize: 13, fontWeight: '700' },
  productsCard: { borderRadius: 16, borderWidth: 1, overflow: 'hidden' },
  emptyProducts: { alignItems: 'center', paddingVertical: 36, gap: 8 },
  emptyText: { fontSize: 15, fontWeight: '600' },
  emptySubText: { fontSize: 13 },
  productRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, gap: 10 },
  productName: { fontSize: 14, fontWeight: '600', marginBottom: 2 },
  productPrice: { fontSize: 13, fontWeight: '700' },
  stockBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 9, paddingVertical: 4, borderRadius: 8 },
  stockDot: { width: 6, height: 6, borderRadius: 3 },
  stockText: { fontSize: 11, fontWeight: '600' },
  iconAction: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },

  // No store
  noStoreTitle: { fontSize: 26, fontWeight: '800', textAlign: 'center', marginBottom: 8 },
  noStoreSub: { fontSize: 15, textAlign: 'center', marginBottom: 32, lineHeight: 22 },
  ctaBtn: { backgroundColor: '#0F6E56', paddingVertical: 16, borderRadius: 14, alignItems: 'center' },
  ctaBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },

  // Modal
  modalBackdrop: { flex: 1 },
  modalSheet: { borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, paddingBottom: 40 },
  modalHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: '#DDD', alignSelf: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: '800', marginBottom: 0 },
  
  // AI Tools
  aiToolsContainer: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  aiBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: 12, borderWidth: 1, gap: 6 },
  aiBtnActive: { backgroundColor: '#E74C3C', borderColor: '#E74C3C' },
  aiBtnText: { fontSize: 14, fontWeight: '700' },
  mlLoading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 12, backgroundColor: '#0F6E5615', borderRadius: 12, marginBottom: 16 },

  inputLabel: { fontSize: 12, fontWeight: '600', letterSpacing: 0.3, marginBottom: 6, textTransform: 'uppercase' },
  textInput: {
    borderRadius: 12, borderWidth: 1, height: 48,
    paddingHorizontal: 14, fontSize: 15, marginBottom: 16,
  },
  modalBtnSecondary: { flex: 1, height: 50, borderRadius: 14, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  modalBtnSecondaryText: { fontSize: 15, fontWeight: '600' },
  modalBtnPrimary: { flex: 1, height: 50, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  modalBtnPrimaryText: { color: '#FFF', fontSize: 15, fontWeight: '700' },
});
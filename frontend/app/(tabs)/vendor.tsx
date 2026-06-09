import {
  StyleSheet, View, Text, ScrollView, TouchableOpacity,
  SafeAreaView, Platform, StatusBar, ActivityIndicator,
  Modal, TextInput, Alert, KeyboardAvoidingView, Image
} from 'react-native';
import { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { apiClient } from '../../utils/apiClient';
import { Audio } from 'expo-av';
import * as ImagePicker from 'expo-image-picker';
import { ML_API } from '../../utils/api';
import { Colors } from '../../constants/theme';
import { useAuth } from '../../context/AuthContext';

const theme = Colors.light;

export default function VendorScreen() {
  const [store, setStore] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // ── Store Status ───────────────────────────────────────────
  const [isOpen, setIsOpen] = useState(true);

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

  useEffect(() => { fetchVendorData(); }, []);

  const fetchVendorData = async () => {
    try {
      setLoading(true);
      const storeData = await apiClient.get('/api/stores/mine');
      if (storeData) {
        setStore(storeData);
        const productData = await apiClient.get(
          `/api/stores/${storeData.id}/products`
        );
        setProducts(productData || []);
      }
    } catch (e: any) {
      // 404 = no store yet, that's fine
      if (!e.message?.includes('404') && !e.message?.includes('No store')) {
        console.error(e);
      }
    } finally {
      setLoading(false);
    }
  };

  // ── ML Handlers ────────────────────────────────────────────
  const handleVoiceToggle = async () => {
    if (recording) await stopRecordingAndProcess();
    else await beginRecording();
  };

  const beginRecording = async () => {
    setIsProcessingML(true);
    setMlStatusText('Checking ML server...');
    const alive = await ML_API.ping();
    setIsProcessingML(false);
    setMlStatusText('');
    if (!alive) {
      Alert.alert('ML Server Unreachable', 'Start FastAPI backend on 0.0.0.0 and configure IP.');
      return;
    }
    const perm = await Audio.requestPermissionsAsync();
    if (perm.status !== 'granted') {
      Alert.alert('Permission Denied', 'Microphone access is needed.');
      return;
    }
    if (recording) {
      try { await recording.stopAndUnloadAsync(); } catch (_) {}
      setRecording(null);
    }
    try {
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const { recording: rec } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      setRecording(rec);
    } catch (err: any) {
      Alert.alert('Mic Error', err.message);
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
      if (!uri) return;

      setIsProcessingML(true);
      setMlStatusText('Transcribing audio...');
      const transcript = await ML_API.transcribeAudio(uri, 'en');
      if (!transcript.text.trim()) {
        Alert.alert('Nothing heard', 'Could not detect speech.');
        return;
      }
      setMlStatusText('Extracting product info...');
      const parsed = await ML_API.parseProduct(transcript.text);
      if (parsed.name) setNewName(parsed.name);
      if (parsed.price) setNewPrice(String(parsed.price));
      if (parsed.unit) setNewUnit(parsed.unit);
    } catch (error: any) {
      Alert.alert('Voice Error', error.message);
    } finally {
      setIsProcessingML(false);
      setMlStatusText('');
    }
  };

  const handleTakeAPhoto = async () => {
    const alive = await ML_API.ping();
    if (!alive) {
      Alert.alert('ML Server Unreachable', 'Ensure FastAPI is running.');
      return;
    }
    try {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (perm.status !== 'granted') return;
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: 'images' as any, allowsEditing: true, aspect: [1, 1], quality: 0.5, base64: true,
      });
      if (!result.canceled && result.assets[0].base64) {
        setIsProcessingML(true);
        setMlStatusText('Identifying product...');
        const visionData = await ML_API.identifyProductBase64(result.assets[0].base64);
        if (visionData.name) setNewName(visionData.name);
      }
    } catch (error: any) {
      Alert.alert('Camera Error', error.message);
    } finally {
      setIsProcessingML(false);
      setMlStatusText('');
    }
  };

  const handleAddProduct = async () => {
    if (!newName.trim()) return;
    try {
      setAddingProduct(true);
      const priceNum = newPrice.trim() ? parseFloat(newPrice.trim().replace(/[^0-9.]/g, '')) : 0;
      const displayName = newUnit.trim() ? `${newName.trim()} (${newUnit.trim()})` : newName.trim();
      const newProduct = await apiClient.post(`/api/stores/${store.id}/products`, {
        name: displayName,
        price: priceNum,
        is_in_stock: true,
      });
      setProducts(prev => [...prev, newProduct]);
      setNewName(''); setNewPrice(''); setNewUnit('');
      setShowAddModal(false);
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setAddingProduct(false);
    }
  };

  const toggleStock = async (product: any) => {
    const newStatus = !product.is_in_stock;
    setProducts(prev => prev.map(p => p.id === product.id ? { ...p, is_in_stock: newStatus } : p));
    await apiClient.patch(`/products/${product.id}`, { is_in_stock: newStatus });
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background, justifyContent: 'center' }]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </SafeAreaView>
    );
  }

  if (!store) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background, justifyContent: 'center', padding: 24 }]}>
        <Ionicons name="storefront-outline" size={64} color="#CCC" style={{ alignSelf: 'center', marginBottom: 20 }} />
        <Text style={[styles.noStoreTitle, { color: theme.onSurface }]}>Vendor Portal</Text>
        <TouchableOpacity style={[styles.ctaBtn, { backgroundColor: theme.primary }]} onPress={() => router.push('/vendor-setup/')}>
          <Text style={styles.ctaBtnText}>Set Up My Store</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      {/* TopAppBar */}
      <View style={[styles.appBar, { backgroundColor: theme.surface }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <TouchableOpacity style={styles.menuBtn}>
            <MaterialIcons name="menu" size={24} color={theme.primary} />
          </TouchableOpacity>
          <Text style={[styles.brandTitle, { color: theme.primary }]}>Vyapari Local</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <TouchableOpacity 
            style={[styles.statusToggle, { backgroundColor: isOpen ? theme.primary : theme.surfaceContainerHighest }]} 
            onPress={() => setIsOpen(!isOpen)}
          >
            <MaterialIcons name="storefront" size={18} color={isOpen ? theme.onPrimary : theme.onSurfaceVariant} />
            <Text style={[styles.statusLabel, { color: isOpen ? theme.onPrimary : theme.onSurfaceVariant }]}>
              {isOpen ? 'OPEN' : 'CLOSED'}
            </Text>
          </TouchableOpacity>
          <Image 
            source={{ uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDh-mt_ZazS0o3yocKCNxNg2zi502882-DGmsj5B4vyOum7yT67i1mHxuFQUTG6Gus-GZPcmDJC4-wT0Q1srXEcL2q8lKtAVqStM8adP_1-KjwA3HdgNJDpgqQ5x47nPZx5acU6VWFSYQdmVjYfBvskLnPa2O8zfgQkGoLKfVeUG9XXuF2JZArdlZ3Rj0tBTXqUHoWHZQiA9A3bCpQjeNS2dimzb77N35d2i2n6y_bANGYETqOXNYzl-1Y0FpJOkXKxlMp1jge-aSOI' }}
            style={[styles.profileImg, { borderColor: theme.primaryContainer }]} 
          />
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {/* Welcome Section */}
        <View style={styles.welcomeSection}>
          <Text style={[styles.overviewLabel, { color: theme.primary }]}>DASHBOARD OVERVIEW</Text>
          <Text style={[styles.welcomeTitle, { color: theme.onSurface }]}>Welcome back, {store.name}</Text>
        </View>

        {/* Sales Summary (Visual mock for dashboard aesthetic) */}
        <View style={[styles.salesCard, { backgroundColor: theme.surfaceContainerLowest }]}>
          <View style={styles.salesHeader}>
            <View>
              <Text style={[styles.salesTitle, { color: theme.onSurface }]}>Today's Sales</Text>
              <Text style={[styles.salesSub, { color: theme.onSurfaceVariant }]}>Live updates from your storefront</Text>
            </View>
            <View style={[styles.badgeContainer, { backgroundColor: theme.secondaryContainer }]}>
              <Text style={[styles.badgeText, { color: theme.onSecondaryContainer }]}>+12.5% VS YESTERDAY</Text>
            </View>
          </View>
          
          <View style={styles.salesContent}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.salesAmount, { color: theme.primary }]}>$1,482.00</Text>
              <Text style={[styles.salesOrders, { color: theme.onSurfaceVariant }]}>24 Total Orders</Text>
            </View>
            {/* Simple Bar Chart Visual */}
            <View style={styles.barChart}>
              {[40, 60, 45, 80, 55, 95, 70].map((h, i) => (
                <View key={i} style={[styles.bar, { 
                  height: `${h}%`, 
                  backgroundColor: i === 6 ? theme.primary : theme.primaryContainer,
                  opacity: i === 6 ? 1 : 0.3
                }]} />
              ))}
            </View>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActionsGrid}>
          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: theme.primary }]} onPress={() => setShowAddModal(true)}>
            <MaterialIcons name="qr-code-scanner" size={32} color={theme.onPrimary} />
            <Text style={[styles.actionLabel, { color: theme.onPrimary }]}>Scan New Item</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.actionBtn, { backgroundColor: theme.secondary }]} 
            onPress={() => router.push({ pathname: '/vendor-bill', params: { storeId: store.id, storeName: store.name } })}
          >
            <MaterialIcons name="receipt-long" size={32} color={theme.onSecondary} />
            <Text style={[styles.actionLabel, { color: theme.onSecondary }]}>Generate Bill</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.viewInventoryBtn, { backgroundColor: theme.surfaceContainerHigh, borderColor: theme.outlineVariant }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <MaterialIcons name="inventory-2" size={28} color={theme.primary} />
              <Text style={[styles.viewInventoryText, { color: theme.onSurface }]}>View Inventory</Text>
            </View>
            <MaterialIcons name="chevron-right" size={24} color={theme.onSurface} />
          </TouchableOpacity>
        </View>

        {/* Stock Alerts (Functional Products List styled as alerts) */}
        <View style={[styles.alertsContainer, { backgroundColor: theme.surfaceContainerLow, borderColor: theme.outlineVariant + '4d' }]}>
          <View style={styles.alertsHeader}>
            <MaterialIcons name="notifications-active" size={24} color={theme.error} />
            <Text style={[styles.alertsTitle, { color: theme.onSurface }]}>Inventory Status</Text>
          </View>
          
          <View style={{ gap: 12 }}>
            {products.length === 0 ? (
              <Text style={{ textAlign: 'center', marginVertical: 20, fontFamily: 'PlusJakartaSans_400Regular', color: theme.onSurfaceVariant }}>
                No products yet. Scan a new item to get started!
              </Text>
            ) : (
              products.map((p) => {
                const inStock = p.is_in_stock;
                const bgColor = theme.surfaceContainerLowest;
                const leftBorderColor = inStock ? theme.primaryContainer : theme.error;
                const iconColor = inStock ? theme.onPrimaryContainer : theme.onErrorContainer;
                const iconBg = inStock ? theme.primaryContainer + '40' : theme.errorContainer;
                const iconName = inStock ? 'check-circle' : 'warning';
                
                return (
                  <View key={p.id} style={[styles.alertCard, { backgroundColor: bgColor, borderLeftColor: leftBorderColor }]}>
                    <View style={[styles.alertIconWrapper, { backgroundColor: iconBg }]}>
                      <MaterialIcons name={iconName} size={20} color={iconColor} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.alertItemName, { color: theme.onSurface }]}>{p.name}</Text>
                      <Text style={[styles.alertItemSub, { color: theme.onSurfaceVariant }]}>
                        {inStock ? `₹${p.price} • In Stock` : 'Out of Stock'}
                      </Text>
                    </View>
                    <TouchableOpacity onPress={() => toggleStock(p)}>
                      <Text style={[styles.restockText, { color: theme.primary }]}>
                        {inStock ? 'MARK OUT' : 'RESTOCK'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                );
              })
            )}
          </View>
        </View>
      </ScrollView>

      {/* Floating Action Button */}
      <TouchableOpacity style={[styles.fab, { backgroundColor: theme.primary }]} onPress={() => setShowAddModal(true)}>
        <MaterialIcons name="add" size={32} color={theme.onPrimary} />
      </TouchableOpacity>

      {/* Full Screen Add Product Modal */}
      <Modal visible={showAddModal} transparent={false} animationType="slide" onRequestClose={() => setShowAddModal(false)}>
        <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
          {/* TopAppBar */}
          <View style={[styles.appBar, { backgroundColor: theme.surface, borderBottomWidth: 0, elevation: 0 }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <TouchableOpacity onPress={() => setShowAddModal(false)} style={styles.menuBtn}>
                <MaterialIcons name="close" size={28} color={theme.primary} />
              </TouchableOpacity>
              <Text style={[styles.brandTitle, { color: theme.primary }]}>Add New Item</Text>
            </View>
            <Image 
              source={{ uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDh-mt_ZazS0o3yocKCNxNg2zi502882-DGmsj5B4vyOum7yT67i1mHxuFQUTG6Gus-GZPcmDJC4-wT0Q1srXEcL2q8lKtAVqStM8adP_1-KjwA3HdgNJDpgqQ5x47nPZx5acU6VWFSYQdmVjYfBvskLnPa2O8zfgQkGoLKfVeUG9XXuF2JZArdlZ3Rj0tBTXqUHoWHZQiA9A3bCpQjeNS2dimzb77N35d2i2n6y_bANGYETqOXNYzl-1Y0FpJOkXKxlMp1jge-aSOI' }}
              style={[styles.profileImg, { borderColor: theme.primary }]} 
            />
          </View>

          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 100 }} keyboardShouldPersistTaps="handled">
            {/* Viewfinder Section */}
            <TouchableOpacity 
              activeOpacity={0.9} 
              style={styles.viewfinderSection} 
              onPress={handleTakeAPhoto}
            >
              <Image 
                source={{ uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAV2hTtWi78BECrizOsLjaw1X50Zx5FHnVWYgZ-4-6B_lxhFhu669Bp0eUlaqoCIzgiYsNZ5mL2P7rKxZ5onZkrsT4VKfGSqOcjVXrct8Dr4b8uqtHIw6JqmXhFzSCq4knYsjlgf6tU3PXYiA7KgDQZeEQW3mDDZurCFTosPil5X7_IAxoRw9x7WW9pYoivMzd_N4Lo9yTeujdIkUoojdslOOMDWTGwJeVu86t79HJa8XNuKeaoEKc1derUUDl7ZVHPAh79q_au6aW1' }} 
                style={styles.viewfinderImage} 
              />
              <View style={styles.viewfinderOverlay}>
                <View style={[styles.scanBox, { borderColor: theme.primary }]}>
                  <View style={[styles.scanBadge, { backgroundColor: theme.primary }]}>
                    <MaterialIcons name="auto-awesome" size={14} color={theme.onPrimary} />
                    <Text style={[styles.scanBadgeText, { color: theme.onPrimary }]}>Tap to Scan Photo</Text>
                  </View>
                </View>
              </View>
            </TouchableOpacity>

            {/* Voice & Control Layer */}
            <View style={styles.voiceControlContainer}>
              <View style={[styles.glassPanel, { backgroundColor: theme.surfaceContainerLowest, borderColor: 'rgba(255,255,255,0.3)' }]}>
                <Text style={[styles.voiceLabel, { color: theme.onSurfaceVariant }]}>Describe your product now</Text>
                
                {/* Voice Visualizer Mock */}
                <View style={styles.waveformContainer}>
                  {[1,2,3,4,5,6,7,8,9,10,11,12].map((i) => (
                    <View key={i} style={[styles.voiceBar, { height: recording ? Math.random() * 24 + 8 : 4, backgroundColor: theme.primary }]} />
                  ))}
                </View>

                <TouchableOpacity 
                  style={[styles.micBtn, { backgroundColor: recording ? theme.error : theme.primary }]} 
                  onPress={handleVoiceToggle} 
                  disabled={isProcessingML}
                >
                  <MaterialIcons name={recording ? "stop" : "mic"} size={32} color={theme.onPrimary} />
                </TouchableOpacity>
                <Text style={[styles.voiceHint, { color: theme.primary }]}>
                  {recording ? '"Listening..."' : (mlStatusText ? `"${mlStatusText}"` : '"Handcrafted ceramic watch with leather strap..."')}
                </Text>
              </View>
            </View>

            {/* Form Section */}
            <View style={styles.formSection}>
              <View style={styles.inputGroup}>
                <Text style={[styles.formLabel, { color: theme.onSurfaceVariant }]}>Product Name</Text>
                <TextInput
                  style={[styles.formInput, { backgroundColor: theme.surfaceContainerLow, color: theme.onSurface, borderColor: theme.outlineVariant }]}
                  placeholder="Artisan Ceramic Watch" placeholderTextColor={theme.outline} value={newName} onChangeText={setNewName}
                />
              </View>

              <View style={styles.formRow}>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={[styles.formLabel, { color: theme.onSurfaceVariant }]}>Price (₹)</Text>
                  <TextInput
                    style={[styles.formInput, { backgroundColor: theme.surfaceContainerLow, color: theme.onSurface, borderColor: theme.outlineVariant }]}
                    placeholder="125.00" placeholderTextColor={theme.outline} keyboardType="numeric" value={newPrice} onChangeText={setNewPrice}
                  />
                </View>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={[styles.formLabel, { color: theme.onSurfaceVariant }]}>Unit (opt)</Text>
                  <TextInput
                    style={[styles.formInput, { backgroundColor: theme.surfaceContainerLow, color: theme.onSurface, borderColor: theme.outlineVariant }]}
                    placeholder="e.g. 500g" placeholderTextColor={theme.outline} value={newUnit} onChangeText={setNewUnit}
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.formLabel, { color: theme.onSurfaceVariant }]}>Description</Text>
                <TextInput
                  style={[styles.formInput, { height: 100, textAlignVertical: 'top', backgroundColor: theme.surfaceContainerLow, color: theme.onSurface, borderColor: theme.outlineVariant }]}
                  placeholder="Add a product description..." placeholderTextColor={theme.outline} multiline
                />
              </View>

              {/* Action Buttons */}
              <View style={styles.actionButtonsContainer}>
                <TouchableOpacity 
                  style={[styles.submitBtn, { backgroundColor: theme.primaryContainer }]} 
                  onPress={handleAddProduct} disabled={addingProduct}
                >
                  <MaterialIcons name="check-circle" size={24} color={theme.onPrimaryContainer} />
                  <Text style={[styles.submitBtnText, { color: theme.onPrimaryContainer }]}>
                    {addingProduct ? 'Adding...' : 'List Product'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.draftBtn, { backgroundColor: theme.surfaceContainerHighest }]} onPress={() => setShowAddModal(false)}>
                  <Text style={[styles.draftBtnText, { color: theme.onSurface }]}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 },
  container: { paddingHorizontal: 20, paddingVertical: 24, paddingBottom: 100 },
  
  // AppBar
  appBar: { height: 60, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.2)', elevation: 2 },
  menuBtn: { padding: 4, borderRadius: 20 },
  brandTitle: { fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 22, letterSpacing: -0.5 },
  statusToggle: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, elevation: 1 },
  statusLabel: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 12, letterSpacing: 0.6 },
  profileImg: { width: 36, height: 36, borderRadius: 18, borderWidth: 2 },

  // Welcome
  welcomeSection: { marginBottom: 24 },
  overviewLabel: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 12, letterSpacing: 0.6, textTransform: 'uppercase', marginBottom: 6 },
  welcomeTitle: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 28, lineHeight: 36 },

  // Sales
  salesCard: { borderRadius: 16, padding: 24, elevation: 2, marginBottom: 24 },
  salesHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  salesTitle: { fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 20 },
  salesSub: { fontFamily: 'PlusJakartaSans_400Regular', fontSize: 14 },
  badgeContainer: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  badgeText: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 10, letterSpacing: 0.5 },
  salesContent: { flexDirection: 'row', alignItems: 'center' },
  salesAmount: { fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 32, letterSpacing: -0.5 },
  salesOrders: { fontFamily: 'PlusJakartaSans_400Regular', fontSize: 16 },
  barChart: { flex: 1, height: 60, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', paddingLeft: 20 },
  bar: { width: '10%', borderTopLeftRadius: 4, borderTopRightRadius: 4 },

  // Actions
  quickActionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16, marginBottom: 24 },
  actionBtn: { flex: 1, minWidth: '45%', borderRadius: 16, padding: 16, alignItems: 'center', justifyContent: 'center', gap: 12, elevation: 2 },
  actionLabel: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.6 },
  viewInventoryBtn: { width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderRadius: 16, borderWidth: 1 },
  viewInventoryText: { fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 20 },

  // Alerts
  alertsContainer: { borderRadius: 16, borderWidth: 1, padding: 24 },
  alertsHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  alertsTitle: { fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 20 },
  alertCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 8, borderLeftWidth: 4, elevation: 1 },
  alertIconWrapper: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  alertItemName: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 16 },
  alertItemSub: { fontFamily: 'PlusJakartaSans_400Regular', fontSize: 14 },
  restockText: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 12, letterSpacing: 0.6 },

  // FAB
  fab: { position: 'absolute', bottom: 24, right: 24, width: 56, height: 56, borderRadius: 20, alignItems: 'center', justifyContent: 'center', elevation: 4 },

  // No Store
  noStoreTitle: { fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 28, textAlign: 'center', marginBottom: 24 },
  ctaBtn: { paddingVertical: 16, borderRadius: 14, alignItems: 'center' },
  ctaBtnText: { color: '#FFF', fontFamily: 'PlusJakartaSans_700Bold', fontSize: 16 },

  // Add Item Modal
  viewfinderSection: { width: '100%', aspectRatio: 1.5, backgroundColor: '#000', overflow: 'hidden' },
  viewfinderImage: { width: '100%', height: '100%', opacity: 0.8 },
  viewfinderOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center' },
  scanBox: { width: '50%', height: '50%', borderWidth: 2, borderRadius: 16, alignItems: 'flex-end', padding: 8 },
  scanBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20 },
  scanBadgeText: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 10, letterSpacing: 0.8, textTransform: 'uppercase' },
  
  voiceControlContainer: { paddingHorizontal: 20, marginTop: -32, zIndex: 10 },
  glassPanel: { borderRadius: 24, padding: 24, alignItems: 'center', borderWidth: 1, elevation: 4 },
  voiceLabel: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 12, letterSpacing: 0.6, textTransform: 'uppercase', opacity: 0.7, marginBottom: 16 },
  waveformContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, height: 48, width: '100%', marginBottom: 16 },
  voiceBar: { width: 4, borderRadius: 2 },
  micBtn: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', elevation: 4, marginBottom: 16 },
  voiceHint: { fontFamily: 'PlusJakartaSans_400Regular', fontSize: 14, fontStyle: 'italic', textAlign: 'center' },
  
  formSection: { marginTop: 24, paddingHorizontal: 20, gap: 20 },
  inputGroup: { gap: 8 },
  formRow: { flexDirection: 'row', gap: 16 },
  formLabel: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 12, letterSpacing: 0.6, textTransform: 'uppercase', marginLeft: 4 },
  formInput: { borderWidth: 1, borderRadius: 16, paddingHorizontal: 16, paddingVertical: 16, fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 16 },
  
  actionButtonsContainer: { gap: 12, marginTop: 8 },
  submitBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16, borderRadius: 16, elevation: 2 },
  submitBtnText: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 20 },
  draftBtn: { alignItems: 'center', justifyContent: 'center', paddingVertical: 16, borderRadius: 16 },
  draftBtnText: { fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 20 },
});
import {
  StyleSheet, View, Text, ScrollView, TouchableOpacity,
  TextInput, SafeAreaView, Platform, StatusBar, Alert,
  ActivityIndicator, Image, KeyboardAvoidingView,
} from 'react-native';
import { useState, useEffect, useMemo } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { supabase } from '../utils/supabase';
import { Colors } from '../constants/theme';

const theme = Colors.light;

type BillItem = {
  productId: string;
  name: string;
  price: number;
  priceStr: string;
  qty: number;
};

function parsePrice(price: number | string | null | undefined): number {
  if (price == null) return 0;
  if (typeof price === 'number') return price;
  const num = parseFloat(String(price).replace(/[^0-9.]/g, ''));
  return isNaN(num) ? 0 : num;
}

export default function VendorBillScreen() {
  const { storeId, storeName } = useLocalSearchParams<{ storeId: string; storeName: string }>();
  const router = useRouter();

  const [products, setProducts] = useState<any[]>([]);
  const [billItems, setBillItems] = useState<BillItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [activeCategory, setActiveCategory] = useState('All Items');

  useEffect(() => { fetchProducts(); }, []);

  const fetchProducts = async () => {
    try {
      const { data } = await supabase
        .from('products')
        .select('*')
        .eq('store_id', storeId)
        .eq('is_in_stock', true)
        .order('name');
      setProducts(data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // ── Handlers ────────────────────────────────────
  const addOrIncrease = (product: any) => {
    const existing = billItems.find(i => i.productId === product.id);
    const price = parsePrice(product.price);
    const priceDisplay = `₹${price.toFixed(2)}`;
    if (existing) {
      setBillItems(prev => prev.map(i =>
        i.productId === product.id ? { ...i, qty: i.qty + 1 } : i
      ));
    } else {
      setBillItems(prev => [...prev, {
        productId: product.id,
        name: product.name,
        price,
        priceStr: priceDisplay,
        qty: 1,
      }]);
    }
  };

  const decrease = (productId: string) => {
    setBillItems(prev => {
      const updated = prev.map(i =>
        i.productId === productId ? { ...i, qty: i.qty - 1 } : i
      );
      return updated.filter(i => i.qty > 0);
    });
  };

  const getQty = (productId: string) => billItems.find(i => i.productId === productId)?.qty || 0;

  const total = billItems.reduce((sum, i) => sum + i.price * i.qty, 0);

  const filteredProducts = useMemo(() => {
    return products.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [products, searchQuery]);

  const handleNext = async () => {
    if (billItems.length === 0) {
      Alert.alert('Empty Cart', 'Please add items to create a bill.');
      return;
    }
    try {
      setGenerating(true);
      const { data, error } = await supabase.from('bills').insert({
        store_id: storeId,
        items: billItems.map(i => ({
          product_id: i.productId,
          name: i.name,
          qty: i.qty,
          unit_price: i.price,
          total: i.price * i.qty,
        })),
        total,
      }).select().single();
      
      if (error) throw error;
      
      router.push({
        pathname: '/receipt',
        params: { billId: data.id, storeName }
      });
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Could not generate bill');
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.surface, justifyContent: 'center' }]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.surface }]}>
      {/* TopAppBar */}
      <View style={[styles.appBar, { backgroundColor: theme.surface }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <TouchableOpacity onPress={() => router.back()} style={styles.menuBtn}>
            <MaterialIcons name="arrow-back" size={24} color={theme.primary} />
          </TouchableOpacity>
          <Text style={[styles.brandTitle, { color: theme.primary }]}>Kinetic Local</Text>
        </View>
        <Image 
          source={{ uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuC8bL7l29o66yJ-Iwc2zUxMnmUVzQg8OtbHHVRsT-4FM-S4fn5-CJqcRBGqnVew9X8YteAQ6xQaTJtolOZoz3bTNfRdn8VuVwJu52nDepIDqm_lBVeYm41CNC5mGKV7fr4mZmRe5qzSdjrVL3Bphy7WoNZhQiu18kGYJ5XQNjj_mpjz8UM24p2eQeOnll3xN2j0CFryATFgXMpqgwgqqC51xYXd-aDZd2s3Op9CPu3PV1XSmkdSCGMSh6MPMnwACn_tzRw_eajYk-Nb' }}
          style={[styles.profileImg, { borderColor: theme.primaryContainer }]} 
        />
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {/* Search & Filter */}
          <View style={styles.searchSection}>
            <Text style={[styles.pageTitle, { color: theme.onSurface }]}>Create New Bill</Text>
            
            <View style={styles.searchBar}>
              <MaterialIcons name="search" size={24} color={theme.outline} style={styles.searchIcon} />
              <TextInput
                style={[styles.searchInput, { backgroundColor: theme.surfaceContainerLowest, color: theme.onSurface, borderColor: theme.outlineVariant }]}
                placeholder="Search inventory..." placeholderTextColor={theme.outline} value={searchQuery} onChangeText={setSearchQuery}
              />
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryTabs}>
              {['All Items', 'Handmade', 'Textiles', 'Pottery'].map(cat => (
                <TouchableOpacity 
                  key={cat} 
                  style={[styles.catTab, { backgroundColor: activeCategory === cat ? theme.secondary : theme.tertiaryFixed }]}
                  onPress={() => setActiveCategory(cat)}
                >
                  <Text style={[styles.catTabText, { color: activeCategory === cat ? theme.onSecondary : theme.onTertiaryFixed }]}>{cat}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Bento Grid Inventory */}
          <View style={styles.gridContainer}>
            {filteredProducts.map(product => {
              const qty = getQty(product.id);
              return (
                <View key={product.id} style={[styles.productCard, { backgroundColor: theme.surfaceContainerLowest, borderColor: theme.outlineVariant }]}>
                  <View style={[styles.productImgContainer, { backgroundColor: theme.surfaceContainerHigh }]}>
                    <MaterialIcons name="inventory" size={48} color={theme.outlineVariant} />
                  </View>
                  <View style={styles.productInfo}>
                    <Text style={[styles.productName, { color: theme.onSurface }]} numberOfLines={1}>{product.name}</Text>
                    <Text style={[styles.productPrice, { color: theme.onSurfaceVariant }]}>₹{parsePrice(product.price).toFixed(2)}</Text>
                  </View>
                  <View style={[styles.qtyControls, { backgroundColor: theme.surfaceContainer }]}>
                    <TouchableOpacity style={[styles.qtyBtn, { backgroundColor: '#FFF' }]} onPress={() => decrease(product.id)}>
                      <MaterialIcons name="remove" size={20} color={theme.primary} />
                    </TouchableOpacity>
                    <Text style={[styles.qtyText, { color: theme.onSurface }]}>{qty}</Text>
                    <TouchableOpacity style={[styles.qtyBtn, { backgroundColor: theme.primary }]} onPress={() => addOrIncrease(product)}>
                      <MaterialIcons name="add" size={20} color={theme.onPrimary} />
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Mobile Floating Summary Bar */}
      {billItems.length > 0 && (
        <View style={[styles.floatingSummary, { backgroundColor: theme.inverseSurface }]}>
          <View style={styles.summaryTotal}>
            <Text style={[styles.summaryLabel, { color: theme.inverseOnSurface }]}>TOTAL AMOUNT</Text>
            <Text style={[styles.summaryAmount, { color: theme.inverseOnSurface }]}>₹{total.toFixed(2)}</Text>
          </View>
          <TouchableOpacity 
            style={[styles.nextBtn, { backgroundColor: theme.primaryContainer }]} 
            onPress={handleNext} disabled={generating}
          >
            {generating ? <ActivityIndicator size="small" color={theme.onPrimaryContainer} /> : (
              <>
                <MaterialIcons name="send" size={20} color={theme.onPrimaryContainer} />
                <Text style={[styles.nextBtnText, { color: theme.onPrimaryContainer }]}>Next</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 },
  appBar: { height: 60, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.2)' },
  menuBtn: { padding: 4, borderRadius: 20 },
  brandTitle: { fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 22, letterSpacing: -0.5 },
  profileImg: { width: 36, height: 36, borderRadius: 18, borderWidth: 2 },
  
  container: { padding: 20, paddingBottom: 120 },
  searchSection: { gap: 16, marginBottom: 24 },
  pageTitle: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 28 },
  searchBar: { position: 'relative' },
  searchIcon: { position: 'absolute', left: 16, top: 12, zIndex: 1 },
  searchInput: { height: 48, borderRadius: 12, borderWidth: 1, paddingLeft: 48, paddingRight: 16, fontFamily: 'PlusJakartaSans_400Regular', fontSize: 16 },
  categoryTabs: { flexDirection: 'row', gap: 8, paddingBottom: 8 },
  catTab: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  catTabText: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 12, textTransform: 'uppercase' },

  gridContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  productCard: { width: '47%', borderRadius: 12, borderWidth: 1, padding: 12, elevation: 1 },
  productImgContainer: { aspectRatio: 1, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  productInfo: { marginBottom: 12 },
  productName: { fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 16, marginBottom: 4 },
  productPrice: { fontFamily: 'PlusJakartaSans_400Regular', fontSize: 14 },
  
  qtyControls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 4, borderRadius: 8 },
  qtyBtn: { width: 36, height: 36, borderRadius: 6, alignItems: 'center', justifyContent: 'center', elevation: 1 },
  qtyText: { fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 16 },

  floatingSummary: { position: 'absolute', bottom: 20, left: 20, right: 20, borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', elevation: 10 },
  summaryTotal: { flexDirection: 'column' },
  summaryLabel: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 10, textTransform: 'uppercase', opacity: 0.8, letterSpacing: 0.5 },
  summaryAmount: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 24 },
  nextBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 24, height: 48, borderRadius: 12 },
  nextBtnText: { fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 16 },
});

import {
  StyleSheet, View, Text, ScrollView, TouchableOpacity,
  TextInput, SafeAreaView, Platform, StatusBar, Alert,
  ActivityIndicator, useColorScheme, KeyboardAvoidingView,
} from 'react-native';
import { useState, useEffect } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { supabase } from '../utils/supabase';

const PRIMARY = '#0F6E56';

type BillItem = {
  productId: string;
  name: string;
  price: number;     // numeric price
  priceStr: string;  // display string e.g. "₹55"
  qty: number;
};

// price from Supabase is now a number (after the numeric fix), but may still be
// a string like "₹55" in old rows. Handle both gracefully.
function parsePrice(price: number | string | null | undefined): number {
  if (price == null) return 0;
  if (typeof price === 'number') return price;
  const num = parseFloat(String(price).replace(/[^0-9.]/g, ''));
  return isNaN(num) ? 0 : num;
}

export default function VendorBillScreen() {
  const { storeId, storeName } = useLocalSearchParams<{ storeId: string; storeName: string }>();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [products, setProducts] = useState<any[]>([]);
  const [billItems, setBillItems] = useState<BillItem[]>([]);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  const colors = {
    bg: isDark ? '#111' : '#F8F9FA',
    card: isDark ? '#1C1C1E' : '#FFFFFF',
    text: isDark ? '#FFF' : '#111',
    textDim: isDark ? '#999' : '#666',
    border: isDark ? '#333' : '#E8E8E8',
    input: isDark ? '#2A2A2A' : '#F5F5F5',
  };

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

  // ── Bill item helpers ────────────────────────────────────
  const addOrIncrease = (product: any) => {
    const existing = billItems.find(i => i.productId === product.id);
    const price = parsePrice(product.price);
    const priceDisplay = `₹${price.toFixed(0)}`;
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

  const getQty = (productId: string) =>
    billItems.find(i => i.productId === productId)?.qty || 0;

  const total = billItems.reduce((sum, i) => sum + i.price * i.qty, 0);

  // ── HTML Bill Template ────────────────────────────────────
  const buildBillHTML = () => {
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    const timeStr = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    const billNo = `BILL-${Date.now().toString().slice(-6)}`;

    const rows = billItems.map((item, idx) => `
      <tr style="background:${idx % 2 === 0 ? '#fff' : '#f9f9f9'}">
        <td style="padding:10px 14px;font-size:14px;color:#333">${item.name}</td>
        <td style="padding:10px 14px;text-align:center;font-size:14px;color:#333">${item.qty}</td>
        <td style="padding:10px 14px;text-align:right;font-size:14px;color:#333">${item.priceStr}</td>
        <td style="padding:10px 14px;text-align:right;font-size:14px;font-weight:600;color:#111">
          ₹${(item.price * item.qty).toFixed(2)}
        </td>
      </tr>
    `).join('');

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    body { font-family: 'Helvetica Neue', sans-serif; background:#fff; padding:32px; color:#111; }
    .header { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:28px; }
    .store-name { font-size:26px; font-weight:800; color:#0F6E56; }
    .bill-meta { text-align:right; }
    .bill-no { font-size:13px; color:#666; font-weight:600; letter-spacing:.5px; }
    .bill-date { font-size:12px; color:#999; margin-top:2px; }
    .divider { height:2px; background:linear-gradient(90deg,#0F6E56,#27AE60); border-radius:2px; margin-bottom:24px; }
    .customer-box { background:#F0FBF7; border:1px solid #B8EDD8; border-radius:10px; padding:14px 18px; margin-bottom:24px; }
    .customer-label { font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:.8px; color:#0F6E56; margin-bottom:4px; }
    .customer-name { font-size:16px; font-weight:700; color:#111; }
    .customer-phone { font-size:13px; color:#555; margin-top:2px; }
    table { width:100%; border-collapse:collapse; border-radius:12px; overflow:hidden; box-shadow:0 1px 6px rgba(0,0,0,.06); }
    thead tr { background:#0F6E56; }
    thead th { padding:12px 14px; text-align:left; font-size:12px; font-weight:700; color:#fff; letter-spacing:.5px; text-transform:uppercase; }
    thead th:last-child, thead th:nth-child(3), thead th:nth-child(2) { text-align:right; }
    thead th:nth-child(2) { text-align:center; }
    .total-row { background:#0F6E56 !important; }
    .total-row td { padding:14px; font-weight:800; font-size:15px; color:#fff !important; }
    .footer { margin-top:32px; text-align:center; color:#aaa; font-size:12px; }
    .thankyou { font-size:20px; font-weight:800; color:#0F6E56; margin-bottom:4px; }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="store-name">${storeName || 'Store'}</div>
      <div style="font-size:13px;color:#666;margin-top:3px">Local Store App</div>
    </div>
    <div class="bill-meta">
      <div class="bill-no">${billNo}</div>
      <div class="bill-date">${dateStr} · ${timeStr}</div>
    </div>
  </div>

  <div class="divider"></div>

  ${(customerName || customerPhone) ? `
  <div class="customer-box">
    <div class="customer-label">Customer</div>
    ${customerName ? `<div class="customer-name">${customerName}</div>` : ''}
    ${customerPhone ? `<div class="customer-phone">📞 ${customerPhone}</div>` : ''}
  </div>
  ` : ''}

  <table>
    <thead>
      <tr>
        <th>Item</th>
        <th style="text-align:center">Qty</th>
        <th style="text-align:right">Unit Price</th>
        <th style="text-align:right">Total</th>
      </tr>
    </thead>
    <tbody>
      ${rows}
      <tr class="total-row">
        <td colspan="3" style="text-align:right;letter-spacing:.5px">TOTAL AMOUNT</td>
        <td style="text-align:right">₹${total.toFixed(2)}</td>
      </tr>
    </tbody>
  </table>

  <div class="footer">
    <div class="thankyou">Thank you! 🙏</div>
    <div>Please visit again</div>
  </div>
</body>
</html>`;
  };

  // ── Generate and Print ────────────────────────────────────
  const handlePrint = async () => {
    if (billItems.length === 0) {
      Alert.alert('Empty bill', 'Please add at least one item before printing.');
      return;
    }
    try {
      setGenerating(true);
      await Print.printAsync({ html: buildBillHTML() });
      await saveBillToSupabase();
    } catch (e: any) {
      console.error(e);
      Alert.alert('Print error', e.message || 'Could not print bill');
    } finally {
      setGenerating(false);
    }
  };

  // ── Generate and Share ────────────────────────────────────
  const handleShare = async () => {
    if (billItems.length === 0) {
      Alert.alert('Empty bill', 'Please add at least one item before sharing.');
      return;
    }
    try {
      setGenerating(true);
      const { uri } = await Print.printToFileAsync({ html: buildBillHTML() });
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          dialogTitle: `Bill from ${storeName}`,
        });
        await saveBillToSupabase();
      } else {
        Alert.alert('Sharing not available', 'Your device does not support sharing.');
      }
    } catch (e: any) {
      console.error(e);
      Alert.alert('Share error', e.message || 'Could not share bill');
    } finally {
      setGenerating(false);
    }
  };

  // ── Save to Supabase ──────────────────────────────────────
  const saveBillToSupabase = async () => {
    try {
      await supabase.from('bills').insert({
        store_id: storeId,
        customer_name: customerName || null,
        customer_phone: customerPhone || null,
        items: billItems.map(i => ({
          product_id: i.productId,
          name: i.name,
          qty: i.qty,
          unit_price: i.price,
          total: i.price * i.qty,
        })),
        total,
      });
    } catch (e) {
      // Non-blocking — bill was already printed/shared
      console.warn('Could not save bill to DB:', e);
    }
  };

  // ── Loading ──────────────────────────────────────────────
  if (loading) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.bg, justifyContent: 'center' }]}>
        <ActivityIndicator size="large" color={PRIMARY} />
      </SafeAreaView>
    );
  }

  // ── Main Screen ──────────────────────────────────────────
  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.bg }]}>
      {/* Header */}
      <View style={[styles.topBar, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={[styles.topBarTitle, { color: colors.text }]}>Generate Bill</Text>
          <Text style={[styles.topBarSub, { color: colors.textDim }]} numberOfLines={1}>{storeName}</Text>
        </View>
        {billItems.length > 0 && (
          <View style={styles.itemCountBadge}>
            <Text style={styles.itemCountText}>{billItems.reduce((s, i) => s + i.qty, 0)} items</Text>
          </View>
        )}
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={[styles.container, { paddingBottom: 200 }]} showsVerticalScrollIndicator={false}>

          {/* Customer Details */}
          <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Customer (optional)</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.input, color: colors.text, borderColor: colors.border }]}
              placeholder="Customer name"
              placeholderTextColor="#AAA"
              value={customerName}
              onChangeText={setCustomerName}
            />
            <TextInput
              style={[styles.input, { backgroundColor: colors.input, color: colors.text, borderColor: colors.border, marginBottom: 0 }]}
              placeholder="Phone number"
              placeholderTextColor="#AAA"
              keyboardType="phone-pad"
              value={customerPhone}
              onChangeText={setCustomerPhone}
            />
          </View>

          {/* Product Picker */}
          <Text style={[styles.pickerTitle, { color: colors.text }]}>Select Items</Text>
          <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {products.length === 0 ? (
              <Text style={[styles.emptyTxt, { color: colors.textDim }]}>No in-stock products found.</Text>
            ) : (
              products.map((product, idx) => {
                const qty = getQty(product.id);
                return (
                  <View
                    key={product.id}
                    style={[
                      styles.productRow,
                      { borderBottomWidth: idx < products.length - 1 ? 0.5 : 0, borderBottomColor: colors.border }
                    ]}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.prodName, { color: colors.text }]} numberOfLines={1}>{product.name}</Text>
                      <Text style={[styles.prodPrice, { color: PRIMARY }]}>₹{parsePrice(product.price).toFixed(0)}</Text>
                    </View>
                    <View style={styles.qtyControl}>
                      <TouchableOpacity
                        style={[styles.qtyBtn, qty === 0 && { opacity: 0.3 }]}
                        onPress={() => decrease(product.id)}
                        disabled={qty === 0}
                      >
                        <Ionicons name="remove" size={16} color={PRIMARY} />
                      </TouchableOpacity>
                      <Text style={[styles.qtyText, { color: colors.text }]}>{qty}</Text>
                      <TouchableOpacity style={styles.qtyBtn} onPress={() => addOrIncrease(product)}>
                        <Ionicons name="add" size={16} color={PRIMARY} />
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })
            )}
          </View>

          {/* Bill Summary */}
          {billItems.length > 0 && (
            <>
              <Text style={[styles.pickerTitle, { color: colors.text }]}>Bill Summary</Text>
              <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
                {billItems.map((item, idx) => (
                  <View
                    key={item.productId}
                    style={[styles.summaryRow, { borderBottomWidth: idx < billItems.length - 1 ? 0.5 : 0, borderBottomColor: colors.border }]}
                  >
                    <Text style={[styles.summaryName, { color: colors.text }]} numberOfLines={1}>{item.name}</Text>
                    <Text style={[styles.summaryQty, { color: colors.textDim }]}>×{item.qty}</Text>
                    <Text style={[styles.summaryTotal, { color: colors.text }]}>₹{(item.price * item.qty).toFixed(2)}</Text>
                  </View>
                ))}
                <View style={[styles.totalRow, { borderTopColor: colors.border }]}>
                  <Text style={[styles.totalLabel, { color: colors.text }]}>Total</Text>
                  <Text style={[styles.totalAmount, { color: PRIMARY }]}>₹{total.toFixed(2)}</Text>
                </View>
              </View>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Bottom Action Bar */}
      <View style={[styles.actionBar, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
        {total > 0 && (
          <View style={styles.totalPreview}>
            <Text style={[styles.totalPreviewLabel, { color: colors.textDim }]}>Total</Text>
            <Text style={[styles.totalPreviewAmount, { color: PRIMARY }]}>₹{total.toFixed(2)}</Text>
          </View>
        )}
        <View style={{ flex: 1, flexDirection: 'row', gap: 10 }}>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: colors.input, borderColor: colors.border, flex: 1 }]}
            onPress={handleShare}
            disabled={generating || billItems.length === 0}
          >
            <Ionicons name="share-outline" size={18} color={generating ? '#CCC' : PRIMARY} />
            <Text style={[styles.actionBtnText, { color: generating ? '#CCC' : PRIMARY }]}>Share</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: PRIMARY, flex: 1.5, opacity: (generating || billItems.length === 0) ? 0.6 : 1 }]}
            onPress={handlePrint}
            disabled={generating || billItems.length === 0}
          >
            {generating
              ? <ActivityIndicator color="#FFF" size="small" />
              : <>
                  <Ionicons name="print-outline" size={18} color="#FFF" />
                  <Text style={[styles.actionBtnText, { color: '#FFF' }]}>Print Bill</Text>
                </>
            }
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 },
  topBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, gap: 12 },
  backBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  topBarTitle: { fontSize: 17, fontWeight: '800' },
  topBarSub: { fontSize: 12, marginTop: 1 },
  itemCountBadge: { backgroundColor: PRIMARY, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  itemCountText: { color: '#FFF', fontSize: 12, fontWeight: '700' },
  container: { padding: 16 },
  section: { borderRadius: 16, borderWidth: 1, overflow: 'hidden', marginBottom: 20, padding: 16 },
  sectionTitle: { fontSize: 15, fontWeight: '700', marginBottom: 14 },
  input: { borderRadius: 10, borderWidth: 1, height: 46, paddingHorizontal: 14, fontSize: 15, marginBottom: 10 },
  pickerTitle: { fontSize: 15, fontWeight: '700', marginBottom: 10 },
  emptyTxt: { fontSize: 14, textAlign: 'center', paddingVertical: 12 },
  productRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, gap: 12 },
  prodName: { fontSize: 14, fontWeight: '600', marginBottom: 2 },
  prodPrice: { fontSize: 13, fontWeight: '700' },
  qtyControl: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  qtyBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#0F6E5615', alignItems: 'center', justifyContent: 'center' },
  qtyText: { fontSize: 16, fontWeight: '700', minWidth: 20, textAlign: 'center' },
  summaryRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, gap: 8 },
  summaryName: { flex: 1, fontSize: 14, fontWeight: '500' },
  summaryQty: { fontSize: 13, width: 32, textAlign: 'center' },
  summaryTotal: { fontSize: 14, fontWeight: '700', minWidth: 64, textAlign: 'right' },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 14, marginTop: 4, borderTopWidth: 1 },
  totalLabel: { fontSize: 16, fontWeight: '800' },
  totalAmount: { fontSize: 22, fontWeight: '900' },
  actionBar: { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', padding: 16, paddingBottom: Platform.OS === 'ios' ? 32 : 16, gap: 10, borderTopWidth: 1, alignItems: 'center' },
  totalPreview: { alignItems: 'flex-start', marginRight: 4 },
  totalPreviewLabel: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase' },
  totalPreviewAmount: { fontSize: 20, fontWeight: '900' },
  actionBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 50, borderRadius: 14, borderWidth: 1 },
  actionBtnText: { fontSize: 15, fontWeight: '700' },
});

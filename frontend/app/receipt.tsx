import {
  StyleSheet, View, Text, ScrollView, TouchableOpacity,
  SafeAreaView, Platform, StatusBar, ActivityIndicator, Image, Alert
} from 'react-native';
import { useState, useEffect } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { supabase } from '../utils/supabase';
import { Colors } from '../constants/theme';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

const theme = Colors.light;

export default function ReceiptScreen() {
  const { billId, storeName } = useLocalSearchParams<{ billId: string; storeName: string }>();
  const router = useRouter();
  
  const [bill, setBill] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    if (billId) {
      fetchBill();
    } else {
      setLoading(false);
    }
  }, [billId]);

  const fetchBill = async () => {
    try {
      const { data, error } = await supabase.from('bills').select('*').eq('id', billId).single();
      if (error) throw error;
      setBill(data);
    } catch (e: any) {
      console.error(e);
      Alert.alert('Error', 'Could not load bill details');
    } finally {
      setLoading(false);
    }
  };

  // ── HTML Bill Template ────────────────────────────────────
  const buildBillHTML = () => {
    if (!bill) return '';
    const now = new Date(bill.created_at || Date.now());
    const dateStr = now.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    const timeStr = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    const billNo = `KL-${bill.id.slice(0, 6).toUpperCase()}`;

    const items = bill.items || [];
    const rows = items.map((item: any, idx: number) => `
      <tr style="background:${idx % 2 === 0 ? '#fff' : '#f9f9f9'}">
        <td style="padding:10px 14px;font-size:14px;color:#333">${item.name}</td>
        <td style="padding:10px 14px;text-align:center;font-size:14px;color:#333">${item.qty}</td>
        <td style="padding:10px 14px;text-align:right;font-size:14px;color:#333">₹${item.unit_price}</td>
        <td style="padding:10px 14px;text-align:right;font-size:14px;font-weight:600;color:#111">
          ₹${item.total.toFixed(2)}
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
    .store-name { font-size:26px; font-weight:800; color:#9b4500; }
    .bill-meta { text-align:right; }
    .bill-no { font-size:13px; color:#666; font-weight:600; letter-spacing:.5px; }
    .bill-date { font-size:12px; color:#999; margin-top:2px; }
    .divider { height:2px; background:linear-gradient(90deg,#9b4500,#ff8c42); border-radius:2px; margin-bottom:24px; }
    table { width:100%; border-collapse:collapse; border-radius:12px; overflow:hidden; box-shadow:0 1px 6px rgba(0,0,0,.06); }
    thead tr { background:#9b4500; }
    thead th { padding:12px 14px; text-align:left; font-size:12px; font-weight:700; color:#fff; letter-spacing:.5px; text-transform:uppercase; }
    thead th:last-child, thead th:nth-child(3), thead th:nth-child(2) { text-align:right; }
    thead th:nth-child(2) { text-align:center; }
    .total-row { background:#9b4500 !important; }
    .total-row td { padding:14px; font-weight:800; font-size:15px; color:#fff !important; }
    .footer { margin-top:32px; text-align:center; color:#aaa; font-size:12px; }
    .thankyou { font-size:20px; font-weight:800; color:#9b4500; margin-bottom:4px; }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="store-name">${storeName || 'Store'}</div>
      <div style="font-size:13px;color:#666;margin-top:3px">Kinetic Local App</div>
    </div>
    <div class="bill-meta">
      <div class="bill-no">#${billNo}</div>
      <div class="bill-date">${dateStr} · ${timeStr}</div>
    </div>
  </div>

  <div class="divider"></div>

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
        <td style="text-align:right">₹${bill.total.toFixed(2)}</td>
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

  const handlePrint = async () => {
    if (!bill) return;
    try {
      setGenerating(true);
      await Print.printAsync({ html: buildBillHTML() });
    } catch (e: any) {
      Alert.alert('Print error', e.message || 'Could not print bill');
    } finally {
      setGenerating(false);
    }
  };

  const handleShare = async () => {
    if (!bill) return;
    try {
      setGenerating(true);
      const { uri } = await Print.printToFileAsync({ html: buildBillHTML() });
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          dialogTitle: \`Receipt from \${storeName}\`,
        });
      }
    } catch (e: any) {
      Alert.alert('Share error', e.message || 'Could not share bill');
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

  if (!bill) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.surface, justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ fontFamily: 'PlusJakartaSans_700Bold', fontSize: 20, color: theme.onSurface }}>Receipt not found.</Text>
        <TouchableOpacity style={{ marginTop: 20, padding: 12, backgroundColor: theme.primary, borderRadius: 8 }} onPress={() => router.back()}>
          <Text style={{ color: '#fff', fontFamily: 'PlusJakartaSans_600SemiBold' }}>Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const billDate = new Date(bill.created_at);
  const formattedDate = billDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const formattedTime = billDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  const shortId = \`#KL-\${bill.id.slice(0, 5).toUpperCase()}\`;
  
  // Tax logic (placeholder 8% as per design)
  const subtotal = bill.total / 1.08;
  const tax = bill.total - subtotal;

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.surface }]}>
      {/* TopAppBar */}
      <View style={[styles.appBar, { backgroundColor: theme.surface }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <TouchableOpacity onPress={() => router.navigate('/vendor')} style={styles.menuBtn}>
            <MaterialIcons name="close" size={24} color={theme.primary} />
          </TouchableOpacity>
          <Text style={[styles.brandTitle, { color: theme.primary }]}>Digital Receipt</Text>
        </View>
        <Image 
          source={{ uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuA8bOcWi0gsuYAzru7WTQ-Wb7lvQHYG0by0q-cPhAhiglOOaPZD4BRGJCrBI0Pmx2WRasgAs-b2-XayyiVWQvbGBlV2djnlHBNC-NgzR8Nc9A2DF2frMS2bbqM6KOaCvpFM92R8k2qXQDEyypMnwKx4W4SOaZ6qJLIDaya9BIQoA1jxvO664nf0wVn4-OdmK7MCoy7_RQdVDdjh5wqA6WVhVPaJSIUklC9eXFdNqdzDVxwqx-0RlKIfn5KsGgl0DChO7wqBANGHRKvc' }}
          style={[styles.profileImg, { borderColor: theme.outlineVariant }]} 
        />
      </View>

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {/* Store & Success Message */}
        <View style={styles.successSection}>
          <View style={[styles.successIconBox, { backgroundColor: theme.secondaryContainer }]}>
            <MaterialIcons name="check-circle" size={32} color={theme.onSecondaryContainer} />
          </View>
          <Text style={[styles.storeTitle, { color: theme.secondary }]}>{storeName || 'Local Artisan Hub'}</Text>
          <Text style={[styles.successMsg, { color: theme.onSurfaceVariant }]}>Thank you for supporting local craft!</Text>
        </View>

        {/* Receipt Card */}
        <View style={[styles.receiptCard, { backgroundColor: theme.surfaceContainerLowest, borderColor: theme.outlineVariant }]}>
          {/* Receipt Header */}
          <View style={[styles.receiptHeader, { borderBottomColor: theme.outlineVariant }]}>
            <View>
              <Text style={[styles.receiptLabel, { color: theme.onSurfaceVariant }]}>DATE & TIME</Text>
              <Text style={[styles.receiptValue, { color: theme.secondary }]}>{formattedDate} • {formattedTime}</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={[styles.receiptLabel, { color: theme.onSurfaceVariant }]}>ORDER ID</Text>
              <Text style={[styles.receiptValue, { color: theme.secondary }]}>{shortId}</Text>
            </View>
          </View>

          {/* Items List */}
          <View style={styles.itemsList}>
            {(bill.items || []).map((item: any, idx: number) => (
              <View key={idx} style={styles.itemRow}>
                <View>
                  <Text style={[styles.itemName, { color: theme.secondary }]}>{item.name}</Text>
                  <Text style={[styles.itemDetail, { color: theme.onSurfaceVariant }]}>{item.qty} × ₹{item.unit_price}</Text>
                </View>
                <Text style={[styles.itemName, { color: theme.secondary }]}>₹{item.total.toFixed(2)}</Text>
              </View>
            ))}
            
            <View style={[styles.divider, { backgroundColor: theme.outlineVariant }]} />
            
            <View style={styles.totalRow}>
              <Text style={[styles.totalLabel, { color: theme.onSurfaceVariant }]}>Subtotal</Text>
              <Text style={[styles.totalLabel, { color: theme.onSurfaceVariant }]}>₹{subtotal.toFixed(2)}</Text>
            </View>
            <View style={styles.totalRow}>
              <Text style={[styles.totalLabel, { color: theme.onSurfaceVariant }]}>Local Tax (8%)</Text>
              <Text style={[styles.totalLabel, { color: theme.onSurfaceVariant }]}>₹{tax.toFixed(2)}</Text>
            </View>
            <View style={styles.grandTotalRow}>
              <Text style={[styles.grandTotalLabel, { color: theme.secondary }]}>Total</Text>
              <Text style={[styles.grandTotalAmount, { color: theme.primary }]}>₹{bill.total.toFixed(2)}</Text>
            </View>
          </View>
        </View>

        {/* QR Code Section */}
        <View style={[styles.qrSection, { backgroundColor: '#FFF', borderColor: theme.outlineVariant }]}>
          <Text style={[styles.qrLabel, { color: theme.secondary }]}>SCAN TO VALIDATE RETURN OR LOYALTY</Text>
          <View style={[styles.qrWrapper, { borderColor: theme.secondaryContainer }]}>
            <Image 
              source={{ uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCVBM16_8Str7jX12OemzgKAO226k55ghJCC7l7UL0PHssCenEzwU7FvgtlShUFdTdiFD8Ps7u5_mQ_wN4nYBxOxrWLpD-Dkh_ntriEsEXWvum_weA9krA98bkNrPtpQPedJln0Rq1_z1cJMaXDywTQFxIhFhTJPmkcdjys4uCXsIXIwbPKZSWZkKBrGWBn-EgnclQW29J9-FZfQXsSryfrgZnnO6gGvDpeFSfOdOfLnod28OS-Gbewq3Ee_E2gLnA_khLEY5NkEI6k' }}
              style={styles.qrImage} 
            />
          </View>
          <View style={styles.secureBadge}>
            <MaterialIcons name="verified-user" size={16} color={theme.secondary} />
            <Text style={[styles.secureText, { color: theme.secondary }]}>Secure Blockchain Receipt</Text>
          </View>
        </View>

        {/* Actions Section */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity 
            style={[styles.primaryActionBtn, { backgroundColor: theme.primary }]} 
            onPress={handleShare} disabled={generating}
          >
            <MaterialIcons name="share" size={24} color={theme.onPrimary} />
            <Text style={[styles.primaryActionText, { color: theme.onPrimary }]}>Share Receipt</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.secondaryActionBtn, { backgroundColor: theme.secondaryContainer, borderColor: theme.secondary }]}>
            <MaterialIcons name="account-balance-wallet" size={24} color={theme.onSecondaryContainer} />
            <Text style={[styles.secondaryActionText, { color: theme.onSecondaryContainer }]}>Save to Wallet</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.tertiaryActionBtn} onPress={handlePrint} disabled={generating}>
            <MaterialIcons name="print" size={20} color={theme.secondary} />
            <Text style={[styles.tertiaryActionText, { color: theme.secondary }]}>PRINT PDF VERSION</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 },
  appBar: { height: 60, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.2)' },
  menuBtn: { padding: 4, borderRadius: 20 },
  brandTitle: { fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 20 },
  profileImg: { width: 32, height: 32, borderRadius: 16, borderWidth: 1 },
  
  container: { padding: 20, paddingBottom: 60 },
  
  successSection: { alignItems: 'center', marginVertical: 8, paddingVertical: 8 },
  successIconBox: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', marginBottom: 12, elevation: 1 },
  storeTitle: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 28 },
  successMsg: { fontFamily: 'PlusJakartaSans_400Regular', fontSize: 14, marginTop: 4 },
  
  receiptCard: { borderRadius: 12, borderWidth: 1, elevation: 1, overflow: 'hidden', marginVertical: 24 },
  receiptHeader: { flexDirection: 'row', justifyContent: 'space-between', padding: 24, borderBottomWidth: 1, borderStyle: 'dashed' },
  receiptLabel: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 12, letterSpacing: 0.6, marginBottom: 4 },
  receiptValue: { fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 16 },
  
  itemsList: { padding: 24, gap: 16 },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  itemName: { fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 16 },
  itemDetail: { fontFamily: 'PlusJakartaSans_400Regular', fontSize: 14 },
  
  divider: { height: 1, marginVertical: 8, opacity: 0.5 },
  
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 2 },
  totalLabel: { fontFamily: 'PlusJakartaSans_400Regular', fontSize: 14 },
  
  grandTotalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 12 },
  grandTotalLabel: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 28 },
  grandTotalAmount: { fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 40, letterSpacing: -0.5 },
  
  qrSection: { alignItems: 'center', padding: 24, borderRadius: 12, borderWidth: 1, elevation: 1, marginBottom: 24 },
  qrLabel: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 12, letterSpacing: 0.6, textAlign: 'center', marginBottom: 16 },
  qrWrapper: { padding: 16, borderWidth: 4, borderRadius: 12 },
  qrImage: { width: 192, height: 192 },
  secureBadge: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 16 },
  secureText: { fontFamily: 'PlusJakartaSans_400Regular', fontSize: 14 },
  
  actionsContainer: { gap: 12, marginBottom: 40 },
  primaryActionBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 56, borderRadius: 28, elevation: 4 },
  primaryActionText: { fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 18 },
  secondaryActionBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 56, borderRadius: 28, borderWidth: 1 },
  secondaryActionText: { fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 18 },
  tertiaryActionBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16, opacity: 0.8 },
  tertiaryActionText: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 12, letterSpacing: 1 },
});

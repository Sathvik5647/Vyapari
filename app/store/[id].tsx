import { useLocalSearchParams, useRouter } from 'expo-router';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, SafeAreaView, Platform, StatusBar, Linking, ActivityIndicator } from 'react-native';
import { useEffect, useState } from 'react';
import { supabase } from '../../utils/supabase';

export default function StoreProfileScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [store, setStore] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStoreDetails();
  }, [id]);

  const fetchStoreDetails = async () => {
    const { data, error } = await supabase
      .from('stores')
      .select('*, products(*)')
      .eq('id', id)
      .single();

    if (!error) {
      setStore(data);
    }
    setLoading(false);
  };

  const handleCall = () => {
    Linking.openURL(`tel:${store?.phone || '+919876543210'}`);
  };

  const handleDirections = () => {
    Linking.openURL(`https://maps.apple.com/?q=${store?.location_text || store?.name}`);
  };

  const handleWhatsApp = () => {
    Linking.openURL(`whatsapp://send?phone=${store?.phone || '919876543210'}&text=Hi, do you have...`);
  };

  if (loading) return <SafeAreaView style={styles.safeArea}><ActivityIndicator style={{marginTop: 50}} /></SafeAreaView>;
  if (!store) return <SafeAreaView style={styles.safeArea}><Text style={{textAlign: 'center', marginTop: 50}}>Store not found.</Text></SafeAreaView>;

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backIcon}>←</Text>
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.container}>
        {/* Store Info Card */}
        <View style={styles.infoCard}>
          <Text style={styles.storeName}>{store.name}</Text>
          <Text style={styles.storeSub}>{store.location_text} · Open now</Text>
          
          <View style={styles.actionsRow}>
            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#E1F5EE' }]} onPress={handleCall}>
              <Text style={[styles.actionText, { color: '#0F6E56' }]}>📞 Call</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#EEEDFE' }]} onPress={handleDirections}>
              <Text style={[styles.actionText, { color: '#3C3489' }]}>📍 Directions</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#FAEEDA' }]} onPress={handleWhatsApp}>
              <Text style={[styles.actionText, { color: '#854F0B' }]}>💬 WhatsApp</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Products List */}
        <Text style={styles.catalogTitle}>Products ({store.products?.length || 0})</Text>
        <View style={styles.productsContainer}>
          {store.products?.map((product: any) => (
            <View key={product.id} style={styles.productRow}>
              <Text style={styles.productName}>{product.name}</Text>
              {!product.is_in_stock ? (
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.productOOS}>Out of stock</Text>
                  <TouchableOpacity 
                    style={{ marginTop: 4 }} 
                    onPress={() => alert(`Stock alert set for ${product.name}! You'll be notified when it's back.`)}
                  >
                    <Text style={{ fontSize: 12, color: '#0F6E56', fontWeight: '500' }}>🔔 Notify Me</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <Text style={styles.productPrice}>{product.price}</Text>
              )}
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backIcon: {
    fontSize: 20,
    marginRight: 4,
    color: '#333',
  },
  backText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  container: {
    padding: 16,
  },
  infoCard: {
    backgroundColor: '#fff',
    borderWidth: 0.5,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  storeName: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111',
    marginBottom: 4,
  },
  storeSub: {
    fontSize: 13,
    color: '#666',
    marginBottom: 16,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  actionBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  actionText: {
    fontSize: 13,
    fontWeight: '500',
  },
  catalogTitle: {
    fontSize: 13,
    color: '#666',
    fontWeight: '500',
    marginBottom: 10,
  },
  productsContainer: {
    borderTopWidth: 0.5,
    borderTopColor: '#e0e0e0',
  },
  productRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 0.5,
    borderBottomColor: '#e0e0e0',
  },
  productName: {
    fontSize: 15,
    color: '#333',
  },
  productPrice: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0F6E56',
  },
  productOOS: {
    fontSize: 13,
    color: '#993C1D',
    fontWeight: '500',
  },
});
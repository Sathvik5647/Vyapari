import { useState, useEffect } from 'react';
import { StyleSheet, TextInput, ScrollView, View, Text, TouchableOpacity, SafeAreaView, Platform, StatusBar } from 'react-native';
import { Link } from 'expo-router';
import { supabase } from '../../utils/supabase';

const CATEGORIES = [
  { id: '1', name: 'Grocery', emoji: '🥦' },
  { id: '2', name: 'Pharmacy', emoji: '💊' },
  { id: '3', name: 'Clothing', emoji: '👕' },
  { id: '4', name: 'Electronics', emoji: '📱' },
];

export default function HomeScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [stores, setStores] = useState<any[]>([]);

  useEffect(() => {
    fetchStores();
  }, []);

  const fetchStores = async () => {
    // Real query bringing stores down from Supabase
    const { data, error } = await supabase.from('stores').select('*, products(count)');
    if (error) console.error("Error fetching stores", error);
    else setStores(data || []);
  };

  // Helper to assign a random UI color matching your plan's mock
  const generateStoreEmojiColor = (category: string) => {
    if (category === 'Grocery') return { emoji: '🥦', bgColor: '#E1F5EE' };
    if (category === 'Pharmacy') return { emoji: '💊', bgColor: '#FAEEDA' };
    if (category === 'Clothing') return { emoji: '👕', bgColor: '#EEEDFE' };
    return { emoji: '🏪', bgColor: '#f5f5f5' };
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search items, stores..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#666"
          />
        </View>

        {/* Categories Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Popular near you</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsScroll}>
            {CATEGORIES.map((cat) => (
              <TouchableOpacity key={cat.id} style={styles.chip}>
                <Text style={styles.chipText}>{cat.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Stores Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Stores nearby</Text>
          {stores.length === 0 ? (
             <Text style={{color: '#666'}}>No stores found yet. Test adding one in Vendor tab!</Text>
          ) : stores.map((store) => {
            const display = generateStoreEmojiColor(store.category);
            return (
            <Link href={`/store/${store.id}`} key={store.id} asChild>
              <TouchableOpacity style={styles.storeCard}>
                <View style={[styles.storeAvatar, { backgroundColor: display.bgColor }]}>
                  <Text style={styles.avatarEmoji}>{display.emoji}</Text>
                </View>
                <View style={styles.storeInfo}>
                  <Text style={styles.storeName}>{store.name}</Text>
                  <Text style={styles.storeDetails}>
                    500m · Open now · {(store.products && store.products[0]) ? store.products[0].count : 0} items
                  </Text>
                </View>
              </TouchableOpacity>
            </Link>
          )})}
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
  container: {
    paddingPrimary: 16,
    padding: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderWidth: 0.5,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 20,
  },
  searchIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#333',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 13,
    color: '#666',
    fontWeight: '500',
    marginBottom: 10,
  },
  chipsScroll: {
    flexDirection: 'row',
    overflow: 'visible',
  },
  chip: {
    backgroundColor: '#fff',
    borderWidth: 0.5,
    borderColor: '#e0e0e0',
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 14,
    marginRight: 8,
  },
  chipText: {
    fontSize: 12,
    color: '#444',
  },
  storeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 0.5,
    borderColor: '#e0e0e0',
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
  },
  storeAvatar: {
    width: 44,
    height: 44,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarEmoji: {
    fontSize: 20,
  },
  storeInfo: {
    flex: 1,
  },
  storeName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111',
    marginBottom: 4,
  },
  storeDetails: {
    fontSize: 12,
    color: '#666',
  },
});

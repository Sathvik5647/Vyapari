import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { useRouter } from "expo-router";
import { useFocusEffect } from "expo-router";
import { useNavigation } from "expo-router";
import { useEffect, useRef, useState, useCallback } from "react";
import {
  Alert,
  Dimensions,
  Linking,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useColorScheme,
  View,
} from "react-native";
import MapView, { Marker, Polyline } from "react-native-maps";
import MapViewDirections from "react-native-maps-directions";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { supabase } from "../../utils/supabase";

const GOOGLE_MAPS_APIKEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || "";
const { width, height } = Dimensions.get("window");

const CATEGORIES = [
  { id: "1", name: "Grocery", icon: "cart-outline", color: "#4CAF50" },
  { id: "2", name: "Pharmacy", icon: "medical-outline", color: "#F44336" },
  { id: "3", name: "Clothing", icon: "shirt-outline", color: "#2196F3" },
  { id: "4", name: "Accessories", icon: "watch-outline", color: "#9C27B0" },
  { id: "5", name: "Electronics", icon: "hardware-chip-outline", color: "#FF9800" },
];

// Suppress all Google Maps POI/transit markers — only show our store pins
const CLEAN_MAP_STYLE = [
  { featureType: "poi", elementType: "all", stylers: [{ visibility: "off" }] },
  { featureType: "poi.business", elementType: "all", stylers: [{ visibility: "off" }] },
  { featureType: "transit", elementType: "all", stylers: [{ visibility: "off" }] },
];

const getCategoryDetails = (categoryName: string) => {
  const cat = CATEGORIES.find(c => c.name.toLowerCase() === (categoryName || "").toLowerCase());
  return {
    icon: cat ? cat.icon : "storefront-outline",
    color: cat ? cat.color : "#0F6E56"
  };
};

export default function HomeScreen() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [stores, setStores] = useState<any[]>([]);
  const [selectedStore, setSelectedStore] = useState<any | null>(null);
  const [userLocation, setUserLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [navigateMode, setNavigateMode] = useState(false);

  const colorScheme = useColorScheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const navigation = useNavigation();
  const mapRef = useRef<MapView>(null);

  const isDark = colorScheme === "dark";

  // Hide tab bar when a store is selected — restore full original style on dismiss
  useEffect(() => {
    navigation.getParent()?.setOptions({
      tabBarStyle: selectedStore
        ? { display: "none" }
        : {
            position: "absolute" as const,
            bottom: Platform.OS === "ios" ? 34 : 20,
            left: 20,
            right: 20,
            height: 64,
            borderRadius: 36,
            backgroundColor: isDark ? "#1C1C1E" : "#FFFFFF",
            borderTopWidth: 0,
            elevation: 24,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 10 },
            shadowOpacity: 0.15,
            shadowRadius: 20,
            paddingBottom: 0,
            paddingTop: 0,
          },
    });
  }, [navigation, selectedStore, isDark]);

  useEffect(() => {
    setupLocationAndData();
  }, []);

  const setupLocationAndData = async () => {
    // 1. Request location
    let { status } = await Location.requestForegroundPermissionsAsync();
    let initialLocation = {
      latitude: 22.3072, // Vadodara Default
      longitude: 73.1812,
    };

    if (status === "granted") {
      try {
        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        initialLocation = {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        };
      } catch (e) {
        console.log("Error getting location: ", e);
      }
    }

    setUserLocation(initialLocation);

    // Initial map zoom to location
    mapRef.current?.animateToRegion(
      {
        latitude: initialLocation.latitude,
        longitude: initialLocation.longitude,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      },
      1000,
    );

    // 2. Fetch stores
    const { data, error } = await supabase
      .from("stores")
      .select("*, products(count)");

    if (error) {
      console.error("Error fetching stores", error);
    } else {
      setStores(data || []);
    }
  };

  const handleMarkerPress = (store: any) => {
    setSelectedStore(store);
    setNavigateMode(false);
    // Pan map to store — slight southward offset keeps the pin in the upper
    // half so it's visible above the bottom sheet.
    mapRef.current?.animateToRegion(
      {
        latitude: store.latitude - 0.004,
        longitude: store.longitude,
        latitudeDelta: 0.012,
        longitudeDelta: 0.012,
      },
      350,
    );
  };

  const handleDirectionsPress = () => {
    if (!GOOGLE_MAPS_APIKEY) {
      Alert.alert(
        "Navigation Key Missing",
        "To enable real in-app navigation routes, please add your Google Maps API Key to EXPO_PUBLIC_GOOGLE_MAPS_API_KEY in your .env file.\n\nOpening external maps instead.",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Open Maps",
            onPress: () => {
              const url = Platform.select({
                ios: `maps:0,0?q=${selectedStore.latitude},${selectedStore.longitude}`,
                android: `geo:0,0?q=${selectedStore.latitude},${selectedStore.longitude}(${selectedStore.name})`,
              });
              Linking.openURL(url!);
            },
          },
        ],
      );
      // Even without API key, let's draw a straight line to simulate "in-app" connection mode
      setNavigateMode(true);
      return;
    }
    setNavigateMode(true);

    // Animate map to show both user and destination
    if (userLocation && selectedStore) {
      mapRef.current?.fitToCoordinates(
        [
          {
            latitude: userLocation.latitude,
            longitude: userLocation.longitude,
          },
          {
            latitude: selectedStore.latitude,
            longitude: selectedStore.longitude,
          },
        ],
        {
          edgePadding: { top: 100, right: 50, bottom: 250, left: 50 },
          animated: true,
        },
      );
    }
  };

  const colors = {
    bg: isDark ? "#121212" : "#FFFFFF",
    text: isDark ? "#FFFFFF" : "#000000",
    textDim: isDark ? "#999999" : "#666666",
    searchBg: isDark ? "#2A2A2A" : "#F5F5F5",
    cardBg: isDark ? "#1E1E1E" : "#FFFFFF",
    border: isDark ? "#333333" : "#E0E0E0",
    primary: "#0F6E56",
    iconDefault: isDark ? "#E0E0E0" : "#333333",
  };

  // Filter map markers by selected category (null = show all)
  const filteredStores = selectedCategory
    ? stores.filter(
        (s) => s.category?.toLowerCase() === selectedCategory.toLowerCase()
      )
    : stores;

  // Guard: skip stores that have null coordinates (e.g. newly created, not geocoded yet)
  const safeStores = filteredStores.filter(
    (s) => s.latitude != null && s.longitude != null
  );

  // Live search results — shown in dropdown when user types
  const searchResults =
    searchQuery.trim().length > 0
      ? stores
          .filter(
            (s) =>
              s.latitude != null &&
              s.longitude != null &&
              (s.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                s.category?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                s.location_text?.toLowerCase().includes(searchQuery.toLowerCase()))
          )
          .slice(0, 6)
      : [];

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={{
          latitude: 22.3072,
          longitude: 73.1812,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        }}
        showsPointsOfInterest={false}
        showsBuildings={false}
        showsTraffic={false}
        showsUserLocation
        toolbarEnabled={false}
        customMapStyle={CLEAN_MAP_STYLE}
        showsMyLocationButton={false}
        userInterfaceStyle={isDark ? "dark" : "light"}
        onPress={() => setSelectedStore(null)}
      >
        {safeStores.map((store) => {
          const { icon, color } = getCategoryDetails(store.category);
          return (
            <Marker
              key={`marker-${store.id}`}
              coordinate={{
                latitude: store.latitude,
                longitude: store.longitude,
              }}
              onPress={(e) => {
                e.stopPropagation();
                handleMarkerPress(store);
              }}
            >
              <View style={styles.pinWrapper}>
                <View style={[styles.pinHead, { backgroundColor: color }]}>
                  <Ionicons name={icon as any} size={15} color="#FFF" />
                </View>
                <View style={[styles.pinTail, { borderTopColor: color }]} />
              </View>
            </Marker>
          );
        })}

        {/* Draw In-App Route to Selected Store */}
        {navigateMode && userLocation && selectedStore && GOOGLE_MAPS_APIKEY ? (
          <MapViewDirections
            origin={userLocation}
            destination={{
              latitude: selectedStore.latitude,
              longitude: selectedStore.longitude,
            }}
            apikey={GOOGLE_MAPS_APIKEY}
            strokeWidth={4}
            strokeColor={colors.primary}
            optimizeWaypoints={true}
          />
        ) : navigateMode && userLocation && selectedStore ? (
          /* Fallback straightforward line if no API key is provided for Maps Directions */
          <Polyline
            coordinates={[
              userLocation,
              {
                latitude: selectedStore.latitude,
                longitude: selectedStore.longitude,
              },
            ]}
            strokeColor={colors.primary}
            strokeWidth={4}
            lineDashPattern={[0]}
          />
        ) : null}
      </MapView>

      {/* Top Floating Search & Categories */}
      <View style={[styles.topOverlay, { paddingTop: insets.top + 10 }]}>
        {/* Search Bar */}
        <View
          style={[
            styles.searchContainer,
            { backgroundColor: "rgba(255,255,255,0.97)", borderColor: "rgba(0,0,0,0.06)" },
          ]}
        >
          <Ionicons name="search" size={18} color="#999" style={styles.searchIcon} />
          <TextInput
            style={[styles.searchInput, { color: "#111" }]}
            placeholder="Search stores, items..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#AAAAAA"
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery("")} style={{ padding: 4 }}>
              <Ionicons name="close-circle" size={18} color="#BBB" />
            </TouchableOpacity>
          )}
        </View>

        {/* Search Results Dropdown */}
        {searchResults.length > 0 && (
          <View style={[styles.searchDropdown, { backgroundColor: colors.cardBg }]}>
            {searchResults.map((store, idx) => {
              const { icon: sIcon, color: sColor } = getCategoryDetails(store.category);
              return (
                <TouchableOpacity
                  key={store.id}
                  style={[
                    styles.searchResultItem,
                    { borderBottomWidth: idx < searchResults.length - 1 ? 0.5 : 0, borderBottomColor: "rgba(0,0,0,0.06)" },
                  ]}
                  onPress={() => {
                    handleMarkerPress(store);
                    setSearchQuery("");
                  }}
                >
                  <View style={[styles.searchResultIcon, { backgroundColor: sColor + "22" }]}>
                    <Ionicons name={sIcon as any} size={15} color={sColor} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.searchResultName, { color: colors.text }]} numberOfLines={1}>
                      {store.name}
                    </Text>
                    {store.location_text ? (
                      <Text style={[styles.searchResultSub, { color: colors.textDim }]} numberOfLines={1}>
                        {store.location_text} · {store.category}
                      </Text>
                    ) : null}
                  </View>
                  <Ionicons name="chevron-forward" size={14} color={colors.textDim} />
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* Category Chips — hidden while searching */}
        {searchQuery.trim() === "" && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipsScroll}
          >
            {CATEGORIES.map((cat) => {
              const isActive = selectedCategory === cat.name;
              return (
                <TouchableOpacity
                  key={cat.id}
                  onPress={() => setSelectedCategory(isActive ? null : cat.name)}
                  style={[
                    styles.chip,
                    isActive
                      ? { backgroundColor: cat.color, borderColor: cat.color }
                      : { backgroundColor: "rgba(255,255,255,0.96)", borderColor: "rgba(0,0,0,0.08)" },
                  ]}
                >
                  <Ionicons name={cat.icon as any} size={14} color={isActive ? "#FFF" : "#333"} />
                  <Text style={[styles.chipText, { color: isActive ? "#FFF" : "#333" }]}>{cat.name}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}
      </View>

      {/* Floating My Location Button */}
      <TouchableOpacity
        style={[
          styles.myLocationButton,
          {
            backgroundColor: colors.cardBg,
            shadowColor: isDark ? "#000" : "#333",
            bottom: 100,
          },
        ]}
        onPress={() => {
          if (userLocation) {
            mapRef.current?.animateToRegion(
              {
                latitude: userLocation.latitude,
                longitude: userLocation.longitude,
                latitudeDelta: 0.05,
                longitudeDelta: 0.05,
              },
              1000,
            );
          }
        }}
      >
        <Ionicons name="location" size={24} color={colors.primary} />
      </TouchableOpacity>

      {/* Store Bottom Sheet — rendered in Modal so it's above EVERYTHING including the nav bar */}
      <Modal
        visible={selectedStore != null}
        transparent
        animationType="slide"
        statusBarTranslucent
        onRequestClose={() => setSelectedStore(null)}
      >
        <View style={styles.modalOverlay}>
          {/* Tappable transparent backdrop dismisses */}
          <TouchableOpacity
            style={{ flex: 1 }}
            activeOpacity={1}
            onPress={() => setSelectedStore(null)}
          />

          {selectedStore && (() => {
            const { icon: catIcon, color: catColor } = getCategoryDetails(selectedStore.category);
            return (
              <View
                style={[
                  styles.storeSheet,
                  {
                    backgroundColor: colors.cardBg,
                    shadowColor: isDark ? "#000" : "#555",
                    paddingBottom: insets.bottom > 0 ? insets.bottom + 8 : 28,
                  },
                ]}
              >
                {/* Drag handle */}
                <View style={styles.dragHandle} />

                {/* Category colour accent strip */}
                <View style={[styles.categoryAccent, { backgroundColor: catColor }]} />

                <View style={styles.sheetContent}>
                  {/* Store name + dismiss */}
                  <View style={styles.nameRow}>
                    <Text style={[styles.storeName, { color: colors.text }]} numberOfLines={1}>
                      {selectedStore.name}
                    </Text>
                    <TouchableOpacity style={styles.dismissBtn} onPress={() => setSelectedStore(null)}>
                      <Ionicons name="close" size={16} color={colors.textDim} />
                    </TouchableOpacity>
                  </View>

                  {/* Category badge + star rating */}
                  <View style={styles.metaRow}>
                    <View style={[styles.catBadge, { backgroundColor: catColor + "22", borderColor: catColor + "55" }]}>
                      <Ionicons name={catIcon as any} size={11} color={catColor} />
                      <Text style={[styles.catBadgeText, { color: catColor }]}>
                        {selectedStore.category || "Store"}
                      </Text>
                    </View>
                    {selectedStore.rating != null && (
                      <View style={styles.ratingRow}>
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Ionicons
                            key={s} name="star" size={12}
                            color={s <= Math.round(selectedStore.rating) ? "#FFB800" : "#DDD"}
                          />
                        ))}
                        <Text style={[styles.ratingNum, { color: colors.textDim }]}> {selectedStore.rating}</Text>
                      </View>
                    )}
                  </View>

                  {/* Location */}
                  {selectedStore.location_text ? (
                    <View style={styles.infoRow}>
                      <Ionicons name="location-outline" size={14} color={colors.textDim} />
                      <Text style={[styles.infoText, { color: colors.textDim }]} numberOfLines={1}>
                        {selectedStore.location_text}
                      </Text>
                    </View>
                  ) : null}

                  {/* Phone */}
                  {selectedStore.phone ? (
                    <View style={styles.infoRow}>
                      <Ionicons name="call-outline" size={14} color={colors.textDim} />
                      <Text style={[styles.infoText, { color: colors.textDim }]}>{selectedStore.phone}</Text>
                    </View>
                  ) : null}

                  {/* Action Buttons */}
                  <View style={styles.actionButtonsRow}>
                    <TouchableOpacity
                      style={[styles.primaryActionBtn, { backgroundColor: colors.primary }]}
                      onPress={handleDirectionsPress}
                    >
                      <Ionicons name="navigate" size={16} color="#FFF" />
                      <Text style={styles.primaryActionText}>Directions</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.secondaryActionBtn, { borderColor: colors.border }]}
                      onPress={() => Linking.openURL(`tel:${selectedStore.phone || ""}`)}
                    >
                      <Ionicons name="call" size={16} color={colors.primary} />
                      <Text style={[styles.secondaryActionText, { color: colors.primary }]}>Call</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.secondaryActionBtn, { borderColor: colors.border }]}
                      onPress={() => router.push(`/store/${selectedStore.id}`)}
                    >
                      <Ionicons name="storefront-outline" size={16} color={colors.primary} />
                      <Text style={[styles.secondaryActionText, { color: colors.primary }]}>Details</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            );
          })()}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
    width: "100%",
    height: "100%",
  },
  // Classic pin marker: circle head + triangle tail
  pinWrapper: {
    alignItems: "center",
  },
  pinHead: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2.5,
    borderColor: "#FFFFFF",
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.30,
    shadowRadius: 5,
  },
  pinTail: {
    width: 0,
    height: 0,
    borderLeftWidth: 5,
    borderRightWidth: 5,
    borderTopWidth: 9,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    marginTop: -1,
    elevation: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.20,
    shadowRadius: 2,
  },
  markerBadge: {
    padding: 6,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: "#FFF",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  topOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    borderRadius: 30,
    paddingHorizontal: 16,
    height: 52,
    borderWidth: 1,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    fontFamily: Platform.OS === "ios" ? "System" : "Roboto",
  },
  chipsScroll: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    gap: 8,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 13,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    gap: 5,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.10,
    shadowRadius: 3,
  },
  chipText: {
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: 0.1,
  },

  // ─── Modal overlay ────────────────────────────────────────
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  // ─── Bottom Sheet (Google Maps style) ──────────────────────
  bottomCardContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 9999,
    elevation: 50,
  },
  storeSheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: "hidden",
    elevation: 50,
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
  },
  dragHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#DDDDDD",
    alignSelf: "center",
    marginTop: 12,
  },
  categoryAccent: {
    height: 3,
    marginTop: 14,
    marginHorizontal: 20,
    borderRadius: 2,
    opacity: 0.7,
  },
  sheetContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  storeName: {
    fontSize: 21,
    fontWeight: "700",
    flex: 1,
    marginRight: 8,
  },
  dismissBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "rgba(0,0,0,0.07)",
    alignItems: "center",
    justifyContent: "center",
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 10,
  },
  catBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
  },
  catBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  ratingNum: {
    fontSize: 12,
    fontWeight: "600",
    marginLeft: 3,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 5,
  },
  infoText: {
    fontSize: 13,
    flex: 1,
  },
  actionButtonsRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 18,
  },
  primaryActionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    height: 46,
    borderRadius: 23,
  },
  primaryActionText: {
    color: "#FFF",
    fontWeight: "700",
    fontSize: 14,
  },
  secondaryActionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    height: 46,
    borderRadius: 23,
    borderWidth: 1.5,
  },
  secondaryActionText: {
    fontWeight: "600",
    fontSize: 13,
  },
  myLocationButton: {
    position: "absolute",
    right: 16,
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    elevation: 5,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    zIndex: 10,
  },
  // ─── Search Dropdown ──────────────────────────────────────
  searchDropdown: {
    marginHorizontal: 16,
    marginTop: 6,
    borderRadius: 16,
    overflow: "hidden",
    elevation: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
  },
  searchResultItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  searchResultIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  searchResultName: {
    fontSize: 15,
    fontWeight: "600",
  },
  searchResultSub: {
    fontSize: 12,
    marginTop: 1,
  },
});

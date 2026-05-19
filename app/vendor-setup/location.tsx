import { StyleSheet, View, Text, TouchableOpacity, SafeAreaView, Platform, StatusBar } from 'react-native';
import { useRouter } from 'expo-router';
import { useVendorContext } from './_layout';
// To use real maps, install: npx expo install react-native-maps
import MapView, { Marker } from 'react-native-maps';
import { useState } from 'react';

export default function VendorOnboardingLocation() {
  const router = useRouter();
  const { updateData } = useVendorContext();
  const [selectedLocation, setSelectedLocation] = useState({
    latitude: 28.6139,
    longitude: 77.2090,
  }); // Default to New Delhi or user's city

  const handleConfirm = () => {
      updateData({ 
        location: `${selectedLocation.latitude.toFixed(4)}, ${selectedLocation.longitude.toFixed(4)}` 
      });
      router.push('/vendor-setup/products');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.progressContainer}>
          <View style={[styles.progressDot, styles.progressActive]} />
          <View style={[styles.progressLine, styles.progressActive]} />
          <View style={[styles.progressDot, styles.progressActive]} />
          <View style={[styles.progressLine, styles.progressActive]} />
          <View style={[styles.progressDot, styles.progressActive]} />
          <View style={styles.progressLine} />
          <View style={styles.progressDot} />
        </View>

        <Text style={styles.title}>Pin location</Text>
        <Text style={styles.subtitle}>Where is your store located?</Text>

        <View style={styles.mapContainer}>
          <MapView
            style={styles.map}
            initialRegion={{
              latitude: selectedLocation.latitude,
              longitude: selectedLocation.longitude,
              latitudeDelta: 0.0922,
              longitudeDelta: 0.0421,
            }}
            showsPointsOfInterest={false}
            onPress={(e) => setSelectedLocation(e.nativeEvent.coordinate)}
          >
            <Marker 
              coordinate={selectedLocation}
              draggable
              onDragEnd={(e) => setSelectedLocation(e.nativeEvent.coordinate)}
            >
              <View style={styles.waterDropMarker}>
                <View style={styles.waterDropIcon} />
              </View>
            </Marker>
          </MapView>
          <Text style={{color: '#666', fontSize: 12, marginTop: 8, textAlign: 'center'}}>
            Drag the pin or tap on the map to set your location
          </Text>
        </View>

        <TouchableOpacity 
          style={styles.button} 
          onPress={handleConfirm}
        >
          <Text style={styles.buttonText}>Confirm Location</Text>
        </TouchableOpacity>
      </View>
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
    padding: 24,
    flex: 1,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 48,
  },
  progressDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#f0f0f0',
    borderWidth: 2,
    borderColor: '#e0e0e0',
  },
  progressActive: {
    backgroundColor: '#E1F5EE',
    borderColor: '#0F6E56',
  },
  progressLine: {
    width: 40,
    height: 2,
    backgroundColor: '#e0e0e0',
    marginHorizontal: 4,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 32,
  },
  mapContainer: {
    flex: 1,
    marginBottom: 24,
    borderRadius: 12,
    overflow: 'hidden',
  },
  map: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
  },
  waterDropMarker: {
    width: 36,
    height: 36,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 0,
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ rotate: '45deg' }],
    borderWidth: 2,
    borderColor: '#FFF',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    backgroundColor: '#0F6E56',
  },
  waterDropIcon: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#FFF',
    transform: [{ rotate: '-45deg' }],
  },
  button: {
    backgroundColor: '#0F6E56',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
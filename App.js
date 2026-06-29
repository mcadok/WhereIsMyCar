import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, Text, View, TouchableOpacity, Alert, 
  ActivityIndicator, FlatList, Platform, StatusBar, Modal, TextInput 
} from 'react-native';
import * as Location from 'expo-location';
import * as Linking from 'expo-linking';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';

import { 
  useFonts, 
  Inconsolata_400Regular, 
  Inconsolata_700Bold 
} from '@expo-google-fonts/inconsolata';

const STORAGE_KEY = '@car_history_v3';
const LIME = '#A2FF00';

export default function App() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [currentLocationData, setCurrentLocationData] = useState(null);
  const [placeName, setPlaceName] = useState('');

  // Ładowanie czcionek
  let [fontsLoaded] = useFonts({
    Inconsolata_400Regular,
    Inconsolata_700Bold,
  });

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      const saved = await AsyncStorage.getItem(STORAGE_KEY);
      if (saved) setHistory(JSON.parse(saved));
    } catch (e) {
      console.error("Błąd odczytu bazy:", e);
    }
  };

  const handleStartSaving = async () => {
    setLoading(true);
    let { status } = await Location.requestForegroundPermissionsAsync();
    
    if (status !== 'granted') {
      Alert.alert('Błąd', 'Brak uprawnień do GPS.');
      setLoading(false);
      return;
    }

    try {
      let currentPos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      setCurrentLocationData(currentPos.coords);
      setModalVisible(true); 
    } catch (e) {
      Alert.alert('Błąd', 'Nie udało się pobrać lokalizacji.');
    } finally {
      setLoading(false);
    }
  };

  const finalizeSave = async () => {
    if (!placeName.trim()) {
      Alert.alert('Info', 'Podaj jakąś nazwę, np. "Pod blokiem"');
      return;
    }

    const newEntry = {
      id: Date.now().toString(),
      name: placeName.trim(),
      lat: currentLocationData.latitude,
      lon: currentLocationData.longitude,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      date: new Date().toLocaleDateString(),
    };

    const updatedHistory = [newEntry, ...history].slice(0, 10);
    setHistory(updatedHistory);
    
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updatedHistory));
    } catch (e) {
      console.error("Błąd zapisu bazy:", e);
    }
    
    setModalVisible(false);
    setPlaceName('');
    setCurrentLocationData(null);
  };

  const deleteEntry = async (id) => {
    const updatedHistory = history.filter(item => item.id !== id);
    setHistory(updatedHistory);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updatedHistory));
    } catch (e) {
      console.error("Błąd podczas usuwania wpisu:", e);
    }
  };

  const navigate = (lat, lon) => {
    const url = Platform.select({
      ios: `maps:0,0?q=${lat},${lon}`,
      android: `geo:0,0?q=${lat},${lon}`
    });
    Linking.openURL(url);
  };

  if (!fontsLoaded) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator color={LIME} size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      <View style={styles.header}>
        <Text style={styles.title}>WhereIsMyCar</Text>
        <Ionicons name="terminal" size={24} color={LIME} />
      </View>

      <View style={styles.mainAction}>
        <TouchableOpacity 
          style={styles.saveButton} 
          onPress={handleStartSaving}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#000" size="large" />
          ) : (
            <View style={{ transform: [{ rotate: '-45deg' }] }}>
              <Ionicons name="pin" size={60} color="#000" />
            </View>
          )}
        </TouchableOpacity>
        <Text style={styles.saveLabel}>NAMIERZ I ZAPISZ</Text>
      </View>

      <View style={styles.listSection}>
        <Text style={styles.sectionLabel}>LOGS_LAST_10_ENTRIES</Text>
        <FlatList
          data={history}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <View style={styles.historyCard}>
              <View style={{ flex: 1 }}>
                <Text style={styles.placeName}>{item.name.toUpperCase()}</Text>
                <Text style={styles.historyMeta}>{item.date} | {item.time}</Text>
              </View>
              
              <View style={styles.actionsContainer}>
                <TouchableOpacity onPress={() => navigate(item.lat, item.lon)} style={styles.actionBtn}>
                  <Ionicons name="navigate" size={26} color={LIME} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => deleteEntry(item.id)} style={styles.actionBtn}>
                  <Ionicons name="trash-outline" size={24} color="#FF3B30" />
                </TouchableOpacity>
              </View>
            </View>
          )}
          ListEmptyComponent={<Text style={styles.empty}>NO_DATA_AVAILABLE</Text>}
        />
      </View>

      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>NAZWIJ LOKALIZACJĘ:</Text>
            <TextInput 
              style={styles.input}
              placeholder="np. SEKTOR C2"
              placeholderTextColor="#444"
              value={placeName}
              onChangeText={setPlaceName}
              autoFocus
              maxLength={20}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.modalBtnSec}>
                <Text style={styles.modalBtnTextSec}>ANULUJ</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={finalizeSave} style={styles.modalBtnPrim}>
                <Text style={styles.modalBtnTextPrim}>ZAPISZ</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    paddingTop: 60,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    marginBottom: 40,
  },
  title: {
    color: LIME,
    fontSize: 26,
    fontFamily: 'Inconsolata_700Bold',
    letterSpacing: -1,
  },
  mainAction: {
    alignItems: 'center',
    marginBottom: 50,
  },
  saveButton: {
    backgroundColor: LIME,
    width: 160,
    height: 160,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    transform: [{ rotate: '45deg' }],
  },
  saveLabel: {
    color: LIME,
    fontFamily: 'Inconsolata_400Regular',
    marginTop: 30,
    fontSize: 14,
  },
  listSection: {
    flex: 1,
    backgroundColor: '#050505',
    borderTopWidth: 1,
    borderTopColor: '#1A1A1A',
    padding: 25,
  },
  sectionLabel: {
    color: '#333',
    fontSize: 12,
    marginBottom: 20,
    fontFamily: 'Inconsolata_700Bold',
  },
  historyCard: {
    backgroundColor: '#0A0A0A',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 18,
    borderRadius: 5,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#111',
  },
  placeName: {
    color: '#FFF',
    fontSize: 18,
    fontFamily: 'Inconsolata_700Bold',
  },
  historyMeta: {
    color: '#555',
    fontSize: 12,
    fontFamily: 'Inconsolata_400Regular',
  },
  actionsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
  },
  actionBtn: {
    padding: 4,
  },
  empty: {
    color: '#222',
    textAlign: 'center',
    marginTop: 50,
    fontFamily: 'Inconsolata_400Regular',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '85%',
    backgroundColor: '#0A0A0A',
    padding: 30,
    borderWidth: 2,
    borderColor: LIME,
  },
  modalTitle: {
    color: LIME,
    fontFamily: 'Inconsolata_700Bold',
    fontSize: 18,
    marginBottom: 20,
  },
  input: {
    backgroundColor: '#000',
    color: LIME,
    fontFamily: 'Inconsolata_400Regular',
    fontSize: 20,
    padding: 15,
    borderWidth: 1,
    borderColor: '#222',
    marginBottom: 25,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 20,
  },
  modalBtnPrim: {
    backgroundColor: LIME,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  modalBtnTextPrim: {
    color: '#000',
    fontFamily: 'Inconsolata_700Bold',
  },
  modalBtnTextSec: {
    color: '#555',
    fontFamily: 'Inconsolata_400Regular',
    paddingVertical: 10,
  }
});
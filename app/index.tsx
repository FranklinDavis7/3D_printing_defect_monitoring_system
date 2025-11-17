import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Dimensions,
  Image,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import Config from './config'; // Make sure this path is correct

// --- NEW IMPORTS for Screenshot and Zoom ---
import * as MediaLibrary from 'expo-media-library';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import ViewShot from 'react-native-view-shot';


const API_BASE_URL = Config.API_BASE_URL;

// --- TypeScript Interfaces (no change) ---
interface Defect {
  type: string;
  subtype: string;
  area: number;
  position: [number, number];
  size: [number, number];
  confidence: string;
  frame: number;
}

interface AnalysisState {
  is_running: boolean;
  is_paused: boolean;
  current_frame: number;
  total_frames: number;
  defects: Defect[];
  defect_counter: {
    STRINGING: number;
    BLOB: number;
    LAYER_ISSUE: number;
    UNDER_EXTRUSION: number;
    OVER_EXTRUSION: number;
    WARPING: number;
  };
  console_output: string[];
  fps: number;
}

interface FrameData {
  image: string;
  frame: number;
  timestamp: number;
}

// --- Color Palette (no change) ---
const COLORS = {
  background: '#1C202A',
  card: '#2A2F3B',
  primary: '#00A8FF',
  secondary: '#00E0C7',
  text: '#EAEAEA',
  textSecondary: '#A0A0A0',
  success: '#2ECC71',
  warning: '#F1C40F',
  danger: '#E74C3C',
  black: '#000000',
  white: '#FFFFFF'
};

const DEFECT_COLORS: { [key: string]: string } = {
  STRINGING: '#FFA726', BLOB: '#EF5350', LAYER_ISSUE: '#5C6BC0',
  UNDER_EXTRUSION: '#66BB6A', OVER_EXTRUSION: '#FFEE58', WARPING: '#EC407A',
};

const getDefectColor = (type: string): string => DEFECT_COLORS[type] || COLORS.white;

export default function Index() {
  const [analysisState, setAnalysisState] = useState<AnalysisState>({
    is_running: false, is_paused: false, current_frame: 0, total_frames: 0, defects: [],
    defect_counter: { STRINGING: 0, BLOB: 0, LAYER_ISSUE: 0, UNDER_EXTRUSION: 0, OVER_EXTRUSION: 0, WARPING: 0, },
    console_output: [], fps: 0,
  });

  const [currentFrame, setCurrentFrame] = useState<FrameData | null>(null);
  const [frameKey, setFrameKey] = useState(0);
  const [connectionStatus, setConnectionStatus] = useState<'checking' | 'connected' | 'disconnected'>('checking');

  // --- NEW REFS AND STATE for Screenshot/Zoom ---
  const viewShotRef = useRef<ViewShot>(null);
  const [mediaLibraryPermission, requestMediaLibraryPermission] = MediaLibrary.usePermissions();

  // --- All original useEffect and API functions (no change) ---
  useEffect(() => { testConnection(); }, []);
  useEffect(() => {
    let frameInterval: NodeJS.Timeout;
    if (analysisState.is_running && connectionStatus === 'connected') {
      frameInterval = setInterval(fetchCurrentFrame, 100);
    }
    return () => clearInterval(frameInterval);
  }, [analysisState.is_running, connectionStatus]);
  useEffect(() => {
    let analysisInterval: NodeJS.Timeout;
    if (analysisState.is_running && connectionStatus === 'connected') {
      analysisInterval = setInterval(fetchAnalysisState, 1000);
    }
    return () => clearInterval(analysisInterval);
  }, [analysisState.is_running, connectionStatus]);

  const testConnection = async () => { /* ... no change ... */ setConnectionStatus('checking'); try { const response = await fetch(`${API_BASE_URL}/analysis-state`); if (response.ok) { setConnectionStatus('connected'); } else { setConnectionStatus('disconnected'); } } catch (error) { setConnectionStatus('disconnected'); }};
  const fetchAnalysisState = async () => { /* ... no change ... */ try { const response = await fetch(`${API_BASE_URL}/analysis-state`); const data = await response.json(); setAnalysisState(data); } catch (error) { console.error('Error fetching analysis state:', error); setConnectionStatus('disconnected'); }};
  const fetchCurrentFrame = async () => { /* ... no change ... */ try { const response = await fetch(`${API_BASE_URL}/current-frame`); const data: FrameData = await response.json(); setCurrentFrame(data); setFrameKey((prev) => prev + 1); } catch (error) { console.error('Error fetching frame:', error); }};
  const startAnalysis = async () => { /* ... no change ... */ if (connectionStatus !== 'connected') { Alert.alert('Connection Error', 'Cannot connect to server.'); return; } try { const response = await fetch(`${API_BASE_URL}/start-analysis`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ video_path: '/Users/fda10h04gmail.com/Desktop/3d_printing_2.mov' }), }); if (response.ok) { setTimeout(() => { fetchAnalysisState(); fetchCurrentFrame(); }, 1000); Alert.alert('Success', 'Analysis started!'); } else { Alert.alert('Error', 'Failed to start analysis'); } } catch (error) { Alert.alert('Connection Error', `Cannot connect to server at ${API_BASE_URL}`); setConnectionStatus('disconnected'); }};
  const pauseAnalysis = async () => { /* ... no change ... */ try { await fetch(`${API_BASE_URL}/pause-analysis`, { method: 'POST' }); setTimeout(fetchAnalysisState, 500); } catch (error) { Alert.alert('Error', 'Cannot connect to server'); }};
  const stopAnalysis = async () => { /* ... no change ... */ try { await fetch(`${API_BASE_URL}/stop-analysis`, { method: 'POST' }); setTimeout(fetchAnalysisState, 500); setCurrentFrame(null); } catch (error) { Alert.alert('Error', 'Cannot connect to server'); }};

  // --- NEW FUNCTION for Screenshot ---
  const handleScreenshot = async () => {
    if (!mediaLibraryPermission?.granted) {
      const permission = await requestMediaLibraryPermission();
      if (!permission.granted) {
        Alert.alert('Permission Required', 'Please grant permission to save photos to your library.');
        return;
      }
    }

    if (viewShotRef.current?.capture) {
      try {
        const uri = await viewShotRef.current.capture();
        await MediaLibrary.saveToLibraryAsync(uri);
        Alert.alert('Screenshot Saved!', 'The current frame has been saved to your photo library.');
      } catch (e) {
        console.error(e);
        Alert.alert('Error', 'Failed to save screenshot.');
      }
    }
  };

  // --- NEW GESTURE HANDLER setup for Zoom ---
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);

  const pinchGesture = Gesture.Pinch()
    .onUpdate((e) => {
      scale.value = savedScale.value * e.scale;
    })
    .onEnd(() => {
      savedScale.value = scale.value;
    });

  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .onStart(() => {
      if (scale.value !== 1) {
        scale.value = withTiming(1);
        savedScale.value = 1;
      }
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const composedGestures = Gesture.Simultaneous(pinchGesture, doubleTap);

  const progress = analysisState.total_frames > 0 ? (analysisState.current_frame / analysisState.total_frames) * 100 : 0;
  const getConnectionStatusText = () => { /* ... no change ... */ switch (connectionStatus) { case 'connected': return 'CONNECTED'; case 'disconnected': return 'DISCONNECTED'; case 'checking': return 'CHECKING...'; default: return 'UNKNOWN'; }};
  const isWeb = Platform.OS === 'web';
  const { width } = Dimensions.get('window');
  const isLargeScreen = width > 768;

  // The entire component must be wrapped in GestureHandlerRootView
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView style={styles.container}>
        {/* Header Section */}
        <View style={styles.header}>{/* ... no change ... */}<Text style={styles.title}>REAL PRINT DEFECT ANALYSIS</Text><Text style={styles.subtitle}>PYTHON BACKEND + REACT NATIVE</Text><View style={[styles.connectionPill, {backgroundColor: connectionStatus === 'connected' ? COLORS.success : connectionStatus === 'disconnected' ? COLORS.danger : COLORS.warning}]}><Text style={styles.connectionStatus}>{getConnectionStatusText()}</Text></View>{connectionStatus === 'disconnected' && (<TouchableOpacity style={styles.retryButton} onPress={testConnection}><Text style={styles.retryButtonText}>🔄 Retry Connection</Text></TouchableOpacity>)}</View>

        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={isWeb && isLargeScreen ? styles.mainContentWeb : styles.mainContentMobile}>
            
            {/* --- Main Column (Video + Controls) --- */}
            <View style={isWeb && isLargeScreen ? styles.leftColumn : styles.fullWidth}>
                <View style={styles.card}>
                    <Text style={styles.sectionTitle}>LIVE ANALYSIS STREAM</Text>
                    {/* --- GESTURE AND SCREENSHOT WRAPPERS ADDED --- */}
                    <GestureDetector gesture={composedGestures}>
                      <ViewShot ref={viewShotRef} options={{ fileName: "defect-analysis-capture", format: "jpg", quality: 0.9 }}>
                        <Animated.View style={[styles.videoContainer, animatedStyle]}>
                            {connectionStatus === 'connected' && currentFrame ? (
                                <Image
                                    key={frameKey}
                                    source={{ uri: currentFrame.image }}
                                    style={styles.videoImage}
                                    resizeMode="contain"
                                />
                            ) : (
                                <View style={styles.placeholderContainer}>
                                    <Text style={styles.placeholderText}>
                                        {connectionStatus === 'connected' ? 'Ready for Analysis' : 'Server Disconnected'}
                                    </Text>
                                </View>
                            )}
                        </Animated.View>
                      </ViewShot>
                    </GestureDetector>
                     <View style={styles.videoOverlay}>
                        <Text style={styles.videoStatus}>{analysisState.is_running ? `Frame: ${analysisState.current_frame}/${analysisState.total_frames}`: ''}</Text>
                        {analysisState.is_running && <Text style={styles.videoStatus}>{analysisState.is_paused ? '⏸️ PAUSED' : '🔴 ANALYZING'}</Text>}
                     </View>
                </View>

                <View style={[styles.card, {marginTop: 20}]}>
                    <Text style={styles.sectionTitle}>CONTROLS</Text>
                    {/* --- UPDATED CONTROLS SECTION --- */}
                    <View style={styles.controlButtons}>
                      {!analysisState.is_running ? (
                          <TouchableOpacity style={[styles.controlButton, {backgroundColor: COLORS.primary}, connectionStatus !== 'connected' && styles.disabledButton]} onPress={startAnalysis} disabled={connectionStatus !== 'connected'}>
                            <Text style={styles.controlButtonText}>▶️ Start Analysis</Text>
                          </TouchableOpacity>
                      ) : (
                          <>
                            <TouchableOpacity style={[styles.controlButton, {backgroundColor: COLORS.warning, flex: 0.48}]} onPress={pauseAnalysis}>
                              <Text style={styles.controlButtonText}>{analysisState.is_paused ? '▶️ Resume' : '⏸️ Pause'}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.controlButton, {backgroundColor: COLORS.danger, flex: 0.48}]} onPress={stopAnalysis}>
                              <Text style={styles.controlButtonText}>⏹️ Stop</Text>
                            </TouchableOpacity>
                          </>
                      )}
                    </View>
                    {/* --- NEW SCREENSHOT BUTTON --- */}
                    {analysisState.is_running && (
                      <TouchableOpacity style={[styles.controlButton, {backgroundColor: COLORS.secondary, marginTop: 10, width: '100%'}]} onPress={handleScreenshot}>
                        <Text style={styles.controlButtonText}>📸 Take Screenshot</Text>
                      </TouchableOpacity>
                    )}
                </View>
            </View>

            {/* --- Side Column (Data) --- */}
            <View style={isWeb && isLargeScreen ? styles.rightColumn : styles.fullWidth}>
                <View style={styles.card}>{/* ... no change ... */}<Text style={styles.sectionTitle}>ANALYSIS STATUS</Text><View style={styles.infoRow}><Text style={styles.infoText}>Frame:</Text><Text style={styles.infoValue}>{analysisState.current_frame}/{analysisState.total_frames}</Text></View><View style={styles.infoRow}><Text style={styles.infoText}>Progress:</Text><Text style={styles.infoValue}>{progress.toFixed(1)}%</Text></View><View style={styles.infoRow}><Text style={styles.infoText}>FPS:</Text><Text style={styles.infoValue}>{analysisState.fps.toFixed(1)}</Text></View><View style={styles.infoRow}><Text style={styles.infoText}>Defects:</Text><Text style={styles.infoValue}>{analysisState.defects.length}</Text></View></View>
                <View style={[styles.card, {marginTop: 20}]}>{/* ... no change ... */}<Text style={styles.sectionTitle}>DEFECT COUNTERS</Text><View style={styles.counterGrid}>{Object.entries(analysisState.defect_counter).map(([key, value]) => (<View key={key} style={styles.counterItem}><View style={[styles.defectColorIndicator, {backgroundColor: getDefectColor(key)}]}/><Text style={styles.counterLabel}>{key.replace('_', ' ')}</Text><Text style={styles.counterValue}>{value}</Text></View>))}</View></View>
                <View style={[styles.card, {marginTop: 20}]}>{/* ... no change ... */}<Text style={styles.sectionTitle}>CURRENT DEFECTS ({analysisState.defects.length})</Text><ScrollView style={styles.defectsList}>{analysisState.defects.length > 0 ? (analysisState.defects.map((defect, index) => (<View key={index} style={styles.defectItem}><Text style={[styles.defectType, { color: getDefectColor(defect.type) }]}>{defect.type}: {defect.subtype}</Text><Text style={styles.defectInfo}>Area: {defect.area.toFixed(0)}px | Confidence: {defect.confidence}</Text></View>))) : (<Text style={styles.noDefectsText}>No defects in current frame</Text>)}</ScrollView></View>
                <View style={[styles.card, {marginTop: 20}]}>{/* ... no change ... */}<Text style={styles.sectionTitle}>CONSOLE OUTPUT</Text><ScrollView style={styles.consoleOutput}>{analysisState.console_output.map((line, index) => (<Text key={index} style={styles.consoleLine}>{`> ${line}`}</Text>))}</ScrollView></View>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </GestureHandlerRootView>
  );
}

// --- Stylesheet (mostly unchanged, minor tweaks for new buttons) ---
const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background, },
    scrollContent: { padding: 20, },
    header: { alignItems: 'center', paddingVertical: 15, paddingHorizontal: 20, backgroundColor: COLORS.card, borderBottomWidth: 1, borderBottomColor: '#444' },
    title: { fontSize: 22, fontWeight: 'bold', color: COLORS.primary, textAlign: 'center', },
    subtitle: { fontSize: 14, color: COLORS.secondary, marginTop: 4, textAlign: 'center', },
    connectionPill: { paddingVertical: 5, paddingHorizontal: 15, borderRadius: 15, marginTop: 12, },
    connectionStatus: { fontSize: 12, fontWeight: 'bold', color: COLORS.white, },
    retryButton: { backgroundColor: '#444', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 6, marginTop: 10, },
    retryButtonText: { color: COLORS.white, fontSize: 12, fontWeight: 'bold', },
    mainContentWeb: { flexDirection: 'row', },
    mainContentMobile: { flexDirection: 'column', },
    leftColumn: { flex: 2, marginRight: 20, },
    rightColumn: { flex: 1, },
    fullWidth: { width: '100%', marginBottom: 20, },
    card: { backgroundColor: COLORS.card, borderRadius: 12, padding: 15, },
    sectionTitle: { color: COLORS.secondary, fontSize: 16, fontWeight: 'bold', marginBottom: 15, },
    videoContainer: { backgroundColor: COLORS.black, borderRadius: 8, overflow: 'hidden', aspectRatio: 16 / 9, justifyContent: 'center', alignItems: 'center', },
    videoImage: { width: '100%', height: '100%', },
    placeholderContainer: { justifyContent: 'center', alignItems: 'center', },
    placeholderText: { color: COLORS.textSecondary, fontSize: 16, },
    videoOverlay: { position: 'absolute', bottom: 0, left: 15, right: 15, backgroundColor: 'rgba(0, 0, 0, 0.6)', padding: 8, borderRadius: 4, flexDirection: 'row', justifyContent: 'space-between', borderTopLeftRadius: 0, borderTopRightRadius: 0, },
    videoStatus: { color: COLORS.white, fontSize: 12, fontWeight: '600', },
    controlButtons: { flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap' },
    controlButton: { paddingVertical: 12, paddingHorizontal: 20, borderRadius: 8, alignItems: 'center', flex: 1, },
    controlButtonText: { color: COLORS.white, fontSize: 16, fontWeight: 'bold', },
    disabledButton: { backgroundColor: '#555', opacity: 0.6, },
    infoRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10, alignItems: 'center', },
    infoText: { color: COLORS.textSecondary, fontSize: 14, },
    infoValue: { color: COLORS.text, fontSize: 14, fontWeight: '600', },
    counterGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', },
    counterItem: { width: '100%', backgroundColor: '#3B4150', padding: 10, borderRadius: 6, marginBottom: 8, flexDirection: 'row', alignItems: 'center', },
    defectColorIndicator: { width: 4, height: '100%', borderRadius: 2, marginRight: 10, },
    counterLabel: { color: COLORS.text, fontSize: 14, flex: 1, textTransform: 'capitalize' },
    counterValue: { color: COLORS.text, fontSize: 20, fontWeight: 'bold', },
    defectsList: { maxHeight: 150, },
    defectItem: { backgroundColor: '#3B4150', padding: 8, borderRadius: 6, marginBottom: 6, },
    defectType: { fontSize: 14, fontWeight: 'bold', marginBottom: 2, },
    defectInfo: { color: COLORS.textSecondary, fontSize: 12, },
    noDefectsText: { color: COLORS.textSecondary, textAlign: 'center', padding: 20, },
    consoleOutput: { backgroundColor: COLORS.black, borderRadius: 6, padding: 10, maxHeight: 150, },
    consoleLine: { color: COLORS.success, fontSize: 12, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', },
});
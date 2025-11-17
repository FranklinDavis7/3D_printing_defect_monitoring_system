import React, { useEffect, useState } from 'react';
import { Alert, Dimensions, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { WebView } from 'react-native-webview';

const API_BASE_URL = 'http://localhost:5000/api';
const VIDEO_STREAM_URL = 'http://localhost:5000/video_feed';

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

export default function Index() {
  const [analysisState, setAnalysisState] = useState<AnalysisState>({
    is_running: false,
    is_paused: false,
    current_frame: 0,
    total_frames: 0,
    defects: [],
    defect_counter: {
      STRINGING: 0,
      BLOB: 0,
      LAYER_ISSUE: 0,
      UNDER_EXTRUSION: 0,
      OVER_EXTRUSION: 0,
      WARPING: 0
    },
    console_output: [],
    fps: 0
  });

  // Test connection on component mount
  useEffect(() => {
    testConnection();
  }, []);

  const testConnection = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/analysis-state`);
      if (response.ok) {
        console.log('✅ Connected to Python server successfully');
      }
    } catch (error) {
      console.log('❌ Cannot connect to Python server');
      Alert.alert(
        'Connection Error',
        `Cannot connect to server at ${API_BASE_URL}\n\nMake sure:\n1. Python server is running\n2. Correct IP address\n3. Same network for devices`,
        [{ text: 'OK' }]
      );
    }
  };

  // Poll for updates
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (analysisState.is_running) {
      interval = setInterval(fetchAnalysisState, 1000);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [analysisState.is_running]);

  const fetchAnalysisState = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/analysis-state`);
      const data = await response.json();
      setAnalysisState(data);
    } catch (error) {
      console.error('Error fetching analysis state:', error);
    }
  };

  const startAnalysis = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/start-analysis`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          video_path: '/Users/fda10h04gmail.com/Desktop/3d_printing_2.mov'
        })
      });
      
      if (response.ok) {
        setTimeout(fetchAnalysisState, 1000);
        Alert.alert('Success', 'Analysis started successfully!');
      } else {
        Alert.alert('Error', 'Failed to start analysis');
      }
    } catch (error) {
      Alert.alert('Connection Error', `Cannot connect to server at ${API_BASE_URL}`);
    }
  };

  const pauseAnalysis = async () => {
    try {
      await fetch(`${API_BASE_URL}/pause-analysis`, {
        method: 'POST'
      });
      setTimeout(fetchAnalysisState, 500);
    } catch (error) {
      Alert.alert('Error', 'Cannot connect to server');
    }
  };

  const singleStep = async () => {
    try {
      await fetch(`${API_BASE_URL}/single-step`, {
        method: 'POST'
      });
      setTimeout(fetchAnalysisState, 500);
    } catch (error) {
      Alert.alert('Error', 'Cannot connect to server');
    }
  };

  const stopAnalysis = async () => {
    try {
      await fetch(`${API_BASE_URL}/stop-analysis`, {
        method: 'POST'
      });
      setTimeout(fetchAnalysisState, 500);
    } catch (error) {
      Alert.alert('Error', 'Cannot connect to server');
    }
  };

  const resetCounters = async () => {
    try {
      await fetch(`${API_BASE_URL}/reset-counters`, {
        method: 'POST'
      });
      setTimeout(fetchAnalysisState, 500);
    } catch (error) {
      Alert.alert('Error', 'Cannot connect to server');
    }
  };

  const showDefectDetails = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/defect-details`);
      if (response.ok) {
        setTimeout(fetchAnalysisState, 500);
      }
    } catch (error) {
      Alert.alert('Error', 'Cannot fetch defect details');
    }
  };

  const progress = analysisState.total_frames > 0 
    ? (analysisState.current_frame / analysisState.total_frames) * 100 
    : 0;

  // HTML for the video stream with custom styling
  const videoHTML = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body {
          margin: 0;
          padding: 0;
          background: #000;
          display: flex;
          justify-content: center;
          align-items: center;
          height: 100vh;
          font-family: Arial, sans-serif;
        }
        .video-container {
          text-align: center;
          color: white;
        }
        .status {
          margin-bottom: 10px;
          font-size: 14px;
          color: #00ff00;
        }
        img {
          max-width: 100%;
          max-height: 100%;
          border: 2px solid #333;
          border-radius: 8px;
        }
        .waiting {
          color: #ffa500;
          font-size: 16px;
          padding: 20px;
        }
      </style>
    </head>
    <body>
      <div class="video-container">
        <div class="status" id="status">Live Video Stream</div>
        <img src="${VIDEO_STREAM_URL}" onerror="document.getElementById('status').innerHTML='Waiting for video stream...'">
      </div>
      <script>
        // Auto-refresh the image every 2 seconds to handle any stream issues
        setInterval(function() {
          var img = document.querySelector('img');
          var src = img.src;
          img.src = '';
          img.src = src;
        }, 2000);
      </script>
    </body>
    </html>
  `;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>🎥 REAL PRINT DEFECT ANALYSIS</Text>
        <Text style={styles.subtitle}>PYTHON BACKEND + REACT NATIVE</Text>
        <Text style={styles.serverInfo}>Server: {API_BASE_URL}</Text>
      </View>

      <View style={styles.mainContent}>
        {/* Left Column - Video Stream */}
        <View style={styles.leftColumn}>
          <View style={styles.videoSection}>
            <Text style={styles.sectionTitle}>LIVE ANALYSIS STREAM</Text>
            <View style={styles.videoContainer}>
              <WebView
                source={{ html: videoHTML }}
                style={styles.webview}
                javaScriptEnabled={true}
                domStorageEnabled={true}
                startInLoadingState={true}
                scalesPageToFit={true}
                mixedContentMode="compatibility"
              />
              <View style={styles.videoOverlay}>
                <Text style={styles.videoStatus}>
                  {analysisState.is_running 
                    ? `Frame: ${analysisState.current_frame}/${analysisState.total_frames}`
                    : 'Start analysis to see video stream'
                  }
                </Text>
              </View>
            </View>
          </View>

          {/* Controls */}
          <View style={styles.controls}>
            <Text style={styles.sectionTitle}>CONTROLS</Text>
            <View style={styles.controlButtons}>
              {!analysisState.is_running ? (
                <TouchableOpacity style={styles.controlButton} onPress={startAnalysis}>
                  <Text style={styles.controlButtonText}>🎬 Start Analysis</Text>
                </TouchableOpacity>
              ) : (
                <>
                  <TouchableOpacity style={styles.controlButton} onPress={pauseAnalysis}>
                    <Text style={styles.controlButtonText}>
                      {analysisState.is_paused ? '▶️ Resume' : '⏸️ Pause'}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.controlButton} onPress={singleStep} disabled={!analysisState.is_paused}>
                    <Text style={[styles.controlButtonText, !analysisState.is_paused && styles.disabledButton]}>
                      ⏭️ Single Step
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.controlButton} onPress={showDefectDetails}>
                    <Text style={styles.controlButtonText}>📊 Show Details</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.controlButton} onPress={resetCounters}>
                    <Text style={styles.controlButtonText}>🔄 Reset</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.controlButton, styles.stopButton]} onPress={stopAnalysis}>
                    <Text style={styles.controlButtonText}>⏹️ Stop</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>
        </View>

        {/* Right Column - Analysis Data */}
        <View style={styles.rightColumn}>
          {/* Analysis Info Panel */}
          <View style={styles.infoPanel}>
            <Text style={styles.sectionTitle}>ANALYSIS STATUS</Text>
            <View style={styles.infoRow}>
              <Text style={styles.infoText}>
                Frame: {analysisState.current_frame}/{analysisState.total_frames}
              </Text>
              <Text style={styles.infoText}>Progress: {progress.toFixed(1)}%</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoText}>FPS: {analysisState.fps.toFixed(1)}</Text>
              <Text style={styles.infoText}>Defects: {analysisState.defects.length}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoText}>
                Status: {analysisState.is_running ? (analysisState.is_paused ? '⏸️ PAUSED' : '🔴 ANALYZING') : '🟢 READY'}
              </Text>
            </View>
          </View>

          {/* Defect Counters */}
          <View style={styles.defectCounters}>
            <Text style={styles.sectionTitle}>DEFECT COUNTERS</Text>
            <View style={styles.counterGrid}>
              <View style={[styles.counterItem, { borderLeftColor: '#FFA500' }]}>
                <Text style={styles.counterLabel}>Stringing</Text>
                <Text style={styles.counterValue}>{analysisState.defect_counter.STRINGING}</Text>
              </View>
              <View style={[styles.counterItem, { borderLeftColor: '#FF0000' }]}>
                <Text style={styles.counterLabel}>Blobs</Text>
                <Text style={styles.counterValue}>{analysisState.defect_counter.BLOB}</Text>
              </View>
              <View style={[styles.counterItem, { borderLeftColor: '#0000FF' }]}>
                <Text style={styles.counterLabel}>Layer Issues</Text>
                <Text style={styles.counterValue}>{analysisState.defect_counter.LAYER_ISSUE}</Text>
              </View>
              <View style={[styles.counterItem, { borderLeftColor: '#00FF00' }]}>
                <Text style={styles.counterLabel}>Under-extrusion</Text>
                <Text style={styles.counterValue}>{analysisState.defect_counter.UNDER_EXTRUSION}</Text>
              </View>
              <View style={[styles.counterItem, { borderLeftColor: '#FFFF00' }]}>
                <Text style={styles.counterLabel}>Over-extrusion</Text>
                <Text style={styles.counterValue}>{analysisState.defect_counter.OVER_EXTRUSION}</Text>
              </View>
              <View style={[styles.counterItem, { borderLeftColor: '#FF00FF' }]}>
                <Text style={styles.counterLabel}>Warping</Text>
                <Text style={styles.counterValue}>{analysisState.defect_counter.WARPING}</Text>
              </View>
            </View>
          </View>

          {/* Current Defects */}
          <View style={styles.currentDefects}>
            <Text style={styles.sectionTitle}>
              CURRENT DEFECTS ({analysisState.defects.length})
            </Text>
            <ScrollView style={styles.defectsList}>
              {analysisState.defects.length > 0 ? (
                analysisState.defects.map((defect, index) => (
                  <View key={index} style={styles.defectItem}>
                    <Text style={[styles.defectType, { color: getDefectColor(defect.type) }]}>
                      {defect.type}: {defect.subtype}
                    </Text>
                    <Text style={styles.defectInfo}>
                      Area: {defect.area.toFixed(0)}px | Confidence: {defect.confidence}
                    </Text>
                    <Text style={styles.defectInfo}>
                      Position: ({defect.position[0]}, {defect.position[1]})
                    </Text>
                  </View>
                ))
              ) : (
                <Text style={styles.noDefectsText}>No defects detected in current frame</Text>
              )}
            </ScrollView>
          </View>

          {/* Console Output */}
          <View style={styles.consoleSection}>
            <Text style={styles.sectionTitle}>CONSOLE OUTPUT</Text>
            <ScrollView style={styles.consoleOutput}>
              {analysisState.console_output.map((line, index) => (
                <Text key={index} style={styles.consoleLine}>{line}</Text>
              ))}
            </ScrollView>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const getDefectColor = (type: string): string => {
  const colors: { [key: string]: string } = {
    STRINGING: '#FFA500',
    BLOB: '#FF0000',
    LAYER_ISSUE: '#0000FF',
    UNDER_EXTRUSION: '#00FF00',
    OVER_EXTRUSION: '#FFFF00',
    WARPING: '#FF00FF'
  };
  return colors[type] || '#FFFFFF';
};

const { width, height } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  header: {
    alignItems: 'center',
    paddingVertical: 10,
    backgroundColor: '#2a2a2a',
    borderBottomWidth: 1,
    borderBottomColor: '#444',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#00ffff',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#ffff00',
    textAlign: 'center',
    marginTop: 2,
  },
  serverInfo: {
    fontSize: 12,
    color: '#888',
    textAlign: 'center',
    marginTop: 4,
  },
  mainContent: {
    flex: 1,
    flexDirection: 'row',
    padding: 10,
  },
  leftColumn: {
    flex: 1,
    marginRight: 10,
  },
  rightColumn: {
    flex: 1,
    marginLeft: 10,
  },
  videoSection: {
    flex: 2,
    marginBottom: 10,
  },
  videoContainer: {
    flex: 1,
    backgroundColor: '#000',
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
  },
  webview: {
    flex: 1,
    backgroundColor: '#000',
  },
  videoOverlay: {
    position: 'absolute',
    top: 10,
    left: 10,
    right: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: 8,
    borderRadius: 4,
  },
  videoStatus: {
    color: '#00ff00',
    fontSize: 12,
    fontFamily: 'monospace',
    textAlign: 'center',
  },
  controls: {
    backgroundColor: '#2a2a2a',
    padding: 12,
    borderRadius: 8,
    marginTop: 10,
  },
  controlButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  controlButton: {
    backgroundColor: '#444',
    padding: 12,
    borderRadius: 6,
    marginBottom: 8,
    minWidth: '48%',
    alignItems: 'center',
  },
  controlButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    fontFamily: 'monospace',
  },
  stopButton: {
    backgroundColor: '#ff4444',
  },
  disabledButton: {
    opacity: 0.5,
  },
  infoPanel: {
    backgroundColor: '#2a2a2a',
    padding: 12,
    borderRadius: 8,
    marginBottom: 10,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  infoText: {
    color: '#ffffff',
    fontSize: 14,
    fontFamily: 'monospace',
  },
  sectionTitle: {
    color: '#ffff00',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
    fontFamily: 'monospace',
  },
  defectCounters: {
    backgroundColor: '#2a2a2a',
    padding: 12,
    borderRadius: 8,
    marginBottom: 10,
  },
  counterGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  counterItem: {
    width: '48%',
    backgroundColor: '#333',
    padding: 8,
    borderRadius: 6,
    marginBottom: 8,
    borderLeftWidth: 4,
  },
  counterLabel: {
    color: '#ccc',
    fontSize: 12,
    fontFamily: 'monospace',
  },
  counterValue: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    fontFamily: 'monospace',
    marginTop: 4,
  },
  currentDefects: {
    backgroundColor: '#2a2a2a',
    padding: 12,
    borderRadius: 8,
    marginBottom: 10,
    flex: 1,
  },
  defectsList: {
    flex: 1,
  },
  defectItem: {
    backgroundColor: '#333',
    padding: 8,
    borderRadius: 6,
    marginBottom: 6,
  },
  defectType: {
    fontSize: 14,
    fontWeight: 'bold',
    fontFamily: 'monospace',
    marginBottom: 2,
  },
  defectInfo: {
    color: '#ccc',
    fontSize: 12,
    fontFamily: 'monospace',
  },
  noDefectsText: {
    color: '#888',
    fontSize: 14,
    fontFamily: 'monospace',
    textAlign: 'center',
    padding: 20,
  },
  consoleSection: {
    backgroundColor: '#2a2a2a',
    padding: 12,
    borderRadius: 8,
    flex: 2,
  },
  consoleOutput: {
    flex: 1,
    backgroundColor: '#000',
    padding: 8,
    borderRadius: 6,
  },
  consoleLine: {
    color: '#00ff00',
    fontSize: 12,
    fontFamily: 'monospace',
    lineHeight: 16,
  },
});
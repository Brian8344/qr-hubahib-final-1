
import { useRef, useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';

import AppButton from '@/components/AppButton';
import Header from '@/components/Header';
import { COLORS } from '@/constants/colors';
import { registerAttendance } from '@/lib/attendance';
import { useAuth } from '@/lib/auth';

type ScanResult = {
  success: boolean;
  message: string;
};

export default function ScanScreen() {
  const { user } = useAuth();
  const [permission, requestPermission] = useCameraPermissions();

  const [scanned, setScanned] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);

  const processingRef = useRef(false);

  async function handleBarCodeScanned({
    data,
  }: {
    data: string;
  }) {
    if (processingRef.current || scanned) return;

    processingRef.current = true;
    setScanned(true);
    setProcessing(true);
    setResult(null);

    try {
      if (!user) {
        setResult({
          success: false,
          message: 'Please sign in before recording attendance.',
        });
        return;
      }

      const attendance = await registerAttendance(data, user.id);

      setResult({
        success: attendance.success,
        message: attendance.eventTitle
          ? `${attendance.message} Event: ${attendance.eventTitle}`
          : attendance.message,
      });
    } catch (error: unknown) {
      console.error('QR attendance scan failed:', error);

      setResult({
        success: false,
        message:
          'Unable to process this scan. Check your internet connection and try again.',
      });
    } finally {
      setProcessing(false);
      processingRef.current = false;
    }
  }

  function resetScanner() {
    processingRef.current = false;
    setScanned(false);
    setProcessing(false);
    setResult(null);
  }

  if (!permission) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.message}>Checking camera permission...</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Header title="Scan QR Code" />

        <View style={styles.centered}>
          <Text style={styles.message}>
            Camera permission is required to scan an event QR code.
          </Text>

          <AppButton
            theme="primary"
            title="Grant Camera Permission"
            onPress={() => void requestPermission()}
          />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Header title="Scan QR Code" />

      <Text style={styles.subtitle}>
        Scan the QR code provided for an available school event.
      </Text>

      <View style={styles.cameraContainer}>
        {!scanned && (
          <CameraView
            style={StyleSheet.absoluteFillObject}
            onBarcodeScanned={handleBarCodeScanned}
            barcodeScannerSettings={{
              barcodeTypes: ['qr'],
            }}
          />
        )}

        {scanned && (
          <View style={styles.cameraPaused}>
            <Text style={styles.message}>
              Scan paused
            </Text>
          </View>
        )}
      </View>

      {processing && (
        <View style={styles.feedback}>
          <ActivityIndicator color={COLORS.primary} size="large" />
          <Text style={styles.message}>
            Validating event and recording attendance...
          </Text>
        </View>
      )}

      {result && !processing && (
        <View
          style={[
            styles.feedback,
            result.success ? styles.successCard : styles.errorCard,
          ]}
          accessibilityRole="summary"
        >
          <Text
            style={[
              styles.resultTitle,
              result.success ? styles.successText : styles.errorText,
            ]}
          >
            {result.success ? 'Attendance Successful' : 'Scan Unsuccessful'}
          </Text>

          <Text style={styles.message}>
            {result.message}
          </Text>
        </View>
      )}

      {scanned && !processing && (
        <View style={styles.buttonContainer}>
          <AppButton
            theme="primary"
            title="Scan Again"
            onPress={resetScanner}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    backgroundColor: COLORS.background,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  subtitle: {
    marginTop: 8,
    color: COLORS.textSecondary,
    fontSize: 14,
    lineHeight: 21,
  },
  cameraContainer: {
    height: 300,
    borderRadius: 16,
    overflow: 'hidden',
    marginTop: 20,
    backgroundColor: '#111827',
  },
  cameraPaused: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  feedback: {
    padding: 16,
    borderRadius: 14,
    marginTop: 20,
    gap: 10,
    alignItems: 'center',
  },
  successCard: {
    backgroundColor: '#DCFCE7',
  },
  errorCard: {
    backgroundColor: '#FEE2E2',
  },
  resultTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  successText: {
    color: '#166534',
  },
  errorText: {
    color: '#991B1B',
  },
  message: {
    fontSize: 14,
    lineHeight: 21,
    color: COLORS.textPrimary,
    textAlign: 'center',
  },
  buttonContainer: {
    marginTop: 20,
  },
});

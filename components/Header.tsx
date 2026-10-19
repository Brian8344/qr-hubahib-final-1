
import { MaterialIcons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { COLORS } from '@/constants/colors';

type Props = {
  title: string;
  subtitle?: string;
};

export default function Header({ title, subtitle }: Props) {
  return (
    <View style={styles.container}>
      <View style={styles.logoBox}>
        <MaterialIcons
          name="qr-code-scanner"
          size={34}
          color={COLORS.accent}
        />
        <View style={styles.statusDot} />
      </View>

      <View style={styles.textContainer}>
        <Text style={styles.eyebrow}></Text>

        <Text style={styles.title}>{title}</Text>

        {subtitle ? (
          <Text style={styles.subtitle}>{subtitle}</Text>
        ) : null}

        <View style={styles.accentLine} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 20,
    gap: 16,
  },
  logoBox: {
    width: 66,
    height: 66,
    borderRadius: 18,
    backgroundColor: COLORS.darkBackground,
    borderWidth: 1,
    borderColor: COLORS.darkBorder,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  statusDot: {
    position: 'absolute',
    top: 9,
    right: 9,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.accent,
  },
  textContainer: {
    flex: 1,
  },
  eyebrow: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.8,
    color: COLORS.accentDark,
    marginBottom: 5,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.6,
    color: COLORS.textPrimary,
  },
  subtitle: {
    marginTop: 5,
    fontSize: 13,
    lineHeight: 19,
    color: COLORS.textSecondary,
  },
  accentLine: {
    width: 38,
    height: 3,
    borderRadius: 2,
    backgroundColor: COLORS.accent,
    marginTop: 9,
  },
});

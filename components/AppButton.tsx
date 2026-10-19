
import Ionicons from '@expo/vector-icons/Ionicons';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { COLORS } from '@/constants/colors';

type Props = {
  title: string;
  icon?: keyof typeof Ionicons.glyphMap;
  theme?: 'primary';
  disabled?: boolean;
  loading?: boolean;
  onPress: () => void;
};

export default function AppButton({
  title,
  icon,
  theme,
  disabled = false,
  loading = false,
  onPress,
}: Props) {
  const isPrimary = theme === 'primary';
  const isDisabled = disabled || loading;

  const iconColor = isPrimary
    ? COLORS.textOnPrimary
    : COLORS.primary;

  return (
    <View style={styles.buttonOuter}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{
          disabled: isDisabled,
          busy: loading,
        }}
        disabled={isDisabled}
        onPress={onPress}
        style={({ pressed }) => [
          styles.buttonInner,
          isPrimary
            ? styles.primaryInner
            : styles.secondaryInner,
          pressed && !isDisabled && styles.pressed,
          isDisabled && styles.disabled,
        ]}
      >
        {loading ? (
          <ActivityIndicator
            size="small"
            color={iconColor}
          />
        ) : (
          <>
            {icon ? (
              <Ionicons
                name={icon}
                size={20}
                color={iconColor}
                style={styles.icon}
              />
            ) : null}

            <Text
              style={[
                styles.label,
                isPrimary
                  ? styles.primaryLabel
                  : styles.secondaryLabel,
              ]}
            >
              {title}
            </Text>

            {isPrimary ? (
              <Ionicons
                name="chevron-forward"
                size={17}
                color={COLORS.textOnPrimary}
                style={styles.endIcon}
              />
            ) : null}
          </>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  buttonOuter: {
    width: '100%',
    marginBottom: 12,
  },

  buttonInner: {
    minHeight: 52,
    borderRadius: 13,
    paddingVertical: 14,
    paddingHorizontal: 18,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    borderWidth: 1,
    gap: 8,
  },

  primaryInner: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
    shadowColor: COLORS.primary,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.16,
    shadowRadius: 7,
    elevation: 3,
  },

  secondaryInner: {
    backgroundColor: COLORS.card,
    borderColor: COLORS.border,
  },

  pressed: {
    opacity: 0.84,
    transform: [{ scale: 0.99 }],
  },

  disabled: {
    opacity: 0.5,
    shadowOpacity: 0,
    elevation: 0,
  },

  icon: {
    marginRight: 2,
  },

  label: {
    fontSize: 15,
    letterSpacing: 0.2,
    flexShrink: 1,
    textAlign: 'center',
  },

  primaryLabel: {
    color: COLORS.textOnPrimary,
    fontWeight: '700',
  },

  secondaryLabel: {
    color: COLORS.textPrimary,
    fontWeight: '600',
  },

  endIcon: {
    marginLeft: 'auto',
  },
});

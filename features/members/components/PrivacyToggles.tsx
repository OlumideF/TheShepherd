import { Pressable, StyleSheet, Switch, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { colors, radii, spacing } from '@/constants/theme';

type PrivacyState = {
  directoryVisible: boolean;
  showEmail: boolean;
  showPhone: boolean;
  showPhoto: boolean;
};

type PrivacyTogglesProps = PrivacyState & {
  onChange: (next: PrivacyState) => void;
};

export function PrivacyToggles({
  directoryVisible,
  showEmail,
  showPhone,
  showPhoto,
  onChange,
}: PrivacyTogglesProps) {
  function patch(partial: Partial<PrivacyState>) {
    onChange({
      directoryVisible: partial.directoryVisible ?? directoryVisible,
      showEmail: partial.showEmail ?? showEmail,
      showPhone: partial.showPhone ?? showPhone,
      showPhoto: partial.showPhoto ?? showPhoto,
    });
  }

  return (
    <View style={styles.wrap}>
      <ToggleRow
        label="Show me in the directory"
        description="Other members can find you when searching."
        value={directoryVisible}
        onValueChange={(value) => patch({ directoryVisible: value })}
      />
      {directoryVisible ? (
        <>
          <ToggleRow
            label="Show email"
            value={showEmail}
            onValueChange={(value) => patch({ showEmail: value })}
          />
          <ToggleRow
            label="Show phone"
            value={showPhone}
            onValueChange={(value) => patch({ showPhone: value })}
          />
          <ToggleRow
            label="Show photo"
            value={showPhoto}
            onValueChange={(value) => patch({ showPhoto: value })}
          />
        </>
      ) : null}
    </View>
  );
}

function ToggleRow({
  label,
  description,
  value,
  onValueChange,
}: {
  label: string;
  description?: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
}) {
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
      accessibilityLabel={label}
      onPress={() => onValueChange(!value)}
      style={styles.row}
    >
      <View style={styles.rowText}>
        <AppText variant="bodyStrong">{label}</AppText>
        {description ? (
          <AppText variant="caption" muted>
            {description}
          </AppText>
        ) : null}
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: colors.line, true: colors.accent }}
        thumbColor={colors.canvasElevated}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    backgroundColor: colors.canvasElevated,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radii.md,
    padding: spacing.md,
  },
  rowText: {
    flex: 1,
    gap: 2,
  },
});

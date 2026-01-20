import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import Svg, { Circle, G } from "react-native-svg";

import { colors } from "../../theme/colors";
import { spacing } from "../../theme/spacing";
import { typography } from "../../theme/typography";

export type DonutSegment = {
  value: number;
  color: string;
  label?: string;
};

type Props = {
  data: DonutSegment[];
  size?: number;
  strokeWidth?: number;
  centerLabel?: string;
  centerValue?: string;
  onSegmentPress?: (segment: DonutSegment, index: number) => void;
};

export function DonutChart({
  data,
  size = 160,
  strokeWidth = 16,
  centerLabel,
  centerValue,
  onSegmentPress,
}: Props) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  const segments = useMemo(() => {
    const total = data.reduce((sum, item) => sum + item.value, 0);
    if (total <= 0) {
      return [];
    }
    let offset = 0;
    return data.map((item, index) => {
      const length = (item.value / total) * circumference;
      const segment = {
        key: `segment-${index}`,
        color: item.color,
        dasharray: `${length} ${circumference - length}`,
        offset,
        dataIndex: index,
      };
      offset += length;
      return segment;
    });
  }, [circumference, data]);

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      {segments.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>No data</Text>
        </View>
      ) : (
        <>
          <Svg width={size} height={size}>
            <G rotation="-90" originX={size / 2} originY={size / 2}>
              <Circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                stroke={colors.divider}
                strokeWidth={strokeWidth}
                fill="none"
              />
              {segments.map((segment) => (
                <Circle
                  key={segment.key}
                  cx={size / 2}
                  cy={size / 2}
                  r={radius}
                  stroke={segment.color}
                  strokeWidth={strokeWidth}
                  strokeDasharray={segment.dasharray}
                  strokeDashoffset={-segment.offset}
                  strokeLinecap="round"
                  fill="none"
                  onPress={
                    onSegmentPress
                      ? () =>
                          onSegmentPress(
                            data[segment.dataIndex],
                            segment.dataIndex
                          )
                      : undefined
                  }
                  accessibilityRole={onSegmentPress ? "button" : undefined}
                  accessibilityLabel={
                    onSegmentPress
                      ? data[segment.dataIndex]?.label ?? "Segment"
                      : undefined
                  }
                />
              ))}
            </G>
          </Svg>
          <View style={styles.center} pointerEvents="none">
            {centerValue ? (
              <Text style={styles.centerValue}>{centerValue}</Text>
            ) : null}
            {centerLabel ? (
              <Text style={styles.centerLabel}>{centerLabel}</Text>
            ) : null}
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
  },
  center: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.md,
  },
  centerValue: {
    fontFamily: typography.fontFamily.semibold,
    fontSize: typography.size.lg,
    color: colors.ink,
  },
  centerLabel: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.xs,
    color: colors.steel,
  },
  empty: {
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.size.sm,
    color: colors.steel,
  },
});

import { useMemo, useState } from "react";
import { LayoutChangeEvent, StyleSheet, Text, View } from "react-native";
import Svg, { Rect } from "react-native-svg";

import { colors } from "../../theme/colors";
import { spacing } from "../../theme/spacing";
import { typography } from "../../theme/typography";

export type BarPoint = {
  label?: string;
  value: number;
  color?: string;
};

type Props = {
  data: BarPoint[];
  height?: number;
  barColor?: string;
};

export function BarChart({
  data,
  height = 160,
  barColor = colors.cobalt,
}: Props) {
  const [width, setWidth] = useState(0);
  const padding = 12;
  const gap = 8;

  const handleLayout = (event: LayoutChangeEvent) => {
    setWidth(event.nativeEvent.layout.width);
  };

  const bars = useMemo(() => {
    if (data.length === 0 || width === 0) {
      return [];
    }
    const maxValue = Math.max(...data.map((item) => item.value), 0);
    const range = maxValue || 1;
    const totalGap = gap * (data.length - 1);
    const barWidth = Math.max(
      6,
      (width - padding * 2 - totalGap) / data.length
    );
    return data.map((item, index) => {
      const x = padding + index * (barWidth + gap);
      const barHeight = ((item.value || 0) / range) * (height - padding * 2);
      const y = height - padding - barHeight;
      return {
        x,
        y,
        width: barWidth,
        height: barHeight,
        color: item.color ?? barColor,
      };
    });
  }, [barColor, data, height, width]);

  return (
    <View style={[styles.container, { height }]} onLayout={handleLayout}>
      {data.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>No data for this range.</Text>
        </View>
      ) : null}
      {width > 0 && data.length > 0 ? (
        <Svg width={width} height={height}>
          {bars.map((bar, index) => (
            <Rect
              key={`bar-${index}`}
              x={bar.x}
              y={bar.y}
              width={bar.width}
              height={Math.max(2, bar.height)}
              rx={6}
              fill={bar.color}
            />
          ))}
        </Svg>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 14,
    backgroundColor: colors.background,
    overflow: "hidden",
  },
  empty: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
  },
  emptyText: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.size.sm,
    color: colors.steel,
    textAlign: "center",
  },
});

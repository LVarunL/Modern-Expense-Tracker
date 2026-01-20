import { useMemo, useState } from "react";
import { LayoutChangeEvent, StyleSheet, Text, View } from "react-native";
import Svg, { Circle, Path } from "react-native-svg";

import { colors } from "../../theme/colors";
import { spacing } from "../../theme/spacing";
import { typography } from "../../theme/typography";
import { formatCurrencyValue, formatShortDate } from "../../utils/format";

export type LineSeriesPoint = {
  x: number;
  y: number;
};

type Props = {
  data: LineSeriesPoint[];
  height?: number;
  stroke?: string;
  fill?: string;
  showAxes?: boolean;
  showRangeSummary?: boolean;
  formatXLabel?: (value: number) => string;
  formatYLabel?: (value: number) => string;
};

export function LineSeriesChart({
  data,
  height = 160,
  stroke = colors.cobalt,
  fill = "rgba(30, 58, 138, 0.12)",
  showAxes = true,
  showRangeSummary = true,
  formatXLabel = formatShortDate,
  formatYLabel = formatCurrencyValue,
}: Props) {
  const [width, setWidth] = useState(0);
  const padding = 10;

  const orderedData = useMemo(
    () => [...data].sort((a, b) => a.x - b.x),
    [data]
  );

  const stats = useMemo(() => {
    if (orderedData.length === 0) {
      return null;
    }
    const values = orderedData.map((point) => point.y);
    const min = Math.min(...values);
    const max = Math.max(...values);
    return {
      min,
      max,
      firstX: orderedData[0].x,
      lastX: orderedData[orderedData.length - 1].x,
    };
  }, [orderedData]);

  const geometry = useMemo(() => {
    if (!stats || width === 0) {
      return null;
    }
    const range = stats.max - stats.min || 1;
    const drawableWidth = Math.max(width - padding * 2, 0);
    if (orderedData.length === 1) {
      const value = orderedData[0].y;
      const y =
        height -
        padding -
        ((value - stats.min) / range) * (height - padding * 2);
      const startX = padding;
      const endX = padding + drawableWidth;
      const centerX = padding + drawableWidth / 2;
      return {
        linePoints: [
          { x: startX, y },
          { x: endX, y },
        ],
        markerPoint: { x: centerX, y },
      };
    }
    const step = drawableWidth / (orderedData.length - 1);
    const linePoints = orderedData.map((point, index) => {
      const x = padding + index * step;
      const y =
        height -
        padding -
        ((point.y - stats.min) / range) * (height - padding * 2);
      return { x, y };
    });
    return {
      linePoints,
      markerPoint: linePoints[linePoints.length - 1],
    };
  }, [height, orderedData, padding, stats, width]);

  const handleLayout = (event: LayoutChangeEvent) => {
    setWidth(event.nativeEvent.layout.width);
  };

  const path = useMemo(() => {
    if (!geometry?.linePoints || geometry.linePoints.length < 2) {
      return null;
    }
    return geometry.linePoints
      .map((point, index) => {
        return `${index === 0 ? "M" : "L"}${point.x} ${point.y}`;
      })
      .join(" ");
  }, [geometry]);

  const areaPath = useMemo(() => {
    if (
      orderedData.length < 2 ||
      !geometry?.linePoints ||
      geometry.linePoints.length < 2 ||
      !path
    ) {
      return null;
    }
    const last = geometry.linePoints[geometry.linePoints.length - 1];
    const first = geometry.linePoints[0];
    return `${path} L${last.x} ${height - padding} L${first.x} ${
      height - padding
    } Z`;
  }, [geometry, height, orderedData.length, padding, path]);

  const markerPoint = geometry?.markerPoint ?? null;

  const showLabels = showAxes && Boolean(stats);
  const maxLabel = stats ? formatYLabel(stats.max) : "";
  const minLabel = stats ? formatYLabel(stats.min) : "";
  const startLabel = stats ? formatXLabel(stats.firstX) : "";
  const endLabel = stats ? formatXLabel(stats.lastX) : "";
  const rangeLabel =
    stats && showRangeSummary ? `${minLabel} to ${maxLabel}` : "";

  return (
    <View style={styles.wrapper}>
      {rangeLabel ? (
        <View style={styles.rangeRow}>
          <View style={styles.rangePill}>
            <Text style={styles.rangeText}>{rangeLabel}</Text>
          </View>
        </View>
      ) : null}
      <View style={[styles.container, { height }]} onLayout={handleLayout}>
        {orderedData.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No data for this range.</Text>
          </View>
        ) : null}
        {width > 0 && orderedData.length > 0 ? (
          <Svg width={width} height={height}>
            {areaPath ? <Path d={areaPath} fill={fill} /> : null}
            {path ? (
              <Path d={path} fill="none" stroke={stroke} strokeWidth={2} />
            ) : null}
            {markerPoint ? (
              <Circle
                cx={markerPoint.x}
                cy={markerPoint.y}
                r={4}
                fill={stroke}
              />
            ) : null}
          </Svg>
        ) : null}
      </View>
      {showLabels ? (
        <View style={styles.axisRow}>
          <Text style={styles.axisLabel}>{startLabel}</Text>
          <Text style={styles.axisLabel}>{endLabel}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: spacing.xs,
  },
  rangeRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  rangePill: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 999,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.divider,
  },
  rangeText: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.size.xs,
    color: colors.steel,
  },
  container: {
    borderRadius: 14,
    backgroundColor: colors.background,
    overflow: "hidden",
    flex: 1,
    position: "relative",
  },
  axisRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: spacing.xs,
  },
  axisLabel: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.size.xs,
    color: colors.steel,
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

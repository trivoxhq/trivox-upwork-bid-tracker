/** Chart.js typography & grid tuned for dashboard bar charts per theme. */
export function barChartThemeAppearance(isDark: boolean) {
  return {
    legendColor: isDark ? "#B4B4B4" : "#666666",
    tickColor: isDark ? "#B4B4B4" : "#666666",
    gridColor: isDark ? "rgb(51 51 51 / 0.85)" : "rgba(221, 221, 221, 0.6)",
    tooltipBg: isDark ? "rgb(48 48 48 / 0.97)" : "rgba(17, 17, 17, 0.92)",
    tooltipBorder: isDark ? "#333333" : "rgba(255,255,255,0.12)",
    tooltipBody: isDark ? "#ECECEC" : "rgb(247 247 247)",
    tooltipTitle: isDark ? "#ECECEC" : "rgb(255 255 255)",
  };
}

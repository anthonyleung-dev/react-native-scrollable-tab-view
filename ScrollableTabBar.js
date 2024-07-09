const React = require("react");
const ReactNative = require("react-native");
const PropTypes = require("prop-types");
const { View, Animated, StyleSheet, ScrollView, Text, Platform, Dimensions } =
  ReactNative;
const Button = require("./Button");

const WINDOW_WIDTH = Dimensions.get("window").width;

const ScrollableTabBar = ({
  goToPage,
  activeTab,
  tabs,
  backgroundColor = null,
  activeTextColor = "navy",
  inactiveTextColor = "black",
  scrollOffset = 52,
  style = {},
  tabStyle = {},
  tabsContainerStyle = {},
  textStyle,
  renderTab,
  underlineStyle = {},
  onScroll,
  scrollValue,
}) => {
  const _tabsMeasurements = React.useRef([]);
  const _scrollView = React.useRef(null);
  const _tabContainerMeasurements = React.useRef(null);
  const _containerMeasurements = React.useRef(null);

  const [_leftTabUnderline, setLeftTabUnderline] = React.useState(
    new Animated.Value(0)
  );
  const [_widthTabUnderline, setWidthTabUnderline] = React.useState(
    new Animated.Value(0)
  );
  const [_containerWidth, setContainerWidth] = React.useState(null);

  React.useEffect(() => {
    scrollValue.addListener(updateView);
    return () => {
      scrollValue.removeListener(updateView);
    };
  }, []);

  React.useEffect(() => {
    if (
      JSON.stringify(tabs) !== JSON.stringify(prevTabs.current) &&
      _containerWidth
    ) {
      setContainerWidth(null);
    }
  }, [tabs]);

  const updateView = (offset) => {
    const position = Math.floor(offset.value);
    const pageOffset = offset.value % 1;
    const tabCount = tabs.length;
    const lastTabPosition = tabCount - 1;

    if (tabCount === 0 || offset.value < 0 || offset.value > lastTabPosition) {
      return;
    }

    if (
      necessarilyMeasurementsCompleted(position, position === lastTabPosition)
    ) {
      updateTabPanel(position, pageOffset);
      updateTabUnderline(position, pageOffset, tabCount);
    }
  };

  const necessarilyMeasurementsCompleted = (position, isLastTab) => {
    return (
      _tabsMeasurements.current[position] &&
      (isLastTab || _tabsMeasurements.current[position + 1]) &&
      _tabContainerMeasurements.current &&
      _containerMeasurements.current
    );
  };

  const updateTabPanel = (position, pageOffset) => {
    const containerWidth = _containerMeasurements.current.width;
    const tabWidth = _tabsMeasurements.current[position].width;
    const nextTabMeasurements = _tabsMeasurements.current[position + 1];
    const nextTabWidth =
      (nextTabMeasurements && nextTabMeasurements.width) || 0;
    const tabOffset = _tabsMeasurements.current[position].left;
    const absolutePageOffset = pageOffset * tabWidth;
    let newScrollX = tabOffset + absolutePageOffset;

    newScrollX -=
      (containerWidth -
        (1 - pageOffset) * tabWidth -
        pageOffset * nextTabWidth) /
      2;
    newScrollX = newScrollX >= 0 ? newScrollX : 0;

    if (Platform.OS === "android") {
      _scrollView.current.scrollTo({ x: newScrollX, y: 0, animated: false });
    } else {
      const rightBoundScroll =
        _tabContainerMeasurements.current.width - containerWidth;
      newScrollX =
        newScrollX > rightBoundScroll ? rightBoundScroll : newScrollX;
      _scrollView.current.scrollTo({ x: newScrollX, y: 0, animated: false });
    }
  };

  const updateTabUnderline = (position, pageOffset, tabCount) => {
    const lineLeft = _tabsMeasurements.current[position].left;
    const lineRight = _tabsMeasurements.current[position].right;

    if (position < tabCount - 1) {
      const nextTabLeft = _tabsMeasurements.current[position + 1].left;
      const nextTabRight = _tabsMeasurements.current[position + 1].right;

      const newLineLeft =
        pageOffset * nextTabLeft + (1 - pageOffset) * lineLeft;
      const newLineRight =
        pageOffset * nextTabRight + (1 - pageOffset) * lineRight;

      _leftTabUnderline.setValue(newLineLeft);
      _widthTabUnderline.setValue(newLineRight - newLineLeft);
    } else {
      _leftTabUnderline.setValue(lineLeft);
      _widthTabUnderline.setValue(lineRight - lineLeft);
    }
  };

  const renderTabContent = (
    name,
    page,
    isTabActive,
    onPressHandler,
    onLayoutHandler
  ) => {
    const textColor = isTabActive ? activeTextColor : inactiveTextColor;
    const fontWeight = isTabActive ? "bold" : "normal";

    return (
      <Button
        key={`${name}_${page}`}
        accessible={true}
        accessibilityLabel={name}
        accessibilityTraits="button"
        onPress={() => onPressHandler(page)}
        onLayout={onLayoutHandler}
      >
        <View style={[styles.tab, tabStyle]}>
          <Text style={[{ color: textColor, fontWeight }, textStyle]}>
            {name}
          </Text>
        </View>
      </Button>
    );
  };

  const measureTab = (page, event) => {
    const { x, width, height } = event.nativeEvent.layout;
    _tabsMeasurements.current[page] = {
      left: x,
      right: x + width,
      width,
      height,
    };
    updateView({ value: scrollValue.__getValue() });
  };

  const onTabContainerLayout = (e) => {
    _tabContainerMeasurements.current = e.nativeEvent.layout;
    let width = _tabContainerMeasurements.current.width;
    if (width < WINDOW_WIDTH) {
      width = WINDOW_WIDTH;
    }
    setContainerWidth(width);
    updateView({ value: scrollValue.__getValue() });
  };

  const onContainerLayout = (e) => {
    _containerMeasurements.current = e.nativeEvent.layout;
    updateView({ value: scrollValue.__getValue() });
  };

  const tabUnderlineStyle = {
    position: "absolute",
    height: 4,
    backgroundColor: "navy",
    bottom: 0,
  };

  const dynamicTabUnderline = {
    left: _leftTabUnderline,
    width: _widthTabUnderline,
  };

  return (
    <View
      style={[styles.container, { backgroundColor }, style]}
      onLayout={onContainerLayout}
    >
      <ScrollView
        ref={_scrollView}
        horizontal={true}
        showsHorizontalScrollIndicator={false}
        showsVerticalScrollIndicator={false}
        directionalLockEnabled={true}
        bounces={false}
        scrollsToTop={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
      >
        <View
          style={[styles.tabs, { width: _containerWidth }, tabsContainerStyle]}
          onLayout={onTabContainerLayout}
        >
          {tabs.map((name, page) => {
            const isTabActive = activeTab === page;
            const renderTabFunc = renderTab || renderTabContent;
            return renderTabFunc(
              name,
              page,
              isTabActive,
              goToPage,
              measureTab.bind(null, page)
            );
          })}
          <Animated.View
            style={[tabUnderlineStyle, dynamicTabUnderline, underlineStyle]}
          />
        </View>
      </ScrollView>
    </View>
  );
};

ScrollableTabBar.propTypes = {
  goToPage: PropTypes.func.isRequired,
  activeTab: PropTypes.number.isRequired,
  tabs: PropTypes.arrayOf(PropTypes.string).isRequired,
  backgroundColor: PropTypes.string,
  activeTextColor: PropTypes.string,
  inactiveTextColor: PropTypes.string,
  scrollOffset: PropTypes.number,
  style: PropTypes.object, // Update according to your requirements
  tabStyle: PropTypes.object, // Update according to your requirements
  tabsContainerStyle: PropTypes.object, // Update according to your requirements
  textStyle: PropTypes.object, // Update according to your requirements
  renderTab: PropTypes.func,
  underlineStyle: PropTypes.object, // Update according to your requirements
  onScroll: PropTypes.func,
  scrollValue: PropTypes.object.isRequired, // Animated.Value
};

module.exports = ScrollableTabBar;

const styles = StyleSheet.create({
  tab: {
    height: 49,
    alignItems: "center",
    justifyContent: "center",
    paddingLeft: 20,
    paddingRight: 20,
  },
  container: {
    height: 50,
    borderWidth: 1,
    borderTopWidth: 0,
    borderLeftWidth: 0,
    borderRightWidth: 0,
    borderColor: "#ccc",
  },
  tabs: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
});

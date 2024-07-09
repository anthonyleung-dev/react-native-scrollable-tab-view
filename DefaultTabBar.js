const React = require("react");
const ReactNative = require("react-native");
const PropTypes = require("prop-types");
const { StyleSheet, Text, View, Animated } = ReactNative;
const Button = require("./Button");

const DefaultTabBar = ({
  goToPage,
  activeTab,
  tabs,
  backgroundColor = null,
  activeTextColor = "navy",
  inactiveTextColor = "black",
  textStyle,
  tabStyle,
  renderTab,
  underlineStyle,
  containerWidth,
  scrollValue,
  style,
}) => {
  const renderTabOption = (name, page) => {
    // Function body if needed
  };

  const renderTabContent = (name, page, isTabActive, onPressHandler) => {
    const textColor = isTabActive ? activeTextColor : inactiveTextColor;
    const fontWeight = isTabActive ? "bold" : "normal";

    return (
      <Button
        style={{ flex: 1 }}
        key={name}
        accessible={true}
        accessibilityLabel={name}
        accessibilityTraits="button"
        onPress={() => onPressHandler(page)}
      >
        <View style={[styles.tab, tabStyle]}>
          <Text style={[{ color: textColor, fontWeight }, textStyle]}>
            {name}
          </Text>
        </View>
      </Button>
    );
  };

  const numberOfTabs = tabs.length;
  const tabUnderlineStyle = {
    position: "absolute",
    width: containerWidth / numberOfTabs,
    height: 4,
    backgroundColor: "navy",
    bottom: 0,
  };

  const translateX = scrollValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0, containerWidth / numberOfTabs],
  });

  return (
    <View style={[styles.tabs, { backgroundColor }, style]}>
      {tabs.map((name, page) => {
        const isTabActive = activeTab === page;
        const renderTabFunc = renderTab || renderTabContent;
        return renderTabFunc(name, page, isTabActive, goToPage);
      })}
      <Animated.View
        style={[
          tabUnderlineStyle,
          { transform: [{ translateX }] },
          underlineStyle,
        ]}
      />
    </View>
  );
};

DefaultTabBar.propTypes = {
  goToPage: PropTypes.func.isRequired,
  activeTab: PropTypes.number.isRequired,
  tabs: PropTypes.arrayOf(PropTypes.string).isRequired,
  backgroundColor: PropTypes.string,
  activeTextColor: PropTypes.string,
  inactiveTextColor: PropTypes.string,
  textStyle: PropTypes.object, // Update according to your requirements
  tabStyle: PropTypes.object, // Update according to your requirements
  renderTab: PropTypes.func,
  underlineStyle: PropTypes.object, // Update according to your requirements
  containerWidth: PropTypes.number.isRequired,
  scrollValue: PropTypes.object.isRequired, // Animated.Value
  style: PropTypes.object, // Update according to your requirements
};

const styles = StyleSheet.create({
  tab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingBottom: 10,
  },
  tabs: {
    height: 50,
    flexDirection: "row",
    justifyContent: "space-around",
    borderWidth: 1,
    borderTopWidth: 0,
    borderLeftWidth: 0,
    borderRightWidth: 0,
    borderColor: "#ccc",
  },
});

module.exports = DefaultTabBar;

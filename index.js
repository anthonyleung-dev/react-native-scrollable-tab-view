const React = require("react");
const ReactNative = require("react-native");
const PropTypes = require("prop-types");
const {
  Dimensions,
  View,
  Animated,
  ScrollView,
  Platform,
  StyleSheet,
  InteractionManager,
} = ReactNative;

const ViewPagerAndroid = require("react-native-pager-view");
const TimerMixin = require("react-timer-mixin");
const ViewPager = require("react-native-pager-view");

const SceneComponent = require("./SceneComponent");
const DefaultTabBar = require("./DefaultTabBar");
const ScrollableTabBar = require("./ScrollableTabBar");

const AnimatedViewPagerAndroid =
  Platform.OS === "android"
    ? Animated.createAnimatedComponent(ViewPager)
    : undefined;

const ScrollableTabView = ({
  tabBarPosition = "top",
  initialPage = 0,
  page = -1,
  onChangeTab = () => {},
  onScroll = () => {},
  renderTabBar,
  tabBarUnderlineStyle,
  tabBarBackgroundColor,
  tabBarActiveTextColor,
  tabBarInactiveTextColor,
  tabBarTextStyle,
  style,
  contentProps = {},
  scrollWithoutAnimation = false,
  locked = false,
  prerenderingSiblingsNumber = 0,
  children,
}) => {
  const containerWidth = Dimensions.get("window").width;
  const scrollViewRef = React.useRef(null);

  const [currentPage, setCurrentPage] = React.useState(initialPage);
  const [scrollValue, setScrollValue] = React.useState(
    new Animated.Value(initialPage * containerWidth)
  );
  const [sceneKeys, setSceneKeys] = React.useState(
    newSceneKeys({ currentPage: initialPage })
  );

  const isIOS = Platform.OS === "ios";
  let scrollXIOS, positionAndroid, offsetAndroid;

  React.useEffect(() => {
    const updateSceneKeys = ({
      page,
      children = React.Children.toArray(children),
      callback = () => {},
    }) => {
      let newKeys = newSceneKeys({
        previousKeys: sceneKeys,
        currentPage: page,
        children,
      });
      setSceneKeys(newKeys);
      setCurrentPage(page);
      callback();
    };

    if (page >= 0 && page !== currentPage) {
      goToPage(page);
    }

    if (isIOS) {
      scrollXIOS = new Animated.Value(initialPage * containerWidth);
      const containerWidthAnimatedValue = new Animated.Value(containerWidth);
      containerWidthAnimatedValue.__makeNative();
      const scrollVal = Animated.divide(
        scrollXIOS,
        containerWidthAnimatedValue
      );
      scrollXIOS.addListener(({ value }) => {
        onScroll(value / containerWidth);
      });
      setScrollValue(scrollVal);
    } else {
      positionAndroid = new Animated.Value(initialPage);
      offsetAndroid = new Animated.Value(0);
      const scrollVal = Animated.add(positionAndroid, offsetAndroid);
      setScrollValue(scrollVal);
    }

    return () => {
      if (isIOS) {
        scrollXIOS?.removeAllListeners();
      } else {
        positionAndroid?.removeAllListeners();
        offsetAndroid?.removeAllListeners();
      }
    };
  }, [page, children]);

  const goToPage = (pageNumber) => {
    if (isIOS) {
      const offset = pageNumber * containerWidth;
      scrollViewRef.current.scrollTo({
        x: offset,
        y: 0,
        animated: !scrollWithoutAnimation,
      });
    } else {
      scrollViewRef.current.setPage(pageNumber);
    }

    setCurrentPage(pageNumber);
    updateSceneKeys({
      page: pageNumber,
      callback: () =>
        onChangeTab({
          i: pageNumber,
          ref: children[pageNumber],
          from: currentPage,
        }),
    });
  };

  const renderTabBarFunc = (props) => {
    if (renderTabBar === false) {
      return null;
    } else if (renderTabBar) {
      return React.cloneElement(renderTabBar(props), props);
    } else {
      return <DefaultTabBar {...props} />;
    }
  };

  const newSceneKeys = ({
    previousKeys = [],
    currentPage = 0,
    children = React.Children.toArray(children),
  }) => {
    let newKeys = [];
    children.forEach((child, idx) => {
      let key = `${child.props.tabLabel}_${idx}`;
      if (
        previousKeys.includes(key) ||
        _shouldRenderSceneKey(idx, currentPage)
      ) {
        newKeys.push(key);
      }
    });
    return newKeys;
  };

  const _shouldRenderSceneKey = (idx, currentPageKey) => {
    let numOfSibling = prerenderingSiblingsNumber;
    return (
      idx < currentPageKey + numOfSibling + 1 &&
      idx > currentPageKey - numOfSibling - 1
    );
  };

  const renderScrollableContent = () => {
    const scenes = _composeScenes();
    if (isIOS) {
      return (
        <Animated.ScrollView
          horizontal
          pagingEnabled
          automaticallyAdjustContentInsets={false}
          contentOffset={{ x: initialPage * containerWidth }}
          ref={scrollViewRef}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { x: scrollXIOS } } }],
            { useNativeDriver: true, listener: onScroll }
          )}
          onMomentumScrollBegin={_onMomentumScrollBeginAndEnd}
          onMomentumScrollEnd={_onMomentumScrollBeginAndEnd}
          scrollEventThrottle={16}
          scrollsToTop={false}
          showsHorizontalScrollIndicator={false}
          scrollEnabled={!locked}
          directionalLockEnabled
          alwaysBounceVertical={false}
          keyboardDismissMode="on-drag"
          {...contentProps}
        >
          {scenes}
        </Animated.ScrollView>
      );
    } else {
      return (
        <AnimatedViewPagerAndroid
          key={React.Children.count(children)}
          style={styles.scrollableContentAndroid}
          initialPage={initialPage}
          onPageSelected={_updateSelectedPage}
          keyboardDismissMode="on-drag"
          scrollEnabled={!locked}
          onPageScroll={Animated.event(
            [
              {
                nativeEvent: {
                  position: positionAndroid,
                  offset: offsetAndroid,
                },
              },
            ],
            { useNativeDriver: true, listener: onScroll }
          )}
          ref={scrollViewRef}
          {...contentProps}
        >
          {scenes}
        </AnimatedViewPagerAndroid>
      );
    }
  };

  const _composeScenes = () => {
    return React.Children.map(children, (child, idx) => {
      let key = `${child.props.tabLabel}_${idx}`;
      return (
        <SceneComponent
          key={child.key}
          shouldUpdated={_shouldRenderSceneKey(idx, currentPage)}
          style={{ width: containerWidth }}
        >
          {sceneKeys.includes(key) ? (
            child
          ) : (
            <View tabLabel={child.props.tabLabel} />
          )}
        </SceneComponent>
      );
    });
  };

  const _onMomentumScrollBeginAndEnd = (e) => {
    const offsetX = e.nativeEvent.contentOffset.x;
    const page = Math.round(offsetX / containerWidth);
    if (currentPage !== page) {
      _updateSelectedPage(page);
    }
  };

  const _updateSelectedPage = (nextPage) => {
    const currentPage = currentPage;
    const page =
      typeof nextPage === "object" ? nextPage.nativeEvent.position : nextPage;
    updateSceneKeys({
      page,
      callback: () =>
        onChangeTab({ i: page, ref: children[page], from: currentPage }),
    });
  };

  const _onScroll = (e) => {
    if (isIOS) {
      const offsetX = e.nativeEvent.contentOffset.x;
      onScroll(offsetX / containerWidth);
    } else {
      const { position, offset } = e.nativeEvent;
      onScroll(position + offset);
    }
  };

  const _handleLayout = (e) => {
    const { width } = e.nativeEvent.layout;
    if (
      !width ||
      width <= 0 ||
      Math.round(width) === Math.round(containerWidth)
    )
      return;

    if (isIOS) {
      const containerWidthAnimatedValue = new Animated.Value(width);
      containerWidthAnimatedValue.__makeNative();
      setScrollValue(Animated.divide(scrollXIOS, containerWidthAnimatedValue));
    }

    requestAnimationFrame(() => {
      goToPage(currentPage);
    });
  };

  let overlayTabs =
    tabBarPosition === "overlayTop" || tabBarPosition === "overlayBottom";
  let tabBarProps = {
    goToPage,
    tabs: React.Children.map(children, (child) => child.props.tabLabel),
    activeTab: currentPage,
    scrollValue,
    containerWidth,
    backgroundColor: tabBarBackgroundColor,
    activeTextColor: tabBarActiveTextColor,
    inactiveTextColor: tabBarInactiveTextColor,
    textStyle: tabBarTextStyle,
    underlineStyle: tabBarUnderlineStyle,
  };

  if (overlayTabs) {
    tabBarProps.style = {
      position: "absolute",
      left: 0,
      right: 0,
      [tabBarPosition === "overlayTop" ? "top" : "bottom"]: 0,
    };
  }

  return (
    <View style={[styles.container, style]} onLayout={_handleLayout}>
      {tabBarPosition === "top" && renderTabBarFunc(tabBarProps)}
      {renderScrollableContent()}
      {(tabBarPosition === "bottom" || overlayTabs) &&
        renderTabBarFunc(tabBarProps)}
    </View>
  );
};

ScrollableTabView.propTypes = {
  tabBarPosition: PropTypes.oneOf([
    "top",
    "bottom",
    "overlayTop",
    "overlayBottom",
  ]),
  initialPage: PropTypes.number,
  page: PropTypes.number,
  onChangeTab: PropTypes.func,
  onScroll: PropTypes.func,
  renderTabBar: PropTypes.any,
  tabBarUnderlineStyle: PropTypes.object, // Update the type according to your requirements
  tabBarBackgroundColor: PropTypes.string,
  tabBarActiveTextColor: PropTypes.string,
  tabBarInactiveTextColor: PropTypes.string,
  tabBarTextStyle: PropTypes.object,
  style: PropTypes.object, // Update the type according to your requirements
  contentProps: PropTypes.object,
  scrollWithoutAnimation: PropTypes.bool,
  locked: PropTypes.bool,
  prerenderingSiblingsNumber: PropTypes.number,
};

module.exports = ScrollableTabView;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollableContentAndroid: {
    flex: 1,
  },
});

define('deviceInfo', [
    'globalConstants'
], function(globalConstants) {
    'use strict';

    function getWidth() {
        if (window.innerWidth) {
            return window.innerWidth;
        }

        if (window.document.documentElement && window.document.documentElement.clientWidth) {
            return window.document.documentElement.clientWidth;
        }

        if (window.document.body) {
            return window.document.body.clientWidth;
        }
    }

    function getHeight() {
        if (window.innerHeight) {
            return window.innerHeight;
        }

        if (window.document.documentElement && window.document.documentElement.clientHeight) {
            return window.document.documentElement.clientHeight;
        }

        if (window.document.body) {
            return window.document.body.clientHeight;
        }
    }

    function getDeviceCategory() {
        if (isMobileBp()) {
            return deviceCategory.MOBILE;
        } else if (isSmallTabletBp()) {
            return deviceCategory.SMALL_TABLET;
        } else if (isLargeTabletBp()) {
            return deviceCategory.LARGE_TABLET;
        } else if (isDesktopBp()) {
            return deviceCategory.DESKTOP;
        } else {
            return deviceCategory.UNKNOWN;
        }
    }

    function isMobileBp() {
        return getWidth() <= globalConstants.maxMobileResolution;
    }

    function isSmallTabletBp() {
        var width = getWidth();

        return width >= globalConstants.minSmallTabletResolution && width <= globalConstants.maxSmallTabletResolution;
    }

    function isLargeTabletBp() {
        var width = getWidth();

        return width >= globalConstants.minLargeTabletResolution && width <= globalConstants.maxLargeTabletResolution;
    }

    function isDesktopBp() {
        return getWidth() >= globalConstants.minDesktopResolution;
    }

    var deviceCategory = {
        DESKTOP: 'DESKTOP',
        LARGE_TABLET: 'LARGE_TABLET',
        SMALL_TABLET: 'SMALL_TABLET',
        MOBILE: 'MOBILE',
        UNKNOWN: 'UNKNOWN'
    };

    return {
        isMobileBp: isMobileBp,
        isSmallTabletBp: isSmallTabletBp,
        isLargeTabletBp: isLargeTabletBp,
        isDesktopBp: isDesktopBp,
        getDeviceCategory: getDeviceCategory,
        getWidth: getWidth,
        getHeight: getHeight,
        deviceCategory: deviceCategory
    };
});

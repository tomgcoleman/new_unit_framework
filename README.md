# new_unit_framework
Create a script element on your page, with src of:

https://rawgit.com/tomgcoleman/new_unit_framework/master/loader.js

This will create a script element for each file listed. As they are loaded, they will run.

    var script_el = document.createElement('script');
    script_el.src = "https://rawgit.com/tomgcoleman/new_unit_framework/master/loader.js?cach_breaker=" + new Date().getTime();
    document.getElementsByTagName('head')[0].appendChild(script_el)

    require('testUtils').hsrQUnitRunAllTests()

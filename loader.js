console.log('injecting code from https://ewegithub.sb.karmalab.net/EWE/new_unit_hsr');

var filenames = [
    'axe.js',
    'device-information.js',
    'global-constants.js',
    'new-unit-reporting.js',
    'new-unit-svg-icons.js',
    'new-unit-test-runner.js',
    'promise-polyfill.js',
    'stacktrace.js'
];

for (var i = 0 ; i < filenames.length ; i++) {    
    var script_el = document.createElement('script');
    script_el.src = "https://rawgit.com/tomgcoleman/new_unit_framework/master/" + filenames[i] + "?cache_breaker=" + new Date().getTime();
    document.getElementsByTagName('head')[0].appendChild(script_el)
}

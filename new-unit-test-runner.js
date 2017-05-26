define('newUnit', [
    'jquery', 'newUnitReporter', 'deviceInfo', 'testSuites'
], function($, newUnitReporter, deviceInfo, testSuites) {
    'use strict';

    var callbacks = {};

    var newUnit = {
        ok: ok,
        test: test,
        module: module,
        deepEqual: deepEqual,
        drawBox: drawBox,
        resultsA11y: {},
        tests: {
            runA11yTests: runA11yTests,
            testsToRun: {},
                testsToRunWithDelay: {},
                runAllTests: runAllTests
        },
        stats: {
            startTime: 0,
            endTime: 0,
            elapsedRunTime: 0
        },
        redBoxElements: {
            'message': 'element',
            'explanation': 'to unselect red items for a known issue, directly, without storing selectors.',
            'explanation2': 'sometimes selectors had splice and parent.'
        },
        redBoxSelectors: {
            'message': 'selector',
            'explanation': 'to unselect red items for a known issue.'
        },
        redBoxSelectors_: [],
        knownIssues: [
            {
                dataSource: 'sample_text',
                dataRequested: true,
                dataLoadComplete: true,
                issues: [
                    {
                        description: 'sample issue description exact match',
                        textMatch: 'zzz exact text to match (never matches) zzz',
                        bug: 'https://jira/jira/browse/BHS-9999'
                    },
                    {
                        description: 'sample issue description regex match',
                        regexMatch: 'zzz.* regex match .* zzz',
                        bug: 'https://jira/jira/browse/BHS-9998'
                    }
                ]
            },
            // nope, No 'Access-Control-Allow-Origin' header is present on the requested resource.
            //{
            //    dataSource: "https://confluence/download/attachments/743114578/known_issues.json?api=v2",
            //    dataRequested: false,
            //    dataLoadComplete: false,
            //    issues: [
            //
            //    ]
            //},
            // nope, No 'Access-Control-Allow-Origin' header is present on the requested resource. Origin 'https://wwwexpediacom.sandbox.dev.sb.karmalab.net' is therefore not allowed access.
            // maybe it will work in trunk.
            // try it out via :
            // localStorage.add_ewe_git_known_issues = 1
            //{
            //    description: "ewe github known issues file.  todo: can we see the latest, or is the token for a version",
            //    dataSource: "https://ewegithub.sb.karmalab.net/raw/tocoleman/new-unit-known-issues/master/known_issues.js?token=AAAHHdG5xka1k89sUC-HxRKDq_IeOfrlks5Yy_LXwA%3D%3D&rnd=" + new Date().getTime(),
            //    dataRequested: false,
            //    dataLoadComplete: false,
            //    issues: []
            //},
            {
                description: "if ewe github works, then we can remove this",
                dataSource: "https://rawgit.com/tomgcoleman/expedia/master/known_issues.js?rnd=" + new Date().getTime(),
                dataRequested: false,
                dataLoadComplete: false,
                issues: []
            }
        ],
        results: {
            currentSummary: {},
            overallSummary: {
                'pageName': undefined,
                'list1': undefined,
                'ScreenDimension': undefined,
                'BrowserDimension': undefined,
                'DocumentDimension': undefined,
                'totalTestCount': 0,
                'passedTestCount': 0,
                'failedTestCount': 0,
                'acceptanceCount': 0,
                'acceptanceFailed': 0,
                'totalAssertionCount': 0,
                'passedAssertionCount': 0,
                'failAssertionCount': 0,
                'errorMessages': [],
                'exceptionMessages': [],
                'a11yErrorMessages': [],
                'totalTestRuntime': 0
            },
            tests: [],
            pendingWaitToTriggerDone: 0,
            pendingWaitToTriggerDelayMS: 2000,
            toString: generateResultSummary
        },
        runtime: {
            testResultsAvailable: false,
            knownIssuesAvailable: false,
            currentModuleName: '',
            currentTestName: '',
                currentTestObj: {
                    assertions: []
            },
            // todo: see if used, remove if not.
            testTagMapping: {
                "AttributeName": ['functionName1', 'functionName2'],
                "Acceptance": ['exampleTest_A'],
                "Regression": ['exampleTest_B'],
                "ButtonClicks": ['exampleTest_A']
            },
            // todo: how to know what tags were used to launch this?
            registerAsyncSuiteCreate: function(asyncTestSuiteName, tags) {
                QUnit.runtime.asyncTests[asyncTestSuiteName] = {
                    timeStarted: new Date().getTime(),
                    tagUsedToLaunch: tags,
                    progressIndicator: 1 // 0 = nothing has happened for max wait
                };
            },
            registerAsyncSuiteProgress: function(asyncTestSuiteName) {
                QUnit.runtime.asyncTestInProgress = asyncTestSuiteName;
                if (!QUnit.runtime.asyncTests[asyncTestSuiteName]) {
                    this.registerAsyncSuiteCreate(asyncTestSuiteName);
                }
                if (QUnit.runtime.asyncTests[asyncTestSuiteName]) {
                    QUnit.runtime.asyncTests[asyncTestSuiteName].progressIndicator++;
                    qunit_trace('async indicator for ' + asyncTestSuiteName + ' is: ' + QUnit.runtime.asyncTests[asyncTestSuiteName].progressIndicator);
                }
            },
            registerAsyncSuiteCompletion: function(asyncTestSuiteName) {
                QUnit.runtime.asyncTestInProgress = asyncTestSuiteName;
                if (QUnit.runtime.asyncTests[asyncTestSuiteName]) {
                    QUnit.runtime.asyncTests[asyncTestSuiteName].timeCompleted = new Date().getTime();
                }
            },
            maxTimeToWaitForAsyncTestProgress: 15000,
            asyncTestInProgress: '',
            asyncTests: {
                exampleTestSuiteName: {
                    tagUsedToLaunch: '',
                    timeStarted: 0,
                    timeCompleted: 0,
                    progressIndicator: 0
                }
            },
            testSuiteHasTag: function(testSuite, attributeList) {
                var tagsToRun = attributeList.split(',');
                var tagsOnSuite = testSuite.tags.split(',');

                for( var i = 0 ; i < tagsToRun.length ; i++ ) {
                    if ($.inArray(tagsToRun[i], tagsOnSuite) > -1) {
                        return true;
                    }
                }
                return false;
            }
        },
        callbacks: {
            registerForCallback: registerForCallback,
            triggerForCallbacks: invokeCallback
        },
        pageState: {},
        helpers: {},
        config: {
            traceResultsAsAvailable: true,
            urlValues: {
                regressionTests: false,
                showTrace: false,
                codeCov: false,
                belowTheFoldTests: false,
                omnitureSelfTests: false,
                clickTests: false,
                autoPageNavigate: false,
                modulesToRun: undefined,
                tagsToRun: undefined
            },
            isSet :function (TagName, tagVal) {
                    if (undefined == TagName) {
                    return false;
                }
                var configVal = this.urlValues[TagName];
                if (undefined == configVal) {
                    return false;
                }
                    if (undefined == tagVal || tagVal.length === 0) {
                    return true; // just checking if tag is there
                }
                var configValArray = configVal.split(',');
                return $.inArray(tagVal, configValArray) > -1;
            },
            ValueCount :function (TagName) {
                    if (undefined == TagName) {
                    return 0;
                }
                var configVal = this.urlValues[TagName];
                if (undefined == configVal) {
                    return 0;
                }
                var configValArray = configVal.split(',');
                return configValArray.length;
            },
            ValueAt :function (TagName, index) {
                if (index < this.ValueCount(TagName))
                {
                    var configVal = this.urlValues[TagName];
                    if (undefined == configVal) {
                        return '';
                    }
                    var configValArray = configVal.split(',');
                    return configValArray[index];
                }
            },
            AppendTagToRun : function (TagName) {
                if (undefined == TagName) {
                    return;
                }
                if (undefined == this.urlValues.tagsToRun) {
                    this.urlValues.tagsToRun = TagName;
                }
                else
                {
                    this.urlValues.tagsToRun += ',' + TagName;
                }
            }
        },
        trace: {
            history: []
        },
        version: {
            versionNumber: '1.0.1',
            framework: 'new'
        }
    };

    registerForCallback('done', newUnit.tests.runA11yTests);
    registerForCallback('done', finalizeTestReports);

    registerForCallback('known_issue_data_ready', knownIssueDataNowReady);

    function knownIssueDataNowReady() {
        newUnit.runtime.knownIssuesAvailable = true;
        updateVisualResults();
    }

    function modifyResultsForKnownIssues(errorGroup) {

        var unkownIssueCount = 0;
        var known_issues_extracted = [];

        // todo: this currently changes the text of the error messages.
        // todo: change this at the source, and add additional groups for the overall summary
        var max_insert = 1000;
        for (var i = 0 ; i < errorGroup.length ; i++) {
            if (max_insert-- < 0) break;

            if (errorGroup[i].indexOf('known issue') > -1) {
                continue;
            }
            if (errorGroup.length > i+1 && errorGroup[i+1].indexOf('knownissue') > -1) {
                continue;
            }

            var issue_text = errorGroup[i];
            var is_known_issue = false;

            for (var jj = 0 ; jj < newUnit.knownIssues.length ; jj++) {
                for (var kk = 0 ; kk < newUnit.knownIssues[jj].issues.length ; kk++) {
                    var content = newUnit.knownIssues[jj].issues[kk];
                    var regexMatch = 0;
                    if (content.regexMatch) {
                        regexMatch = new RegExp(content.regexMatch, 'i');
                    }
                    if (content.textMatch && issue_text == content.textMatch) {
                        is_known_issue = true;
                    }
                    if (regexMatch && regexMatch.exec(issue_text)) {
                        is_known_issue = true;
                    }
                    if (is_known_issue && content.pos) {
                        // if pos are listed, then it must match the current domain.
                        var domain_for_known_compare = newUnit.helpers.getPosFromUrl(document.URL);
                        var found_domain_match = false;
                        for (var pos_index = 0 ; pos_index < content.pos.length ; pos_index++) {
                            regexMatch = new RegExp(content.pos[pos_index], 'i');
                            if (regexMatch.exec(domain_for_known_compare)) {
                                found_domain_match = true;
                            }
                        }
                        is_known_issue = found_domain_match;
                    }
                    if (is_known_issue) {
                        var known_issue_found = {
                            original_text: errorGroup[i],
                            known_issue_match: content
                        };
                        known_issues_extracted.push(known_issue_found);

                        // remove index i
                        errorGroup.splice(i, 1);

                        i = i - 1;
                        break;
                    }
                }
                if (is_known_issue) break;
            }
            if (is_known_issue) {
                var elements_to_unselect = newUnit.redBoxElements[issue_text.trim()];
                if (elements_to_unselect && elements_to_unselect.length) {
                    for (var el_i = 0 ; el_i < elements_to_unselect.length ; el_i++) {
                        var el_to_uns = elements_to_unselect[el_i];
                        if (el_to_uns.className && typeof el_to_uns.className.replace == 'function') {
                            el_to_uns.className = el_to_uns.className.replace('qunit_red_dashed_box', '');
                        }
                    }
                }
            }
            if (!is_known_issue) {
                unkownIssueCount++;
            }
        }
        // insert after the content
        if (known_issues_extracted.length > 0) {
            errorGroup.push("\n*** List of Known Issues ***");
            var repeat_counts = {};
            for (var i = 0 ; i < known_issues_extracted.length ; i++) {
                var match_name = known_issues_extracted[i].known_issue_match.description;
                if (!repeat_counts[match_name]) {
                    repeat_counts[match_name] = 0;
                }
                repeat_counts[match_name]++;
            }
            for (var name in repeat_counts) {
                errorGroup.push(repeat_counts[name] + ' x ' + name.replace(/git:\s+/, ''));
                for (var i = 0 ; i < known_issues_extracted.length ; i++) {
                    if (name == known_issues_extracted[i].known_issue_match.description) {
                        errorGroup.push(known_issues_extracted[i].original_text);
                        errorGroup.push('        ' + known_issues_extracted[i].known_issue_match.bug);
                        break;
                    }
                }
            }
        }
        return unkownIssueCount;
    }

    function updateVisualResults() {
        var thereAreFailures = (newUnit.results.overallSummary.errorMessages.length > 0 || newUnit.results.overallSummary.a11yErrorMessages.length > 0);
        var thereAreExceptions = newUnit.results.overallSummary.exceptionMessages.length > 0;
        var results = newUnit.results.toString();

        if (thereAreFailures) {
            var errorsRemain = modifyResultsForKnownIssues(newUnit.results.overallSummary.errorMessages);
            var a11yRemain = modifyResultsForKnownIssues(newUnit.results.overallSummary.a11yErrorMessages);
            thereAreFailures = errorsRemain || a11yRemain;
        }
        if (thereAreExceptions) {
            thereAreExceptions = modifyResultsForKnownIssues(newUnit.results.overallSummary.exceptionMessages);
        }

        // if results are not available, then this was called by Known Issues Data Loading.
        if (newUnit.runtime.testResultsAvailable) {
            if (thereAreExceptions) {
                // newUnitReporter.displayExceptionIcon(results, hsrQUnitReRun);
                newUnitReporter.displayFailIcon(results, hsrQUnitReRun);
            } else if (thereAreFailures) {
                newUnitReporter.displayFailIcon(results, hsrQUnitReRun);
            } else {
                newUnitReporter.displayPassIcon(results, hsrQUnitReRun);
            }
        }
    }

    if (localStorage.add_ewe_git_known_issues) {
        var known_issue_option = {
            description: "ewe github known issues file.  todo: can we see the latest, or is the token for a version",
            dataSource: "https://ewegithub.sb.karmalab.net/raw/tocoleman/new-unit-known-issues/master/known_issues.js?token=AAAHHdG5xka1k89sUC-HxRKDq_IeOfrlks5Yy_LXwA%3D%3D&rnd=" + new Date().getTime(),
            dataRequested: false,
            dataLoadComplete: false,
            issues: []
        };

        console.log('adding ewe git known issue for testing in trunk.');
        newUnit.knownIssues.push(known_issue_option);
    }

    try {
        qunit_trace('add css for visual code coverage.');
        var sheet = window.document.styleSheets[0];
        sheet.insertRule('.qunit_red_dashed_box { border-color: red; border-width: 4px; border-style: dashed }', sheet.cssRules.length);
        sheet.insertRule('.qunit_blue_dashed_box { border-color: blue; border-width: 2px; border-style: dashed }', sheet.cssRules.length);
    } catch(e) {
        qunit_trace('failed to add css for code coverage.');
    }

    function qunit_trace() {}

    /* to see trace output set local storage in the browser console.
        localStorage.show_trace = 1;
        to remove again :
        delete localStorage.show_trace;
    */
    if (localStorage.show_trace) {
        qunit_trace = window.console.log;
    }

    /* object to push onto array  newUnit.results.tests */
    function TestResults( module, testName, startTime){
        this.module = module;
        this.testName = testName;
        this.startTime = startTime || Date.now();
        this.endTime = startTime;
        this.exception = 0;
        this.assertions = [];

        function recordResult( passFail, message, endTime){
            this.endTime = endTime || Date.now();
        }
    }

    function AssertResults( parentTest, message, result, exception, selector ){
        // this.parentTest = parentTest;
        this.message = message;
        this.result = result;
        this.exception = 0 || exception;
        this.lineNumber = -1;
        this.selector = selector
    }

    function registerForCallback(trigger, callback ) {
        qunit_trace('register for callback: ' + trigger);

        if (!callbacks[trigger]) {
            callbacks[trigger] = [];
        }

        callbacks[trigger].push(callback);
    }

    function invokeCallback(trigger) {
        if (callbacks[trigger]) {
            qunit_trace('invoking callback for: ' + trigger);

            for (var i = 0; i < callbacks[trigger].length; i++) {
                try {
                    callbacks[trigger][i].call();
                } catch(e) {
                    console.error('failed to callback index: ' + i + ' for trigger: ' + trigger);
                    console.error(e);
                }
            }
        }
    }

    function generateResultSummary() {
        var resultStr = "*** Result Summary ***\n";

        resultStr += "Execution Time: " + new Date(newUnit.stats.startTime).toString() + "\n\n";
        resultStr += "Page: " + newUnit.results.overallSummary.pageName + "\n\n";
        resultStr += "Url: " + window.document.URL + "\n\n";
        resultStr += "Bucketing Info:\n" + newUnit.results.overallSummary.list1 + "\n\n";
        resultStr += "Monitor Size: " + newUnit.results.overallSummary.ScreenDimension + "; ";
        resultStr += "Browser Size: " + newUnit.results.overallSummary.BrowserDimension + "; ";
        resultStr += "Document Size: " + newUnit.results.overallSummary.DocumentDimension + "\n\n";
        resultStr += "Test executed: " + newUnit.results.overallSummary.totalTestCount + "; ";
        resultStr += "Passed: " + newUnit.results.overallSummary.passedTestCount + "; ";
        resultStr += "Failed: " + newUnit.results.overallSummary.failedTestCount + "\n\n";
        resultStr += "Total Assertions: " + newUnit.results.overallSummary.totalAssertionCount + "; ";
        resultStr += "\tPassed: " + newUnit.results.overallSummary.passedAssertionCount + "; ";
        resultStr += "\tFailed: " + newUnit.results.overallSummary.failAssertionCount + "\n\n";
        resultStr += "\tAcceptance Total: " + newUnit.results.overallSummary.acceptanceCount + "; ";
        resultStr += "\tAcceptance Failed: " + newUnit.results.overallSummary.acceptanceFailed + "\n\n";

        resultStr += "Elapsed time: " + newUnit.results.overallSummary.totalTestRuntime + "ms\n\n";

        resultStr += "Help:  https://confluence/display/POS/NewUnit+Results+easy+to+Debug\n";
        if (this.overallSummary.errorMessages.length > 0) {
            resultStr += "to see test failures in the browser console:\n";
            resultStr += "\tlocalStorage.qunitShowTestFailuresInConsole = 1\n";
            resultStr += "\tdelete localStorage.qunitShowTestFailuresInConsole\n\n";
        }
        resultStr += "*** List of failing tests ***\n";
        resultStr += this.overallSummary.errorMessages.join('\n');

        resultStr += "\n\n*** List of failing Accessibility tests ***\n";
        resultStr += this.overallSummary.a11yErrorMessages.join('\n');

        if (this.overallSummary.a11yErrorMessages.length > 0) {
            resultStr += "\n\nPlease see:\n\nhttps://confluence/display/POS/Expedia+AxE+diagnostics";
        }

        if (newUnit.config.isSet('verbose')) {
            resultStr += "\n\n\n\n*** Verbose Result Details ***\n";

            for (var i = 0; i < newUnit.results.tests.length; i++) {
                var dat = '';
                var dat2 = '';

                dat = '\n\t' + newUnit.results.tests[i].testName + '\t';
                dat2 += '\n\n' + dat + '#assertions: \t' + newUnit.results.tests[i].assertions.length;
                for (var j = 0; j < newUnit.results.tests[i].assertions.length; j++) {
                    dat2 += dat + newUnit.results.tests[i].assertions[j].message;
                }

                resultStr += dat2;
            }
            resultStr += '\n\n Done *****';

            if (undefined != window.pageModel) {
                resultStr += '\n\n Hotel list *****';

                for (var i = 0; i < window.pageModel.results.length; i++) {
                    var dat = '\n\t' + 'HotelId: \t' + window.pageModel.results[i].hotelId + '\t Name: \t' + window.pageModel.results[i].normalizedHotelName;
                    resultStr += dat;
                }

                resultStr += '\n\n Hotel list Done *****';
            }
        }

        return resultStr;
    }
    
    newUnit.results.dumpResultsAll = function(){
        newUnit.results.dumpResultsFailures( true, true );
    };

    newUnit.results.dumpResultsFailures = function(show_pass, show_fail){
        // window.console.log( JSON.stringify(newUnit.results.tests);

        console.log('elapsed time : Module name : test name');
        console.log('  assert result : assert message');

        // default to show only failures.
        if( !show_pass && !show_fail )
        {
            show_fail = true;
        }

        var total_elapsed = 0;
        var success_count = 0;
        var failure_count = 0;
        var pass_output = [];
        var fail_output = [];

        for( var test_index = 0 ; test_index < newUnit.results.tests.length ; test_index++ )
        {
            var t = newUnit.results.tests[test_index];
            var dur = t.endTime - t.startTime;
            total_elapsed += dur;

            var trace_test_name_pass = '';
            var trace_test_name_fail = '';
            var trace_module_name = dur + ' : ' + t.module + ' : ' + t.testName;

            for( var assert_index = 0 ; assert_index < t.assertions.length ; assert_index++ )
            {
                var a = t.assertions[assert_index];
                var pass_or_fail = '';
                var trace_output = '';
                if( a.result )
                {
                    success_count++;

                    if( !trace_test_name_pass )
                    {
                        /* lame attempt to give summary groups */
                        trace_test_name_pass = trace_module_name;
                        pass_output.push( trace_test_name_pass );
                    }
                    pass_or_fail = 'pass';
                    trace_output = '  ' + pass_or_fail + ' : ' + a.message;
                    pass_output.push( trace_output );
                }
                else
                {
                    failure_count++;

                    if( !trace_test_name_fail )
                    {
                        /* lame attempt to give summary groups */
                        trace_test_name_fail = trace_module_name;
                        fail_output.push( trace_test_name_fail );
                    }
                    pass_or_fail = 'fail';
                    trace_output = '  ' + pass_or_fail + ' : ' + a.message;
                    fail_output.push( trace_output );
                }
                if( a.exception && a.exception != 'undefined' )
                {
                    var trace_exception = '    ' + a.exception;
                    fail_output.push( trace_exception );
                }
            }
        }
        if( show_pass )
        {
            for( var i = 0 ; i < pass_output.length ; i++ )
            {
                console.log( pass_output[i] );
            }
        }
        if( show_fail )
        {
            console.log( '*** failures ***' );
            for( var i = 0 ; i < fail_output.length ; i++ )
            {
                console.log( fail_output[i] );
            }
        }
        console.log( success_count+' passed, ' +failure_count+ ' failed in ' +total_elapsed+ 'ms' );
    };

    newUnit.tests.convert_a11y_results = function() {
        // iterate through newUnit.resultsA11y, convert over to newUnit.results, so that reporting pulls in the info.

        var entityMap = {
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': '&quot;',
            "'": '&#39;',
            "/": '&#x2F;'
        };

        function escapeHtml(string) {
            return String(string).replace(/[&<>"'\/]/g, function (s) {
                return entityMap[s];
            });
        }

        newUnit.results.overallSummary.a11yErrorMessages = [];

        var module_name = 'axe_scan';
        var convert_results = '[a11y trace] done converting results for a11y:';
        if (newUnit.resultsA11y.hasOwnProperty('passes')) {
            // a single QUnit TestResult represents all of the Accessibility stuff.
            // this will be pushed on the tests array.

            var test_result = true;

            convert_results += ' passes: ' + newUnit.resultsA11y.passes.length;

            for (var i = 0; i < newUnit.resultsA11y.passes.length; i++) {
                var a11y_result_pass = newUnit.resultsA11y.passes[i];

                var test_name = a11y_result_pass.id || 'a11y_test_name';

                var qunit_a11y_test = new TestResults( module_name, test_name, 0 );
                newUnit.results.tests.push( qunit_a11y_test );

                qunit_a11y_test.description = a11y_result_pass.description;
                qunit_a11y_test.help = a11y_result_pass.help;
                qunit_a11y_test.help_url = a11y_result_pass.helpUrl;
                // hack alert, prevent this from showing up in the list of "normal" failures.
                qunit_a11y_test.logged = true;

                var nodes = a11y_result_pass.nodes;
                for (var n = 0 ; n < nodes.length ; n++) {
                    var node = nodes[n];
                    var not_used = 'a11y_test';
                    var target = node.target[0];
                    var array_with_item = node.any;
                    if (array_with_item.length < 1) {
                        array_with_item = node.all;
                    }
                    if (array_with_item.length < 1) {
                        array_with_item = node.none;
                    }
                    if (array_with_item.length < 1) {
                        var stop_here = 1;
                    }
                    var assert_message = array_with_item[0].message;

                    var qunit_a11y_assert = new AssertResults( not_used, assert_message, test_result );
                    qunit_a11y_assert.lineNumber = target;

                    qunit_a11y_test.assertions.push(qunit_a11y_assert);
                }
            }

            // now add in the a11y failures
            // todo: put them in with the passed tests, grouped by tests.
            if (newUnit.resultsA11y.hasOwnProperty('violations')) {

                var test_result = false;

                // for now , put all violations together in one test
                var qunit_a11y_test = new TestResults( module_name, test_name, 0 );
                newUnit.results.tests.push( qunit_a11y_test );

                convert_results += ', violations: ' + newUnit.resultsA11y.violations.length;

                var a11y_error_index = 0;
                var unique_error_text_items = [];

                for (var i = 0 ; i < newUnit.resultsA11y.violations.length ; i++) {
                    var a11y_result_violation = newUnit.resultsA11y.violations[i];

                    qunit_a11y_test.description = a11y_result_violation.description;
                    qunit_a11y_test.help = a11y_result_violation.help;
                    qunit_a11y_test.help_url = a11y_result_violation.helpUrl;

                    var test_name = a11y_result_violation.id;
                    test_name = 'a11y_violations';

                    var nodes = a11y_result_violation.nodes;
                    for (var n = 0 ; n < nodes.length ; n++) {
                        var node = nodes[n];
                        var not_used = 'a11y_test';
                        var target = node.target[0];
                        var array_with_item = node.any;
                        if (array_with_item.length < 1) {
                            array_with_item = node.all;
                        }
                        if (array_with_item.length < 1) {
                            array_with_item = node.none;
                        }
                        if (array_with_item.length < 1) {
                            var stop_here = 1;
                        }
                        var assert_message = array_with_item[0].message;

                        var qunit_a11y_assert = new AssertResults( not_used, assert_message, test_result );
                        qunit_a11y_assert.lineNumber = target;


                        var a11y_failure = a11y_result_violation.id + ' : ';
                        a11y_failure += assert_message;
                        for (var tar = 0 ; tar < a11y_result_violation.nodes.length ; tar++) {
                            a11y_failure += '\n  : ' + a11y_result_violation.nodes[tar].target;
                        }
                        a11y_failure = escapeHtml(a11y_failure);

                        // todo: figure out why there are duplicates.
                        if (unique_error_text_items.indexOf(a11y_failure) > -1) continue;

                        unique_error_text_items.push(a11y_failure);

                        a11y_failure = a11y_error_index + ' : ' + a11y_failure;
                        newUnit.results.overallSummary.a11yErrorMessages.push(a11y_failure);
                        qunit_a11y_test.assertions.push(qunit_a11y_assert);
                        a11y_error_index++;
                    }
                }
            }
            console.log(convert_results);
        }
    };

    function runA11yTests(args) {
        if ('undefined' == typeof axe) {
            qunit_trace('[a11y trace] unable to find axe library, include axe.js from DeQue via experiment 8741.');
            return;
        }
        axe.a11yCheck(document, function (results) {
            newUnit.resultsA11y = results;
            if (localStorage['qunit_block_a11y']) {
                qunit_trace('[a11y trace] to unblock tracing:  delete localStorage["qunit_block_a11y"]');
            } else {
                qunit_trace('showing qunit result details, to block them use:  localStorage["qunit_block_a11y"] = 1');
                for (var i = 0; i < results.violations.length; i++) {
                    qunit_trace('[a11y trace]id: ' + results.violations[i].id);
                    qunit_trace('[a11y trace]tags: ' + results.violations[i].tags.join(','));
                    for (var n = 0; n < results.violations[i].nodes.length; n++) {
                        var node = results.violations[i].nodes[n];
                        qunit_trace('[a11y trace]  ' + node.target);
                        for (var a = 0; a < node.any.length; a++) {
                            var any = node.any[a];
                            qunit_trace('[a11y trace]    any : ' + any.id + ' : ' + any.message);
                        }
                        for (var a = 0; a < node.all.length; a++) {
                            var all = node.all[a];
                            qunit_trace('[a11y trace]    all : ' + all.id + ' : ' + all.message);
                        }
                        for (var a = 0; a < node.none.length; a++) {
                            var none = node.none[a];
                            qunit_trace('[a11y trace]    none: ' + none.id + ' : ' + none.message);
                        }
                    }
                }
                qunit_trace('[a11y trace] please use extension: https://chrome.google.com/webstore/detail/axe/lhdoppojpmngadmnindnejefpokejbdd?hl=en-US');
                qunit_trace('[a11y trace] raw results in memory:  newUnit.resultsA11y');
                qunit_trace('[a11y trace] to block this trace:  localStorage["qunit_block_a11y"] = 1');
            }

            qunit_trace('[a11y trace] result count is: ' + results.violations.length);
            //window.console.log('[results]' + JSON.stringify(results));

            newUnit.tests.convert_a11y_results();

            // if no failures, then don't change anything.

            //if (results.violations.length > 0) {
            //    newUnit.helpers.showSummaryIcon(true);
            //}

            // update the icons to show red if any a11y errors showed up.
            // do not call this again, as it forgets about previously converted failures.
            //newUnit.helpers.convertQUnitResults();
        });
    }

    function runAllTests(avoidDelay) {
        if (avoidDelay) {
            runAllTestsImpl();
        } else {
            // several tests are adding a delay before running.
            // rather than have them all delay, add one here.
            // todo: make this configurable.
            setTimeout(runAllTestsImpl, 2000);
        }
        newUnitReporter.loadKnownIssues();
    }
    function runAllTestsImpl() {
        newUnitReporter.displayInProgressIcon(hsrQUnitReRun);

        require(testSuites, function() {
            addAcceptanceTagIfSandbox();

            var testSuiteDetails = mapTestSuitesToDetails(testSuites, arguments);
            var testsToRun = filterTestsToRun(testSuiteDetails);
            var allTests = [];

            // Start all non-delayed tests and store them in a collection
            newUnit.stats.startTime = window.Date.now();
            for (var i = 0; i < testsToRun.length; i++) {
                allTests.push(runTest(testsToRun[i]));
            }

            // Wait for all tests to complete
            Promise.all(allTests).then(function() {
                waitForAsyncToComplete();
            });
        });
    }

    function waitForAsyncToComplete() {
        newUnit.trace.info("wait : enter : waitForAsyncToComplete");
        var okToWaitSomeMore = false;
        for (var asyncSuiteName in newUnit.runtime.asyncTests) {
            var suite = newUnit.runtime.asyncTests[asyncSuiteName];
            if (suite.timeCompleted) {
                continue;
            }
            if (suite.progressIndicator) {
                newUnit.trace.info("wait : async test : " + asyncSuiteName + " : " + suite.progressIndicator);

                okToWaitSomeMore = true;
                suite.progressIndicator = 0;
            }
        }
        if (okToWaitSomeMore) {
            setTimeout(waitForAsyncToComplete, newUnit.runtime.maxTimeToWaitForAsyncTestProgress);
            return;
        }
        // All tests completed
        // todo: add support for ansync test completion, such as click tests
        newUnit.trace.info("wait : exit : waitForAsyncToComplete : invoke callbacks : done");
        invokeCallback('done');
    }

    var testSuiteModel = {
        name: undefined,
        run: undefined,
        delay: 0,
        tags: undefined
    };

    function mapTestSuitesToDetails(testSuites, args) {
        var testSuiteDetails = {};

        if (args !== undefined) {
            _.each(args, function (arg, index) {
                var testSuiteName = testSuites[index];
                var testSuite;

                if (arg.run) {
                    // the test module provided a single object in the return value
                    testSuite = Object.create(testSuiteModel);
                    testSuite.name = testSuiteName;
                    testSuite.run = arg.run;
                    testSuite.delay = arg.delay;
                    testSuite.tags = arg.tags;

                    testSuiteDetails[testSuiteName] = testSuite;
                } else if (arg.runners) {
                    // the test module provided an array in the return value
                    for (var i = 0 ; i < arg.runners.length ; i++) {
                        testSuite = Object.create(testSuiteModel);
                        var argRunner = arg.runners[i];
                        testSuite.name = argRunner.testSuiteName || testSuiteName;
                        testSuite.run = argRunner.run;
                        testSuite.delay = argRunner.delay;
                        testSuite.tags = argRunner.tags;

                        if (testSuiteDetails[testSuiteName]) {
                            testSuiteName += '_' + i;
                        }
                        testSuiteDetails[testSuiteName] = testSuite;
                    }
                } else {
                    console.error('test module ' + testSuiteName + ' does not have tests to run.');
                    console.error('when defining your amd test module, return an object with "run" and "tags"');
                    console.error('or return an array of objects named "runners"');
                }
            });
        }

        return testSuiteDetails;
    }

    function addAcceptanceTagIfSandbox() {
        var isHotelPage = (newUnit.config.urlValues.isHotelSearch || newUnit.config.urlValues.isHotelInformation);
        var isSandbox = document.URL.indexOf('.sandbox.') > -1 || document.URL.indexOf('localhost')  > -1;
        // var isHSRSkelly = document.URL.match(/hotel_search.*.html/);  // test environments
        // var isHSRSkelly = $('[data-cached-skeleton=true]').length > 0;
        var isHsrAcceptanceSet = newUnit.config.isSet('testModules', 'HSRAcceptance');

        // if the URL has qunit=1 , and no tags are in use, then everything would run
        // to avoid this, add acceptance here.  Otherwise every possible test will run.
        if (newUnit.config.urlValues.qunit == '1') {
            if (!newUnit.config.isSet('tagsToRun')) {
                newUnit.config.AppendTagToRun('acceptance');
                newUnit.config.AppendTagToRun('regression');
            }
        }

        // if this is a hotel page, and the acceptance is requested, or this is the sandbox
        // then run acceptance tests, unless qunit is set to 0
        if ( isHotelPage && (isHsrAcceptanceSet || isSandbox) ) {
            if (!newUnit.config.isSet('qunit', '0')) {
                newUnit.config.urlValues.qunit = '1';

                if (!newUnit.config.isSet('tagsToRun')) {
                    newUnit.config.AppendTagToRun('acceptance');
                    newUnit.config.AppendTagToRun('regression');
                }
            }
        }
    }

    /*

        to run a non acceptance test:

        tagsToRun=clickTests,

     */
    function filterTestsToRun(srcTestsToRun) {
        newUnit.trace.info("SetupRunAllTests new framework.");

        var execTestList = [];
        //var tags = newUnit.config.urlValues.tagsToRun;
        //Queue up all the tests to execute
        for( var testName in srcTestsToRun ) {
            if (srcTestsToRun.hasOwnProperty(testName)) {
                var testSuite = srcTestsToRun[testName];

                try {
                    if (newUnit.config.isSet('qunit', '1') && !newUnit.config.isSet('tagsToRun')) {
                        execTestList.push(testSuite);
                        newUnit.trace.info("**************** queue up the next test - isQUnitRun and  NO tagsToRun : " + testName);
                    } else if (newUnit.config.isSet('qunit', '1') && newUnit.config.isSet('tagsToRun')) {
                        // implementing a 'or' filter so if tags has multiple entries
                        if (newUnit.runtime.testSuiteHasTag(testSuite, newUnit.config.urlValues.tagsToRun)) {
                            execTestList.push(testSuite);
                            newUnit.trace.info("**************** tag match, queue up test - tagsToRun matched - " + testName);
                        }
                    } else if (newUnit.config.isSet('testModules')) {
                        if (newUnit.config.isSet('testModules', testName) ||
                            newUnit.config.isSet('testModules', '*')) {
                            execTestList.push(testSuite);
                            newUnit.trace.info("**************** queue up the next test testModules - " + testName);
                        }
                    } else {
                        newUnit.trace.error('failed to queue test: ' + testName);
                    }
                }
                catch (e) {
                    newUnit.trace.error('failed to queue test: ' + testName);
                    newUnit.trace.error(e);
                }
            }
        }

        return execTestList;
    }

    /* method to set global module name. */
    function module(module_name) {
        if( newUnit.runtime.currentModuleName && module_name !== newUnit.runtime.currentModuleName ){
            invokeCallback('moduleDone');
        }
        newUnit.runtime.currentModuleName = module_name;
        invokeCallback('moduleStart');

        if( newUnit.config.traceResultsAsAvailable ){
            newUnit.trace.info('entering module: ' + module_name );
        }
    }

//FUNCTION OBJECT THAT REPRESENT A TEST
    function test(test_name, tests) {
        if( newUnit.config.traceResultsAsAvailable ){
            newUnit.trace.info('running tests: ' + test_name );
        }
        newUnit.runtime.currentTestName = test_name;
        invokeCallback('testStart');

        var startTime = Date.now();
        var newTest = new TestResults( newUnit.runtime.currentModuleName, test_name, startTime );
        newUnit.runtime.currentTestObj = newTest;
        newUnit.results.tests.push( newTest );

        try{
            //TODO: READ FROM QUNIT.CONFIG AND DECIDE IF THIS TEST SHOULD RUN OR NOT.
            tests();
        } catch(e) {
            var exceptionMessage = "\tTest " + test_name + " is terminated due to an exception. Message: " + e.message + " Stack Trace: \n" + e.stack;

            newUnit.results.overallSummary.errorMessages.push(exceptionMessage);
            newUnit.results.overallSummary.exceptionMessages.push(exceptionMessage);

            newTest.exception = e;
            if( newUnit.config.traceResultsAsAvailable ){
                newUnit.trace.error( 'exception: ' + e.message );
                newUnit.trace.error( 'exception during test: ' + test_name );
            }
            if (localStorage.qunitShowTestFailuresInConsole) {
                // give just the message and first line of code.
                // [^\r\n]+   =   .*   =   anything but a carriage return
                // [\r\n]+   =   line break
                // [\s\S]+   =   anything, including carriage return.
                console.error('new-unit test code error: ' + e.stack.replace(/ ([^\r\n]+[\r\n]+[^\r\n]+)[\s\S]+/, '$1'));
            }
        }
        var endTime = Date.now();
        newTest.endTime = endTime;

        var duration = endTime - startTime;
        newUnit.stats.elapsedRunTime += duration;

        invokeCallback('testDone');
        newUnit.results.triggerDelayTestDone();
    }

    /* There may be many delayed tests.
     Batch up many results together
     by waiting some delay before triggering completion.
     If a new batch is done before the delay has passed, then reset the wait.
     */
    newUnit.runtime.maxTimeToWaitForResults = 30000;
    newUnit.results.triggerDelayTestDone = function( ){
        if( newUnit.results.pendingWaitToTriggerDone ){
            clearTimeout( newUnit.results.pendingWaitToTriggerDone );
        } else {
            // reset delay as each test run cycle is started.
            newUnit.runtime.maxTimeToWaitForResults = 30000;
        }
        newUnit.results.pendingWaitToTriggerDone = setTimeout( function(){
            newUnit.runtime.maxTimeToWaitForResults -= newUnit.results.pendingWaitToTriggerDelayMS;

            if ( newUnit.runtime.maxTimeToWaitForResults > 0 &&
                !newUnit.runtime.registeredDelayedTestsHaveCompleted) {
                newUnit.results.triggerDelayTestDone();
                return;
            }
            if (newUnit.runtime.maxTimeToWaitForResults < 0) {
                qunit_trace('*** max delay was waited for tests to finish ***');
            }

            newUnit.results.pendingWaitToTriggerDone = 0;
            invokeCallback('delayedTestDone');
        }, newUnit.results.pendingWaitToTriggerDelayMS);
    };

    newUnit.trace.dump = function(){
        for( var i = 0 ; i < newUnit.trace.history.length ; i++ )
        {
            window.console.log(newUnit.trace.history[i]);
        }
    };

    newUnit.trace.info = function(message){
        try {
            newUnit.trace.history.push( Date.now() + ' : info : ' + message );
            if (newUnit.config.urlValues.showTrace) {
                window.console.log('QUnit: ' + message);
            }
        }
        catch (e) {
            newUnit.trace.error('error tracing output.');
            newUnit.trace.error(e.message);
        }
    };

    if (newUnit.config.urlValues.showTraceNoHistory || localStorage.showTraceNoHistory) {
        newUnit.trace.info = console.log;
    }

    newUnit.trace.error = function(message, context) {
        var ex_msg = message + '\n';
        try {
            if( arguments && arguments.callee && arguments.callee.caller )
            {
                // console.error('QUnit error in: ' + arguments.callee.caller.name);
                ex_msg += arguments.callee.caller.name;
                if( arguments.callee.caller.caller )
                {
                    // console.error('QUnit error in: ' + arguments.callee.caller.caller.name);
                    ex_msg += "\n" + arguments.callee.caller.caller.name;
                    if( arguments.callee.caller.caller.caller )
                    {
                        // console.error('QUnit error in: ' + arguments.callee.caller.caller.caller.name);
                        ex_msg += "\n" + arguments.callee.caller.caller.caller.name;
                    }
                }
            }
            if( context )
            {
                newUnit.trace.history.push( new Date().toUTCString() + ' : context : ' + context );
                ex_msg += 'QUnit: context: ' + context;
            }
            newUnit.trace.history.push( new Date().toUTCString() + ' : error : ' + ex_msg );
            if (newUnit.config.urlValues.showTrace) {
                console.error('QUnit err: ' + ex_msg);
            }
        }
        catch (e) {
            //TODO: NEED TO REVISIT THIS.. IMO WE SHOULD EITHER SHOW SOMETHING IN CONSOLE OR NOT CATCHING THE EXCEPTION
            var something_wrong = 1;
            // do nothing.
        }
        // throw('\nexception: ' + ex_msg);
        try
        {
            // only add detailed qunit failures when requested.
            if (newUnit.config.urlValues.showTrace) {
                newUnit.pushFailure( "Exception in test code:\n" + ex_msg, this.stack );
            }
        }
        catch(e)
        {
            var place_breakpoint_here = 1;
            // this fails if outside the test context.
        }
    };

    newUnit.helpers.resetTestResults = function() {
        newUnit.results.currentSummary = [];
        newUnit.results.tests = [];
        newUnit.results.overallSummary.a11yErrorMessages = [];
        newUnit.results.overallSummary.errorMessages = [];
        newUnit.results.overallSummary.exceptionMessages = [];
        newUnit.results.overallSummary.totalTestCount = 0;
        newUnit.results.overallSummary.passedTestCount = 0;
        newUnit.results.overallSummary.failedTestCount = 0;
        newUnit.results.overallSummary.totalAssertionCount = 0;
        newUnit.results.overallSummary.passedAssertionCount = 0;
        newUnit.results.overallSummary.failAssertionCount = 0;
        newUnit.results.overallSummary.totalTestRuntime = 0;
        newUnit.results.overallSummary.acceptanceCount = 0;
        newUnit.results.overallSummary.acceptanceFailed = 0;

        newUnit.helpers.summary_to_log = resetSummaryObject();
        newUnit.helpers.pending_summary_log = 0;
        newUnit.stats.startTime = 0;
        newUnit.stats.endTime = 0;
        newUnit.stats.elapsedRunTime = 0;

        newUnit.runtime.testResultsAvailable = false;
    };

    // TODO: Why are there HSR specific functions in newUnit?
    function hsrQUnitReRun() {
        // URL may have changed, do not change config from initial page load
        //newUnit.helpers.extractConfigFromUrl(window.document.URL);
        newUnit.helpers.resetTestResults();
        newUnit.tests.runAllTests('noDelay');
    }

// DESCRIPTION:
// THIS METHOD IS CALLED WHEN THE TEST EXECUTION COMPLETES AND THE FRAMEWORK START LOGGING RESULTS TO SPLUNK.
// IT LOOPS THROUGH EACH TEST AND THE ASSERTION RESULTS CONTAINED
    newUnit.helpers.convertQUnitResults = function (){
        var errors = [];
        var errorMessages = [];
        var types = {};
        var testCount = 0;
        var assertionCount = 0;
        var passCount = 0;
        var failCount = 0;
        var acceptanceTotalCount = 0;
        var acceptanceFailCount = 0;
        var totalTestRuntime = 0;

        for (var i = 0 ; i < newUnit.results.tests.length ; i++) {
            var result=newUnit.results.tests[i];
            var filename = 'file_unknown';
            var environment = 'env_unknown';
            var version = 'version_unknown';
            var failPoint = 'failPoint_unknown';
            var testType = 'regression';
            var isAcceptance = false;
            /* $TODO - 1. Add switch statement to classify all the test types. Need to classify the tests to make this work
             *  $TODO - 2. HSR should use the same mapping convention as HIS tests. Need to communicate with HIS to get the list of test moduel names
             */
            if( result.module.search('Acceptance:') == 0 || (result.testName && result.testName.search('Acceptance:') == 0))
            {
                testType = 'acceptance';
                isAcceptance = true;
            }

            // Getting the build version - the following query will get URL for on HIS and HSR page
            // "http://wwwexpediacom.trunk.sb.karmalab.net/minify/uitk-only-header-bundle-min-2059231131.js?v=trunk-trunk-ci-1071077-1"
            var testUrl=$('head').find('script[src*="uitk-only-header"]').attr('src');
            var matches = /(http.*?\.js)\?v=(.*?)-(\d\d\d\d\d\d\d?)-\d*$/.exec(testUrl);
            if( matches && matches.length > 3 )
            {
                filename = matches[1];
                environment = matches[2];
                version = matches[3];
            }

            if (result.module && result.module == 'axe_scan') {
                // hack to avoid logging a11y issues.
                result.logged = true;
            }

            if (result.logged!=true) {
                testCount++;
                totalTestRuntime = totalTestRuntime + (result.endTime - result.startTime);
                result.logged = true;

                //Checking the assertion results contained in each test.
                //If all assertions pass, then the test passes. The test fails otherwise.
                var assertFailCount = 0;
                for (var as = 0 ; as < result.assertions.length ; as++) {
                    var assertion = result.assertions[as];
                    assertionCount++;
                    if( isAcceptance ){
                        acceptanceTotalCount++;
                    }
                    if (!assertion.result) {
                        if (!types[result.testName]) {
                            assertFailCount++;
                            if( isAcceptance ){
                                acceptanceFailCount++;
                            }
                            errors.push(
                                {
                                    'module': result.module,
                                    'test': result.testName,
                                    'testType': testType,
                                    'cause': assertion.message,
                                    'environment': environment,
                                    'version': version,
                                    'failPoint': failPoint,
                                    'filename': filename
                                }
                            );
                            qunit_trace('errorMessages : pushing error onto temp stack.');
                            //errorMessages.push(errorMessages.length + ": " + assertion.message);
                            errorMessages.push("\t" + assertion.message);
                        }
                        // TODO: Add a flag to show all errors
                        // types[result.testName] = 1;
                    }
                }

                if(assertFailCount === 0){
                    result.isPassed = true;
                    passCount++;
                }
                else{
                    result.isPassed = false;
                    failCount++;
                }
            }
        }

        newUnit.results.overallSummary.ScreenDimension = screen.width + 'x' + screen.height;
        newUnit.results.overallSummary.BrowserDimension = deviceInfo.getWidth() + 'x' + deviceInfo.getHeight();
        newUnit.results.overallSummary.DocumentDimension = $(document).width() + 'x' + $(document).height();
        newUnit.results.overallSummary.totalTestCount += testCount;
        newUnit.results.overallSummary.passedTestCount += passCount;
        newUnit.results.overallSummary.failedTestCount += failCount;
        newUnit.results.overallSummary.totalAssertionCount += assertionCount;
        newUnit.results.overallSummary.passedAssertionCount += (assertionCount - errors.length);
        newUnit.results.overallSummary.failAssertionCount += errors.length;
        newUnit.results.overallSummary.totalTestRuntime += totalTestRuntime;
        newUnit.results.overallSummary.acceptanceCount += acceptanceTotalCount;
        newUnit.results.overallSummary.acceptanceFailed += acceptanceFailCount;

        if( "undefined" == typeof( dctk.omtr ) ) {
            // TODO: dctk.omtr should not be undefined, please investigate it
            newUnit.trace.info("enter function: newUnit.helpers.convertQUnitResults");
            newUnit.trace.info("dctk.omtr=='undefined'");
            newUnit.results.overallSummary.pageName = "undefined";
            newUnit.results.overallSummary.list1 = "undefined";
            newUnit.trace.info("newUnit.results.overallSummary.pageName == 'undefined'");
            newUnit.trace.info("newUnit.results.overallSummary.list1 == 'undefined'");
        } else {
            newUnit.results.overallSummary.pageName = dctk.omtr.pageName;
            newUnit.results.overallSummary.list1 = dctk.omtr.list1;
        }

        if (0 != errorMessages.length){
            qunit_trace('errorMessages : concat errors : ' + errorMessages.length);
        }

        newUnit.results.overallSummary.errorMessages = newUnit.results.overallSummary.errorMessages.concat(errorMessages);

        var currentSummary_pageName = "";
        var currentSummary_list1 = "";
        if( "undefined" == typeof( dctk.omtr ) ) {
            newUnit.trace.info("dctk.omtr=='undefined'");
            currentSummary_pageName= "undefined";
            currentSummary_list1 = "undefined";
            newUnit.trace.info("newUnit.results.currentSummary.pageName == 'undefined'");
            newUnit.trace.info("newUnit.results.currentSummary.list1 == 'undefined'");
        }
        else {
            currentSummary_pageName= dctk.omtr.pageName;
            currentSummary_list1 = dctk.omtr.list1;
        }
        newUnit.results.currentSummary = {
            'totalTestCount': testCount,
            'passedTestCount': passCount,
            'failedTestCount': failCount,
            'totalAssertionCount': assertionCount,
            'passedAssertionCount': (assertionCount - errors.length),
            'failAssertionCount': errors.length,
            'acceptanceCount': acceptanceTotalCount,
            'acceptanceFailed': acceptanceFailCount,
            'totalTestRuntime': totalTestRuntime,
            'pageName': currentSummary_pageName,
            'Screen Dimension': screen.width + 'x' + screen.height,
            'Browser Dimension': $(window).width() + 'x' + $(window).height(),
            'Document Dimension': $(document).width() + 'x' + $(document).height(),
            'list1': currentSummary_list1
        };

        var retValues = {
            'errors': errors,
            'summaries': newUnit.results.currentSummary
        };

        return retValues;
    };

    /*
     newUnit.config is populated with key value pairs from the url
     */
    newUnit.helpers.extractConfigFromUrl = function( url )
    {
        try {
            newUnit.config.urlValues = {};

            /* first remove everything up to the first ? & or # */
            var url_params = url.replace(/.*?[?&#]+/, '');

            var traceMessage = "";

            newUnit.config.urlValues.showTrace = false;

            if (localStorage.show_trace) {
                newUnit.config.urlValues.showTrace = true;
            }

            traceMessage += 'QUNIT: url args: \n';
            var args = url_params.split(/[#&]+/);
            for (var i = 0; i < args.length; i++) {
                var paramName = "";
                var paramValue = "";
                if (args[i].search(/=/) < 0) {
                    /* skip if there is no equals sign to work with */
                    paramName = args[i];
                }
                else {
                    var kvp = args[i].split('=');
                    paramName = kvp[0];
                    paramValue = kvp[1];
                }

                paramValue = decodeURIComponent(paramValue);

                traceMessage += paramName + ' = ' + paramValue + '\n';

                newUnit.config.urlValues[paramName] = paramValue;
            }

            newUnit.config.urlValues[ 'isHotelSearch'] = (window.location.pathname.indexOf('Hotel-Search' ) > 0);
            newUnit.config.urlValues[ 'isHotelInformation'] = (window.location.pathname.indexOf('Hotel-Information') > 0);
            newUnit.trace.info(traceMessage);
        }
        catch (e) {
            newUnit.trace.error('extract url parameters');
            newUnit.trace.error(e);
        }
    };

    newUnit.helpers.getPosFromUrl = function( url )
    {
        var pos_output = url;
        try
        {
            /* given a URL output a POS
             if no match found, then return the domain.

             US : www.expedia.com
             US : http://wwwexpediacom.trunk.sb.karmalab.net/
             DE : www.expedia.de
             DE : http://wwwexpediade.trunk.sb.karmalab.net/
             */
            /* first remove any http stuff */
            pos_output = pos_output.replace(/http[^/]+[/]+/i, '');
            /* next cut off anything after the domain */
            pos_output = pos_output.replace(/\/.*/, '');

            var pos_only = pos_output;
            /* next remove the expedie.co part from expedia.co.uk */
            pos_only = pos_only.replace(/.*expedia\.?co([^m])/i, '$1');
            /* next remove the expedia part */
            pos_only = pos_only.replace(/.*expedia/i, '');

            /* next remove all starting with anything that has 4 or more letters */
            pos_only = pos_only.replace(/(.*?\.)[a-z]{4}.*/, '$1');

            /* finally remove the periods */
            pos_only = pos_only.replace(/\./g, '');

            /* deal with .com.au */
            if( pos_only.length > 3 )
            {
                pos_only = pos_only.replace(/com/,'');
            }
            /* finally change com to us */
            if( pos_only.search(/^com$/i) > -1 )
            {
                pos_only = 'us';
            }

            if( pos_only.length > 1 )
            {
                pos_output = pos_only;
            }
        }
        catch(e)
        {
            newUnit.trace.error('failed to extract pos from url');
            newUnit.trace.error( e );
        }
        return pos_output.toUpperCase();
    };

    function resetSummaryObject(){
        var newSummaryObject = {
            totalTestCount:   0,
            passedTestCount:  0,
            failedTestCount:  0,
            totalAssertionCount:  0,
            passedAssertionCount: 0,
            failAssertionCount:   0,
            totalTestRuntime: 1,
            errorMessages: [],
            pos: newUnit.helpers.getPosFromUrl(document.URL)
        };

        return newSummaryObject;
    }

    newUnit.helpers.summary_to_log = resetSummaryObject();

    newUnit.helpers.pending_summary_log = 0;

    newUnit.helpers.sendOutSummaryLog = function()
    {
        try {
            newUnit.helpers.pending_summary_log = 0;

            var summaries = newUnit.helpers.summary_to_log;
            var summaryLog = [];
            summaryLog.push('totalTestCount=' + encodeURIComponent(summaries.totalTestCount));
            summaryLog.push('passedTestCount=' + encodeURIComponent(summaries.passedTestCount));
            summaryLog.push('failedTestCount=' + encodeURIComponent(summaries.failedTestCount));
            summaryLog.push('totalAssertionCount=' + encodeURIComponent(summaries.totalAssertionCount));
            summaryLog.push('passedAssertionCount=' + encodeURIComponent(summaries.passedAssertionCount));
            summaryLog.push('failAssertionCount=' + encodeURIComponent(summaries.failAssertionCount));
            summaryLog.push('totalTestRuntime=' + encodeURIComponent(summaries.totalTestRuntime));
            summaryLog.push('pos=' + newUnit.helpers.getPosFromUrl(document.URL));
            if ("undefined" == typeof( dctk.omtr )) {
                // TODO: dctk.omtr should not be undefined, please investigate it
                newUnit.trace.info("enter function: newUnit.helpers.sendOutSummaryLog");
                summaryLog.push('pageName=undefined');
            } else {
                summaryLog.push('pageName=' + dctk.omtr.pageName);
            }
            summaryLog.push('screenDimension=' + screen.width + 'x' + screen.height);
            summaryLog.push('browserDimension=' + deviceInfo.getWidth() + 'x' + deviceInfo.getHeight());
            summaryLog.push('documentDimension=' + $(document).width() + 'x' + $(document).height());
            if ("undefined" == typeof( dctk.omtr )) {
                newUnit.trace.info("dctk.omtr=='undefined'");
                summaryLog.push('list1=undefined');
            } else {
                summaryLog.push('list1=' + dctk.omtr.list1);
            }

            if (newUnit.config.urlValues.jenkins_job) {
                summaryLog.push('jenkinsJob=' + newUnit.config.urlValues.jenkins_job);
            }

            newUnit.helpers.summary_to_log = resetSummaryObject();

            require('logger', function (logger) {
                if (summaries.failedTestCount > 0){
                    error = new Error('failedTestCount > 0');
                    // todo: how can we get a reduced tracelog output going to console.
                    logger.logError('FuncTestSummary', error, summaryLog); // we need to add a dummy error so the DCT doesn't disallow msg
                }
                else {
                    logger.logMessage('FuncTestSummary', summaryLog);
                }
                qunit_trace('FuncTestSummary - ' + (summaries.failedTestCount > 0 ? 'Failed' : 'Passed'));
            });
        }
        catch(e)
        {
            newUnit.trace.error('failed summary log');
            newUnit.trace.error( e );
        }
    };

    newUnit.helpers.delaySummaryLog = function( summaries )
    {
        newUnit.helpers.summary_to_log.totalTestCount += summaries.totalTestCount;
        newUnit.helpers.summary_to_log.passedTestCount += summaries.passedTestCount;
        newUnit.helpers.summary_to_log.failedTestCount += summaries.failedTestCount;
        newUnit.helpers.summary_to_log.totalAssertionCount += summaries.totalAssertionCount;
        newUnit.helpers.summary_to_log.passedAssertionCount += summaries.passedAssertionCount;
        newUnit.helpers.summary_to_log.failAssertionCount += summaries.failAssertionCount;
        newUnit.helpers.summary_to_log.totalTestRuntime += summaries.totalTestRuntime;

        if( newUnit.helpers.pending_summary_log )
        {
            clearTimeout( newUnit.helpers.pending_summary_log );
        }
        newUnit.helpers.pending_summary_log = setTimeout( newUnit.helpers.sendOutSummaryLog, 2000 );
    };

    /* this code was recently moved from infosite specific, trace statements are for debugging */
    newUnit.results.logResults = function(){
        //window.console.log("################## logResults");
        newUnit.trace.info('********** log results enter *************');
        var errors = [];
        var types = {};
        var summaries= {};
        var retResults = newUnit.helpers.convertQUnitResults();
        errors = retResults.errors;
        newUnit.helpers.delaySummaryLog( retResults.summaries );

        newUnit.trace.info('********** log results prepare url *************');
        var splunk_url = 'no_url';
        try {
            splunk_url = document.URL;
            /*
             http:/ /www.expedia.com/
             remove:   Las-Vegas-Hotels-Hilton-Grand-Vacations-Suites-On-The-Las-Vegas-Strip.
             keep:     h921745.Hotel-Information?
             keep:     chkin=04%2F04%2F2014&chkout=04%2F09%2F2014&rm1=a2&
             remove:   hwrqCacheKey=d30f673e-fb72-41fb-830c-ebb766e6366eHWRQ1391707844488&c=d9d34f87-fe14-4763-a31d-f2089cabfb98&
             */
            splunk_url = splunk_url.replace(/([^/]\/)[^/&]+(h\d+)/, '$1$2');
            /* remove hotel name : ^/ / ^/+ h#### -> ^/ / h#### */
            splunk_url = splunk_url.replace(/&hwrq[^&]*=[^&]+/, '&');
            /* remove guids */
            splunk_url = splunk_url.replace(/&c=[^&]+/, '&');
            /* remove guids */
            splunk_url = splunk_url.replace(/&+/g, '&');
            /* duplicate &&&& become & */
            splunk_url = splunk_url.replace(/&/g, '%26');
            /* & become encoded to: %26 */
            splunk_url = splunk_url.replace(/#.*/g, '');
            /* remove everything after # */

            /* convert equals sign to %3D so that splunk will not truncate the url */
            splunk_url = splunk_url.replace(/=/g, '%3D');
        }
        catch (e) {
            /* avoid breaking logging on url cleanup */
        }

        newUnit.trace.info('********** log results process errors *************');
        for (var i = 0; i < errors.length; i++) {
            var err = errors[i];
            var logValues = [];
            logValues.push('module=' + encodeURIComponent(err.module));
            logValues.push('test=' + encodeURIComponent(err.test));
            logValues.push('testType=' + encodeURIComponent(err.testType));
            logValues.push('cause=' + encodeURIComponent(err.cause));
            logValues.push('branch=' + encodeURIComponent(err.environment));
            logValues.push('filename=' + err.filename);
            logValues.push('failPoint=' + err.failPoint);
            logValues.push('url=' + splunk_url);
            logValues.push('pos=' + newUnit.helpers.getPosFromUrl(document.URL));

            if( "undefined" == typeof( dctk.omtr ) ) {
                // TODO: dctk.omtr should not be undefined, please investigate it
                logValues.push('list1=undefined');
            } else {
                logValues.push('list1=' + dctk.omtr.list1);
            }
            if( newUnit.config.urlValues.jenkins_job ){
                logValues.push('jenkinsJob=' + newUnit.config.urlValues.jenkins_job);
            }

            /* newUnit.trace.info("sending dctk message"); */
            dctk.loggingAdapter.logMessage("QUnitResults", logValues);
            newUnit.trace.info('********** log results error sent to dctk *************');
        }

        var accept_errors = [];
        var errors_message='';
        var accept_errors_mes='';
        var acc_error_count = 1;
        for (var i = 0 ; i < errors.length ; i++) {
            var err = errors[i];
            errors_message = errors_message + i.toString() +  ". " + err.cause + "\n";
            if (err.module.search('Acceptance:') > -1) {
                accept_errors.push(err);
                accept_errors_mes = accept_errors_mes + acc_error_count.toString() +  ". (" + i.toString() + ") " + err.cause + "\n"
                acc_error_count++;
            }
        }
        newUnit.results.errors={
            count: errors.length,
            cause: errors_message,
            acceptCount: accept_errors.length,
            acceptCause:accept_errors_mes
        };
        return errors;
    };

    /*
     Chrome and Firefox provide line numbers
     IE cannot give line numbers.
     */
    newUnit.helpers.getAssertLineNumber = function(assertMethodName){
        var lineNumber = -1;
        try
        {
            if( 'undefined' != typeof printStackTrace ){
                var call_stack = printStackTrace();
                for (var i = 0 ; i < call_stack.length ; i++) {
                    if (call_stack[i].search(assertMethodName + '@') > -1) {
                        var line_before_run_all_tests = call_stack[i+1];
                        var pullLineNumber = /:(\d+):\d+$/.exec(line_before_run_all_tests);
                        if( pullLineNumber ){
                            lineNumber = pullLineNumber[1];
                        }
                        break;
                    }
                }
            }
        }
        catch(e)
        {
            newUnit.trace.error('failed to get call stack using print stack trace');
        }
        return lineNumber;
    };

// draw colored box around UI element
// for error, using red box - solid box
// for code coverage use blue box - dash box
    function drawBox(web_element, color, errMsg)
    {
        if( 'object' == typeof web_element && web_element.is(':visible')) {
            if (color == 'red') {
                web_element.addClass('qunit_red_dashed_box');
                if (errMsg && web_element.selector) {
                    newUnit.redBoxSelectors[errMsg] = web_element.selector;
                    newUnit.redBoxElements[errMsg] = web_element;
                    // support more than one selector for a message
                    var msg_selector_obj = {};
                    msg_selector_obj[errMsg] = web_element.selector;
                    newUnit.redBoxSelectors_.push(msg_selector_obj);
                    //newUnit.redBoxSelectors_.push({errMsg: web_element.selector});
                }
            } else {
                web_element.addClass('qunit_blue_dashed_box');
            }
        }
    }

// when test failed, this function will draw red box on the element to indicate failure to user
// when test successful and visual code coverage is on, it will draw blue box on the element
//  test_element - ui element under test
    function ok(test_result, assert_message, test_element) {
        if( !test_result )
        {
            if( 'undefined' != typeof printStackTrace ){
                /* from library stacktrace.js */
                var call_stack = printStackTrace();
                newUnit.trace.info('call stack trace to get line number:');
                newUnit.trace.info(call_stack);
            }
            if( newUnit.config.traceResultsAsAvailable ){
                newUnit.trace.error( 'failed: ' + assert_message );
            }
            if (localStorage.qunitShowTestFailuresInConsole) {
                console.error('new-unit: ' + assert_message);
                // Looking for the test that failed?
                // try the top (anonymous) link
            }
            // draw red box if test failed on it
            drawBox(test_element, "red", assert_message);
        }
        else
        {
            if( newUnit.config.traceResultsAsAvailable ){
                newUnit.trace.info( 'success: ' + assert_message );
            }
            // draw blue box if visual code coverage is on
            if(newUnit.config.urlValues.codeCov ) {
                drawBox(test_element, "blue");
            }
        }
        var okCheck = new AssertResults( newUnit.runtime.currentTestObj, assert_message, test_result );
        okCheck.lineNumber = newUnit.helpers.getAssertLineNumber('ok');
        newUnit.runtime.currentTestObj.assertions.push( okCheck );
        invokeCallback('assertionDone');
    }

    /* todo: implement equal different from deep equal */
    newUnit.equal = function( actual, expected, assert_message ){
        /* console.error('to be implemented.') */
        deepEqual( actual, expected, assert_message );
    };

// when test failed, this function will draw red box on the element to indicate failure to user
// when test successful and visual code coverage is on, it will draw blue box on the element
//  test_element - ui element under test
    function deepEqual(actual, expected, assert_message, test_element) {
        var test_result = false;
        if( actual != expected ){
            if( 'undefined' != typeof printStackTrace ){
                var call_stack = printStackTrace();
                newUnit.trace.info('call stack trace to get line number:');
                newUnit.trace.info(call_stack);
            }
            if( newUnit.config.traceResultsAsAvailable ){
                newUnit.trace.error( 'deep Equal failed: expected: ' + expected );
                newUnit.trace.error( 'deep Equal failed: actual  : ' + actual );
                newUnit.trace.error( 'deep Equal failed: ' + assert_message );
            }
            if (localStorage.qunitShowTestFailuresInConsole) {
                console.error('new-unit: ' + assert_message);
            }
            // draw red box if test failed on it
            drawBox(test_element, "red", assert_message);
        } else {
            test_result = true;
            if( newUnit.config.traceResultsAsAvailable ){
                newUnit.trace.info( 'deep Equal success: ' + assert_message );
            }
            // draw blue box if visual code coverage is on
            if(newUnit.config.urlValues.codeCov ) {
                drawBox(test_element, "blue");
            }
        }
        var okCheck = new AssertResults( newUnit.runtime.currentTestObj, assert_message, test_result );
        okCheck.lineNumber = newUnit.helpers.getAssertLineNumber('deepEqual');
        newUnit.runtime.currentTestObj.assertions.push( okCheck );
        invokeCallback('assertionDone');
    }

    function finalizeTestReports() {
        newUnit.stats.endTime = Date.now();
        newUnit.stats.elapsedRunTime = newUnit.stats.endTime - newUnit.stats.startTime;
        newUnit.results.logResults();

        newUnit.runtime.testResultsAvailable = true;
        updateVisualResults();
    }

    function runTest(test) {
        return new Promise(function(resolve) {
            // Timeout defaults to 0 ms if not explicitly specified
            setTimeout(function() {
                test.run();
                resolve('Test completed successfully');
            }, test.delay);
        });
    }

    newUnit.helpers.extractConfigFromUrl(window.document.URL);

    if (window.newUnit === undefined) {
        window.newUnit = newUnit;
    }

    newUnitReporter.init(newUnit);

    return newUnit;
});

define('QUnit', ['newUnit'], function(newUnit) {
    var testFramework = window.QUnit;

    if (testFramework === undefined) {
        testFramework = newUnit;
        window.QUnit = testFramework;
    } else {
        testFramework.drawBox = newUnit.drawBox;
    }

    return testFramework;
});

/*
  var qunit = require('QUnit');
  qunit.tests.runAllTests();
 */
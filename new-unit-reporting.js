define('newUnitReporter', [
    'jquery', 'newUnitSvgIcons'
], function($, newUnitSvgIcons) {
    'use strict';

    //var console_log = QUnit.trace.info;
    var console_log = window.console.log;

    var mainIconId = 'new_unit_summary';
    var closeButtonId = 'new_unit_summary_close';
    var resultsButtonId = 'new_unit_summary_results';
    var rerunButtonId = 'new_unit_summary_rerun_tests';
    var $summaryIcon = createSummaryIcon();
    var $summaryControls = createControls();

    var $statusIcon = createStatusIcon();

    $summaryIcon.append($statusIcon);
    $summaryIcon.append($summaryControls);

    $('body').append($summaryIcon);

    function init(QUnit) {
        if (QUnit && QUnit.trace && typeof QUnit.trace.info == 'function') {
            console_log = QUnit.trace.info;
        }
    }

    function createStatusIcon() {
        var svg = $(newUnitSvgIcons.qUnitIcon)
            .width('5em');
        var wrapper = $('<div>')
            .attr('id', 'new_unit_status')
            .attr('class', 'new_unit_not_started')
            .css({
                'padding': '6px',
                'border-radius': '20px'
            })
            .hide();
        wrapper.append(svg);
        return wrapper;
    }

    function createSummaryIcon() {
        var $summaryNode = $('<div>').attr('id', mainIconId).hide();
        $summaryNode.css({
            width: '7em',
            position: 'fixed',
            right: '0.5em',
            'text-align': 'center',
            opacity: '0.6',
            top: '2.5em',
            'z-index': '9999'
        });

        return $summaryNode;
    }

    // The click listener for the rerun button is added in the display methods
    function createRerunButton() {
        var $rerunButton = $(newUnitSvgIcons.rerunButton)
            .height('20px')
            .attr('id', rerunButtonId)
            .attr('title', 'Run tests again')
            .css({
                cursor: 'pointer'
            });

        var $span = $('<span>').css({
            flex: '1 0 20px'
        });

        $span.append($rerunButton);

        return $span;
    }

    function createCloseButton() {
        var $closeButton = $(newUnitSvgIcons.closeButton)
            .attr('id', closeButtonId).attr('title', 'Close')
            .height('20px');
        $closeButton.css({
            cursor: 'pointer'
        });

        $closeButton.on('click', function(e) {
            if (e.stopPropagation) {
                e.stopPropagation();
            }

            if (e.cancelBubble !== null) {
                e.cancelBubble = true;
            }

            $summaryIcon.hide();
            clearVisualCodeCoverage();
        });

        var $span = $('<span>').css({
            flex: '1 0 20px'
        });

        $span.append($closeButton);

        return $span;
    }

    // The click listener for the details button is added in the display methods
    function createDetailsButton() {
        var $detailsButton = $(newUnitSvgIcons.detailsButton)
            .attr('id', resultsButtonId).attr('title', 'Test results')
            .height('20px');
        $detailsButton.css({
            cursor: 'pointer'
        });

        var $span = $('<span>').css({
            flex: '1 0 20px'
        });

        $span.append($detailsButton);

        return $span;
    }

    function createControls() {
        var $summaryControls = $('<div>')
            .attr('id', 'new_unit_summary_controls')
            .css({
                display: 'flex'
            });

        var $rerunButton = createRerunButton();
        var $closeButton = createCloseButton();
        var $detailsButton = createDetailsButton();

        $summaryControls.append($rerunButton);
        $summaryControls.append($closeButton);
        $summaryControls.append($detailsButton);

        return $summaryControls;
    }

    function clearVisualResults() {
        $summaryIcon.hide();
        $statusIcon.hide();

        $summaryIcon.css('background-color', '');

        $('#' + resultsButtonId).off('click');
        $('#' + rerunButtonId).off('click');
    }

    function clearVisualCodeCoverage() {
        $('.qunit_red_dashed_box').removeClass('qunit_red_dashed_box');
        $('.qunit_blue_dashed_box').removeClass('qunit_blue_dashed_box');
    }

    function addRerunClickListener(rerunCallback) {
        $('#' + rerunButtonId).on('click', function() {
            clearVisualCodeCoverage();
            rerunCallback();
        });
    }

    function addResultsClickListener(results) {
        $('#' + resultsButtonId).on('click', function() {
            var newWindow = window.open('');

            var results_redone = newUnit.results.toString();
            newWindow.document.write('<pre>' + results_redone + '</pre>');

            //newWindow.document.write('<pre>' + results + '</pre>');
            newWindow.document.close();
        });
    }

    // todo: how to deal with / catch Cross Origin issues that block the use of known issues.
    function loadKnownIssues() {
        if (localStorage.showKnownIssueTraces) {
            console_log('load known issues');
        }
        if (newUnit.runtime.knownIssuesAvailable) {
            console_log('known issues previously loaded, return, skip reload.');
            return;
        }
        for (var i = 0 ; i < QUnit.knownIssues.length ; i++) {
            var known_issues_obj = QUnit.knownIssues[i];
            if (known_issues_obj.dataRequested) {
                continue;
            }
            var req = new XMLHttpRequest();
            var async = true;
            var url = known_issues_obj.dataSource;

            req.open("GET", url, async);
            req.onreadystatechange = function () {
                if (req.readyState == 4) {
                    if (req.status == 200) {
                        known_issues_obj.raw_data = req.responseText;
                        known_issues_obj.issues = {};
                        try {
                            var responseObj = JSON.parse(req.responseText);
                            known_issues_obj.issues = responseObj.known_issues;
                            if (localStorage.showKnownIssueTraces) {
                                console_log('known issues data back:');
                                console_log(known_issues_obj.issues);
                            }
                            // deal with race condition where sometimes the tests finish first.
                            QUnit.callbacks.triggerForCallbacks('known_issue_data_ready');
                        } catch (e) {
                            if (localStorage.showKnownIssueTraces) {
                                console.error('failed to parse data from known issues: ' + url);
                            }
                        }
                    }
                }
            };
            req.send(null);
        }
    }

    function displayInProgressIcon(rerunCallback) {
        clearVisualResults();

        addRerunClickListener(rerunCallback);

        $statusIcon.css({
            'display': 'block',
            'background-color': 'gold'
        });
        $statusIcon.attr('class', 'new_unit_running');
        $summaryIcon.css('opacity', '0.4');
        $summaryIcon.show();
    }

    function displayPassIcon(results, rerunCallback) {
        clearVisualResults();

        addResultsClickListener(results);
        addRerunClickListener(rerunCallback);

        var iconClass = 'new_unit_done new_unit_pass';
        if (newUnit.runtime.knownIssuesAvailable) {
            iconClass += ' known_issues_loaded';
        }

        $statusIcon.css({
            'display': 'block',
            'background-color': 'green'
        });
        $statusIcon.attr('class', iconClass);
        $summaryIcon.css('opacity', '0.2');
        $summaryIcon.show();
    }

    function displayFailIcon(results, rerunCallback) {
        clearVisualResults();

        addResultsClickListener(results);
        addRerunClickListener(rerunCallback);

        var iconClass = 'new_unit_done new_unit_fail';
        if (newUnit.runtime.knownIssuesAvailable) {
            iconClass += ' known_issues_loaded';
        }
        $statusIcon.css({
            'display': 'block',
            'background-color': 'red'
        });
        $statusIcon.attr('class', iconClass);
        $summaryIcon.css('opacity', '0.6');
        $summaryIcon.show();
    }

    return {
        displayInProgressIcon: displayInProgressIcon,
        displayPassIcon: displayPassIcon,
        displayFailIcon: displayFailIcon,
        displayExceptionIcon: displayFailIcon,
        loadKnownIssues: loadKnownIssues,
        init: init
    };
});

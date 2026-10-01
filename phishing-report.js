/* Stand-alone manual debrief: no connection to legacy phishing activity or data. */
(() => {
  'use strict';
  if (!window.LabReport || !document.getElementById('labReportMount')) return;
  LabReport.mount({
    labId: 'phishing', mountTo: '#labReportMount',
    scope: 'Manual debrief of a fictional phishing-awareness exercise. This page does not import, inspect, or verify activity from the phishing exercise and does not access credentials or instructor records.',
    getSnapshot: () => ({
      status: 'not-performed', actions: [], findings: [],
      limitations: ['No activity is imported from the legacy phishing exercise. Not performed means no automated test or activity was verified by this report page, even if the student separately visited the exercise.', 'Any description of prior activity belongs only in the optional student observations and is not independently verified.']
    })
  });
})();

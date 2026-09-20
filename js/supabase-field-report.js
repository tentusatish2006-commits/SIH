(function () {
  'use strict';
  function toast(msg, type) {
    if (window.SmartRoute && SmartRoute.showToast) SmartRoute.showToast(msg, type || 'info');
  }
  document.addEventListener('DOMContentLoaded', function () {
    var path = (location.pathname || '').toLowerCase();
    if (path.indexOf('field-report') < 0) return;
    var btn = document.getElementById('btn-submit');
    if (!btn) return;
    btn.addEventListener('click', function () {
      setTimeout(async function () {
        try {
          if (!window.SmartRouteSupabase) return;
          var lat = window.acquiredLat, lng = window.acquiredLng;
          if (typeof lat !== 'number' || typeof lng !== 'number') {
            var loc = document.getElementById('location-data');
            if (loc) {
              var m = (loc.textContent || '').match(/Lat:\s*([\d.]+).*Lng:\s*([\d.]+)/i);
              if (m) { lat = parseFloat(m[1]); lng = parseFloat(m[2]); }
            }
          }
          var fileInput = document.querySelector('input[type="file"]');
          var file = fileInput && fileInput.files && fileInput.files[0];
          var imageUrl = null;
          if (file) imageUrl = await SmartRouteSupabase.uploadFieldImage(file, 'fo');
          var payload = {
            code: 'FR-' + Date.now().toString(36).toUpperCase(),
            officer_id: localStorage.getItem('sr_user_email') || 'FO-UNKNOWN',
            officer_name: localStorage.getItem('sr_user_email') || 'Field Officer',
            title: 'Field geo-report',
            description: (document.getElementById('report-notes') && document.getElementById('report-notes').value) || 'Submitted from field-report page',
            hazard_type: (document.getElementById('hazard-type') && document.getElementById('hazard-type').value) || 'general',
            severity: 'medium', lat: lat || null, lng: lng || null, image_url: imageUrl, status: 'submitted'
          };
          var row = await SmartRouteSupabase.insertRow('field_reports', payload);
          if (row) {
            toast('Field report saved to Supabase', 'success');
            if (window.SmartRouteAPI && SmartRouteAPI.createIncident) {
              await SmartRouteAPI.createIncident({
                code: 'INC-' + Date.now().toString(36).toUpperCase(),
                title: payload.title, type: payload.hazard_type || 'field', severity: payload.severity,
                status: 'Active', lat: payload.lat || 26.14, lng: payload.lng || 91.73,
                description: payload.description, reported_by: payload.officer_name, image_url: imageUrl
              });
            }
          }
        } catch (e) { console.warn('[field-report supabase]', e); }
      }, 300);
    });
  });
})();

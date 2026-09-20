/**
 * SmartRoute Client API Bridge
 * Preference: Supabase -> Flask /api -> demo fallbacks
 * Never fails hard when keys/backend are missing.
 */
(function() {
    const API_PORT = 5000;
    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    const BASE_URL = (isLocalhost && window.location.port == API_PORT)
        ? '/api'
        : `http://127.0.0.1:${API_PORT}/api`;

    const SmartRouteAPI = {
        baseUrl: BASE_URL,
        isOnline: false,

        async request(endpoint, options = {}) {
            const url = `${this.baseUrl}${endpoint}`;
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 3500);
            try {
                const response = await fetch(url, {
                    ...options,
                    signal: controller.signal,
                    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) }
                });
                clearTimeout(timeoutId);
                if (!response.ok) throw new Error(`HTTP error ${response.status}`);
                const data = await response.json();
                this.setOnline(true);
                return data;
            } catch (err) {
                clearTimeout(timeoutId);
                this.setOnline(false);
                return null;
            }
        },

        setOnline(status) {
            this.isOnline = status;
            const badge = document.getElementById('backend-status-badge');
            if (badge) {
                if (status) {
                    badge.innerHTML = '<span style="color:#00ff88;">●</span> API CONNECTED';
                    badge.className = 'badge badge-safe';
                    badge.title = 'Connected to SmartRoute backend';
                } else if (window.SmartRouteSupabase) {
                    badge.innerHTML = '<span style="color:#00d4ff;">●</span> SUPABASE';
                    badge.className = 'badge badge-safe';
                    badge.title = 'Using Supabase cloud data';
                } else {
                    badge.innerHTML = '<span style="color:#aaa;">○</span> STANDALONE';
                    badge.className = 'badge';
                    badge.title = 'Offline mode (Fallback data active)';
                }
            }
        },

        async _sbList(table, orderCol) {
            try {
                if (!window.SmartRouteSupabase) return null;
                return await SmartRouteSupabase.selectAll(table, orderCol);
            } catch (e) { return null; }
        },

        async checkHealth() {
            const res = await this.request('/health');
            return res && res.status === 'healthy';
        },

        async getRoads() {
            const res = await this.request('/roads');
            if (res && res.data) return res.data;
            return window.MapEngine ? window.MapEngine.ROAD_DATA : [];
        },

        async getIncidents() {
            const sb = await this._sbList('incidents', 'created_at');
            if (sb && sb.length) return sb;
            const res = await this.request('/incidents');
            if (res && res.data) return res.data;
            return [];
        },

        async reportIncident(data) {
            try {
                if (window.SmartRouteSupabase) {
                    const row = await SmartRouteSupabase.insertRow('incidents', data);
                    if (row) return { ok: true, data: row, source: 'supabase' };
                }
            } catch (e) {}
            return await this.request('/incidents', { method: 'POST', body: JSON.stringify(data) });
        },

        async createIncident(payload) {
            return await this.reportIncident(payload);
        },

        async getAlerts() {
            const sb = await this._sbList('alerts', 'created_at');
            if (sb && sb.length) return sb;
            const res = await this.request('/alerts');
            return res ? res.data : [];
        },

        async getFieldReports() {
            const sb = await this._sbList('field_reports', 'created_at');
            if (sb && sb.length) return sb;
            const res = await this.request('/reports');
            return res && res.data ? res.data : [];
        },

        async createFieldReport(payload) {
            try {
                if (window.SmartRouteSupabase) {
                    const row = await SmartRouteSupabase.insertRow('field_reports', payload);
                    if (row) return { ok: true, data: row, source: 'supabase' };
                }
            } catch (e) {}
            const res = await this.request('/reports', { method: 'POST', body: JSON.stringify(payload) });
            return res || { ok: false };
        },

        async getVehicles() {
            const sb = await this._sbList('vehicles', 'updated_at');
            if (sb && sb.length) return sb;
            const res = await this.request('/vehicles');
            if (res && res.data) return res.data;
            return window.MapEngine ? window.MapEngine.VEHICLE_DATA : [];
        },

        async getDeliveries() {
            const sb = await this._sbList('deliveries', 'updated_at');
            if (sb && sb.length) return sb;
            const res = await this.request('/deliveries');
            return res ? res.data : [];
        },

        async getOfficers() {
            const sb = await this._sbList('officers', 'created_at');
            if (sb && sb.length) return sb;
            const res = await this.request('/officers');
            return res ? res.data : [];
        },

        async getDistricts() {
            const sb = await this._sbList('districts');
            if (sb && sb.length) return sb;
            const res = await this.request('/districts');
            if (res && res.data) return res.data;
            return window.MapEngine ? window.MapEngine.DISTRICT_DATA : [];
        },

        async getReports(filters = {}) {
            const sb = await this.getFieldReports();
            if (sb && sb.length) return sb;
            let qs = [];
            if (filters.district) qs.push(`district=${encodeURIComponent(filters.district)}`);
            if (filters.severity) qs.push(`severity=${encodeURIComponent(filters.severity)}`);
            if (filters.status) qs.push(`status=${encodeURIComponent(filters.status)}`);
            if (filters.search) qs.push(`search=${encodeURIComponent(filters.search)}`);
            const url = `/reports${qs.length ? '?' + qs.join('&') : ''}`;
            const res = await this.request(url);
            return res ? res.data : [];
        },

        async getInfrastructure(type = 'ALL') {
            const res = await this.request(`/infrastructure?type=${type}`);
            return res ? res.data : [];
        }
    };

    window.SmartRouteAPI = SmartRouteAPI;
})();

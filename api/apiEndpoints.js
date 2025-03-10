// Get the current hostname dynamically
const hostname = window.location.hostname;
// Use the current hostname or fallback to the original IP if running locally
export const API_BASE_URL = hostname === 'localhost' || hostname === '127.0.0.1' 
    ? "http://192.168.29.123:3000" 
    : `http://${hostname}:3000`;

export const API_ENDPOINTS = {
    GET_DEVICE_MAC_ID: `${API_BASE_URL}/get-mac-address`,
    GET_M3U_URL: `${API_BASE_URL}/get-m3u`,
    GET_ALL_MAC_IDS: `${API_BASE_URL}/get-mac-ids`,
}
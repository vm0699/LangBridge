import { Platform } from 'react-native';

// --- Base URLs ---
const LOCAL_ANDROID = 'http://10.0.2.2:8000';   // Android emulator only
const LOCAL_IOS = 'http://localhost:8000';      // iOS simulator only
const LAN_IP = 'http://172.20.10.3:8000';       // Physical device → your laptop IP

// --- Select API base ---
// Priority: physical device LAN → else emulator/simulator defaults
export const API_BASE = LAN_IP;

// --- Settings ---
export const DEV_BYPASS = false; // set true only for mock testing without backend
export const APP_NAME = 'LangBridge';

import axios from 'axios';
import { Platform } from 'react-native';

const BASE_URL =
  typeof window !== 'undefined' && !Platform.OS
    ? ''                          // web build: same origin (Railway)
    : Platform.OS === 'android'
    ? 'http://10.0.2.2:3001'     // Android emulator
    : 'http://localhost:3001';   // iOS simulator / local dev

const client = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
});

export default client;

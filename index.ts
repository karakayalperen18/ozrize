// URL/global polyfill — Supabase istemcisinden önce yüklenmelidir.
import 'react-native-url-polyfill/auto';

import { registerRootComponent } from 'expo';

import App from './App';

// Registers the root component for both Expo Go and native builds.
registerRootComponent(App);

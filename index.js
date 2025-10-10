/**
 * @format
 */

// Import polyfills FIRST for Firebase to work in React Native
import 'react-native-get-random-values';

import { AppRegistry } from 'react-native';
import App from './App';

// Use the app name directly since it's now in the expo object
const appName = 'MobileApp';

AppRegistry.registerComponent(appName, () => App);

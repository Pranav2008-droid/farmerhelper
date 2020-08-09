import 'react-native-gesture-handler';
import React from 'react';
import LoginScrn from './screens/loginscrn';
import OtpScrn from './screens/otpscrn';
import UserScreens from './screens/userscreens/index';
import {NavigationContainer} from '@react-navigation/native';
import {createStackNavigator} from '@react-navigation/stack';
import { State } from 'react-native-gesture-handler';

const Stack = createStackNavigator();

function ScreenStack() {
  return (
    <Stack.Navigator
      headerMode="none"
      screenOptions={{
        gestureEnabled: true,
      }}>
      <Stack.Screen name="LoginScrn" component={LoginScrn} />
      <Stack.Screen name="OtpScrn" component={OtpScrn} />
      <Stack.Screen name="UserScreens" component={UserScreens} />
    </Stack.Navigator>
  );
}

export default class App extends React.Component {
  render() {
    return <NavigationContainer>{<ScreenStack />}</NavigationContainer>;
  }
}

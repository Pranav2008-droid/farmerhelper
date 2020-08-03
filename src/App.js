import 'react-native-gesture-handler';
import React from 'react';
import LoginScrn from './screens/loginscrn';
import OtpScrn from './screens/otpscrn';
import {NavigationContainer} from '@react-navigation/native';
import {createStackNavigator} from '@react-navigation/stack';

const Stack = createStackNavigator();

function MyStack() {
  return (
    <Stack.Navigator headerMode="none">
      <Stack.Screen name="Login" component={LoginScrn} />
      <Stack.Screen name="OTP" component={OtpScrn} />
    </Stack.Navigator>
  );
}

export default class App extends React.Component {
  render() {
    return <NavigationContainer>{<MyStack />}</NavigationContainer>;
  }
}

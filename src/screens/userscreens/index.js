/* eslint-disable no-unused-vars */
import React, {Component} from 'react';
import * as rn from 'react-native';
import * as nb from 'native-base';
import * as themes from '../../themes';
import {strings} from '../../i18n';
import {wp, hp} from '../utils/dimension';
import {NavigationContainer} from '@react-navigation/native';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import FontAwesome5 from 'react-native-vector-icons/FontAwesome5';
import HomeScrn from './measurescrn';
import InfoScrn from './infoscrn';

const BottomTabs = createBottomTabNavigator();

export default class Index extends React.Component {
  render() {
    return (
      <BottomTabs.Navigator
        screenOptions={({route}) => ({
          tabBarIcon: ({focused, color, size}) => {
            var icon = null;
            if (route.name === 'Measure') {
              icon = <FontAwesome5 name={'tachometer-alt'} />;
            } else {
              icon = <FontAwesome5 name={'info'} />;
            }
            return icon;
          },
        })}>
        <BottomTabs.Screen name="Measure" component={HomeScrn} />
        <BottomTabs.Screen name="Info" component={InfoScrn} />
      </BottomTabs.Navigator>
    );
  }
}

/* eslint-disable no-unused-vars */
import React, {Component} from 'react';
import * as rn from 'react-native';
import * as nb from 'native-base';
import Spinner from 'react-native-spinkit';
import * as themes from '../../themes';
import {strings} from '../../i18n';
import {wp, hp} from '../utils/dimension';
import {PhoneInput} from '../components';

export default class InfoScrn extends React.Component {
  render() {
    return (
      <rn.View>
        <rn.Text> this is the Info Screen</rn.Text>
      </rn.View>
    );
  }
}

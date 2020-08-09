/* eslint-disable no-unused-vars */
import React, {Component} from 'react';
import * as rn from 'react-native';
import * as nb from 'native-base';
import Spinner from 'react-native-spinkit';
import * as themes from '../../themes';
import {strings} from '../../i18n';
import {wp, hp} from '../utils/dimension';
import {PhoneInput} from '../components';
import {AnimatedCircularProgress} from 'react-native-circular-progress';

export default class MeasureScrn extends React.Component {
  constructor() {
    super();
    this.state = {
      phase1: 440,
    };
  }
  render() {
    return (
      <rn.View style={styles.container}>
        <rn.View>
          <AnimatedCircularProgress
            animate={500}
            size={wp(50)}
            width={wp(7.5)}
            backgroundWidth={wp(8.625)}
            lineCap={'round'}
            arcSweepAngle={240}
            rotation={240}
            fill={this.state.phase1 / 5}
            tintColor="#00e0ff"
            duration={1000}
            backgroundColor="#3d5875"
            style={styles.circularProgress}>
            {(phase1) => <rn.Text>{this.state.phase1 + 'v'}</rn.Text>}
          </AnimatedCircularProgress>
        </rn.View>
        <rn.View>
          <AnimatedCircularProgress
            animate={500}
            size={wp(50)}
            width={wp(7.5)}
            backgroundWidth={wp(8.625)}
            lineCap={'round'}
            arcSweepAngle={240}
            rotation={240}
            fill={this.state.phase1 / 5}
            tintColor="#00e0ff"
            duration={1000}
            backgroundColor="#3d5875"
            style={styles.circularProgress}>
            {(phase1) => <rn.Text>{this.state.phase1 + 'v'}</rn.Text>}
          </AnimatedCircularProgress>
        </rn.View>
        <rn.View>
          <AnimatedCircularProgress
            animate={500}
            size={wp(50)}
            width={wp(7.5)}
            backgroundWidth={wp(8.625)}
            lineCap={'round'}
            arcSweepAngle={240}
            rotation={240}
            fill={this.state.phase1 / 5}
            tintColor="#00e0ff"
            duration={1000}
            backgroundColor="#3d5875"
            style={styles.circularProgress}>
            {(phase1) => <rn.Text>{this.state.phase1 + 'v'}</rn.Text>}
          </AnimatedCircularProgress>
        </rn.View>
      </rn.View>
    );
  }
}

const styles = rn.StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  circularProgress: {
    alignSelf: 'center',
    justifyContent: 'center',
  },
  centerText: {
    padding: wp(20),
  },
});

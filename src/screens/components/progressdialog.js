import React from 'react';
import Modal from 'react-native-modal';
import {Text, View, StyleSheet} from 'react-native';
import {DotIndicator} from 'react-native-indicators';
import * as themes from '../../themes';
import {wp, hp} from '../utils/dimension';

class ProgressDialog extends React.Component {
  render() {
    return this.props.isVisible === true ? (
      <Modal isVisible style={modalStyles.dialog}>
        <Text style={modalStyles.dummyText} />
        <DotIndicator
          style={modalStyles.indicator}
          color={themes.colors.progressIndicator}
          count={4}
          size={10}
        />
        <Text style={modalStyles.text}>{this.props.message}</Text>
        <Text style={modalStyles.dummyText} />
      </Modal>
    ) : (
      <View />
    );
  }
}
const modalStyles = StyleSheet.create({
  text: {
    flex: 1,
    flexDirection: 'row',
    color: themes.colors.primaryFg1,
    fontSize: wp(14),
    fontFamily: themes.fonts.medium2,
    justifyContent: 'center',
    alignItems: 'center',
    textAlign: 'center',
    textAlignVertical: 'center',
  },
  indicator: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    textAlignVertical: 'top',
  },
  dialog: {
    justifyContent: 'center',
  },
  dummyText: {
    flex: 3,
    height: hp(5),
  },
});
export default ProgressDialog;

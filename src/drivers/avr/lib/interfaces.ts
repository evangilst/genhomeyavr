"use strict";

import { AVR } from "./avr";

export interface HomeyAvrInfo {
  dev:         AVR,
  available:   boolean,
  confLoaded:  boolean,
  used:        boolean
};

export interface KnownAvrInfo {
  name:   string,
  avr:    string
};

export interface SelectionInfo {
  command:     string,
  i18n:        string
};

export interface SelectionArgs {
  command:     string,
  name:        string,
  i18n:        string
};

export interface PairData {
  avrip:      string,
  avrport:    string,
  avrname:    string,
  avrtype:    string
};

export interface SetttingsData {
  avrip:      string,
  avrport:    string,
  avrtype:    string
};

export interface AvrDeviceData {
  avrip:      string,
  avrport:    number,
  avrname:    string,
  avrtype:    string,
  avrindex:   number
};

export interface HomeyDeviceData {
  id:         string,
  avrip:      string,
  avrport:    number,
  avrname:    string,
  avrtype:    string,
  avrindex:   number
};

export interface HomeyDevice {
  name:        string,
  data:        HomeyDeviceData
}

export interface TriggerArgs {
  device:     HomeyDeviceData,
  input: {
    command:  string,
    name:     string,
    i18n:     string
  }
};

export interface TriggerData {
  command:     string,
  name:        string,
  i18n:        string
}

export interface ArgsData {
  avrname: KnownAvrInfo
};

export interface ActionArgsInfo {
  device:      AvrDeviceData,
  volumeNum?:  number,
  input?: {
    command:   string,
    name:      string
  }
};

export interface ArgsComplete {
  query:       string,
  args: {
    device: {
      name:    string,
      icon:    string,
      id:      string,
    }
    input:     string
  }
};

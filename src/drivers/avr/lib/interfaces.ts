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
  i18n:     string,
  command:  string
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
  name:        string,
  data: {
    id:         string,
    avrip:      string,
    avrport:    number,
    avrname:    string,
    avrtype:    string,
    avrindex:   number
  }
};

export interface ArgsData {
  avrname: KnownAvrInfo
};

export interface TriggerData {
  name:      string
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

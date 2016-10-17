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
  avrport:    number,
  avrname:    string,
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
  name:         string,
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

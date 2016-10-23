"use strict";

/* ================================================================== */
/* = Note:                                                          = */
/* = This is a generated javascript file.                           = */
/* = Don't edit the javascript file directly or changes might be    = */
/* = lost with the next build.                                      = */
/* = Edit the typescipt file instead and re-generate the javascript = */
/* = file.                                                          = */
/* ================================================================== */

import * as events                                   from "events";
import * as net                                      from "net";
import { AVR }                                       from "./lib/avr";
import { HomeyAvrInfo, KnownAvrInfo, SelectionArgs } from "./lib/interfaces";
import { PairData, SetttingsData, AvrDeviceData  }   from "./lib/interfaces";
import { HomeyDevice, TriggerArgs, TriggerData }     from "./lib/interfaces";
import { ActionArgsInfo, ArgsData, ArgsComplete }    from "./lib/interfaces";

declare var Homey: any ;

const MAX_AVRS: number                 = 8    ;  // Max allowed AVR configurations
const RESTART_WAIT_TIME: number        = 10000 ; // 10 sec.

let avrComChannel: events.EventEmitter = null ;  // event channel
let myDebugMode: boolean               = true;   // Write debug messages or not
let avrDevArray: Array<HomeyAvrInfo>   = [];     // AVR device array
let newDevInfo: AvrDeviceData          = null;   // New device
let knownAvrs: Array<KnownAvrInfo>     = [];     // Known avr names.
let knownDevs: Array<AvrDeviceData>    = [];     // Known used devices

/**
 * Prints debug messages using homey.log if debug is switched on.
 *
 * @param      {string}  str     The message string
 */
let prtDbg = (str: string): void => {
  if ( myDebugMode === true ) {
    Homey.log(`[D] ${str}`);
  }
};

/**
 * Prints error message via Homey.log
 *
 * @param      {string}  str     The message string
 */
let prtErr = (str: string ): void => {
  Homey.log(`[HomeyAvr_Error]: ${str}.`);
};

/**
 * Notify Homey the AVR is unavailabble, i.e no network connection.
 * @param      {AvrDeviceData}     device_data   Device information.
 * @param      {string}            str           Reason why unavailabble.
 */
let setAvrUnavailable = ( device_data: AvrDeviceData , str: string ): void => {
  module.exports.setUnavailable( device_data, str);
}

/**
 * Notify Homey the AVR is available, i.e the AVR is connected.
 * @param      {AvrDeviceData}     device_data   Device information.
 */
let setAvrAvailable = (device_data: AvrDeviceData): void => {
  module.exports.setAvailable( device_data );
}

/**
 * Gets the string defined in the locales files of homey.
 *
 * @param      {string}  str     The ID string
 * @return     {string}  The 'locales' string for the ID.
 */
let getI18nString = (str: string): string => {
    return Homey.manager("i18n").__(str);
};

/**
 * Initialize the HOMEY AVR application paramaters called after
 * startup or reboot of Homey.
 *
 * @param      {Array.<AvrDeviceData>}     devices   Array with all devices info.
 * @param      {Function}  callback  Notify Homey we have started
 * @return     'callback'
 */
let init = (devices: Array<AvrDeviceData>, callback: Function) => {

  if (myDebugMode === true ) {
    prtDbg( "Init called.");
    prtDbg( "Devices => " + JSON.stringify( devices ));
  }

  if ( avrComChannel === null ) {

    /* ============================================================== */
    /* = Initialize the avrDevArray and knownDevs.                  = */
    /* ============================================================== */
    for ( let I = 0 ; I < MAX_AVRS ; I++ ) {

      avrDevArray[I]  = {
        dev:        null,
        available:  false,
        confLoaded: false,
        used:       false
      }

      knownDevs[I] = {
        avrip:      "",
        avrport:    23,
        avrname:    "",
        avrtype:    "",
        avrindex:   -1
      }
    }

    avrComChannel = new events.EventEmitter();

    setUpListeners();

    if ( devices.length !== 0 ) {

      devices.forEach( (device) => {

        if ( device.avrindex >= 0 && device.avrindex < MAX_AVRS ) {

          avrDevArray[ device.avrindex ] = {
            dev:        new AVR(),
            available:  false,
            confLoaded: false,
            used:       true
          }

          avrDevArray[ device.avrindex ].dev.init(device.avrport,
                                                  device.avrip,
                                                  device.avrname,
                                                  device.avrtype ,
                                                  device.avrindex,
                                                  avrComChannel );

          knownAvrs.push({
            name: device.avrname,
            avr:  device.avrname
          });

          knownDevs[ device.avrindex ] = device;

          setAvrUnavailable( device  , getI18nString("devnotavil"));
        } else {
          prtErr(`Invalid avrindex : ${device.avrindex}.`);
        }
      });

      if ( myDebugMode === true ) {
        for ( let I = 0 ; I < avrDevArray.length; I++ ) {
          if ( avrDevArray[I].used === true ) {
            let xStr: string = `${avrDevArray[I].dev.getName()}/${avrDevArray[I].dev.getType()}-` +
            `${avrDevArray[ I ].dev.getHostname()}:${avrDevArray[ I ].dev.getPort()}`
            prtDbg(`Entry ${I} has ${xStr}.`);
          } else {
              prtDbg(`Entry ${I} is not used.`);
          }
        }
        prtDbg("KnownAvrs :");

        for ( let I = 0 ; I < knownAvrs.length; I++ ) {
            prtDbg(`${I} -> ${knownAvrs[I].name}.`);
        }

        prtDbg("KnownDevs :");
        for ( let I = 0 ; I < MAX_AVRS ; I++ ) {
          prtDbg(`${I} -> ${JSON.stringify(knownDevs[I])}.`);
        }
      }
    }

    setUpFlowActionsAndTriggers();

    } else {
        prtDbg("Init called for the second time ??.");
    }
    callback(null,"");
};

/**
 * Homey delete request for an AVR.
 *
 * @param      AvrDeviceData  device    Info of the to-be-delete device
 * @param      Function  callback  Inform Homey of the result.
 * @return     'callback'
 */
let deleted = (device: AvrDeviceData, callback: Function): void  => {

  if ( myDebugMode === true ) {
    prtDbg("HomeyAvr: delete_device called");
    prtDbg( "Device => " + JSON.stringify( device ));
  }

  if ( avrDevArray[ device.avrindex ].used === false ) {

    callback( new Error( getI18nString("error.dev_mis_del")), false );

  } else {

    /* ============================================================== */
    /* = Disconnect and remove possible existing network connection = */
    /* = to the AVR                                                 = */
    /* ============================================================== */
    avrDevArray[device.avrindex].dev.disconnect();

    /* ============================================================== */
    /* = Remove the AVR from the known avrs list                    = */
    /* ============================================================== */
    for ( let I = 0 ; I < knownAvrs.length; I++ ) {
        if ( knownAvrs[I].name === device.avrname ) {
            knownAvrs.splice(I, 1);
        }
    }
    /* ============================================================== */
    /* = Remove the AVR from the known devs list                    = */
    /* ============================================================== */
    knownDevs[ device.avrindex ] = {
      avrip:      "",
      avrport:    23,
      avrname:    "",
      avrtype:    "",
      avrindex:   -1
    };

    /* ============================================================== */
    /* = Clear the entry in the device array                        = */
    /* ============================================================== */
    avrDevArray[ device.avrindex ] = {
      dev:        null,
      available:  false,
      confLoaded: false,
      used:       false
    }

    if ( myDebugMode === true ) {
      for ( let I = 0 ; I < avrDevArray.length; I++ ) {
        if ( avrDevArray[I].used === true ) {
          let xStr: string = `${avrDevArray[I].dev.getName()}-` +
            `${avrDevArray[ I ].dev.getHostname()}:${avrDevArray[ I ].dev.getPort()}.`
          prtDbg(`Entry ${I} has ${xStr}.`);
        } else {
          prtDbg(`Entry ${I} is not used.`);
        }
      }
      prtDbg("KnownAvrs :");

      for ( let I = 0 ; I < knownAvrs.length; I++ ) {
          prtDbg(`${I} -> ${knownAvrs[I].name}.`);
      }
      prtDbg("KnownDevs :");
      for ( let I = 0 ; I < MAX_AVRS ; I++ ) {
        prtDbg(`${I} -> ${JSON.stringify(knownDevs[I])}.`);
      }
    }
    callback( null, true);
    }
};

/**
* Homey add request for an AVR.
*
* @param      AvrDeviceData  device    Info of the to-be-delete device
* @param      Function  callback  Inform Homey of the result.
* @return     'callback'
 */
let added = (device: AvrDeviceData , callback: Function ) => {

  if ( myDebugMode === true ) {
      prtDbg("HomeyAvr: add_device called");
      prtDbg( "device => " + JSON.stringify( device ));
  }

  avrDevArray[ device.avrindex ] = {
    dev:        new AVR(),
    available:  false,
    confLoaded: false,
    used:       true
  };

  avrDevArray[ device.avrindex ].dev.init(device.avrport,
                                          device.avrip,
                                          device.avrname,
                                          device.avrtype ,
                                          device.avrindex,
                                          avrComChannel );

  knownAvrs.push( { name: device.avrname, avr:  device.avrname } );

  knownDevs[ device.avrindex ] = device;

  if ( myDebugMode === true ) {
    prtDbg("New device array :");

    for ( let I = 0 ; I < avrDevArray.length ; I++ ) {
      if ( avrDevArray[I].used == true ) {
        let host = avrDevArray[I].dev.getHostname();
        let port = avrDevArray[I].dev.getPort();
        let used = avrDevArray[I].used;

        prtDbg(`Entry ${I} has ${host}:${port} (${used}).`);
      } else {
        prtDbg(`Entry ${I} is not used.`);
      }
    }
    prtDbg("KnownAvrs :");

    for ( let I = 0 ; I < knownAvrs.length; I++ ) {
        prtDbg(`${I} -> ${knownAvrs[I].name}.`);
    }

    prtDbg("KnownDevs :");
    for ( let I = 0 ; I < MAX_AVRS ; I++ ) {
      prtDbg(`${I} -> ${JSON.stringify(knownDevs[I])}.`);
    }
  }

  callback(null,true);

};

/**
 * Pair Homey with new devices.
 *
 * @method     pair
 * @param      net.Socket  socket  communication socket
 * @return     'callback'
 */
let pair = (socket: net.Socket): void  => {

  socket
    .on( "list_devices", (data, callback: Function ): void  => {

      // Data doesnt contain information ({}).

      if ( myDebugMode === true ) {

        prtDbg("HomeyAvr: pair => list_devices called.");
        prtDbg( "data => "       + JSON.stringify( data ));
        prtDbg( "newDevInfo => " + JSON.stringify( newDevInfo ));
      }

      if ( newDevInfo.avrindex === -1 ) {
        callback( new Error( getI18nString("error.full_dev_ar")), {});
      }

      let devices: Array<HomeyDevice>  = [
        {
          name: newDevInfo.avrname,
          data: {
            id:       newDevInfo.avrname,
            avrip:    newDevInfo.avrip,
            avrport:  newDevInfo.avrport,
            avrname:  newDevInfo.avrname,
            avrtype:  newDevInfo.avrtype,
            avrindex: newDevInfo.avrindex
          }
        }
      ];

      newDevInfo = null;

      callback( null, devices);
    })

    .on( "get_devices", (data: PairData ): void  => {

      if ( myDebugMode === true ) {
        prtDbg("HomeyAvr: pair => get_devices called.");
        prtDbg( "data => " + JSON.stringify( data ));
      }

      let curSlot: number = -1 ;

      for ( let I = 0 ; I < MAX_AVRS ; I++ ) {

        if ( avrDevArray[I].used === false ) {
          curSlot = I;
          prtDbg(`Using slot ${I}.`);
          break;
        }
      }

      newDevInfo = {
        avrip:    data.avrip,
        avrport:  parseInt(data.avrport),
        avrname:  data.avrname,
        avrtype:  data.avrtype,
        avrindex: curSlot
      };

      socket.emit("continue", null );
    })

    .on("disconnect" , (): void => {

      prtDbg("HomeyAvr - User aborted pairing, or pairing is finished");

    });
};

/**
 * Capabilities of the AVR application.
 * onoff: AVR power on or off.
 */
let capabilities = {

  onoff: {
    get: (device_data: AvrDeviceData, callback: Function): void  => {
      if ( myDebugMode === true ) {
        prtDbg("Capabilities - get");
        prtDbg( "device_data => " + JSON.stringify( device_data ));
      }

      if ( avrDevArray[ device_data.avrindex ].used === true ) {
        if ( avrDevArray[ device_data.avrindex ].available === true ) {
          callback( null, avrDevArray[ device_data.avrindex ].dev.getPowerOnOffState() );
        } else {
          callback( new Error( getI18nString("error.devnotavail")), false);
        }
      } else {
        callback( new Error( getI18nString("error.devnotused")), false);
      }
    },
    set: (device_data: AvrDeviceData, data: boolean , callback: Function ): void  => {
      if ( myDebugMode === true ) {
        prtDbg("Capabilities - set ");
        prtDbg( "Device_data => " + JSON.stringify( device_data ));
        prtDbg( "Data => " + JSON.stringify( data ));
      }
      if ( avrDevArray[ device_data.avrindex ].used === true ) {
        if ( avrDevArray[ device_data.avrindex ].available === true ) {
          if ( data === true ) {
            avrDevArray[ device_data.avrindex ].dev.powerOn();
          } else {
            avrDevArray[ device_data.avrindex ].dev.powerOff();
          }
          callback( null, true);
        }else {
          callback( new Error( getI18nString("error.devnotavail")), false);
        }
      } else {
        callback( new Error( getI18nString("error.devnotused")), false);
      }
    }
  }
};

/**
 * Change saved parameters of the Homey device.
 *
 * @param      AvrDeviceData    device_data    The device data
 * @param      SetttingsData    newSet         The new set
 * @param      SetttingsData    oldSet         The old set
 * @param      Array<string>,   changedKeyArr  The changed key arr
 * @param      Function         callback       The callback
 * @return     'callback'
 */
let settings = (device_data: AvrDeviceData,
                newSet: SetttingsData  ,
                oldSet: SetttingsData  ,
                changedKeyArr: Array<string>,
                callback: Function): void => {

  if ( myDebugMode === true ) {
    prtDbg("Capabilities get : ");
    prtDbg( "device_data => "  + JSON.stringify( device_data) );
    prtDbg( "newSet => "       + JSON.stringify( newSet) );
    prtDbg( "oldSet => "       + JSON.stringify( oldSet ) );
    prtDbg( "changedKeyArr =>" + JSON.stringify( changedKeyArr));
  }

  let nIP:        string  = device_data.avrip;
  let nPort:      number  = device_data.avrport;
  let nType:      string  = device_data.avrtype;
  let isChanged:  number  =  0 ;
  let errorDect:  number  =  0 ;
  let errorIdStr: string  = "";
  let num:        number  = parseInt(newSet.avrport);

  changedKeyArr.forEach( (key: string) => {

    switch (key) {

      case "avrip":
        if (/^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/.test(newSet.avrip))  {

          prtDbg(`Correct IP adresss ${nIP}.`);
          nIP = newSet.avrip;
          isChanged = 1;
        } else {

          errorDect = 1;
          errorIdStr = "error.invalidIP";
        }

        break;
      case "avrport" :
        if ( isNaN(num) || num < 0 || num > 65535 ) {
          errorDect = 1;
          errorIdStr = "error.invalidPort";
        } else {
          nPort = parseInt(newSet.avrport);
          isChanged = 1;
        }
        break;
      case "avrtype":
        nType = newSet.avrtype;
        isChanged = 1;
        break;
    }
  });

  if ( errorDect === 1 ) {
    prtDbg("Settings returning a failure");
    callback( new Error( getI18nString(errorIdStr)), false );
    return;
  }

  if ( isChanged === 1 ) {
    if ( avrDevArray[ device_data.avrindex].used === true ) {

      avrDevArray[ device_data.avrindex].dev.disconnect();
      avrDevArray[ device_data.avrindex].dev = null ;
    }

    avrDevArray[ device_data.avrindex ] = {
      dev:        new AVR(),
      available:  false,
      confLoaded: false,
      used:       true
    }

    prtDbg(`Check -> ${nIP}:${nPort}:${nType}.`);

    avrDevArray[ device_data.avrindex ].dev.init(nPort,
                                                 nIP,
                                                 device_data.avrname,
                                                 nType,
                                                 device_data.avrindex,
                                                 avrComChannel );
  }

  knownDevs[ device_data.avrindex ] = {
    avrip:      nIP,
    avrport:    nPort,
    avrname:    device_data.avrname,
    avrtype:    nType,
    avrindex:   device_data.avrindex
  }

  callback( null, true );
};

/**
 * Homey.on("unload").
 * Called when Homey requests the app to stop/unload.
 */
Homey.on("unload" , (): void => {
  /* ================================================================ */
  /* = Homey requests to 'unload/stop'.                             = */
  /* = For all known devices: disconnnect                           = */
  /* ================================================================ */
  for ( let I = 0 ; I < avrDevArray.length ; I++ ) {
    if ( avrDevArray[I].used === true ) {

      avrDevArray[I].dev.disconnect();
    }
  }
});

/**
 * Homey.on("cpuwarn")
 * Called when Homey informs us the program takes too much cpu power.
 * Currently the reaction is to close down,
 */
Homey.on("cpuwarn" , (): void => {

  /* ================================================================ */
  /* = Homey warning HomeyAVr takes more the 80 of the cpu.         = */
  /* = For all known devices: disconnnect                           = */
  /* ================================================================ */

  for ( let I = 0 ; I < avrDevArray.length ; I++ ) {
    for ( let I = 0 ; I < avrDevArray.length ; I++ ) {
      if ( avrDevArray[I].used === true ) {

        avrDevArray[I].dev.disconnect();
      }
    }
  }
});


/**
 * Set up event listeners on events fro the AVR controller..
 */
let setUpListeners = (): void => {

  avrComChannel
    /* ============================================================== */
    /* = Initialization event from the AVR controller               = */
    /* = 'init_success' => Loaded the 'type'.json file              = */
    /* =                   Network connection initiated             = */
    /* = 'init_failed'  => unable to load 'type'.json file          = */
    /* =                   Controller will do nothing anymore       = */
    /* ============================================================== */
    .on("init_success", (num: number, name: string, type: string): void => {
      prtDbg(`AVR ${name} (slot:${num}) has loaded the ${type}.json file.`);
        avrDevArray[ num ].confLoaded = true;
      })

    .on("init_failed", (num: number, name: string, type: string): void => {
      prtDbg(`Error: AVR ${name} (slot:${num}) has fail to load the ${type}.json file.`);
      avrDevArray[ num ].confLoaded = false;
    })

    /* ============================================================== */
    /* = Network events from the AVR controller                     = */
    /* = 'net_connected'   => Network connection to AVR established.= */
    /* = 'net_disconnected' => Avr disconnect request               = */
    /* = 'net_timed_out'   => Received a time out event             = */
    /* = 'net_error'       => received a network error.nymore       = */
    /* = 'net_uncaught'    => Uncatched network event               = */
    /* ============================================================== */
    .on("net_connected", (num: number ,name: string ): void => {
      prtDbg(`AVR ${name} (slot:${num}) is connected.`);
      avrDevArray[ num ].available = true;
      setAvrAvailable( knownDevs[num]);
    })

    .on("net_disconnected" , (num: number, name: string ): void => {
      prtDbg(`AVR ${name} (slot:${num}) is disconnected.`);
      avrDevArray[ num ].available = false;
      setAvrUnavailable( knownDevs[num], getI18nString("error.devnotcon"));
    })

    .on("net_timedout" , (num: number, name: string): void  => {
      prtDbg(`AVR ${name} (slot:${num}) timed out.`);
      avrDevArray[ num ].available = false;
      setAvrUnavailable( knownDevs[num], getI18nString("error.devnotcon"));
    })

    .on("net_error", (num: number, name: string, err: Error ): void  => {
      prtDbg(`AVR ${name} (slot:${num}) has a network error -> ${err}.`);
      avrDevArray[ num ].available = false;
      setAvrUnavailable( knownDevs[num], getI18nString("error.devnotcon"));
    })

    .on("net_uncaught" , (num: number, name: string, err: string): void => {
      prtDbg(`AVR ${name} (slot:${num}) : uncaught event '${err}'.`);
      avrDevArray[ num ].available = false;
      setAvrUnavailable( knownDevs[num], getI18nString("error.devnotcon"));
    })

    /* ============================================================== */
    /* = Status change events from the AVR controller               = */
    /* = 'power_status_chg'    => Main power status changed.        = */
    /* = 'mzpower_status_chg'  => Main zone power status changed    = */
    /* = 'mute_status_chg'     => Mute status changed               = */
    /* = 'eco_status_chg'      => Eco mode status changed.          = */
    /* ============================================================== */
    .on("power_status_chg" , (num: number, name: string, newcmd: string, oldcmd: string ): void => {
      prtDbg(`Power: AVR ${name} (slot:${num}) : ${newcmd} - ${oldcmd}`);
      if ( newcmd === "power.on" && oldcmd === "power.off" ) {
          Homey.manager("flow").trigger("t_power_on", {name: name}, {name: name});
      } else if ( newcmd === "power.off" && oldcmd === "power.on") {
          Homey.manager("flow").trigger("t_power_off", {name: name}, {name: name});
      }
    })

    .on("mzpower_status_chg" , (num: number, name: string, newcmd: string, oldcmd: string ): void => {
      prtDbg(`Mzpower: AVR ${name} (slot:${num}) : ${newcmd} - ${oldcmd}`);
      if ( newcmd === "mzpower.on" && oldcmd === "mzpower.off" ) {
          Homey.manager("flow").trigger("t_mzpower_on", {name: name}, {name: name});
      } else if ( newcmd === "mzpower.off" && oldcmd === "mzpower.on") {
          Homey.manager("flow").trigger("t_mzpower_off", {name: name}, {name: name});
      }
    })

    .on("mute_status_chg" , (num: number, name: string, newcmd: string, oldcmd: string ): void => {
      prtDbg(`Mute: AVR ${name} (slot:${num}) : ${newcmd} - ${oldcmd}`);
      if ( newcmd === "mute.on" && oldcmd === "mute.off" ) {
        Homey.manager("flow").trigger("t_mute_on", {name: name}, {name: name});
      } else if ( newcmd === "mute.off" && oldcmd === "mute.on") {
        Homey.manager("flow").trigger("t_mute_off", {name: name}, {name: name});
      }
    })

    .on("eco_status_chg" , (num: number, name: string, newStat: string, oldStat: string ): void => {
      prtDbg(`Eco: AVR ${name} (slot:${num}): ${newStat} - ${oldStat}`);
      Homey.manager("flow").trigger("t_eco_on", {name: name}, {name: name, command: newStat });
      Homey.manager("flow").trigger("t_eco_off", {name: name}, {name: name, command: oldStat });
    })

    .on("isource_status_chg" , (num: number, name: string, newStat: string, oldStat: string ): void  => {
      prtDbg(`Inputsource: AVR ${name} (slot:${num}): newStat:${newStat} - oldStat:${oldStat}`);
      Homey.manager("flow").trigger("t_inputsource_sel", {name: name}, {name: name, command: newStat});
      Homey.manager("flow").trigger("t_inputsource_des", {name: name}, {name: name, command: oldStat});
    })

    .on("surround_status_chg" , (num: number, name: string, newStat: string, oldStat: string ): void => {
      prtDbg(`Surround: AVR ${name} (slot:${num}): newStat:${newStat} - oldStat:${oldStat}`);
      Homey.manager("flow").trigger("t_surround_sel", {name: name}, {name: name, command: newStat });
      Homey.manager("flow").trigger("t_surround_des", {name: name}, {name: name, command: oldStat });
    })

    .on("volume_chg" , (num: number, name: string, value: number): void  => {
      prtDbg(`Avr ${name} (slot ${num}) changed volume to ${value}.`);
    })

    /* ============================================================== */
    /* = Debug events from the AVR controller                       = */
    /* ============================================================== */
    .on( "debug_log"  , (num: number, name: string, msg: string ): void => {
      prtDbg(`AVR ${name} (slot ${num}) ${msg}.`);
    })

    /* ============================================================== */
    /* = Uncaught exceptions                                        = */
    /* =   To prevent run time error when fired.                    = */
    /* ============================================================== */
    .on("uncaughtException", (err: Error): void  => {
      prtDbg(`Oops: uncaught exception: ${err} !.`);
    });
};

let setUpFlowActionsAndTriggers = () : void => {

  Homey.manager("flow")
  /* ============================================================== */
  /* = Main power events                                         = */
  /* ============================================================== */
    .on("action.poweron" , (callback: Function, args: ActionArgsInfo): void  =>  {
      if ( myDebugMode === true ){
        prtDbg( "action.poweron :");
        prtDbg( "args => " + JSON.stringify( args ));
      }
      if ( avrDevArray[ args.device.avrindex ].used === true ) {
        if ( avrDevArray[ args.device.avrindex ].available == true ) {
          avrDevArray[ args.device.avrindex ].dev.powerOn();
          callback( null, true );
        } else {
          callback( new Error( getI18nString("error.devnotavail")), false );
        }
      } else {
        callback( new Error( getI18nString("error.devnotused")), false );
      }
    })

    .on("action.poweroff", (callback: Function, args: ActionArgsInfo ): void => {
      if ( myDebugMode === true ){
        prtDbg( "action.poweroff :");
        prtDbg( "args => " + JSON.stringify( args ));
      }
      if ( avrDevArray[ args.device.avrindex ].used === true ) {
        if ( avrDevArray[ args.device.avrindex ].available == true ) {
          avrDevArray[ args.device.avrindex ].dev.powerOff();
          callback( null, true );
        } else {
          callback( new Error( getI18nString("error.devnotavail")), false );
        }
      } else {
        callback( new Error( getI18nString("error.devnotused")), false );
      }
    })

    .on("trigger.t_power_on.avrname.autocomplete", (callback: Function): void => {
      callback( null, knownAvrs);
    })

    .on("trigger.t_power_off.avrname.autocomplete", (callback: Function): void => {
      callback( null, knownAvrs);
    })

    .on("trigger.t_power_on", (callback: Function, args: ArgsData , data: TriggerData ): void => {
      if ( myDebugMode === true ){
        prtDbg( "trigger.t_power_on :");
        prtDbg( "args => " + JSON.stringify( args ));
        prtDbg( "data => " + JSON.stringify( data ));
      }
      prtDbg("On Trigger t_power_on called");
      callback( null, true );
    })

    .on("trigger.t_power_off", (callback: Function, args: ArgsData , data: TriggerData ): void => {
      prtDbg("On Trigger t_power_off called");
      callback( null, true );
    })

    /* ============================================================== */
    /* = Main zone power events                                     = */
    /* ============================================================== */
    .on("action.main_zone_poweron" , (callback: Function, args: ActionArgsInfo ): void => {
      if ( myDebugMode === true ) {
        prtDbg( "Action.main_zone_poweron : ");
        prtDbg( "args => " + JSON.stringify( args ));
      }
      if ( avrDevArray[ args.device.avrindex ].used === true ) {
        if ( avrDevArray[ args.device.avrindex ].available == true ) {
          avrDevArray[ args.device.avrindex ].dev.mainZonePowerOn();
          callback( null, true );
        } else {
          callback( new Error( getI18nString("error.devnotavail")), false );
        }
      } else {
        callback( new Error( getI18nString("error.devnotused")), false );
      }
    })

    .on("action.main_zone_poweroff", (callback: Function, args: ActionArgsInfo ): void => {
      if ( myDebugMode === true ) {
        prtDbg( "Action.main_zone_poweroff : ");
        prtDbg( "args => " + JSON.stringify( args ));
      }
      if ( avrDevArray[ args.device.avrindex ].used === true ) {
        if ( avrDevArray[ args.device.avrindex ].available == true ) {
          avrDevArray[ args.device.avrindex ].dev.mainZonePowerOff();
          callback( null, true );
        } else {
          callback( new Error( getI18nString("error.devnotavail")), false );
        }
      } else {
        callback( new Error( getI18nString("error.devnotused")), false );
      }
    })

    .on("trigger.t_mzpower_on.avrname.autocomplete", (callback: Function): void => {
      callback( null, knownAvrs);
    })

    .on("trigger.t_mzpower_off.avrname.autocomplete", (callback: Function): void => {
      callback( null, knownAvrs);
    })

    .on("trigger.t_mzpower_on", (callback: Function, args: ArgsData , data: TriggerData ): void => {
      if ( myDebugMode === true ) {
        prtDbg( "Trigger.t_mzpower_on : ");
        prtDbg( "args => " + JSON.stringify( args ));
        prtDbg( "data => " + JSON.stringify( data ));
      }
      callback( null, true );
    })

    .on("trigger.t_mzpower_off", (callback: Function, args: ArgsData , data: TriggerData ): void => {
      if ( myDebugMode === true ) {
        prtDbg( "Trigger.t_mzpower_off : ");
        prtDbg( "args => " + JSON.stringify( args ));
        prtDbg( "data => " + JSON.stringify( data ));
      }
      callback( null, true );
    })

    /* ============================================================== */
    /* = Mute events                                                = */
    /* ============================================================== */
    .on("action.mute", (callback: Function, args: ActionArgsInfo ): void => {
      if ( myDebugMode === true ) {
        prtDbg( "Action.mute : ");
        prtDbg( "args => " + JSON.stringify( args ));
      }
      if ( avrDevArray[ args.device.avrindex ].used === true ) {
        if ( avrDevArray[ args.device.avrindex ].available == true ) {
          avrDevArray[ args.device.avrindex ].dev.muteOn();
          callback( null, true );
        } else {
          callback( new Error( getI18nString("error.devnotavail")), false );
        }
      } else {
        callback( new Error( getI18nString("error.devnotused")), false );
      }
    })

    .on("action.unmute", (callback: Function, args: ActionArgsInfo ): void => {
      if ( myDebugMode === true ) {
        prtDbg( "Action.unmute : ");
        prtDbg( "args => " + JSON.stringify( args ));
      }
      if ( avrDevArray[ args.device.avrindex ].used === true ) {
        if ( avrDevArray[ args.device.avrindex ].available == true ) {
          avrDevArray[ args.device.avrindex ].dev.muteOff();
          callback( null, true );
        } else {
          callback( new Error( getI18nString("error.devnotavail")), false );
        }
      } else {
        callback( new Error( getI18nString("error.devnotused")), false );
      }
    })

    .on("trigger.t_mute_on.avrname.autocomplete", (callback: Function): void => {
      callback( null, knownAvrs);
    })

    .on("trigger.t_mute_off.avrname.autocomplete", (callback: Function): void => {
      callback( null, knownAvrs);
    })

    .on("trigger.t_mute_on", (callback: Function, args: ArgsData , data: TriggerData ): void => {
      if ( myDebugMode === true ) {
        prtDbg( "Trigger.t_mute_on : ");
        prtDbg( "args => " + JSON.stringify( args ));
        prtDbg( "data => " + JSON.stringify( data ));
      }
      callback( null, true );
    })

    .on("trigger.t_mute_off", (callback: Function, args: ArgsData , data: TriggerData ): void => {
      if ( myDebugMode === true ) {
        prtDbg( "Trigger.t_mute_off : ");
        prtDbg( "args => " + JSON.stringify( args ));
        prtDbg( "data => " + JSON.stringify( data ));
      }
      callback( null, true );
    })

    /* ============================================================== */
    /* = Eco events                                                 = */
    /* ============================================================== */
    .on("action.eco.input.autocomplete", (callback: Function, args: ArgsComplete): void => {
      if ( myDebugMode === true ) {
        prtDbg( "Action.eco input complete : ");
        prtDbg( "args => " + JSON.stringify( args ));
      }
      if ( typeof(args.args.device.name) === "undefined" ) {
        callback( new Error( getI18nString("error.devnotsel")), false );
      } else {
        let index = -1 ;
        for( let I = 0 ; I < MAX_AVRS ; I++ ){
          if ( avrDevArray[I].used === true ) {
            if ( avrDevArray[I].dev.getName() === args.args.device.name ) {
              index = I;
              break;
            }
          }
        }
        if ( index !== -1 ) {
          let cItems = [];
          if ( avrDevArray[ index].dev.hasEco() === true ) {
            let items = avrDevArray[ index ].dev.getValidEcoModes();

            for ( let I = 0 ; I < items.length; I++ ){
              cItems.push( {
                command: items[I].command,
                name:    getI18nString(items[I].i18n)
              });
            }
          } else {
            cItems.push( {
              command: "",
              name:    getI18nString("eco.ns")
            });
          }
          callback(null, cItems);
        } else {
          callback( new Error( getI18nString("error.devnotused")), false );
        }
      }
    })

    .on("action.eco", (callback: Function, args: ActionArgsInfo ): void  => {
      if ( myDebugMode === true ) {
        prtDbg( "Action.eco : ");
        prtDbg( "args => " + JSON.stringify( args ));
      }
      if ( avrDevArray[ args.device.avrindex ].used === true ) {
        if ( avrDevArray[ args.device.avrindex ].available == true ) {
          if ( avrDevArray[ args.device.avrindex].dev.hasEco() === true ) {
            avrDevArray[ args.device.avrindex ].dev.sendEcoCommand(args.input.command);
            callback(null, true);
          } else {
            callback( new Error( getI18nString("error.econotsup")), false );
          }
        } else {
          callback( new Error( getI18nString("error.devnotavail")), false );
        }
      } else {
        callback( new Error( getI18nString("error.devnotconf")), false );
      }
    })

    .on("trigger.t_eco_on.input.autocomplete", (callback: Function, args: ArgsComplete ): void  => {
      if ( myDebugMode === true ) {
        prtDbg( "Trigger.t_eco_on : ");
        prtDbg( "args => " + JSON.stringify( args ));
      }
      if ( typeof(args.args.device.name) === "undefined" ) {
        callback( new Error( getI18nString("error.devnotsel")), false );
      } else {
        let index = -1 ;
        for( let I = 0 ; I < MAX_AVRS ; I++ ){
          if ( avrDevArray[I].used === true ) {
            if ( avrDevArray[I].dev.getName() === args.args.device.name ) {
              index = I;
              break;
            }
          }
        }
        if ( index !== -1 ) {

          if( avrDevArray[ index ].dev.hasEco() === true ) {
            let items = avrDevArray[ index ].dev.getValidEcoModes();
            let cItems: Array<SelectionArgs> = [];

            for ( let I = 0 ; I < items.length; I++ ){
              cItems.push( {
                command: items[I].command,
                name:    getI18nString(items[I].i18n),
                i18n:    items[I].i18n
              });
            }
            callback(null, cItems);
          } else {
            callback( new Error( getI18nString("error.econotsup")), false );
          }
        } else {
          prtDbg(`Error: AVR ${args.args.device.name} not found.`);
          callback( new Error( getI18nString("error.devnotused")), false );
        }
      }
    })

    .on("trigger.t_eco_off.input.autocomplete", (callback: Function, args: ArgsComplete ): void  => {
      if ( myDebugMode === true ) {
        prtDbg( "Trigger.t_eco_off imput complete : ");
        prtDbg( "args => " + JSON.stringify( args ));
      }
      if ( typeof(args.args.device.name) === "undefined" ) {
        callback( new Error( getI18nString("error.devnotsel")), false );
      } else {
        let index = -1 ;
        for( let I = 0 ; I < MAX_AVRS ; I++ ){
          if ( avrDevArray[I].used === true ) {
            if ( avrDevArray[I].dev.getName() === args.args.device.name ) {
              index = I;
              break;
            }
          }
        }
        if ( index !== -1 ) {
          if( avrDevArray[ index ].dev.hasEco() === true ) {
            let items = avrDevArray[ index ].dev.getValidEcoModes();
            let cItems: Array<SelectionArgs> = [];

            for ( let I = 0 ; I < items.length; I++ ){
              cItems.push( {
                command: items[I].command,
                name:    getI18nString(items[I].i18n),
                i18n:    items[I].i18n
              });
            }
            callback(null, cItems);
          } else {
            callback( new Error( getI18nString("error.econotsup")), false );
          }
        } else {
          callback( new Error( getI18nString("error.devnotused")), false );
        }
      }
    })

    .on("trigger.t_eco_on.avrname.autocomplete", (callback: Function): void => {
      callback( null, knownAvrs);
    })

    .on("trigger.t_eco_off.avrname.autocomplete", (callback: Function): void => {
      callback( null, knownAvrs);
    })

    .on("trigger.t_eco_on", (callback: Function, args: TriggerArgs , data: TriggerData ): void => {
      if ( myDebugMode === true ) {
        prtDbg( "Trigger.t_eco_on : ");
        prtDbg( "args => " + JSON.stringify( args ));
        prtDbg( "data => " + JSON.stringify( data ));
      }
      if ( data.name === args.device.avrname && data.command === args.input.i18n ) {
        callback( null, true);
      } {
        callback( null, false );
      }
    })

    .on("trigger.t_eco_off", (callback: Function, args: TriggerArgs , data: TriggerData ): void => {
      if ( myDebugMode === true ) {
        prtDbg( "Trigger.t_eco_off : ");
        prtDbg( "args => " + JSON.stringify( args ));
        prtDbg( "data => " + JSON.stringify( data ));
      }
      if ( data.name === args.device.avrname && data.command === args.input.i18n ) {
        callback( null, true);
      } {
        callback( null, false );
      }
    })

    /* ============================================================== */
    /* = inputsource events                                         = */
    /* ============================================================== */
    //General
    .on("action.selectinput.input.autocomplete", (callback: Function, args: ArgsComplete): void => {
      if ( myDebugMode === true ) {
        prtDbg( "Action selectinput imput complete : ");
        prtDbg( "args => " + JSON.stringify( args ));
      }
      if ( typeof(args.args.device.name) === "undefined" ) {
        callback( new Error( getI18nString("error.devnotsel")), false );
      } else {
        let index = -1 ;
        for( let I = 0 ; I < MAX_AVRS ; I++ ){
          if ( avrDevArray[I].used === true ) {
            if ( avrDevArray[I].dev.getName() === args.args.device.name ) {
              index = I;
              break;
            }
          }
        }
        if ( index !== -1 ) {
          let items = avrDevArray[ index ].dev.getValidInputSelection();
          let cItems = [];

          for ( let I = 0 ; I < items.length; I++ ){
            cItems.push( {
              command: items[I].command,
              name:    getI18nString(items[I].i18n)
            });
          }
          callback(null, cItems);
        } else {
          callback( new Error( getI18nString("error.devnotused")), false );
        }
      }
    })

    .on("action.selectinput", (callback: Function, args: ActionArgsInfo ): void => {
      if ( myDebugMode === true ) {
        prtDbg( "Action selectinput : ");
        prtDbg( "args => " + JSON.stringify( args ));
      }
      if ( avrDevArray[ args.device.avrindex ].used === true ) {
        if ( avrDevArray[ args.device.avrindex ].available == true ) {
          avrDevArray[ args.device.avrindex ].dev.selectInputSource(args.input.command);
          callback(null, true);
        } else {
          callback( new Error( getI18nString("error.devnotavail")), false );
        }
      } else {
        callback( new Error( getI18nString("error.devnotconf")), false );
      }
    })

    .on("trigger.t_inputsource_sel.input.autocomplete", (callback: Function, args: ArgsComplete ): void  => {
      if ( myDebugMode === true ) {
        prtDbg( "Trigger t_inputsource_sel imput complete : ");
        prtDbg( "args => " + JSON.stringify( args ));
      }
      if ( typeof(args.args.device.name) === "undefined" ) {
        callback( new Error( getI18nString("error.devnotsel")), false );
      } else {
        let index = -1 ;
        for( let I = 0 ; I < MAX_AVRS ; I++ ){
          if ( avrDevArray[I].used === true ) {
            if ( avrDevArray[I].dev.getName() === args.args.device.name ) {
              index = I;
              break;
            }
          }
        }
        if ( index !== -1 ) {
          let items = avrDevArray[ index ].dev.getValidInputSelection();
          let cItems: Array<SelectionArgs> = [];

          for ( let I = 0 ; I < items.length; I++ ){
            cItems.push( {
              command: items[I].command,
              name:    getI18nString(items[I].i18n),
              i18n:    items[I].i18n
            });
          }
          callback(null, cItems);
        } else {
          callback( new Error( getI18nString("error.devnotused")), false );
        }
      }
    })

    .on("trigger.t_inputsource_des.input.autocomplete", (callback: Function, args: ArgsComplete ): void  => {
      if ( myDebugMode === true ) {
        prtDbg( "Trigger t_inputsource_des imput complete : ");
        prtDbg( "args => " + JSON.stringify( args ));
      }
      if ( typeof(args.args.device.name) === "undefined" ) {
        callback( new Error( getI18nString("error.devnotsel")), false );
      } else {
        let index = -1 ;
        for( let I = 0 ; I < MAX_AVRS ; I++ ){
          if ( avrDevArray[I].used === true ) {
            if ( avrDevArray[I].dev.getName() === args.args.device.name ) {
              index = I;
              break;
            }
          }
        }
        if ( index !== -1 ) {
          let items = avrDevArray[ index ].dev.getValidInputSelection();
          let cItems: Array<SelectionArgs> = [];

          for ( let I = 0 ; I < items.length; I++ ){
            cItems.push( {
              command: items[I].command,
              name:    getI18nString(items[I].i18n),
              i18n:    items[I].i18n
            });
          }
          callback(null, cItems);
        } else {
          callback( new Error( getI18nString("error.devnotused")), false );
        }
      }
    })

    .on("trigger.t_inputsource_sel.avrname.autocomplete", (callback: Function): void => {
      callback( null, knownAvrs);
    })

    .on("trigger.t_inputsource_des.avrname.autocomplete", (callback: Function): void => {
      callback( null, knownAvrs);
    })

    .on("trigger.t_inputsource_sel", (callback: Function, args: TriggerArgs , data: TriggerData ): void => {
      if ( myDebugMode === true ) {
        prtDbg( "Trigger.t_inputsource_sel : ");
        prtDbg( "args => " + JSON.stringify( args ));
        prtDbg( "data => " + JSON.stringify( data ));
      }
      if ( data.name === args.device.avrname && data.command === args.input.i18n ) {
        callback( null, true);
      } {
        callback( null, false );
      }
    })

    .on("trigger.t_inputsource_des", (callback: Function, args: TriggerArgs , data: TriggerData ): void => {
      if ( myDebugMode === true ) {
        prtDbg( "Trigger.t_inputsource_des : ");
        prtDbg( "args => " + JSON.stringify( args ));
        prtDbg( "data => " + JSON.stringify( data ));
      }
      prtDbg( JSON.stringify( args ));
      prtDbg( JSON.stringify( data ));

      if ( data.name === args.device.avrname && data.command === args.input.i18n ) {
        callback( null, true);
      } {
        callback( null, false );
      }
    })

    /* ============================================================== */
    /* = surround mode events                                       = */
    /* ============================================================== */
    // General
    .on("action.surround", (callback: Function, args: ActionArgsInfo ): void  => {
      if ( myDebugMode === true ) {
        prtDbg( "Action surround : ");
        prtDbg( "args => " + JSON.stringify( args ));
      }
      if ( avrDevArray[ args.device.avrindex ].used === true ) {
        if ( avrDevArray[ args.device.avrindex ].available == true ) {
          avrDevArray[ args.device.avrindex ].dev.setSurrroundCommand(args.input.command);
          callback(null, true);
        } else {
          callback( new Error( getI18nString("error.devnotavail")), false );
        }
      } else {
        callback( new Error( getI18nString("error.devnotconf")), false );
      }
    })

    .on("action.surround.input.autocomplete", (callback: Function, args: ArgsComplete ): void  => {
      if ( myDebugMode === true ) {
        prtDbg( "Action surround input autocomplete: ");
        prtDbg( "args => " + JSON.stringify( args ));
      }
      if ( typeof(args.args.device.name) === "undefined" ) {
        callback( new Error( getI18nString("error.devnotsel")), false );
      } else {
        let index = -1 ;
        for( let I = 0 ; I < MAX_AVRS ; I++ ){
          if ( avrDevArray[I].used === true ) {
            if ( avrDevArray[I].dev.getName() === args.args.device.name ) {
              index = I;
              break;
            }
          }
        }
        if ( index !== -1 ) {
          let items = avrDevArray[ index ].dev.getValidSurround();
          let cItems = [];

          for ( let I = 0 ; I < items.length; I++ ){
            cItems.push( {
              command: items[I].command,
              name:    getI18nString(items[I].i18n)
            });
          }
          callback(null, cItems);
        } else {
          callback( new Error( getI18nString("error.devnotused")), false );
        }
      }
    })

    .on("trigger.t_surround_sel.input.autocomplete", (callback: Function, args: ArgsComplete ): void  => {
      if ( myDebugMode === true ) {
        prtDbg( "Trigger t_surround_sel input autocomplete : ");
        prtDbg( "args => " + JSON.stringify( args ));
      }
      if ( typeof(args.args.device.name) === "undefined" ) {
        callback( new Error( getI18nString("error.devnotsel")), false );
      } else {
        let index = -1 ;
        for( let I = 0 ; I < MAX_AVRS ; I++ ){
          if ( avrDevArray[I].used === true ) {
            if ( avrDevArray[I].dev.getName() === args.args.device.name ) {
              index = I;
              break;
            }
          }
        }
        if ( index !== -1 ) {
          let items = avrDevArray[ index ].dev.getValidSurround();
          let cItems: Array<SelectionArgs> = [];

          for ( let I = 0 ; I < items.length; I++ ){
            cItems.push( {
              command: items[I].command,
              name:    getI18nString(items[I].i18n),
              i18n:    items[I].i18n
            });
          }
          callback(null, cItems);
        } else {
          callback( new Error( getI18nString("error.devnotused")), false );
        }
      }
    })

    .on("trigger.t_surround_des.input.autocomplete", (callback: Function, args: ArgsComplete ): void  => {
      if ( myDebugMode === true ) {
        prtDbg( "Trigger t_surround_des input autocomplete : ");
        prtDbg( "args => " + JSON.stringify( args ));
      }
      if ( typeof(args.args.device.name) === "undefined" ) {
        callback( new Error( getI18nString("error.devnotsel")), false );
      } else {
        let index = -1 ;
        for( let I = 0 ; I < MAX_AVRS ; I++ ){
          if ( avrDevArray[I].used === true ) {
            if ( avrDevArray[I].dev.getName() === args.args.device.name ) {
              index = I;
              break;
            }
          }
        }
        if ( index !== -1 ) {
          let items = avrDevArray[ index ].dev.getValidSurround();
          let cItems: Array<SelectionArgs> = [];

          for ( let I = 0 ; I < items.length; I++ ){
            cItems.push( {
              command: items[I].command,
              name:    getI18nString(items[I].i18n),
              i18n:    items[I].i18n
            });
          }
          callback(null, cItems);
        } else {
          callback( new Error( getI18nString("error.devnotused")), false );
        }
      }
    })

    .on("trigger.t_surround_sel.avrname.autocomplete", (callback: Function): void => {
      callback( null, knownAvrs);
    })

    .on("trigger.t_surround_des.avrname.autocomplete", (callback: Function): void => {
      callback( null, knownAvrs);
    })

    .on("trigger.t_surround_sel", (callback: Function, args: TriggerArgs , data: TriggerData ): void => {
      if ( myDebugMode === true ) {
        prtDbg( "Trigger.t_surround_sel : ");
        prtDbg( "args => " + JSON.stringify( args ));
        prtDbg( "data => " + JSON.stringify( data ));
      }
      if ( data.name === args.device.avrname && data.command === args.input.i18n ) {
        callback( null, true);
      } {
        callback( null, false );
      }
    })

    .on("trigger.t_surround_des", (callback: Function, args: TriggerArgs , data: TriggerData ): void => {
      if ( myDebugMode === true ) {
        prtDbg( "Trigger.t_surround_des : ");
        prtDbg( "args => " + JSON.stringify( args ));
        prtDbg( "data => " + JSON.stringify( data ));
      }
      if ( data.name === args.device.avrname && data.command === args.input.i18n ) {
        callback( null, true);
      } {
        callback( null, false );
      }
    })

    /* ============================================================== */
    /* = volume events                                              = */
    /* ============================================================== */
    .on("action.volumeup", (callback: Function, args: ActionArgsInfo ): void => {
      if ( myDebugMode === true ) {
        prtDbg( "Action volumeup : ");
        prtDbg( "args => " + JSON.stringify( args ));
      }
      if ( avrDevArray[ args.device.avrindex ].used === true ) {
        if ( avrDevArray[ args.device.avrindex ].available == true ) {
          avrDevArray[ args.device.avrindex ].dev.volumeUp();
          callback( null, true );
        } else {
          callback( new Error( getI18nString("error.devnotavail")), false );
        }
      } else {
        callback( new Error( getI18nString("error.devnotused")), false );
      }
    })

    .on("action.volumedown", (callback: Function, args: ActionArgsInfo ): void => {
      if ( myDebugMode === true ) {
        prtDbg( "Action volumedown : ");
        prtDbg( "args => " + JSON.stringify( args ));
      }
      if ( avrDevArray[ args.device.avrindex ].used === true ) {
        if ( avrDevArray[ args.device.avrindex ].available == true ) {
          avrDevArray[ args.device.avrindex ].dev.volumeDown();
          callback( null, true );
        } else {
          callback( new Error( getI18nString("error.devnotavail")), false );
        }
      } else {
        callback( new Error( getI18nString("error.devnotused")), false );
      }
    })

    .on("action.setvolume" , (callback: Function, args: ActionArgsInfo ): void => {
      if ( myDebugMode === true ) {
        prtDbg( "Action setvolume : ");
        prtDbg( "args => " + JSON.stringify( args ));
      }
      if ( avrDevArray[ args.device.avrindex ].used === true ) {
        if ( avrDevArray[ args.device.avrindex ].available == true ) {
          avrDevArray[ args.device.avrindex ].dev.setVolume( args.volumeNum);
          callback( null, true );
        } else {
          callback( new Error( getI18nString("error.devnotavail")), false );
        }
      } else {
        callback( new Error( getI18nString("error.devnotused")), false );
      }
    });
};

module.exports.deleted        = deleted;
module.exports.added          = added;
module.exports.init           = init;
module.exports.pair           = pair;
module.exports.capabilities   = capabilities;
module.exports.settings       = settings;

"use strict";

/* ================================================================== */
/* = Note:                                                          = */
/* = This is a generated javascript file.                           = */
/* = Don't edit the javascript file directly or change might be     = */
/* = lost with the next build.                                      = */
/* = Edit the typescipt file instead and re-generate the javascript = */
/* = file.                                                          = */
/* ================================================================== */

import * as events                                   from "events";
import { AVR }                                       from "./lib/avr";
import { PairData, AvrDeviceData, HomeyDeviceData  } from "./lib/interfaces";
import { HomeyAvrInfo, KnownAvrInfo, TriggerData   } from "./lib/interfaces";
import { ArgsData, ActionArgsInfo, SetttingsData }   from "./lib/interfaces";
import { ArgsComplete }                              from "./lib/interfaces";

declare var Homey: any ;

const MAX_AVRS: number                 = 8    ;  // Max allowed AVR configurations
const RESTART_WAIT_TIME: number        = 10000 ; // 10 sec.
let avrComChannel: events.EventEmitter = null ;  // event channel
let myDebugMode: boolean               = true;  // Write debug messages or not
let avrDevArray: Array<HomeyAvrInfo>   = [];     // AVR device array
let newDevInfo: AvrDeviceData          = null;     // New device
let knownAvrs: Array<KnownAvrInfo>     = [];     // Known avr names.
let knownDevs: Array<AvrDeviceData>   = [];

/**
 * Prints debug messages using homey.log if debug is switched on.
 *
 * @param      {string}  str     The message string
 */
let prtDbg = (str) => {
    if ( myDebugMode === true ) {
        let date = new Date();
        let dateStr = date.toISOString();
        Homey.log(`${dateStr}-${str}`);
    }
};

/**
 * Prints message unconditionally using home.log
 *
 * @param      {string}  str     The mesage string
 */
let prtMsg = (str) => {
    let date = new Date();
    let dateStr = date.toISOString();
    Homey.log(`${dateStr}-${str}`);
};

let setAvrUnavaileble = ( device_data, str: string ): void => {
  module.exports.setUnavailable( device_data, str);
}

let setAvrAvailable = (device_data): void => {
  module.exports.setAvailable( device_data );
}

/**
 * Gets the string defined in the locales files of homey.
 *
 * @param      {string}  str     The ID string
 * @return     {string}  The 'locales' string for the ID.
 */
let getI18nString = (str) => {
    return Homey.manager("i18n").__(str);
};

/**
 * Initialize the HOMEY AVR application paramaters called after
 * startup or reboot of Homey.
 *
 * @param      Array     devices   Array with all devices info.
 * @param      Function  callback  Notify Homey we have started
 * @return     'callback'
 */
let init = (devices: Array<AvrDeviceData> ,callback: Function) => {

  prtDbg( "Init called.");

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

        if ( myDebugMode === true ) {

          prtDbg(`MarantzAvr: init: '${device.avrip}'.`);
          prtDbg(`MarantzAvr: init: '${device.avrport}'.`);
          prtDbg(`MarantzAvr: init: '${device.avrname}'.`);
          prtDbg(`MarantzAvr: init: '${device.avrtype}'.`);
          prtDbg(`MarantzAvr: init: '${device.avrindex}'.`);
        }


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

        setAvrUnavaileble( device  , getI18nString("devnotavil"));
      });

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
    prtDbg(`HomeyAvr: delete_device: ${device.avrip}.`);
    prtDbg(`HomeyAvr: delete_device: ${device.avrport}.`);
    prtDbg(`HomeyAvr: delete_device: ${device.avrname}.`);
    prtDbg(`HomeyAvr: delete_device: ${device.avrindex}.`);
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
      prtDbg(`HomeyAvr: add_device: ${device.avrip}.`);
      prtDbg(`HomeyAvr: add_device: ${device.avrport}.`);
      prtDbg(`HomeyAvr: add_device: ${device.avrname}.`);
      prtDbg(`HomeyAvr: add_device: ${device.avrindex}.`);
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
 * @param      socket  socket  communication socket
 * @return     'callback'
 */
let pair = (socket) => {

  socket
    .on( "list_devices", (data, callback: Function ): void  => {

      // Data doesnt contain information ({}).

      if ( myDebugMode === true ) {

        prtDbg("HomeyAvr: pair => list_devices called.");
        prtDbg(`HomeyAvr: pair => list_devices: '${newDevInfo.avrip}'.`);
        prtDbg(`HomeyAvr: pair => list_devices: '${newDevInfo.avrport}'.`);
        prtDbg(`HomeyAvr: pair => list_devices: '${newDevInfo.avrname}'.`);
        prtDbg(`HomeyAvr: pair => list_devices: '${newDevInfo.avrtype}'.`);
        prtDbg(`HomeyAvr: pair => list_devices: '${newDevInfo.avrindex}'.`);
      }

      if ( newDevInfo.avrindex === -1 ) {
        callback( new Error( getI18nString("error.full_dev_ar")), {});
      }

      let devices: Array<HomeyDeviceData>  = [
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
        prtDbg(`HomeyAvr: pair => get_devices: '${data.avrip}'.`);
        prtDbg(`HomeyAvr: pair => get_devices: '${data.avrport}'.`);
        prtDbg(`HomeyAvr: pair => get_devices: '${data.avrname}'.`);
        prtDbg(`HomeyAvr: pair => get_devices: '${data.avrtype}'.`);
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
    get: (device_data, callback) => {
      if ( device_data instanceof Error || !device_data) {
        return callback(device_data);
      }

      if ( avrDevArray[ device_data.avrindex ].used === true ) {
        if ( avrDevArray[ device_data.avrindex ].available === true ) {

          let powerStatus =
            avrDevArray[ device_data.avrindex ].dev.getPowerOnOffState();

          callback( null, powerStatus);
        } else {
          prtMsg( getI18nString("error.devnotavail"));
          callback( true, false);
        }
      } else {
        prtMsg( getI18nString("error.devnotused"));
        callback( true, false);
      }
    },
    set: (device_data, data, callback ) => {
      if ( device_data instanceof Error || !device_data) {
        return callback(device_data);
      }

      if ( avrDevArray[ device_data.avrindex ].used === true ) {
        if ( data === true ) {
          avrDevArray[ device_data.avrindex ].dev.powerOn();
        } else {
          avrDevArray[ device_data.avrindex ].dev.powerOff();
        }
        callback( null, true);
      } else {
        prtMsg( getI18nString("error.devnotused"));
        callback( true, false);
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
      prtDbg( "device_data" );
      prtDbg( JSON.stringify( device_data) );

      prtDbg( "newSet :");
      prtDbg( JSON.stringify( newSet) );

      prtDbg( "oldSet :" );
      prtDbg( JSON.stringify( oldSet ) );

      prtDbg( "changedKeyArr : ");
      prtDbg( JSON.stringify( changedKeyArr));
  }

  let nIP:        string  = device_data.avrip;
  let nPort:      number  = device_data.avrport;
  let nType:      string  = device_data.avrtype;
  let isChanged:  number  =  0 ;// cannot use boolean due to typescipt errors when comparing
  let errorDect:  number  =  0 ;// cannot use boolean due to typescipt errors when comparing
  let errorIdStr: string  = "";
  let num:        number  = parseInt(newSet.avrport);

  changedKeyArr.forEach( (key) => {

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

    prtDbg(`Check -> ${nPort}:${nIP}:${nType}.`);

    avrDevArray[ device_data.avrindex ].dev.init(nPort,
                                                 nIP,
                                                 device_data.avrname,
                                                 nType,
                                                 device_data.avrindex,
                                                 avrComChannel );
  }

  prtDbg("Settings returning oke");
  callback( null, true );
};

/**************************************************
 * Homey is shutting down/ reboots, Close the open network connections.
 **************************************************/

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
 * Try if disconnecting and restarting all devices will solve the issue/
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
      prtMsg(`Error: AVR ${name} (slot:${num}) has fail to load the ${type}.json file.`);
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
      prtMsg(`AVR ${name} (slot:${num}) is disconnected.`);
      avrDevArray[ num ].available = false;
      setAvrUnavaileble( knownDevs[num], getI18nString("error.devnotcon"));
    })

    .on("net_timedout" , (num: number, name: string): void  => {
      prtMsg(`AVR ${name} (slot:${num}) timed out.`);
      avrDevArray[ num ].available = false;
      setAvrUnavaileble( knownDevs[num], getI18nString("error.devnotcon"));
    })

    .on("net_error", (num: number, name: string, err: Error ): void  => {
      prtMsg(`AVR ${name} (slot:${num}) has a network error -> ${err}.`);
      avrDevArray[ num ].available = false;
      setAvrUnavaileble( knownDevs[num], getI18nString("error.devnotcon"));
    })

    .on("net_uncaught" , (num: number, name: string, err: string): void => {
      prtMsg(`AVR ${name} (slot:${num}) : uncaught event '${err}'.`);
      avrDevArray[ num ].available = false;
      setAvrUnavaileble( knownDevs[num], getI18nString("error.devnotcon"));
    })

    /* ============================================================== */
    /* = Status change events from the AVR controller               = */
    /* = 'power_status_chg'    => Main power status changed.        = */
    /* = 'mzpower_status_chg'  => Main zone power status changed    = */
    /* = 'mute_status_chg'     => Mute status changed               = */
    /* = 'eco_status_chg'      => Eco mode status changed.          = */
    /* ============================================================== */
    .on("power_status_chg" , (num: number, name: string, newcmd: string, oldcmd: string ): void => {
      prtDbg(`AVR ${name} (slot:${num}) : ${newcmd} - ${oldcmd}`);
      if ( newcmd === "power.on" && oldcmd === "power.off" ) {
          prtDbg("triggering t_power_on");
          Homey.manager("flow").trigger("t_power_on", {name: name}, {name: name});

      } else if ( newcmd === "power.off" && oldcmd === "power.on") {
          prtDbg("triggering t_power_off");
          Homey.manager("flow").trigger("t_power_off", {name: name}, {name: name});
      }
    })

    .on("mzpower_status_chg" , (num: number, name: string, newcmd: string, oldcmd: string ): void => {
      prtDbg(`AVR ${name} (slot:${num}) : ${newcmd} - ${oldcmd}`);
      if ( newcmd === "mzpower.on" && oldcmd === "mzpower.off" ) {
          prtDbg("triggering t_mzpower_on");
          Homey.manager("flow").trigger("t_mzpower_on", {name: name}, {name: name});

      } else if ( newcmd === "mzpower.off" && oldcmd === "mzpower.on") {
          prtDbg("triggering t_mzpower_off");
          Homey.manager("flow").trigger("t_mzpower_off", {name: name}, {name: name});
      }
    })

    .on("mute_status_chg" , (num: number, name: string, newcmd: string, oldcmd: string ): void => {
      prtDbg(`AVR ${name} (slot:${num}) : ${newcmd} - ${oldcmd}`);
      if ( newcmd === "mute.on" && oldcmd === "mute.off" ) {
        prtDbg("triggering t_mute_on");
        Homey.manager("flow").trigger("t_mute_on", {name: name}, {name: name});

      } else if ( newcmd === "mute.off" && oldcmd === "mute.on") {
        prtDbg("triggering t_mute_off");
        Homey.manager("flow").trigger("t_mute_off", {name: name}, {name: name});
      }
    })

    .on("eco_status_chg" , (num: number, name: string, newcmd: string, oldcmd: string ): void => {
      prtDbg(`AVR ${name} (slot:${num}): ${newcmd} - ${oldcmd}`);
      if ( newcmd === "eco.on" && oldcmd !== "eco.on" ) {
        prtDbg("triggering t_eco_on");
        Homey.manager("flow").trigger("t_eco_on", {name: name}, {name: name});

      } else if ( newcmd === "eco.off" && oldcmd !== "eco.off") {
        prtDbg("triggering t_eco_off");
        Homey.manager("flow").trigger("t_eco_off", {name: name}, {name: name});

      } else if ( newcmd === "eco.auto" && oldcmd !== "eco.auto") {
        prtDbg("triggering t_eco_auto");
        Homey.manager("flow").trigger("t_eco_auto", {name: name}, {name: name});
      }
    })

    .on("isource_status_chg" , (num: number, name: string, cmd: string ): void  => {
      prtDbg(`Avr ${name} (slot ${num}) : ${cmd}`);

      let deviceAr = cmd.split(".");
      switch ( deviceAr[1] ) {
        case "aux1":
          Homey.manager("flow").trigger("t_in_aux1", {name: name}, {name: name});
          break;
        case "aux2":
          Homey.manager("flow").trigger("t_in_aux2", {name: name}, {name: name});
          break;
        case "aux3":
          Homey.manager("flow").trigger("t_in_aux3", {name: name}, {name: name});
          break;
        case "aux4":
          Homey.manager("flow").trigger("t_in_aux4", {name: name}, {name: name});
          break;
        case "aux5":
          Homey.manager("flow").trigger("t_in_aux5", {name: name}, {name: name});
          break;
        case "aux6":
          Homey.manager("flow").trigger("t_in_aux6", {name: name}, {name: name});
          break;
        case "aux7":
          Homey.manager("flow").trigger("t_in_aux7", {name: name}, {name: name});
          break;
        case "bd":
          Homey.manager("flow").trigger("t_in_bd", {name: name}, {name: name});
          break;
        case "bt":
          Homey.manager("flow").trigger("t_in_bt", {name: name}, {name: name});
          break;
        case "cd":
          Homey.manager("flow").trigger("t_in_cd", {name: name}, {name: name});
          break;
        case "cdr":
          Homey.manager("flow").trigger("t_in_cdr", {name: name}, {name: name});
          break;
        case "dvd":
          Homey.manager("flow").trigger("t_in_dvd", {name: name}, {name: name});
          break;
        case "favorites":
          Homey.manager("flow").trigger("t_in_favorites", {name: name}, {name: name});
          break;
        case "flickr":
          Homey.manager("flow").trigger("t_in_flickr", {name: name}, {name: name});
          break;
        case "game":
          Homey.manager("flow").trigger("t_in_game", {name: name}, {name: name});
          break;
        case "iradio":
          Homey.manager("flow").trigger("t_in_iradio", {name: name}, {name: name});
          break;
        case "mplay":
          Homey.manager("flow").trigger("t_in_mplay", {name: name}, {name: name});
          break;
        case "mxport":
          Homey.manager("flow").trigger("t_in_mxport", {name: name}, {name: name});
          break;
        case "napster":
          Homey.manager("flow").trigger("t_in_napster", {name: name}, {name: name});
          break;
        case "net":
          Homey.manager("flow").trigger("t_in_net", {name: name}, {name: name});
          break;
        case "net_usb":
          Homey.manager("flow").trigger("t_in_net_usb", {name: name}, {name: name});
          break;
        case "phono":
          Homey.manager("flow").trigger("t_in_phono", {name: name}, {name: name});
          break;
        case "sat":
          Homey.manager("flow").trigger("t_in_sat", {name: name}, {name: name});
          break;
        case "sat_cbl":
          Homey.manager("flow").trigger("t_in_sat_sbl", {name: name}, {name: name});
          break;
        case "server":
          Homey.manager("flow").trigger("t_in_server", {name: name}, {name: name});
          break;
        case "spotify":
          Homey.manager("flow").trigger("t_in_spotify", {name: name}, {name: name});
          break;
        case "tuner":
          Homey.manager("flow").trigger("t_in_tuner", {name: name}, {name: name});
          break;
        case "tv":
          Homey.manager("flow").trigger("t_in_tv", {name: name}, {name: name});
          break;
        case "usb_ipod":
          Homey.manager("flow").trigger("t_in_usb_ipod", {name: name}, {name: name});
          break;
        case "v_aux":
          Homey.manager("flow").trigger("t_in_v_aux", {name: name}, {name: name});
          break;
        case "vcr":
          Homey.manager("flow").trigger("t_in_vcr", {name: name}, {name: name});
          break;
        case "usb":
          Homey.manager("flow").trigger("t_in_usb", {name: name}, {name: name});
          break;
        case "ipd":
          Homey.manager("flow").trigger("t_in_ipd", {name: name}, {name: name});
          break;
        case "irp":
          Homey.manager("flow").trigger("t_in_irp", {name: name}, {name: name});
          break;
        case "fvp":
          Homey.manager("flow").trigger("t_in_fvp", {name: name}, {name: name});
          break;
        case "otp":
          Homey.manager("flow").trigger("t_in_otp", {name: name}, {name: name});
          break;
      }
    })

    .on("surround_status_chg" , (num: number, name: string, cmd: string ): void => {
      prtDbg(`Avr ${name} (slot ${num}) : ${cmd}`);

      let deviceAr = cmd.split(".");
      switch ( deviceAr[1] ) {
        case "auto":
          Homey.manager("flow").trigger("t_sur_auto", {name: name}, {name: name});
          break;
        case "direct":
          Homey.manager("flow").trigger("t_sur_direct", {name: name}, {name: name});
          break;
        case "dolby":
          Homey.manager("flow").trigger("t_sur_dolby", {name: name}, {name: name});
          break;
        case "dts":
          Homey.manager("flow").trigger("t_sur_dts", {name: name}, {name: name});
          break;
        case "game":
          Homey.manager("flow").trigger("t_sur_game", {name: name}, {name: name});
          break;
        case "left":
          Homey.manager("flow").trigger("t_sur_left", {name: name}, {name: name});
          break;
        case "matrix":
          Homey.manager("flow").trigger("t_sur_matrix", {name: name}, {name: name});
          break;
        case "mchstereo":
          Homey.manager("flow").trigger("t_sur_mchstereo", {name: name}, {name: name});
          break;
        case "movie":
          Homey.manager("flow").trigger("t_sur_movie", {name: name}, {name: name});
          break;
        case "music":
          Homey.manager("flow").trigger("t_sur_music", {name: name}, {name: name});
          break;
        case "neural":
          Homey.manager("flow").trigger("t_sur_neural", {name: name}, {name: name});
          break;
        case "pure":
          Homey.manager("flow").trigger("t_sur_pure", {name: name}, {name: name});
          break;
        case "right":
          Homey.manager("flow").trigger("t_sur_right", {name: name}, {name: name});
          break;
        case "standard":
          Homey.manager("flow").trigger("t_sur_standard", {name: name}, {name: name});
          break;
        case "stereo":
          Homey.manager("flow").trigger("t_sur_stereo", {name: name}, {name: name});
          break;
        case "virtual":
          Homey.manager("flow").trigger("t_sur_virtual", {name: name}, {name: name});
          break;
      }
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
    /* = Homey autocomplete triggers                                = */
    /* ============================================================== */
    .on("trigger.t_power_on.avrname.autocomplete", (callback: Function): void => {
      prtDbg("t_power_on autocomplete trigger");
      callback( null, knownAvrs);
    })

    .on("trigger.t_power_off.avrname.autocomplete", (callback: Function): void => {
      prtDbg("t_power_off autocomplete trigger");
      callback( null, knownAvrs);
    })

    .on("trigger.t_mute_on.avrname.autocomplete", (callback: Function): void => {
      prtDbg("t_mute_on autocomplete trigger");
      callback( null, knownAvrs);
    })

    .on("trigger.t_mute_off.avrname.autocomplete", (callback: Function): void => {
      prtDbg("t_mute_off autocomplete trigger");
      callback( null, knownAvrs);
    })

    .on("trigger.t_eco_on.avrname.autocomplete", (callback: Function): void => {
      prtDbg("t_eco_on autocomplete trigger");
      callback( null, knownAvrs);
    })

    .on("trigger.t_eco_off.avrname.autocomplete", (callback: Function): void => {
      prtDbg("t_eco_off autocomplete trigger");
      callback( null, knownAvrs);
    })

    .on("trigger.t_eco_auto.avrname.autocomplete", (callback: Function): void => {
      prtDbg("t_eco_auto autocomplete trigger");
      callback( null, knownAvrs);
    })

    .on("trigger.t_in_aux1.avrname.autocomplete", (callback: Function): void => {
      prtDbg("t_in_aux1 autocomplete trigger");
      callback( null, knownAvrs);
    })

    .on("trigger.t_in_aux2.avrname.autocomplete", (callback: Function): void => {
      prtDbg("t_in_aux2 autocomplete trigger");
      callback( null, knownAvrs);
    })

    .on("trigger.t_in_aux3.avrname.autocomplete", (callback: Function): void => {
      prtDbg("t_in_aux3 autocomplete trigger");
      callback( null, knownAvrs);
    })

    .on("trigger.t_in_aux4.avrname.autocomplete", (callback: Function): void => {
      prtDbg("t_in_aux4 autocomplete trigger");
      callback( null, knownAvrs);
    })

    .on("trigger.t_in_aux5.avrname.autocomplete", (callback: Function): void => {
      prtDbg("t_in_aux5 autocomplete trigger");
      callback( null, knownAvrs);
    })

    .on("trigger.t_in_aux6.avrname.autocomplete", (callback: Function): void => {
      prtDbg("t_in_aux6 autocomplete trigger");
      callback( null, knownAvrs);
    })

    .on("trigger.t_in_aux7.avrname.autocomplete", (callback: Function): void => {
      prtDbg("t_in_aux7 autocomplete trigger");
      callback( null, knownAvrs);
    })

    .on("trigger.t_in_bd.avrname.autocomplete", (callback: Function): void => {
      prtDbg("t_in_bd autocomplete trigger");
      callback( null, knownAvrs);
    })

    .on("trigger.t_in_bt.avrname.autocomplete", (callback: Function): void => {
      prtDbg("t_in_bt autocomplete trigger");
      callback( null, knownAvrs);
    })

    .on("trigger.t_in_cd.avrname.autocomplete", (callback: Function): void => {
      prtDbg("t_in_cd autocomplete trigger");
      callback( null, knownAvrs);
    })

    .on("trigger.t_in_cdr.avrname.autocomplete", (callback: Function): void => {
      prtDbg("t_in_cdr autocomplete trigger");
      callback( null, knownAvrs);
    })

    .on("trigger.t_in_dvd.avrname.autocomplete", (callback: Function): void => {
      prtDbg("t_in_dvd autocomplete trigger");
      callback( null, knownAvrs);
    })

    .on("trigger.t_in_favorites.avrname.autocomplete", (callback: Function): void => {
      prtDbg("t_in_favorites autocomplete trigger");
      callback( null, knownAvrs);
    })

    .on("trigger.t_in_flickr.avrname.autocomplete", (callback: Function): void => {
      prtDbg("t_in_flickr autocomplete trigger");
      callback( null, knownAvrs);
    })

    .on("trigger.t_in_game.avrname.autocomplete", (callback: Function): void => {
      prtDbg("t_in_game autocomplete trigger");
      callback( null, knownAvrs);
    })

    .on("trigger.t_in_iradio.avrname.autocomplete", (callback: Function): void => {
      prtDbg("t_in_iradio autocomplete trigger");
      callback( null, knownAvrs);
    })

    .on("trigger.t_in_mplay.avrname.autocomplete", (callback: Function): void => {
      prtDbg("t_in_mplay autocomplete trigger");
      callback( null, knownAvrs);
    })

    .on("trigger.t_in_mxport.avrname.autocomplete", (callback: Function): void => {
      prtDbg("t_in_mxport autocomplete trigger");
      callback( null, knownAvrs);
    })

    .on("trigger.t_in_napster.avrname.autocomplete", (callback: Function): void => {
      prtDbg("t_in_napster autocomplete trigger");
      callback( null, knownAvrs);
    })

    .on("trigger.t_in_net.avrname.autocomplete", (callback: Function): void => {
      prtDbg("t_in_net autocomplete trigger");
      callback( null, knownAvrs);
    })

    .on("trigger.t_in_net_usb.avrname.autocomplete", (callback: Function): void => {
      prtDbg("t_in_net_usb autocomplete trigger");
      callback( null, knownAvrs);
    })

    .on("trigger.t_in_phono.avrname.autocomplete", (callback: Function): void => {
      prtDbg("t_in_phono autocomplete trigger");
      callback( null, knownAvrs);
    })

    .on("trigger.t_in_sat.avrname.autocomplete", (callback: Function): void => {
      prtDbg("t_in_sat autocomplete trigger");
      callback( null, knownAvrs);
    })

    .on("trigger.t_in_sat_cbl.avrname.autocomplete", (callback: Function): void => {
      prtDbg("t_in_sat_cbl autocomplete trigger");
      callback( null, knownAvrs);
    })

    .on("trigger.t_in_server.avrname.autocomplete", (callback: Function): void => {
      prtDbg("t_in_server autocomplete trigger");
      callback( null, knownAvrs);
    })

    .on("trigger.t_in_spotify.avrname.autocomplete", (callback: Function): void => {
      prtDbg("t_in_spotify autocomplete trigger");
      callback( null, knownAvrs);
    })

    .on("trigger.t_in_tuner.avrname.autocomplete", (callback: Function): void => {
      prtDbg("t_in_tuner autocomplete trigger");
      callback( null, knownAvrs);
    })

    .on("trigger.t_in_tv.avrname.autocomplete", (callback: Function): void => {
      prtDbg("t_in_tv autocomplete trigger");
      callback( null, knownAvrs);
    })

    .on("trigger.t_in_usb_ipod.avrname.autocomplete", (callback: Function): void => {
      prtDbg("t_in_usb_ipod autocomplete trigger");
      callback( null, knownAvrs);
    })

    .on("trigger.t_in_v_aux.avrname.autocomplete", (callback: Function): void => {
      prtDbg("t_in_v_aux autocomplete trigger");
      callback( null, knownAvrs);
    })

    .on("trigger.t_in_vsr.avrname.autocomplete", (callback: Function): void => {
      prtDbg("t_in_vcr autocomplete trigger");
      callback( null, knownAvrs);
    })

    .on("trigger.t_in_usb.avrname.autocomplete", (callback: Function): void => {
      prtDbg("t_in_usb autocomplete trigger");
      callback( null, knownAvrs);
    })

    .on("trigger.t_in_ipd.avrname.autocomplete", (callback: Function): void => {
      prtDbg("t_in_ipd autocomplete trigger");
      callback( null, knownAvrs);
    })

    .on("trigger.t_in_irp.avrname.autocomplete", (callback: Function): void => {
      prtDbg("t_in_irp autocomplete trigger");
      callback( null, knownAvrs);
    })

    .on("trigger.t_in_fvp.avrname.autocomplete", (callback: Function): void => {
      prtDbg("t_in_fvp autocomplete trigger");
      callback( null, knownAvrs);
    })

    .on("trigger.t_in_otp.avrname.autocomplete", (callback: Function): void => {
      prtDbg("t_in_otp autocomplete trigger");
      callback( null, knownAvrs);
    })

    .on("trigger.t_sur_auto.avrname.autocomplete", (callback: Function): void => {
      prtDbg("t_sur_auto autocomplete trigger");
      callback( null, knownAvrs);
    })

    .on("trigger.t_sur_direct.avrname.autocomplete", (callback: Function): void => {
      prtDbg("t_sur_direct autocomplete trigger");
      callback( null, knownAvrs);
    })

    .on("trigger.t_sur_dolby.avrname.autocomplete", (callback: Function): void => {
      prtDbg("t_sur_dolby autocomplete trigger");
      callback( null, knownAvrs);
    })

    .on("trigger.t_sur_dts.avrname.autocomplete", (callback: Function): void => {
      prtDbg("t_sur_dts autocomplete trigger");
      callback( null, knownAvrs);
    })

    .on("trigger.t_sur_game.avrname.autocomplete", (callback: Function): void => {
      prtDbg("t_sur_game autocomplete trigger");
      callback( null, knownAvrs);
    })

    .on("trigger.t_sur_left.avrname.autocomplete", (callback: Function): void => {
      prtDbg("t_sur_left autocomplete trigger");
      callback( null, knownAvrs);
    })

    .on("trigger.t_sur_matrix.avrname.autocomplete", (callback: Function): void => {
      prtDbg("t_sur_matrix autocomplete trigger");
      callback( null, knownAvrs);
    })

    .on("trigger.t_sur_mchstereo.avrname.autocomplete", (callback: Function): void => {
      prtDbg("t_sur_mchstereo autocomplete trigger");
      callback( null, knownAvrs);
    })

    .on("trigger.t_sur_movie.avrname.autocomplete", (callback: Function): void => {
      prtDbg("t_sur_movie autocomplete trigger");
      callback( null, knownAvrs);
    })

    .on("trigger.t_sur_music.avrname.autocomplete", (callback: Function): void => {
      prtDbg("t_sur_music autocomplete trigger");
      callback( null, knownAvrs);
    })

    .on("trigger.t_sur_neural.avrname.autocomplete", (callback: Function): void => {
      prtDbg("t_sur_neural autocomplete trigger");
      callback( null, knownAvrs);
    })

    .on("trigger.t_sur_pure.avrname.autocomplete", (callback: Function): void => {
      prtDbg("t_sur_pure autocomplete trigger");
      callback( null, knownAvrs);
    })

    .on("trigger.t_sur_right.avrname.autocomplete", (callback: Function): void => {
      prtDbg("t_sur_right autocomplete trigger");
      callback( null, knownAvrs);
    })

    .on("trigger.t_sur_standard.avrname.autocomplete", (callback: Function): void => {
      prtDbg("t_sur_standard autocomplete trigger");
      callback( null, knownAvrs);
    })

    .on("trigger.t_sur_stereo.avrname.autocomplete", (callback: Function): void => {
      prtDbg("t_sur_stereo autocomplete trigger");
      callback( null, knownAvrs);
    })

    .on("trigger.t_sur_virtual.avrname.autocomplete", (callback: Function): void => {
      prtDbg("t_sur_virtual autocomplete trigger");
      callback( null, knownAvrs);
    })

    .on("action.selectinput.input.autocomplete", (callback: Function, args: ArgsComplete): void => {
      if ( typeof(args.args.device.name) === "undefined" ) {
        prtMsg("Error: No device selected");
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
          prtMsg(`Error: AVR ${args.args.device.name} not found.`);
          callback( new Error( getI18nString("error.devnotused")), false );
        }
      }
    })

    .on("action.surround.input.autocomplete", (callback: Function, args: ArgsComplete ): void  => {
      if ( typeof(args.args.device.name) === "undefined" ) {
        prtMsg("Error: No device selected");
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
          prtMsg(`Error: AVR ${args.args.device.name} not found.`);
          callback( new Error( getI18nString("error.devnotused")), false );
        }
      }
    })

    .on("action.eco.input.autocomplete", (callback: Function, args: ArgsComplete): void => {
      if ( typeof(args.args.device.name) === "undefined" ) {
        prtMsg("Error: No device selected");
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
          let items = avrDevArray[ index ].dev.getValidEcoModes();
          let cItems = [];

          for ( let I = 0 ; I < items.length; I++ ){
            cItems.push( {
              command: items[I].command,
              name:    getI18nString(items[I].i18n)
            });
          }
          callback(null, cItems);
        } else {
          prtMsg(`Error: AVR ${args.args.device.name} not found.`);
          callback( new Error( getI18nString("error.devnotused")), false );
        }
      }
    });

    /* ============================================================== */
    /* = Homey triggers                                             = */
    /* ============================================================== */

  Homey.manager("flow")

    .on("trigger.t_power_on", (callback: Function, args: ArgsData , data: TriggerData ): void => {
      prtDbg("On Trigger t_power_on called");
      callback( null, true );
    })

    .on("trigger.t_power_off", (callback: Function, args: ArgsData , data: TriggerData ): void => {
      prtDbg("On Trigger t_power_off called");
      callback( null, true );
    })

    .on("trigger.t_mute_on", (callback: Function, args: ArgsData , data: TriggerData ): void => {
      prtDbg("On Trigger t_mute_on called");
      callback( null, true );
    })

    .on("trigger.t_mute_off", (callback: Function, args: ArgsData , data: TriggerData ): void => {
      prtDbg("On Trigger t_mute_off called");
      callback( null, true );
    })

    .on("trigger.t_eco_on", (callback: Function, args: ArgsData , data: TriggerData ): void => {
      prtDbg("On Trigger t_eco_on called");
      callback( null, true );
    })

    .on("trigger.t_eco_off", (callback: Function, args: ArgsData , data: TriggerData ): void => {
      prtDbg("On Trigger t_eco_off called");
      callback( null, true );
    })

    .on("trigger.t_eco_auto", (callback: Function, args: ArgsData , data: TriggerData ): void => {
      prtDbg("On Trigger t_eco_auto called");
      callback( null, true );
    })

    .on("trigger.t_in_aux1", (callback: Function, args: ArgsData , data: TriggerData ): void => {
      prtDbg("On Trigger t_in_aux1 called");
      callback( null, true );
    })

    .on("trigger.t_in_aux2", (callback: Function, args: ArgsData , data: TriggerData ): void => {
      prtDbg("On Trigger t_in_aux2 called");
      callback( null, true );
    })

    .on("trigger.t_in_aux3", (callback: Function, args: ArgsData , data: TriggerData ): void => {
      prtDbg("On Trigger t_in_aux3 called");
      callback( null, true );
    })

    .on("trigger.t_in_aux4", (callback: Function, args: ArgsData , data: TriggerData ): void => {
      prtDbg("On Trigger t_in_aux4 called");
      callback( null, true );
    })

    .on("trigger.t_in_aux5", (callback: Function, args: ArgsData , data: TriggerData ): void => {
      prtDbg("On Trigger t_in_aux5 called");
      callback( null, true );
    })

    .on("trigger.t_in_aux6", (callback: Function, args: ArgsData , data: TriggerData ): void => {
      prtDbg("On Trigger t_in_aux6 called");
      callback( null, true );
    })

    .on("trigger.t_in_aux7", (callback: Function, args: ArgsData , data: TriggerData ): void => {
      prtDbg("On Trigger t_in_aux7 called");
      callback( null, true );
    })

    .on("trigger.t_in_bd", (callback: Function, args: ArgsData , data: TriggerData ): void => {
      prtDbg("On Trigger t_in_bd called");
      callback( null, true );
    })

    .on("trigger.t_in_bt", (callback: Function, args: ArgsData , data: TriggerData ): void => {
      prtDbg("On Trigger t_in_bt called");
      callback( null, true );
    })

    .on("trigger.t_in_cd", (callback: Function, args: ArgsData , data: TriggerData ): void => {
      prtDbg("On Trigger t_in_cd called");
      callback( null, true );
    })

    .on("trigger.t_in_cdr", (callback: Function, args: ArgsData , data: TriggerData ): void => {
      prtDbg("On Trigger t_in_cdr called");
      callback( null, true );
    })

    .on("trigger.t_in_dvd", (callback: Function, args: ArgsData , data: TriggerData ): void => {
      prtDbg("On Trigger t_in_dvd called");
      callback( null, true );
    })

    .on("trigger.t_in_favorites", (callback: Function, args: ArgsData , data: TriggerData ): void => {
      prtDbg("On Trigger t_in_favorites called");
      callback( null, true );
    })

    .on("trigger.t_in_flickr", (callback: Function, args: ArgsData , data: TriggerData ): void => {
      prtDbg("On Trigger t_in_flickr called");
      callback( null, true );
    })

    .on("trigger.t_in_game", (callback: Function, args: ArgsData , data: TriggerData ): void => {
      prtDbg("On Trigger t_in_game called");
      callback( null, true );
    })

    .on("trigger.t_in_iradio", (callback: Function, args: ArgsData , data: TriggerData ): void => {
      prtDbg("On Trigger t_in_iradio called");
      callback( null, true );
    })

    .on("trigger.t_in_mplay", (callback: Function, args: ArgsData , data: TriggerData ): void => {
      prtDbg("On Trigger t_in_mplay called");
      callback( null, true );
    })

    .on("trigger.t_in_mxport", (callback: Function, args: ArgsData , data: TriggerData ): void => {
      prtDbg("On Trigger t_in_mxport called");
      callback( null, true );
    })

    .on("trigger.t_in_napster", (callback: Function, args: ArgsData , data: TriggerData ): void => {
      prtDbg("On Trigger t_in_napster called");
      callback( null, true );
    })

    .on("trigger.t_in_net", (callback: Function, args: ArgsData , data: TriggerData ): void => {
      prtDbg("On Trigger t_in_net called");
      callback( null, true );
    })

    .on("trigger.t_in_net_usb", (callback: Function, args: ArgsData , data: TriggerData ): void => {
      prtDbg("On Trigger t_in_net_usb called");
      callback( null, true );
    })

    .on("trigger.t_in_phono", (callback: Function, args: ArgsData , data: TriggerData ): void => {
      prtDbg("On Trigger t_in_phono called");
      callback( null, true );
    })

    .on("trigger.t_in_sat", (callback: Function, args: ArgsData , data: TriggerData ): void => {
      prtDbg("On Trigger t_in_sat called");
      callback( null, true );
    })

    .on("trigger.t_in_sta_cbl", (callback: Function, args: ArgsData , data: TriggerData ): void => {
      prtDbg("On Trigger t_in_sat_cbl called");
      callback( null, true );
    })

    .on("trigger.t_in_server", (callback: Function, args: ArgsData , data: TriggerData ): void => {
      prtDbg("On Trigger t_in_server called");
      callback( null, true );
    })

    .on("trigger.t_in_spotify", (callback: Function, args: ArgsData , data: TriggerData ): void => {
      prtDbg("On Trigger t_in_spotify called");
      callback( null, true );
    })

    .on("trigger.t_in_tuner", (callback: Function, args: ArgsData , data: TriggerData ): void => {
      prtDbg("On Trigger t_in_tuner called");
      callback( null, true );
    })

    .on("trigger.t_in_tv", (callback: Function, args: ArgsData , data: TriggerData ): void => {
      prtDbg("On Trigger t_in_tv called");
      callback( null, true );
    })

    .on("trigger.t_in_usb_ipod", (callback: Function, args: ArgsData , data: TriggerData ): void => {
      prtDbg("On Trigger t_in_usb_ipod called");
      callback( null, true );
    })

    .on("trigger.t_in_v_aux", (callback: Function, args: ArgsData , data: TriggerData ): void => {
      prtDbg("On Trigger t_in_v_aux called");
      callback( null, true );
    })

    .on("trigger.t_in_vcr", (callback: Function, args: ArgsData , data: TriggerData ): void => {
      prtDbg("On Trigger t_in_vdr called");
      callback( null, true );
    })

    .on("trigger.t_in_usb", (callback: Function, args: ArgsData , data: TriggerData ): void => {
      prtDbg("On Trigger t_in_usb called");
      callback( null, true );
    })

    .on("trigger.t_in_ipd", (callback: Function, args: ArgsData , data: TriggerData ): void => {
      prtDbg("On Trigger t_in_ipd called");
      callback( null, true );
    })

    .on("trigger.t_in_irp", (callback: Function, args: ArgsData , data: TriggerData ): void => {
      prtDbg("On Trigger t_in_irp called");
      callback( null, true );
    })

    .on("trigger.t_in_fvp", (callback: Function, args: ArgsData , data: TriggerData ): void => {
      prtDbg("On Trigger t_in_fvp called");
      callback( null, true );
    })

    .on("trigger.t_in_otp", (callback: Function, args: ArgsData , data: TriggerData ): void => {
      prtDbg("On Trigger t_in_otp called");
      callback( null, true );
    })

    .on("trigger.t_sur_auto", (callback: Function, args: ArgsData , data: TriggerData ): void => {
      prtDbg("On Trigger t_sur_auto called");
      callback( null, true );
    })

    .on("trigger.t_sur_direct", (callback: Function, args: ArgsData , data: TriggerData ): void => {
      prtDbg("On Trigger t_sur_direct called");
      callback( null, true );
    })

    .on("trigger.t_sur_dolby", (callback: Function, args: ArgsData , data: TriggerData ): void => {
      prtDbg("On Trigger t_sur_dolby called");
      callback( null, true );
    })

    .on("trigger.t_sur_dts", (callback: Function, args: ArgsData , data: TriggerData ): void => {
      prtDbg("On Trigger t_sur_dts called");
      callback( null, true );
    })

    .on("trigger.t_sur_game", (callback: Function, args: ArgsData , data: TriggerData ): void => {
      prtDbg("On Trigger t_sur_game called");
      callback( null, true );
    })

    .on("trigger.t_sur_left", (callback: Function, args: ArgsData , data: TriggerData ): void => {
      prtDbg("On Trigger t_sur_left called");
      callback( null, true );
    })

    .on("trigger.t_sur_matrix", (callback: Function, args: ArgsData , data: TriggerData ): void => {
      prtDbg("On Trigger t_sur_matrix called");
      callback( null, true );
    })

    .on("trigger.t_sur_mchstereo", (callback: Function, args: ArgsData , data: TriggerData ): void => {
      prtDbg("On Trigger t_sur_mchstereo called");
      callback( null, true );
    })

    .on("trigger.t_sur_movie", (callback: Function, args: ArgsData , data: TriggerData ): void => {
      prtDbg("On Trigger t_sur_movie called");
      callback( null, true );
    })

    .on("trigger.t_sur_music", (callback: Function, args: ArgsData , data: TriggerData ): void => {
      prtDbg("On Trigger t_sur_music called");
      callback( null, true );
    })

    .on("trigger.t_sur_neural", (callback: Function, args: ArgsData , data: TriggerData ): void => {
      prtDbg("On Trigger t_sur_neural called");
      callback( null, true );
    })

    .on("trigger.t_sur_pure", (callback: Function, args: ArgsData , data: TriggerData ): void => {
      prtDbg("On Trigger t_sur_pure called");
      callback( null, true );
    })

    .on("trigger.t_sur_right", (callback: Function, args: ArgsData , data: TriggerData ): void => {
      prtDbg("On Trigger t_sur_right called");
      callback( null, true );
    })

    .on("trigger.t_sur_standard", (callback: Function, args: ArgsData , data: TriggerData ): void => {
      prtDbg("On Trigger t_sur_standard called");
      callback( null, true );
    })

    .on("trigger.t_sur_stereo", (callback: Function, args: ArgsData , data: TriggerData ): void => {
      prtDbg("On Trigger t_sur_stereo called");
      callback( null, true );
    })

    .on("trigger.t_sur_virtual", (callback: Function, args: ArgsData , data: TriggerData ): void => {
      prtDbg("On Trigger t_sur_virtual called");
      callback( null, true );
    });

  /* ================================================================ */
  /* = Action events                                                = */
  /* ================================================================ */
  Homey.manager("flow")
      /* ============================================================ */
      /* = Main power action events                                  = */
      /* ============================================================= */
    .on("action.poweron" , (callback: Function, args: ActionArgsInfo): void  =>  {
      if ( avrDevArray[ args.device.avrindex ].used === true ) {
        if ( avrDevArray[ args.device.avrindex ].available == true ) {
          avrDevArray[ args.device.avrindex ].dev.powerOn();
          callback( null, true );
        } else {
          prtMsg(`Error: ${args.device.avrname} is not available.`);
          callback( new Error( getI18nString("error.devnotavail")), false );
        }
      } else {
        prtMsg(`Error: Slot ${args.device.avrindex} is not used.`);
        callback( new Error( getI18nString("error.devnotused")), false );
      }
    })

    .on("action.poweroff", (callback: Function, args: ActionArgsInfo ): void => {
      if ( avrDevArray[ args.device.avrindex ].used === true ) {
        if ( avrDevArray[ args.device.avrindex ].available == true ) {
          avrDevArray[ args.device.avrindex ].dev.powerOff();
          callback( null, true );
        } else {
          prtMsg(`Error: ${args.device.avrname} is not available.`);
          callback( new Error( getI18nString("error.devnotavail")), false );
        }
      } else {
        prtMsg(`Error: Slot ${args.device.avrindex} is not used.`);
        callback( new Error( getI18nString("error.devnotused")), false );
      }
    })

    /* ================================================================ */
    /* = Main zone power action events                                = */
    /* ================================================================ */
    .on("action.main_zone_poweron" , (callback: Function, args: ActionArgsInfo ): void => {
      if ( avrDevArray[ args.device.avrindex ].used === true ) {
        if ( avrDevArray[ args.device.avrindex ].available == true ) {
          avrDevArray[ args.device.avrindex ].dev.mainZonePowerOn();
          callback( null, true );
        } else {
          prtMsg(`Error: ${args.device.avrname} is not available.`);
          callback( new Error( getI18nString("error.devnotavail")), false );
        }
      } else {
        prtMsg(`Error: Slot ${args.device.avrindex} is not used.`);
        callback( new Error( getI18nString("error.devnotused")), false );
      }
    })

    .on("action.main_zone_poweroff", (callback: Function, args: ActionArgsInfo ): void => {
      if ( avrDevArray[ args.device.avrindex ].used === true ) {
        if ( avrDevArray[ args.device.avrindex ].available == true ) {
          avrDevArray[ args.device.avrindex ].dev.mainZonePowerOff();
          callback( null, true );
        } else {
          prtMsg(`Error: ${args.device.avrname} is not available.`);
          callback( new Error( getI18nString("error.devnotavail")), false );
        }
      } else {
        prtMsg(`Error: Slot ${args.device.avrindex} is not used.`);
        callback( new Error( getI18nString("error.devnotused")), false );
      }
    })

    /* ================================================================ */
    /* = Mute action events                                           = */
    /* ================================================================ */
    .on("action.mute", (callback: Function, args: ActionArgsInfo ): void => {
      if ( avrDevArray[ args.device.avrindex ].used === true ) {
        if ( avrDevArray[ args.device.avrindex ].available == true ) {
          avrDevArray[ args.device.avrindex ].dev.muteOn();
          callback( null, true );
        } else {
          prtMsg(`Error: ${args.device.avrname} is not available.`);
          callback( new Error( getI18nString("error.devnotavail")), false );
        }
      } else {
        prtMsg(`Error: Slot ${args.device.avrindex} is not used.`);
        callback( new Error( getI18nString("error.devnotused")), false );
      }
    })

    .on("action.unmute", (callback: Function, args: ActionArgsInfo ): void => {
      if ( avrDevArray[ args.device.avrindex ].used === true ) {
        if ( avrDevArray[ args.device.avrindex ].available == true ) {
          avrDevArray[ args.device.avrindex ].dev.muteOff();
          callback( null, true );
        } else {
          prtMsg(`Error: ${args.device.avrname} is not available.`);
          callback( new Error( getI18nString("error.devnotavail")), false );
        }
      } else {
        prtMsg(`Error: Slot ${args.device.avrindex} is not used.`);
        callback( new Error( getI18nString("error.devnotused")), false );
      }
    })

    /* ================================================================ */
    /* = Volume action events                                         = */
    /* ================================================================ */
    .on("action.volumeup", (callback: Function, args: ActionArgsInfo ): void => {
      if ( avrDevArray[ args.device.avrindex ].used === true ) {
        if ( avrDevArray[ args.device.avrindex ].available == true ) {
          avrDevArray[ args.device.avrindex ].dev.volumeUp();
          callback( null, true );
        } else {
          prtMsg(`Error: ${args.device.avrname} is not available.`);
          callback( new Error( getI18nString("error.devnotavail")), false );
        }
      } else {
        prtMsg(`Error: Slot ${args.device.avrindex} is not used.`);
        callback( new Error( getI18nString("error.devnotused")), false );
      }
    })

    .on("action.volumedown", (callback: Function, args: ActionArgsInfo ): void => {
      if ( avrDevArray[ args.device.avrindex ].used === true ) {
        if ( avrDevArray[ args.device.avrindex ].available == true ) {
          avrDevArray[ args.device.avrindex ].dev.volumeDown();
          callback( null, true );
        } else {
          prtMsg(`Error: ${args.device.avrname} is not available.`);
          callback( new Error( getI18nString("error.devnotavail")), false );
        }
      } else {
        prtMsg(`Error: Slot ${args.device.avrindex} is not used.`);
        callback( new Error( getI18nString("error.devnotused")), false );
      }
    })
    .on("action.setvolume" , (callback: Function, args: ActionArgsInfo ): void => {
      if ( avrDevArray[ args.device.avrindex ].used === true ) {
        if ( avrDevArray[ args.device.avrindex ].available == true ) {
          avrDevArray[ args.device.avrindex ].dev.setVolume( args.volumeNum);
          callback( null, true );
        } else {
          prtMsg(`Error: ${args.device.avrname} is not available.`);
          callback( new Error( getI18nString("error.devnotavail")), false );
        }
      } else {
        prtMsg(`Error: Slot ${args.device.avrindex} is not used.`);
        callback( new Error( getI18nString("error.devnotused")), false );
      }
    })

    /* ================================================================ */
    /* = Inputsource action events                                    = */
    /* ================================================================ */
    .on("action.selectinput", (callback: Function, args: ActionArgsInfo ): void => {
      if ( avrDevArray[ args.device.avrindex ].used === true ) {
        if ( avrDevArray[ args.device.avrindex ].available == true ) {
          avrDevArray[ args.device.avrindex ].dev.selectInputSource(args.input.command);
          callback(null, true);
        } else {
          prtMsg(`Error: ${args.device.avrname} is not available.`);
          callback( new Error( getI18nString("error.devnotavail")), false );
        }
      } else {
        prtMsg(`Error: ${args.device.avrname} has not loaded the configuration.`);
        callback( new Error( getI18nString("error.devnotconf")), false );
      }
    })

    /* ================================================================ */
    /* = surround action events                                       = */
    /* ================================================================ */
    .on("action.surround", (callback: Function, args: ActionArgsInfo ): void  => {

      if ( avrDevArray[ args.device.avrindex ].used === true ) {
        if ( avrDevArray[ args.device.avrindex ].available == true ) {
          avrDevArray[ args.device.avrindex ].dev.setSurrroundCommand(args.input.command);
          callback(null, true);
        } else {
          prtMsg(`Error: ${args.device.avrname} is not available.`);
          callback( new Error( getI18nString("error.devnotavail")), false );
        }
      } else {
        prtMsg(`Error: ${args.device.avrname} has not loaded the configuration.`);
        callback( new Error( getI18nString("error.devnotconf")), false );
      }
    })

    /* ================================================================ */
    /* = eco action events                                            = */
    /* ================================================================ */
    .on("action.eco", (callback: Function, args: ActionArgsInfo ): void  => {
      prtDbg("Surroung action");
      prtDbg( JSON.stringify( args ));
      if ( avrDevArray[ args.device.avrindex ].used === true ) {
        if ( avrDevArray[ args.device.avrindex ].available == true ) {
          avrDevArray[ args.device.avrindex ].dev.sendEcoCommand(args.input.command);
          callback(null, true);
        } else {
          prtMsg(`Error: ${args.device.avrname} is not available.`);
          callback( new Error( getI18nString("error.devnotavail")), false );
        }
      } else {
        prtMsg(`Error: ${args.device.avrname} has not loaded the configuration.`);
        callback( new Error( getI18nString("error.devnotconf")), false );
      }
    });
};

module.exports.deleted        = deleted;
module.exports.added          = added;
module.exports.init           = init;
module.exports.pair           = pair;
module.exports.capabilities   = capabilities;
module.exports.settings       = settings;

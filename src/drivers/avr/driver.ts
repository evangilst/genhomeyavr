"use strict";

import * as events from "events";

import { AVR } from "./lib/avr";
import { PairData, AvrDeviceData, HomeyDeviceData  } from "./lib/interfaces";
import { HomeyAvrInfo, KnownAvrInfo, TriggerData   } from "./lib/interfaces";
import { ArgsData } from "./lib/interfaces";

declare var Homey: any ;

const MAX_AVRS: number                 = 8    ;  // Max allowed AVR configurations
let avrSvr: events.EventEmitter        = null ;  // event channel
let myDebugMode: boolean               = true;  // Write debug messages or not
let avrDevArray: Array<HomeyAvrInfo>   = [];     // AVR device array
let newDevInfo: AvrDeviceData          = null;     // New device
let knownAvrs: Array<KnownAvrInfo>     = [];     // Known avr names.

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
        //console.log(`${dateStr}-${str}`);
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
    //console.log(`${dateStr}-${str}`);
};

/**
 * Gets the string defined in the locales files of homey.
 *
 * @param      {string}  str     The ID string
 * @return     {string}  The 'locales' string for the ID.
 */
let getI18String = (str) => {
    return Homey.manager("i18n").__(str);
};

/**
 * Switch debug mode on
 */
// let switchOnDebugMode = () => {
//     myDebugMode = true ;
//     prtDbg("Debug switched on");
// };

/**
 * Swicth debug mode off.
 */
// let switchOffDebugMode = () => {
//     prtDbg("Debug switched off");
//     myDebugMode = false ;
// };

/**
 * Set up event listeners.
 */
let setUpListeners = () => {

  avrSvr
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
    })

    .on("net_disconnected" , (num: number, name: string ): void => {
      prtMsg(`AVR ${name} (slot:${num}) is disconnected.`);
      avrDevArray[ num ].available = false;
    })

    .on("net_timed_out" , (num: number, name: string): void  => {
      prtMsg(`AVR ${name} (slot:${num}) timed out.`);
      avrDevArray[ num ].available = false;
    })

    .on("net_error", (num: number, name: string, err: Error ): void  => {
      prtMsg(`AVR ${name} (slot:${num}) has a network error -> ${err}.`);
      avrDevArray[ num ].available = false;
    })

    .on("net_uncaught" , (num: number, name: string, err: string): void => {
      prtMsg(`AVR ${name} (slot:${num}) : uncaught event '${err}'.`);
      avrDevArray[ num ].available = false;
    })

    /* ============================================================== */
    /* = Status change events from the AVR controller               = */
    /* = 'power_status_chg' => Main power status changed.           = */
    /* = 'mute_status_chg'  => Mute status changed                  = */
    /* = 'eco_status_chg'   => Eco mode status changed.             = */
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
    })

    .on("surmode_status_chg" , (num: number, name: string, cmd: string ): void => {
      prtDbg(`Avr ${name} (slot ${num}) : ${cmd}`);
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
    .on("uncaughtException", (err: Error) => {
      prtDbg(`Oops: uncaught exception: ${err} !.`);
    });
};

/**
 * Initialize the HOMEY AVR application paramaters called after
 * startup or reboot of Homey.
 *
 * @param      Array     devices   Array with all devices info.
 * @param      Function  callback  Notify Homey we have started
 * @return     'callback'
 */
let init = (devices,callback) => {

  prtDbg( "Init called.");

  if ( avrSvr === null ) {

    /* ============================================================== */
    /* = Initialize the avrDevArray                                 = */
    /* ============================================================== */
    for ( let I = 0 ; I < MAX_AVRS ; I++ ) {

      avrDevArray[I]  = {
        dev:        null,
        available:  false,
        confLoaded: false,
        used:       false
      }
    }

    avrSvr = new events.EventEmitter();

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
                                                avrSvr );
        let x: KnownAvrInfo = {
          name: device.avrname,
          avr:  device.avrname
        };

        knownAvrs.push(x);
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
      }
    }
    /* ============================================================== */
    /* = Homey autocomplete triggers                                = */
    /* ============================================================== */

    Homey.manager("flow")

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
        });
    } else {
        prtDbg("Init called for the second time!.");
    }
    callback(null,"");
};

/**
 * Homey delete request for an AVR.
 *
 * @param      Object    device    Info of the to-be-delete device
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

    callback( new Error( getI18String("error.dev_mis_del")), false );

  } else {

    /* ============================================================== */
    /* = Disconnect and remove possible existing network connection = */
    /* = to the AVR                                                 = */
    /* ============================================================== */
    avrDevArray[device.avrindex].dev.disconnect();

    /* ============================================================== */
    /* = Remove the AVR fromthe known avrs list                     = */
    /* ============================================================== */
    for ( let I = 0 ; I < knownAvrs.length; I++ ) {
        if ( knownAvrs[I].name === device.avrname ) {
            knownAvrs.splice(I, 1);
        }
    }

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
    }

    callback( null, true);
    }
};

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
                                          avrSvr );

  let x = {
      name: device.avrname,
      avr:  device.avrname
  };

  knownAvrs.push(x);

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
        callback( new Error( getI18String("error.full_dev_ar")), {});
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
        avrport:  data.avrport,
        avrname:  data.avrname,
        avrtype:  data.avrtype,
        avrindex: curSlot
      };

      socket.emit("continue", null );
    })

    .on("disconnect" , (): void => {

      prtDbg("Marantz app - User aborted pairing, or pairing is finished");

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

                    prtMsg( getI18String("error.devnotavail"));
                    callback( true, false);
                }

            } else {
                prtMsg( getI18String("error.devnotused"));
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
                prtMsg( getI18String("error.devnotused"));
                callback( true, false);
            }
        }
    }
};

/**
 * Change saved parameters of the Homey device.
 *
 * @param      {Json-object}    device_data    The device data
 * @param      {Json-object}    newSet         The new set
 * @param      {Json-object}    oldSet         The old set
 * @param      {Array}          changedKeyArr  The changed key arr
 * @param      {Function}       callback       The callback
 * @return     'callback'
 */
let settings = (device_data, newSet, oldSet, changedKeyArr, callback) => {

    if ( myDebugMode === true ) {
        prtDbg( device_data.avrip );
        prtDbg( device_data.avrport );
        prtDbg( device_data.avrtype );
        prtDbg( device_data.avrindex );

        prtDbg( newSet.avrip );
        prtDbg( newSet.avrport );
        prtDbg( newSet.avrtype );
        prtDbg( newSet.avrindex );

        prtDbg( oldSet.avrip );
        prtDbg( oldSet.avrport );
        prtDbg( oldSet.avrtype );
        prtDbg( oldSet.avrindex );

        prtDbg( changedKeyArr);


        prtDbg( "Device_data -> " + JSON.stringify(device_data));
        prtDbg( "newSet -> " + JSON.stringify(newSet));
        prtDbg( "oldSet -> " + JSON.stringify(changedKeyArr));
    }

    let nIP         = device_data.avrip;
    let nPort       = device_data.avrport;
    let nType       = device_data.avrtype;
    let newAvr      = false ;
    let errorDect   = false ;
    let errorIdStr  = "";
    // let avrDebugChg = false;
    // let homDebugChg = false;

    let num = parseInt(newSet.avrport);

    changedKeyArr.forEach( (key) => {

        switch (key) {

            case "avrip":
                if (/^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/.test(newSet.avrip))  {

                    prtDbg(`Correct IP adresss ${nIP}.`);
                    nIP = newSet.avrip;
                    newAvr = true;
                } else {

                    errorDect = true;
                    errorIdStr = "error.invalidIP";
                }

                break;
            case "avrport" :
                if ( isNaN(num) || num < 0 || num > 65535 ) {
                    errorDect = true;
                    errorIdStr = "error.invalidPort";
                } else {
                    nPort = newSet.avrport;
                    newAvr = true;
                }
                break;
            case "avrtype":
                nType = newSet.avrtype;
                newAvr = true;
                break;
            // case "aDebug":
            //     avrDebugChg = true;
            //     break;
            // case "hDebug":
            //     homDebugChg = true;
            //     break;
        }
    });

    if ( errorDect === false ) {

        if ( newAvr === true ) {

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
                                                     avrSvr );
        }

        // if ( avrDebugChg === true ) {
        //     if ( newSet.aDebug === true ) {

        //         avrDevArray[ device_data.avrindex].dev.setConsoleToDebug();

        //     } else {
        //         avrDevArray[ device_data.avrindex].dev.setConsoleOff();
        //     }
        // }

        // if ( homDebugChg === true ) {

        //     if ( newSet.hDebug === true ) {

        //         switchOnDebugMode();
        //     } else {

        //         switchOffDebugMode();
        //     }
        // }

        prtDbg("Settings returning oke");
        callback( null, true );
    } else {
        prtDbg("Settings returning a failure");
        callback( new Error( getI18String(errorIdStr)), false );
    }
};

/**************************************************
 * Homey is shutting down/ reboots, Close the open network connections.
 **************************************************/

/**
 * Homey.on("unload").
 * Called when Homey requests the app to stop/unload.
 */
Homey.on("unload" , () => {

    for ( let I = 0 ; I < avrDevArray.length ; I++ ) {

        if ( avrDevArray[I].used === true ) {

            avrDevArray[I].dev.disconnect();

            avrDevArray[ I ] = {
              dev:        null,
              available:  false,
              confLoaded: false,
              used:       false
            }
        }
    }
});

/**************************************************
 * power methodes, valid for all Marantz devices.
 **************************************************/

Homey.manager("flow")

    .on("action.poweron" , (callback, args) => {

        if ( avrDevArray[ args.device.avrindex ].used === true ) {

            if ( avrDevArray[ args.device.avrindex ].available == true ) {

                avrDevArray[ args.device.avrindex ].dev.powerOn();

                callback( null, true );
            } else {

                // Configuration (AVR type.json file) not loaded.
                // That is needed otherwise runtime error will occur.
                //
                prtMsg(`Error: ${args.device.avrname} is not available.`);

                callback( new Error( getI18String("error.devnotavail")), false );
            }

        } else {

            // Try to access a slot in the dev Array which does not have
            // a AVR attached to it.
            //
            prtMsg(`Error: Slot ${args.device.avrindex} is not used.`);

            callback( new Error( getI18String("error.devnotused")), false );

        }
    })

    .on("action.poweroff", (callback,args) => {

        if ( avrDevArray[ args.device.avrindex ].used === true ) {

            if ( avrDevArray[ args.device.avrindex ].available == true ) {

                avrDevArray[ args.device.avrindex ].dev.powerOff();

                callback( null, true );
            } else {
                // Configuration (AVR type.json file) not loaded.
                // That is needed otherwise runtime error will occur.
                //
                prtMsg(`Error: ${args.device.avrname} is not available.`);

                callback( new Error( getI18String("error.devnotavail")), false );
            }

        } else {
            // Try to access a slot in the dev Array which does not have
            // a AVR attached to it.
            //
            prtMsg(`Error: Slot ${args.device.avrindex} is not used.`);

            callback( new Error( getI18String("error.devnotused")), false );

        }
    });

/**************************************************
 * main_zone-power methodes, valid for all Marantz devices.
 **************************************************/

Homey.manager("flow")

    .on("action.main_zone_poweron" , (callback, args) => {

        if ( avrDevArray[ args.device.avrindex ].used === true ) {

            if ( avrDevArray[ args.device.avrindex ].available == true ) {

                avrDevArray[ args.device.avrindex ].dev.mainZonePowerOn();

                callback( null, true );
            } else {
                // Configuration (AVR type.json file) not loaded.
                // That is needed otherwise runtime error will occur.
                //
                prtMsg(`Error: ${args.device.avrname} is not available.`);

                callback( new Error( getI18String("error.devnotavail")), false );
            }

        } else {
            // Try to access a slot in the dev Array which does not have
            // a AVR attached to it.
            //
            prtMsg(`Error: Slot ${args.device.avrindex} is not used.`);

            callback( new Error( getI18String("error.devnotused")), false );

        }
    })

    .on("action.main_zone_poweroff", (callback,args) => {

        if ( avrDevArray[ args.device.avrindex ].used === true ) {

            if ( avrDevArray[ args.device.avrindex ].available == true ) {

                avrDevArray[ args.device.avrindex ].dev.mainZonePowerOff();

                callback( null, true );
            } else {
                // Configuration (AVR type.json file) not loaded.
                // That is needed otherwise runtime error will occur.
                //
                prtMsg(`Error: ${args.device.avrname} is not available.`);

                callback( new Error( getI18String("error.devnotavail")), false );
            }

        } else {
            // Try to access a slot in the dev Array which does not have
            // a AVR attached to it.
            //
            prtMsg(`Error: Slot ${args.device.avrindex} is not used.`);

            callback( new Error( getI18String("error.devnotused")), false );

        }
    });

/**************************************************
 * mute methodes, valid for all Marantz devices.
 **************************************************/
Homey.manager("flow")

    .on("action.mute", (callback,args) => {

        if ( avrDevArray[ args.device.avrindex ].used === true ) {

            if ( avrDevArray[ args.device.avrindex ].available == true ) {

                avrDevArray[ args.device.avrindex ].dev.muteOn();

                callback( null, true );
            } else {
                // Configuration (AVR type.json file) not loaded.
                // That is needed otherwise runtime error will occur.
                //
                prtMsg(`Error: ${args.device.avrname} is not available.`);

                callback( new Error( getI18String("error.devnotavail")), false );
            }

        } else {
            // Try to access a slot in the dev Array which does not have
            // a AVR attached to it.
            //
            prtMsg(`Error: Slot ${args.device.avrindex} is not used.`);

            callback( new Error( getI18String("error.devnotused")), false );

        }
    })

    .on("action.unmute", (callback,args) => {

        if ( avrDevArray[ args.device.avrindex ].used === true ) {

            if ( avrDevArray[ args.device.avrindex ].available == true ) {

                avrDevArray[ args.device.avrindex ].dev.muteOff();

                callback( null, true );
            } else {
                // Configuration (AVR type.json file) not loaded.
                // That is needed otherwise runtime error will occur.
                //
                prtMsg(`Error: ${args.device.avrname} is not available.`);

                callback( new Error( getI18String("error.devnotavail")), false );
            }

        } else {
            // Try to access a slot in the dev Array which does not have
            // a AVR attached to it.
            //
            prtMsg(`Error: Slot ${args.device.avrindex} is not used.`);

            callback( new Error( getI18String("error.devnotused")), false );

        }
    });

/**************************************************
 * Input source selection based on the available sources per AVR.
 **************************************************/

Homey.manager("flow")

    .on("action.selectinput.input.autocomplete", (callback, args) => {

        if ( typeof(args.device) === "undefined" ) {
            // The AVR must be selected first as the input source selection
            // is depending on it.
            // If continue without the AVR runtime errors will occur.
            //
            prtMsg("Error: No device selected");

            callback( new Error( getI18String("error.devnotsel")), false );

        } else {

            if ( avrDevArray[ args.device.avrindex ].used === true ) {

                if ( avrDevArray[ args.device.avrindex ].confLoaded === true ) {

                    let items = avrDevArray[ args.device.avrindex ].dev.getValidInputSelection();

                    let cItems = [];

                    for ( let I = 0 ; I < items.length; I++ ){
                        let x = {
                          command: items[I].command,
                          name:    getI18String(items[I].i18n)
                        };

                        cItems.push(x);
                    }

                    callback(null, cItems);

                } else {
                    // Configuration (AVR type.json file) not loaded.
                    // That is needed otherwise runtime error will occur.
                    //
                    prtMsg(`Error: ${args.device.avrname} has not loaded the configuration.`);

                    callback( new Error( getI18String("error.devnotconf")), false );
                }

            } else {
                // Try to access a slot in the dev Array which does not have
                // a AVR attached to it.
                //
                prtMsg(`Error: Slot ${args.device.avrindex} is not used.`);

                callback( new Error( getI18String("error.devnotused")), false );
            }
        }
    })

    .on("action.selectinput", (callback, args) => {

        if ( avrDevArray[ args.device.avrindex ].used === true ) {

            if ( avrDevArray[ args.device.avrindex ].available == true ) {

                avrDevArray[ args.device.avrindex ].dev.selectInputSource(args.input.command);

                callback(null, true);

            } else {
                // Configuration (AVR type.json file) not loaded.
                // That is needed otherwise runtime error will occur.
                //
                prtMsg(`Error: ${args.device.avrname} is not available.`);

                callback( new Error( getI18String("error.devnotavail")), false );
            }

        } else {
            // Try to access a slot in the dev Array which does not have
            // a AVR attached to it.
            //
            prtMsg(`Error: ${args.device.avrname} has not loaded the configuration.`);

            callback( new Error( getI18String("error.devnotconf")), false );
        }
    });

/**************************************************
 * Volume methodes, valid for all Marantz devices.
 **************************************************/

Homey.manager("flow")

    .on("action.volumeup", (callback,args) => {

        if ( avrDevArray[ args.device.avrindex ].used === true ) {

            if ( avrDevArray[ args.device.avrindex ].available == true ) {

                avrDevArray[ args.device.avrindex ].dev.volumeUp();

                callback( null, true );
            } else {
                // Configuration (AVR type.json file) not loaded.
                // That is needed otherwise runtime error will occur.
                //
                prtMsg(`Error: ${args.device.avrname} is not available.`);

                callback( new Error( getI18String("error.devnotavail")), false );
            }

        } else {
            // Try to access a slot in the dev Array which does not have
            // a AVR attached to it.
            //
            prtMsg(`Error: Slot ${args.device.avrindex} is not used.`);

            callback( new Error( getI18String("error.devnotused")), false );

        }
    })

    .on("action.volumedown", (callback,args) => {

        if ( avrDevArray[ args.device.avrindex ].used === true ) {

            if ( avrDevArray[ args.device.avrindex ].available == true ) {

                avrDevArray[ args.device.avrindex ].dev.volumeDown();

                callback( null, true );
            } else {
                // Configuration (AVR type.json file) not loaded.
                // That is needed otherwise runtime error will occur.
                //
                prtMsg(`Error: ${args.device.avrname} is not available.`);

                callback( new Error( getI18String("error.devnotavail")), false );
            }

        } else {
            // Try to access a slot in the dev Array which does not have
            // a AVR attached to it.
            //
            prtMsg(`Error: Slot ${args.device.avrindex} is not used.`);

            callback( new Error( getI18String("error.devnotused")), false );

        }
    })
    .on("action.setvolume" , (callback,args) => {

        if ( avrDevArray[ args.device.avrindex ].used === true ) {

            if ( avrDevArray[ args.device.avrindex ].available == true ) {

                avrDevArray[ args.device.avrindex ].dev.setVolume( args.volumeNum);

                callback( null, true );
            } else {
                // Configuration (AVR type.json file) not loaded.
                // That is needed otherwise runtime error will occur.
                //
                prtMsg(`Error: ${args.device.avrname} is not available.`);

                callback( new Error( getI18String("error.devnotavail")), false );
            }

        } else {
            // Try to access a slot in the dev Array which does not have
            // a AVR attached to it.
            //
            prtMsg(`Error: Slot ${args.device.avrindex} is not used.`);

            callback( new Error( getI18String("error.devnotused")), false );

        }
    }) ;

/**************************************************
 * Surround selection based on the available sources per AVR.
 **************************************************/

Homey.manager("flow")

    .on("action.surround.input.autocomplete", (callback, args) => {

        if ( typeof(args.device) === "undefined" ) {
            // The AVR must be selected first as the input source selection
            // is depending on it.
            // If continue without the AVR runtime errors will occur.
            //
            prtMsg("Error: No device selected");

            callback( new Error( getI18String("error.devnotsel")), false );

        } else {

            if ( avrDevArray[ args.device.avrindex ].used === true ) {

                if ( avrDevArray[ args.device.avrindex ].confLoaded === true ) {

                    let items = avrDevArray[ args.device.avrindex ].dev.getValidSurround();

                    let cItems = [];

                    for ( let I = 0 ; I < items.length; I++ ){
                        let x = {
                          command: items[I].command,
                          name:    getI18String(items[I].i18n)
                        };

                        cItems.push(x);
                    }

                    callback(null, cItems);

                } else {
                    // Configuration (AVR type.json file) not loaded.
                    // That is needed otherwise runtime error will occur.
                    //
                    prtMsg(`Error: ${args.device.avrname} has not loaded the configuration.`);

                    callback( new Error( getI18String("error.devnotconf")), false );
                }

            } else {
                // Try to access a slot in the dev Array which does not have
                // a AVR attached to it.
                //
                prtMsg(`Error: Slot ${args.device.avrindex} is not used.`);

                callback( new Error( getI18String("error.devnotused")), false );
            }
        }
    })

    .on("action.surround", (callback, args) => {

        if ( avrDevArray[ args.device.avrindex ].used === true ) {

            if ( avrDevArray[ args.device.avrindex ].available == true ) {

                avrDevArray[ args.device.avrindex ].dev.setSurrroundCommand(args.input.command);

                callback(null, true);

            } else {
                // Configuration (AVR type.json file) not loaded.
                // That is needed otherwise runtime error will occur.
                //
                prtMsg(`Error: ${args.device.avrname} is not available.`);

                callback( new Error( getI18String("error.devnotavail")), false );
            }

        } else {
            // Try to access a slot in the dev Array which does not have
            // a AVR attached to it.
            //
            prtMsg(`Error: ${args.device.avrname} has not loaded the configuration.`);

            callback( new Error( getI18String("error.devnotconf")), false );
        }
    });

/**************************************************
 * eco methodes, based on the support per AVR.
 *
 * NEED TO BE CHANGED:
 * Needs to be conditional: should be available only when AVR supports ECO
 * Currently it needs to defined in app.json regardsless if it is supported or not.
 *
 * Currently if ECO is not supported an array with 1 entry "not supported" is returned.
 **************************************************/
Homey.manager("flow")

    .on("action.eco.input.autocomplete", (callback, args) => {

        if ( typeof(args.device) === "undefined" ) {
            // The AVR must be selected first as the input source selection
            // is depending on it.
            // If continue without the AVR runtime errors will occur.
            //
            prtMsg("Error: No device selected");

            callback( new Error( getI18String("error.devnotsel")), false );

        } else {

            if ( avrDevArray[ args.device.avrindex ].used === true ) {

                if ( avrDevArray[ args.device.avrindex ].confLoaded === true ) {

                    let items = avrDevArray[ args.device.avrindex ].dev.getValidEcoModes();

                    let cItems = [];

                    for ( let I = 0 ; I < items.length; I++ ){
                        let x = {
                          command: items[I].command,
                          name:    getI18String(items[I].i18n)
                        };

                        cItems.push(x);
                    }

                    callback(null, cItems);

                } else {
                    // Configuration (AVR type.json file) not loaded.
                    // That is needed otherwise runtime error will occur.
                    //
                    prtMsg(`Error: ${args.device.avrname} has not loaded the configuration.`);

                    callback( new Error( getI18String("error.devnotconf")), false );
                }

            } else {
                // Try to access a slot in the dev Array which does not have
                // a AVR attached to it.
                //
                prtMsg(`Error: Slot ${args.device.avrindex} is not used.`);

                callback( new Error( getI18String("error.devnotused")), false );
            }
        }
    })

    .on("action.eco", (callback, args) => {

        if ( avrDevArray[ args.device.avrindex ].used === true ) {

            if ( avrDevArray[ args.device.avrindex ].available == true ) {

                avrDevArray[ args.device.avrindex ].dev.sendEcoCommand(args.input.command);

                callback(null, true);

            } else {
                // Configuration (AVR type.json file) not loaded.
                // That is needed otherwise runtime error will occur.
                //
                prtMsg(`Error: ${args.device.avrname} is not available.`);

                callback( new Error( getI18String("error.devnotavail")), false );
            }

        } else {
            // Try to access a slot in the dev Array which does not have
            // a AVR attached to it.
            //
            prtMsg(`Error: ${args.device.avrname} has not loaded the configuration.`);

            callback( new Error( getI18String("error.devnotconf")), false );
        }
    });

module.exports.deleted      = deleted;
module.exports.added        = added;
module.exports.init         = init;
module.exports.pair         = pair;
module.exports.capabilities = capabilities;
module.exports.settings     = settings;

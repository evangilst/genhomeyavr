"use strict";

/* ================================================================== */
/* = Note:                                                          = */
/* = This is a generated javascript file.                           = */
/* = Don't edit the javascript file directly or change might be     = */
/* = lost with the next build.                                      = */
/* = Edit the typescipt file instead and re-generate the javascript = */
/* = file.                                                          = */
/* ================================================================== */

import * as fs       from "fs";
import * as path     from "path";
import * as events   from "events";

import { AVR }           from "./avr";
import { HomeyAvrInfo }  from "./interfaces";

const IPADDRESS: string   = "192.168.1.232";
const IPPORT:    number   = 2222;
const AVRTYPE:   string   = "SR5010";
const AVRNAME:   string   = "avrtest";

let avrDevArray: Array<HomeyAvrInfo> = [];
let myDebugMode: boolean             = true;

/* ================================================================ */
/* = 'Homey' simulation functions.                                = */
/* ================================================================ */

/**
 * Print debug messages to prtMsg
 * .
 */
let prtDbg = (str: string ): void => {
  if ( myDebugMode === true ) {
    console.log(`[D]: ${str}.`);
  }
};

/**
 * Print messages to console.log.
 */
let prtMsg = (str: string ): void => {
  console.log(`${str}.`);
};

/**
 * Setup listeners to allow communiction between test prog and AVR part.
 */
let setUpListeners = (): void  => {

  eventSck
    .on( "init_success", ( num: number, name: string, type: string): void  => {
      prtDbg(`AVR ${name} (slot-${num}) has loaded the ${type}.json file.`);

      avrDevArray[0].available = true ;

      prtMsg(`IP address:  ${avrDevArray[0].dev.getHostname()}.`);
      prtMsg(`Port      :  ${avrDevArray[0].dev.getPort()}.`);
      prtMsg(`Name      :  ${avrDevArray[0].dev.getName()}.`);
      prtMsg(`Type      :  ${avrDevArray[0].dev.getType()}.`);

      avrDevArray[0].dev.setTest();
    })

    .on( "init_failed" , (num: number, name: string, type: string) : void => {
      prtDbg(`AVR ${name} (slot-${num}) failed to loaded the ${type}.json file.`);
      process.exit(3);
    })

    .on( "net_connected" , (num: number, name: string): void => {
      prtDbg(`AVR ${name} (slot-${num}) is connected.`);

      checkAll();
    })

    .on( "net_disconnected" , ( num: number, name: string ): void => {
      prtDbg(`AVR ${name} (slot-${num}) is disconnected.`);
      avrDevArray[0].available  = false ;
    })

    .on( "net_timed_out" , ( num: number, name: string ): void => {
      prtDbg(`AVR ${name} (slot-${num}) is timed out.`);
      avrDevArray[0].available  = false ;
    })

    .on( "net_error" , ( num: number, name: string, err: Error ): void => {
      prtDbg(`AVR ${name} (slot-${num}), ${err}.`);
      avrDevArray[0].available  = false ;
    })

    .on( "net_uncaught" , ( num: number, name: string, err: Error ): void => {
      prtDbg(`AVR ${name} (slot-${num}) has an uncaughtException -> ${err}.`);
      avrDevArray[0].available  = false ;
    })

    // Status triggers
    .on("power_status_chg" , (num: number, name: string , cmd: string ): void  => {
      prtMsg(`Power status trigger (${num}-${name}) : ${cmd}`);
    })
    .on("mute_status_chg" , (num: number, name: string , cmd: string ): void => {
      prtMsg(`Main zone power status trigger (${num}-${name}) : ${cmd}`);
    })
    .on("eco_status_chg" , (num: number, name: string , cmd: string ): void  => {
      prtMsg(`Eco status trigger (${num}-${name}) : ${cmd}`);
    })
    .on("isource_status_chg" , (num: number, name: string , cmd: string ): void  => {
      prtMsg(`Inputsource status trigger (${num}-${name}) : ${cmd}`);
    })
    .on("surmode_status_chg" , (num: number, name: string , cmd: string ): void  => {
      prtMsg(`Surround status trigger (${num}-${name}) : ${cmd}`);
    })
    .on("volume_chg" , (num: number, name: string, value: number): void  => {
      prtMsg(`Volume trigger (${num}-${name}) changed volume to ${value}.`);
    })

    // Debug messages from ath avr control part.
    .on( "debug_log"  , (num: number, name: string, msg: string ): void  => {
      prtDbg(`AVR ${name} (slot ${num}) ${msg}.`);
    })

    .on("uncaughtException", (err: Error): void  => {
      // catch uncaught exception to prevent runtime problems.
      prtMsg("Oops: uncaught exception (${err}) !.");
    });
}

/* ======================================================================= */
/* = Test functions                                                      = */
/* ======================================================================= */

/**
 * Check all power commands.
 */
let checkPowerCommands = () : void  => {
  prtMsg("========================================================");
  prtMsg("Power commands.");
  prtMsg("========================================================");
  setTimeout( () => {              mAvr.powerOn();          },   10);
  setTimeout( () => { prtMsg( mAvr.getPoweri18nStatus() );  }, 1000);
  setTimeout( () => {
    let x= mAvr.getPowerOnOffState();
    if ( x === true ) {
      prtMsg("Boolean: true");
    } else {
      prtMsg("Boolean: false.")
    }
                                                            }, 1200);
  setTimeout( () => {              mAvr.powerOff();         }, 2000);
  setTimeout( () => { prtMsg( mAvr.getPoweri18nStatus() );  }, 2500);
  setTimeout( () => {
    let x= mAvr.getPowerOnOffState();
    if ( x === true ) {
      prtMsg("Boolean: true");
    } else {
      prtMsg("Boolean: false")
    }
                                                            }, 2700);
}

/**
 * Check all main zone power commands.
 */
let checkMainZonePowerCommands = () : void  => {
  prtMsg("========================================================");
  prtMsg("Main Zone Power commands :");
  prtMsg("========================================================");
  setTimeout( () => {              mAvr.mainZonePowerOn();        },   10);
  setTimeout( () => { prtMsg( mAvr.getMainZonePoweri18nStatus()); }, 1000);
  setTimeout( () => {
    let x = mAvr.getMainZonePowerOnOffState();
    if ( x === true ) {
      prtMsg("Boolean: true");
    } else {
      prtMsg("Boolean: false")
    }
                                                                  }, 1200);
  setTimeout( () => {              mAvr.mainZonePowerOff();       }, 2000);
  setTimeout( () => { prtMsg( mAvr.getMainZonePoweri18nStatus()); }, 2500);
  setTimeout( () => {
    let x = mAvr.getMainZonePowerOnOffState();
    if ( x === true ) {
      prtMsg("Boolean: true");
    } else {
      prtMsg("Boolean: false")
    }
                                                                   }, 2700);
};

/**
 * Check all mute commands.
 */
let checkMuteCommands = () : void => {
  prtMsg("========================================================");
  prtMsg("Mute commands :");
  prtMsg("========================================================");
  setTimeout( () => {              mAvr.muteOn();           },   10);
  setTimeout( () => { prtMsg( mAvr.getMutei18nStatus());    },  500);
  setTimeout( () => {
    let x = mAvr.getMuteOnOffState();
    if ( x === true ) {
      prtMsg("Boolean: true");
    } else {
      prtMsg("Boolean: false")
    }
                                                            },  800);
  setTimeout( () => {              mAvr.muteOff();          }, 1000);
  setTimeout( () => { prtMsg( mAvr.getMutei18nStatus());    }, 1500);
  setTimeout( () => {
    let x = mAvr.getMuteOnOffState();
    if ( x === true ) {
      prtMsg("Boolean: true");
    } else {
      prtMsg("Boolean: false")
    }
                                                            }, 1800);
};

/**
 * Check all volume commands
 */
let checkVolumeCommands = () : void  => {
  prtMsg("========================================================");
  prtMsg( "Volume commands: ");
  prtMsg("========================================================");
  setTimeout( () => {         mAvr.volumeUp();        },   10);
  setTimeout( () => { prtMsg( mAvr.getVolume());      },  500);
  setTimeout( () => {         mAvr.volumeDown();      },  800);
  setTimeout( () => { prtMsg( mAvr.getVolume());      }, 1300);
  setTimeout( () => {         mAvr.setVolume(33);     }, 1600);
  setTimeout( () => { prtMsg( mAvr.getVolume());      }, 2000);
};

/**
 * Check all input source commands.
 */
let checkInputSourceCommands = () : void => {
  prtMsg("========================================================");
  prtMsg("inputsource commands :");
  prtMsg("========================================================");
  setTimeout( () => {         mAvr.selectInputSourcePhono();        },   10);
  setTimeout( () => { prtMsg( mAvr.getInputSourceI18n());           },  200);
  setTimeout( () => {         mAvr.selectInputSourceCd();           },  400);
  setTimeout( () => { prtMsg( mAvr.getInputSourceI18n());           },  600);
  setTimeout( () => {         mAvr.selectInputSourceDvd();          },  800);
  setTimeout( () => { prtMsg( mAvr.getInputSourceI18n());           }, 1000);
  setTimeout( () => {         mAvr.selectInputSourceBluray();       }, 1200);
  setTimeout( () => { prtMsg( mAvr.getInputSourceI18n());           }, 1400);
  setTimeout( () => {         mAvr.selectInputSourceTv();           }, 1600);
  setTimeout( () => { prtMsg( mAvr.getInputSourceI18n());           }, 1800);
  setTimeout( () => {         mAvr.selectInputSourceSatCbl();       }, 2000);
  setTimeout( () => { prtMsg( mAvr.getInputSourceI18n());           }, 2200);
  setTimeout( () => {         mAvr.selectInputSourceSat();          }, 2400);
  setTimeout( () => { prtMsg( mAvr.getInputSourceI18n());           }, 2600);
  setTimeout( () => {         mAvr.selectInputSourceMplay();        }, 2800);
  setTimeout( () => { prtMsg( mAvr.getInputSourceI18n());           }, 3000);
  setTimeout( () => {         mAvr.selectInputSourceVcr();          }, 3200);
  setTimeout( () => { prtMsg( mAvr.getInputSourceI18n());           }, 3400);
  setTimeout( () => {         mAvr.selectInputSourceGame();         }, 3600);
  setTimeout( () => { prtMsg( mAvr.getInputSourceI18n());           }, 3800);
  setTimeout( () => {         mAvr.selectInputSourceVaux();         }, 4000);
  setTimeout( () => { prtMsg( mAvr.getInputSourceI18n());           }, 4200);
  setTimeout( () => {         mAvr.selectInputSourceTuner();        }, 4400);
  setTimeout( () => { prtMsg( mAvr.getInputSourceI18n());           }, 4800);
  setTimeout( () => {         mAvr.selectInputSourceSpotify();      }, 5000);
  setTimeout( () => { prtMsg( mAvr.getInputSourceI18n());           }, 5200);
  setTimeout( () => {         mAvr.selectInputSourceNapster();      }, 5400);
  setTimeout( () => { prtMsg( mAvr.getInputSourceI18n());           }, 5600);
  setTimeout( () => {         mAvr.selectInputSourceFlickr();       }, 5800);
  setTimeout( () => { prtMsg( mAvr.getInputSourceI18n());           }, 6000);
  setTimeout( () => {         mAvr.selectInputSourceIradio();       }, 6200);
  setTimeout( () => { prtMsg( mAvr.getInputSourceI18n());           }, 6400);
  setTimeout( () => {         mAvr.selectInputSourceFavorites();    }, 6600);
  setTimeout( () => { prtMsg( mAvr.getInputSourceI18n());           }, 6800);
  setTimeout( () => {         mAvr.selectInputSourceAux1();         }, 7000);
  setTimeout( () => { prtMsg( mAvr.getInputSourceI18n());           }, 7200);
  setTimeout( () => {         mAvr.selectInputSourceAux2();         }, 7400);
  setTimeout( () => { prtMsg( mAvr.getInputSourceI18n());           }, 7600);
  setTimeout( () => {         mAvr.selectInputSourceAux3();         }, 7800);
  setTimeout( () => { prtMsg( mAvr.getInputSourceI18n());           }, 8000);
  setTimeout( () => {         mAvr.selectInputSourceAux4();         }, 8200);
  setTimeout( () => { prtMsg( mAvr.getInputSourceI18n());           }, 8400);
  setTimeout( () => {         mAvr.selectInputSourceAux5();         }, 8600);
  setTimeout( () => { prtMsg( mAvr.getInputSourceI18n());           }, 8800);
  setTimeout( () => {         mAvr.selectInputSourceAux6();         }, 9000);
  setTimeout( () => { prtMsg( mAvr.getInputSourceI18n());           }, 9200);
  setTimeout( () => {         mAvr.selectInputSourceAux7();         }, 9400);
  setTimeout( () => { prtMsg( mAvr.getInputSourceI18n());           }, 9600);
  setTimeout( () => {         mAvr.selectInputSourceNetUsb();       }, 9800);
  setTimeout( () => { prtMsg( mAvr.getInputSourceI18n());           },10000);
  setTimeout( () => {         mAvr.selectInputSourceNet();          },10200);
  setTimeout( () => { prtMsg( mAvr.getInputSourceI18n());           },10400);
  setTimeout( () => {         mAvr.selectInputSourceBluetooth();    },10600);
  setTimeout( () => { prtMsg( mAvr.getInputSourceI18n());           },10800);
  setTimeout( () => {         mAvr.selectInputSourceMxport();       },11000);
  setTimeout( () => { prtMsg( mAvr.getInputSourceI18n());           },11200);
  setTimeout( () => {         mAvr.selectInputSourceUsbIpod();      },11400);
  setTimeout( () => { prtMsg( mAvr.getInputSourceI18n());           },11600);
  setTimeout( () => {         mAvr.selectInputSource("SICD");       },11800);
  setTimeout( () => { prtMsg( mAvr.getInputSourceI18n());           },12000);
  setTimeout( () => { prtMsg(
    JSON.stringify(mAvr.getValidInputSelection()))          ;       },12200);
};

/**
 * Check all surround mode commands.
 */
let checkSurroundCommands = () : void => {
  prtMsg("========================================================");
  prtMsg("Surround mode commands :");
  prtMsg("========================================================");
  setTimeout( () => {         mAvr.setSurroundModeToMovies();         },    1);
  setTimeout( () => { prtMsg( mAvr.geti18nSurroundMode());            },  200);
  setTimeout( () => {         mAvr.setSurroundModeToMusic();          },  400);
  setTimeout( () => { prtMsg( mAvr.geti18nSurroundMode());            },  600);
  setTimeout( () => {         mAvr.setSurroundModeToGame();           },  800);
  setTimeout( () => { prtMsg( mAvr.geti18nSurroundMode());            }, 1000);
  setTimeout( () => {         mAvr.setSurroundModeToDirect();         }, 1200);
  setTimeout( () => { prtMsg( mAvr.geti18nSurroundMode());            }, 1400);
  setTimeout( () => {         mAvr.setSurroundModeToPureDirect();     }, 1600);
  setTimeout( () => { prtMsg( mAvr.geti18nSurroundMode());            }, 1800);
  setTimeout( () => {         mAvr.setSurroundModeToStereo();         }, 2000);
  setTimeout( () => { prtMsg( mAvr.geti18nSurroundMode());            }, 2200);
  setTimeout( () => {         mAvr.setSurroundModeToAuto();           }, 2400);
  setTimeout( () => { prtMsg( mAvr.geti18nSurroundMode());            }, 2600);
  setTimeout( () => {         mAvr.setSurroundModeToNeural();         }, 2800);
  setTimeout( () => { prtMsg( mAvr.geti18nSurroundMode());            }, 3000);
  setTimeout( () => {         mAvr.setSurroundModeToStandard();       }, 3200);
  setTimeout( () => { prtMsg( mAvr.geti18nSurroundMode());            }, 3400);
  setTimeout( () => {         mAvr.setSurroundModeToDolby();          }, 3600);
  setTimeout( () => { prtMsg( mAvr.geti18nSurroundMode());            }, 3800);
  setTimeout( () => {         mAvr.setSurroundModeToDts();            }, 4000);
  setTimeout( () => { prtMsg( mAvr.geti18nSurroundMode());            }, 4200);
  setTimeout( () => {         mAvr.setSurroundModeToMultiChannel();   }, 4400);
  setTimeout( () => { prtMsg( mAvr.geti18nSurroundMode());            }, 4600);
  setTimeout( () => {         mAvr.setSurroundModeToMatrix();         }, 4800);
  setTimeout( () => { prtMsg( mAvr.geti18nSurroundMode());            }, 5000);
  setTimeout( () => {         mAvr.setSurroundModeToVirtual();        }, 5200);
  setTimeout( () => { prtMsg( mAvr.geti18nSurroundMode());            }, 5400);
  setTimeout( () => {         mAvr.setSurroundModeToLeft();           }, 5600);
  setTimeout( () => { prtMsg( mAvr.geti18nSurroundMode());            }, 5800);
  setTimeout( () => {         mAvr.setSurroundModeToRight();          }, 6000);
  setTimeout( () => { prtMsg( mAvr.geti18nSurroundMode());            }, 6200);
  setTimeout( () => {         mAvr.setSurrroundCommand("MSAUTO");     }, 6400);
  setTimeout( () => { prtMsg( mAvr.geti18nSurroundMode());            }, 6600);
  setTimeout( () => { prtMsg(
    JSON.stringify(mAvr.getValidSurround()));                         }, 6800);
};

/**
 * Check all eco mode commands.
 */
let checkEcoCommands = () : void => {
  prtMsg("========================================================");
  prtMsg(" Eco mode commands :") ;
  prtMsg("========================================================");
  setTimeout( () => {
    let x = mAvr.hasEco();
    if ( x === true ) {
      prtMsg("Boolean: true");
    } else {
      prtMsg("Boolean: false")
    };                                                                 },    1);
  setTimeout( () => {         mAvr.ecoOn();                            },  200);
  setTimeout( () => { prtMsg( mAvr.geti18nEcoMode());                  },  400);
  setTimeout( () => {         mAvr.ecoOff();                           },  600);
  setTimeout( () => { prtMsg( mAvr.geti18nEcoMode());                  },  800);
  setTimeout( () => {         mAvr.ecoAuto();                          }, 1000);
  setTimeout( () => { prtMsg( mAvr.geti18nEcoMode());                  }, 1200);
  setTimeout( () => {         mAvr.sendEcoCommand("ECO_UN_SUPPORTED"); }, 1400);
  setTimeout( () => { prtMsg(
    JSON.stringify( mAvr.getValidEcoModes()) );                        }, 1600);
};

/**
 * Check all AVR commands.
 */
let checkAll = (): void => {

    setTimeout( () => { checkPowerCommands();             },    10);
    setTimeout( () => { checkMainZonePowerCommands();     },  3000);
    setTimeout( () => { checkMuteCommands();              },  6000);
    setTimeout( () => { checkVolumeCommands();            },  8000);
    setTimeout( () => { checkInputSourceCommands();       }, 11000);
    setTimeout( () => { checkSurroundCommands();          }, 25000);
    setTimeout( () => { checkEcoCommands();               }, 35000);
    setTimeout( () => { process.exit(0);                  }, 40000);
};


/* ================================================================ */
/* = Main test program                                                 = */
/* ================================================================ */

prtMsg( "Testing the marantz configuration files: ");

let confDir  = path.join( __dirname, "/conf");
let confFile = path.join( __dirname, `/conf/${AVRTYPE}.json`);
let conf     = null ;
let eventSck = new events.EventEmitter();

avrDevArray[0] = {
  dev:   null,
  available:   false,
  confLoaded:  false,
  used:        false
};

fs.readdirSync( confDir).forEach( ( file ) => {
  let tFile = `${confDir}/${file}`;
  let jsonData = fs.readFileSync( tFile ).toString();

  try{
    conf = JSON.parse( jsonData );
    prtMsg(`${tFile}: oke.`);
  } catch (err) {
    prtMsg(`${tFile}: failed -> ${err}.`);
  }
});

let confData = fs.readFileSync( confFile ).toString();

try {
  conf = JSON.parse( confData );
} catch ( err ) {
  console.error(`Cannot load ${confFile} -> ${err}.`);
  process.exit(2);
}

setUpListeners();

avrDevArray[0].dev = new AVR();

let mAvr = avrDevArray[0].dev;

mAvr.init( IPPORT, IPADDRESS, AVRNAME , AVRTYPE, 0, eventSck );

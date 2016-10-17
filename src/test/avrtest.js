/**
 * AVRTEST
 *      a basic node program to test the functionality of the 'avr.js' commands
 *      for a Marantz AVR remote commands over a telnet connetion.
 */

"use strict";
let fs   = require("fs");
let path = require("path");
let eventEmitter = require("events");

const IPADDRESS = "192.168.1.35";
const IPPORT    = 2222;
const AVRTYPE   = "SR5010";
const AVRNAME   = "avrtest";


let Avr = require("./avr");

let avrDevArray = [];
let myDebugMode = true ;

let prtDbg = (str) => {
    if ( myDebugMode === true ) {
        let date = new Date();
        let dateStr = date.toISOString();
        console.log(`${dateStr}-${str}`);
    }
};

let prtMsg = (str) => {
    let date = new Date();
    let dateStr = date.toISOString();
    console.log(`${dateStr}-${str}`);
};

/**
 * Check all power commands.
 *
 */
let checkPowerCommands = () => {

    setTimeout( () => {              mAvr.powerOn();             },   10);
    setTimeout( () => { console.log( mAvr.getPowerStatus());     }, 1000);
    setTimeout( () => { console.log( mAvr.getPowerOnOffState()); }, 1200);
    setTimeout( () => {              mAvr.powerOff();            }, 2000);
    setTimeout( () => { console.log( mAvr.getPowerStatus());     }, 2500);
    setTimeout( () => { console.log( mAvr.getPowerOnOffState()); }, 2700);
};

/**
 * Check all main zone power commands.
 *
 */
let checkMainZonePowerCommands = () => {

    setTimeout( () => {              mAvr.mainZonePowerOn();             },   10);
    setTimeout( () => { console.log( mAvr.getMainZonePowerStatus());     }, 1000);
    setTimeout( () => { console.log( mAvr.getMainZonePowerOnOffState()); }, 1200);
    setTimeout( () => {              mAvr.mainZonePowerOff();            }, 2000);
    setTimeout( () => { console.log( mAvr.getMainZonePowerStatus());     }, 2500);
    setTimeout( () => { console.log( mAvr.getMainZonePowerOnOffState()); }, 2700);
};

/**
 * Check all mute commands.
 *
 */
let checkMuteCommands = () => {

    setTimeout( () => {              mAvr.muteOn();             },   10);
    setTimeout( () => { console.log( mAvr.getMuteStatus());     },  500);
    setTimeout( () => { console.log( mAvr.getMuteOnOffState()); },  800);
    setTimeout( () => {              mAvr.muteOff();            }, 1000);
    setTimeout( () => { console.log( mAvr.getMuteStatus());     }, 1500);
    setTimeout( () => { console.log( mAvr.getMuteOnOffState()); }, 1800);
};

/**
 * Check all vlume commands.
 *
 */
let checkVolumeCommands = () => {

    setTimeout( () => {              mAvr.volumeUp();        },   10);
    setTimeout( () => { console.log( mAvr.getVolume());      },  500);
    setTimeout( () => {              mAvr.volumeDown();      },  800);
    setTimeout( () => { console.log( mAvr.getVolume());      }, 1300);
    setTimeout( () => {              mAvr.setVolume(33);     }, 1600);
    setTimeout( () => { console.log( mAvr.getVolume());      }, 2000);
};

/**
 * Check all input source commands.
 *
 */
let checkInputSourceCommands = () => {

    setTimeout( () => {              mAvr.selectInputSourcePhono();        },   10);
    setTimeout( () => { console.log( mAvr.getInputSelection());            },  200);
    setTimeout( () => {              mAvr.selectInputSourceCd();           },  400);
    setTimeout( () => { console.log( mAvr.getInputSelection());            },  600);
    setTimeout( () => {              mAvr.selectInputSourceDvd();          },  800);
    setTimeout( () => { console.log( mAvr.getInputSelection());            }, 1000);
    setTimeout( () => {              mAvr.selectInputSourceBluray();       }, 1200);
    setTimeout( () => { console.log( mAvr.getInputSelection());            }, 1400);
    setTimeout( () => {              mAvr.selectInputSourceTv();           }, 1600);
    setTimeout( () => { console.log( mAvr.getInputSelection());            }, 1800);
    setTimeout( () => {              mAvr.selectInputSourceSatCbl();       }, 2000);
    setTimeout( () => { console.log( mAvr.getInputSelection());            }, 2200);
    setTimeout( () => {              mAvr.selectInputSourceSat();          }, 2400);
    setTimeout( () => { console.log( mAvr.getInputSelection());            }, 2600);
    setTimeout( () => {              mAvr.selectInputSourceMplay();        }, 2800);
    setTimeout( () => { console.log( mAvr.getInputSelection());            }, 3000);
    setTimeout( () => {              mAvr.selectInputSourceVcr();          }, 3200);
    setTimeout( () => { console.log( mAvr.getInputSelection());            }, 3400);
    setTimeout( () => {              mAvr.selectInputSourceGame();         }, 3600);
    setTimeout( () => { console.log( mAvr.getInputSelection());            }, 3800);
    setTimeout( () => {              mAvr.selectInputSourceVaux();         }, 4000);
    setTimeout( () => { console.log( mAvr.getInputSelection());            }, 4200);
    setTimeout( () => {              mAvr.selectInputSourceTuner();        }, 4400);
    setTimeout( () => { console.log( mAvr.getInputSelection());            }, 4800);
    setTimeout( () => {              mAvr.selectInputSourceSpotify();      }, 5000);
    setTimeout( () => { console.log( mAvr.getInputSelection());            }, 5200);
    setTimeout( () => {              mAvr.selectInputSourceNapster();      }, 5400);
    setTimeout( () => { console.log( mAvr.getInputSelection());            }, 5600);
    setTimeout( () => {              mAvr.selectInputSourceFlickr();       }, 5800);
    setTimeout( () => { console.log( mAvr.getInputSelection());            }, 6000);
    setTimeout( () => {              mAvr.selectInputSourceIradio();       }, 6200);
    setTimeout( () => { console.log( mAvr.getInputSelection());            }, 6400);
    setTimeout( () => {              mAvr.selectInputSourceFavorites();    }, 6600);
    setTimeout( () => { console.log( mAvr.getInputSelection());            }, 6800);
    setTimeout( () => {              mAvr.selectInputSourceAux1();         }, 7000);
    setTimeout( () => { console.log( mAvr.getInputSelection());            }, 7200);
    setTimeout( () => {              mAvr.selectInputSourceAux2();         }, 7400);
    setTimeout( () => { console.log( mAvr.getInputSelection());            }, 7600);
    setTimeout( () => {              mAvr.selectInputSourceAux3();         }, 7800);
    setTimeout( () => { console.log( mAvr.getInputSelection());            }, 8000);
    setTimeout( () => {              mAvr.selectInputSourceAux4();         }, 8200);
    setTimeout( () => { console.log( mAvr.getInputSelection());            }, 8400);
    setTimeout( () => {              mAvr.selectInputSourceAux5();         }, 8600);
    setTimeout( () => { console.log( mAvr.getInputSelection());            }, 8800);
    setTimeout( () => {              mAvr.selectInputSourceAux6();         }, 9000);
    setTimeout( () => { console.log( mAvr.getInputSelection());            }, 9200);
    setTimeout( () => {              mAvr.selectInputSourceAux7();         }, 9400);
    setTimeout( () => { console.log( mAvr.getInputSelection());            }, 9600);
    setTimeout( () => {              mAvr.selectInputSourceInetUsb();      }, 9800);
    setTimeout( () => { console.log( mAvr.getInputSelection());            },10000);
    setTimeout( () => {              mAvr.selectInputSourceNet();          },10200);
    setTimeout( () => { console.log( mAvr.getInputSelection());            },10400);
    setTimeout( () => {              mAvr.selectInputSourceBluetooth();    },10600);
    setTimeout( () => { console.log( mAvr.getInputSelection());            },10800);
    setTimeout( () => {              mAvr.selectInputSourceMxport();       },11000);
    setTimeout( () => { console.log( mAvr.getInputSelection());            },11200);
    setTimeout( () => {              mAvr.selectInputSourceUsbIpod();      },11400);
    setTimeout( () => { console.log( mAvr.getInputSelection());            },11600);
    setTimeout( () => {              mAvr.sendInputSourceCommand("SICD");  },11800);
    setTimeout( () => { console.log( mAvr.getInputSelection());            },12000);
    setTimeout( () => { console.log( mAvr.getValidInputSelection());       },12200);
};

/**
 * Check all surround mode commands.
 *
 */
let checkSurroundCommands = () => {
    setTimeout( () => {              mAvr.setSurroundModeToMovies();         },    1);
    setTimeout( () => { console.log( mAvr.getSurroundMode());                },  200);
    setTimeout( () => {              mAvr.setSurroundModeToMusic();          },  400);
    setTimeout( () => { console.log( mAvr.getSurroundMode());                },  600);
    setTimeout( () => {              mAvr.setSurroundModeToGame();           },  800);
    setTimeout( () => { console.log( mAvr.getSurroundMode());                }, 1000);
    setTimeout( () => {              mAvr.setSurroundModeToDirect();         }, 1200);
    setTimeout( () => { console.log( mAvr.getSurroundMode());                }, 1400);
    setTimeout( () => {              mAvr.setSurroundModeToPureDirect();     }, 1600);
    setTimeout( () => { console.log( mAvr.getSurroundMode());                }, 1800);
    setTimeout( () => {              mAvr.setSurroundModeToStereo();         }, 2000);
    setTimeout( () => { console.log( mAvr.getSurroundMode());                }, 2200);
    setTimeout( () => {              mAvr.setSurroundModeToAuto();           }, 2400);
    setTimeout( () => { console.log( mAvr.getSurroundMode());                }, 2600);
    setTimeout( () => {              mAvr.setSurroundModeToNeural();         }, 2800);
    setTimeout( () => { console.log( mAvr.getSurroundMode());                }, 3000);
    setTimeout( () => {              mAvr.setSurroundModeToStandard();       }, 3200);
    setTimeout( () => { console.log( mAvr.getSurroundMode());                }, 3400);
    setTimeout( () => {              mAvr.setSurroundModeToDolby();          }, 3600);
    setTimeout( () => { console.log( mAvr.getSurroundMode());                }, 3800);
    setTimeout( () => {              mAvr.setSurroundModeToDts();            }, 4000);
    setTimeout( () => { console.log( mAvr.getSurroundMode());                }, 4200);
    setTimeout( () => {              mAvr.setSurroundModeToMultiChnStereo(); }, 4400);
    setTimeout( () => { console.log( mAvr.getSurroundMode());                }, 4600);
    setTimeout( () => {              mAvr.setSurroundModeToMatrix();         }, 4800);
    setTimeout( () => { console.log( mAvr.getSurroundMode());                }, 5000);
    setTimeout( () => {              mAvr.setSurroundModeToVirtual();        }, 5200);
    setTimeout( () => { console.log( mAvr.getSurroundMode());                }, 5400);
    setTimeout( () => {              mAvr.setSurroundModeToLeft();           }, 5600);
    setTimeout( () => { console.log( mAvr.getSurroundMode());                }, 5800);
    setTimeout( () => {              mAvr.setSurroundModeToRight();          }, 6000);
    setTimeout( () => { console.log( mAvr.getSurroundMode());                }, 6200);
    setTimeout( () => {              mAvr.sendSurroundCommand("MSAUTO");     }, 6400);
    setTimeout( () => { console.log( mAvr.getSurroundMode());                }, 6600);
    setTimeout( () => { console.log( mAvr.getValidSurround());               }, 6800);
};

/**
 * Check all eco commands.
 *
 */
let checkEcoCommands = () => {
    setTimeout( () => { console.log( mAvr.hasEco());              },                1);
    setTimeout( () => {              mAvr.ecoOn();                },              200);
    setTimeout( () => { console.log( mAvr.getEcoMode());          },              400);
    setTimeout( () => {              mAvr.ecoOff();               },              600);
    setTimeout( () => { console.log( mAvr.getEcoMode());          },              800);
    setTimeout( () => {              mAvr.ecoAuto();              },             1000);
    setTimeout( () => { console.log( mAvr.getEcoMode());          },             1200);
    setTimeout( () => {              mAvr.sendEcoCommand("ECO_UN_SUPPORTED"); }, 1400);
    setTimeout( () => { console.log( mAvr.getValidEcoCommands()); },             1600);
};

/**
 * Check all avr commands
 * Calls checks for power, mani zone power, mute, volume, inputsource, surround mode and eco.
 *
 */
let checkAll = (xAvr) => {

    setTimeout( () => { checkPowerCommands(xAvr);             },    10);
    setTimeout( () => { checkMainZonePowerCommands(xAvr);     },  3000);
    setTimeout( () => { checkMuteCommands(xAvr);              },  6000);
    setTimeout( () => { checkVolumeCommands(xAvr);            },  8000);
    setTimeout( () => { checkInputSourceCommands(xAvr);       }, 11000);
    setTimeout( () => { checkSurroundCommands(xAvr);          }, 25000);
    setTimeout( () => { checkEcoCommands(xAvr);               }, 35000);
    setTimeout( () => { process.exit(0);                      }, 40000);
};

let setUpListeners = () => {

    eventSocket
        // initiation and load avr type json files events
        .on("init_success", (num, name, type) => {
            prtDbg(`AVR ${name} (slot ${num}) has loaded the ${type}.json file.`);
            avrDevArray[ num ].available = true;

            let xhost = avrDevArray[0].dev.getHostname();
            let xport = avrDevArray[0].dev.getPort();
            let xtype = avrDevArray[0].dev.getType();
            let xname = avrDevArray[0].dev.getName();

            prtMsg(`IP address : ${xhost}.`);
            prtMsg(`Port       : ${xport}.`);
            prtMsg(`Type       : ${xtype}.`);
            prtMsg(`Name       : ${xname}.`);

            avrDevArray[0].dev.setTest();
        })
        .on("init_failed", (num, name, type) => {
            prtMsg(`Error: AVR ${name} (slot ${num}) has fail to load the ${type}.json file.`);
            avrDevArray[ num ].available = false;
        })

        // network events.
        .on("net_connected", (num,name) => {
            prtDbg(`Avr ${name} (slot ${num}) is connected.`);

            checkAll();

        })
        .on("net_disconnected" , (num, name) => {
            prtMsg(`Avr ${name} (slot ${num}) is disconnected.`);
            avrDevArray[ num ].connected = false;
        })
        .on("net_timed_out" , (num, name) => {
            prtMsg(`Avr ${name} (slot ${num}) timed out.`);
            avrDevArray[ num ].connected = false;
        })
        .on("net_error", (num,name,err) => {
            prtMsg(`Avr ${name} (slot ${num}) has a network error -> ${err}.`);
            avrDevArray[ num ].connected = false;
        })
        .on("net_uncaught" , (num, name,err) => {
            prtMsg(`Avr ${name} (slot ${num}) : uncaught network event -> '${err}.`);
            //avrDevArray[ num ].connected = false;
        })

        // Status triggers
        .on("power_status_chg" , (num, name, cmd ) => {
            prtDbg(`Avr ${name} (slot ${num}) : ${cmd}`);
        })
        .on("mute_status_chg" , (num, name, cmd ) => {
            prtDbg(`Avr ${name} (slot ${num}) : ${cmd}`);
        })
        .on("eco_status_chg" , (num, name, cmd ) => {
            prtDbg(`Avr ${name} (slot ${num}) : ${cmd}`);
        })
        .on("isource_status_chg" , (num, name, cmd ) => {
            prtDbg(`Avr ${name} (slot ${num}) : ${cmd}`);
        })
        .on("surmode_status_chg" , (num, name, cmd ) => {
            prtDbg(`Avr ${name} (slot ${num}) : ${cmd}`);
        })
        .on("volume_chg" , (num, name, value) => {
            prtDbg(`Avr ${name} (slot ${num}) changed volume to ${value}.`);
        })

         // Debug messages from ath avr control part.
        .on( "debug_log"  , (num, name, msg ) => {
            prtMsg(`AVR ${name} (slot ${num}) ${msg}.`);
        })

        .on("uncaughtException", () => {
            // catch uncaught exception to prevent runtime problems.
            prtMsg("Oops: uncaught exception !.");
        });
};

/***********************************************************************************
 * Main prog
 **********************************************************************************/

prtMsg("Testing the marantz configuration files:");

let confDir     = path.join( __dirname, "/conf/");
let confFile    = path.join( __dirname,`/conf/${AVRTYPE}.json`);
let conf        = null;
let eventSocket = new eventEmitter();

avrDevArray[0] = {
    dev:       null,
    connected: false,
    available: false,
    used:      false
};


fs.readdirSync( confDir ).forEach( (file) => {

    let tFile = confDir + file ;

    let jsondata = fs.readFileSync( tFile ).toString();

    try {
        conf = JSON.parse( jsondata );
        prtMsg(`${file} : Oke`);
    } catch(err) {
        prtMsg(`${file} : Failed.`);
        prtMsg(`Reason: ${err}.`);
    }
});

let jsondata = fs.readFileSync( confFile ).toString();

try{
    conf = JSON.parse( jsondata);
    console.log(`Avrtest has loaded the ${confFile}.`);
} catch (err) {
    console.log(`Oops cannot load/parse '${confFile}'.`);
    process.exit(2);
}

setUpListeners();

avrDevArray[0].dev = new Avr();
avrDevArray[0].dev.init( IPPORT, IPADDRESS, AVRNAME, AVRTYPE, 0 , eventSocket);

let mAvr= avrDevArray[0].dev;

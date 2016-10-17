"use strict";

/* ==================================================================== */
/* = NOTE:                                                              */
/* =   THIS IS A GENERATED JAVASCRIPT FILE                              */
/* =   DONT EDIT THE JAVASCRIPT FILE (*.js)                             */
/* =   but the typescipt file (*.ts) instead and re-generate the file   */
/* ==================================================================== */

import * as path      from "path";
import * as fs        from "fs";
import * as net       from "net";
import * as events    from "events";


import { SelectionInfo }  from "./interfaces" ;

/* ==================================================================== */
/* TIME_TO_RETRY: (= 10 sec)                                            */
/* Time to wait before a re-open a new connection to the AVR will       */
/* take place after a connection has failed.                            */
/* ==================================================================== */
const TIME_TO_RETRY         = 10000 ;

/* ==================================================================== */
/* WAIT_BETWEEN_TRANSMITS: (= 100 msec)                                 */
/* Time to wait between two consecutive command transmission.           */
/* Marantz; 70 msec or higher                                           */
/* ==================================================================== */
const WAIT_BETWEEN_TRANSMITS  = 100 ;

/* ==================================================================== */
/* MAX_INDEX                                                            */
/*    Maximum send buffer size                                          */
/* ==================================================================== */
const MAX_INDEX  = 64 ;

/* ==================================================================== */
/* MAX_VOLUME                                                           */
/*    Maximum volume level which can be set at once                     */
/* ==================================================================== */
const MAX_VOLUME = 80 ;

export class AVR {

  avr_port:                   number; // Network port ti use.
  avr_host:                   string; // IP address or hostname to use
  avr_name:                   string; // Given naam to the device within Homey
  avr_type:                   string; // Type of Marantz AVR

  powerStatus:                string;
  mainZonePowerStatus:        string;
  muteStatus:                 string;
  inputSourceSelection:       string;
  volumeStatus:               string;
  surroundMode:               string;
  ecoStatus:                  string;

  avr_avrnum:                 number; // Internal index
  insertIndex:                number; // Insert position index of the send buffer
  deleteIndex:                number; // Delete position index of the send buffer.

  eventch:                    events.EventEmitter;// Internal event channel
  comChannel:                 events.EventEmitter;// Event channel from homey driver.

  hasConfigLoaded:            boolean;
  hasToStop:                  boolean;
  hasNetworkConnection:       boolean;
  isBufferLoopRunning:        boolean;
  consoleOut:                 boolean;// Debug messages (true) or not (false).
  filter:                     boolean;// use all possible commands to the AVR
                                      // Test only !

  selAr:                      SelectionInfo[];
  surroundAr:                 SelectionInfo[];
  ecoAr:                      SelectionInfo[];
  sendBuffer:                 string[];

  avrSocket:                  net.Socket;// Network socket to the AVR.

  conf:                       any;  // Will container the parsed JSON configuration.

  constructor() {
    this.avr_port             = 0  ;
    this.avr_host             = "" ;
    this.avr_name             = "" ;
    this.avr_type             = "" ;

    this.conf                 = {} ;

    this.insertIndex          = 0 ;
    this.deleteIndex          = 0 ;
    this.avr_avrnum           = 0 ;

    this.hasConfigLoaded      = false;
    this.hasToStop            = false;
    this.hasNetworkConnection = false;
    this.isBufferLoopRunning  = false;
    this.consoleOut           = false;
    this.filter               = true;

    this.selAr                = [];
    this.surroundAr           = [];
    this.ecoAr                = [];
    this.sendBuffer           = [];

    this.powerStatus          = "Unknown";
    this.mainZonePowerStatus  = "Unknown";
    this.muteStatus           = "Unknown";
    this.inputSourceSelection = "Unknown";
    this.volumeStatus         = "Unknown";
    this.surroundMode         = "Unknown";
    this.ecoStatus            = "Unknown";

    this.eventch              = null;
    this.comChannel           = null;

    /* ================================================================= */
    /* Initialize the senf buffer                                        */
    /* ================================================================= */
    for ( let I = 0 ; I < MAX_INDEX ; I++ ) {
      this.sendBuffer[I] = "" ;
    }

    /* ================================================================= */
    /* Internal event handler                                            */
    /* ================================================================= */
    this.eventch         = new events.EventEmitter();

    /* ================================================================= */
    /* Initaite the event listeners                                      */
    /* ================================================================= */
    this._eventLoop();
  }

  /**
   * Initialize a AVR.
   * @param {number}              sPort    The network port to use.
   * @param {string}              sHost    The hostname or IP address to be used.
   * @param {string}              sName    The given 'Homey name' of the AVR.
   * @param {string}              sType    The selectied Homey type of the AVR/
   * @param {number}              sNum     An index into the AVR array (internal)
   * @param {events.EventEmitter} sChannel Communication channel with the Homey part
   */
  public init( sPort: number,
              sHost: string,
              sName: string,
              sType: string,
              sNum: number,
              sChannel: events.EventEmitter ): void {

    this.avr_port      = sPort ;
    this.avr_host      = sHost ;
    this.avr_name      = sName ;
    this.avr_type      = sType ;
    this.avr_avrnum    = sNum  ;
    this.comChannel    = sChannel;

    let avRConfigFile = path.join( __dirname, `/conf/${this.avr_type}.json`);

    fs.readFile( avRConfigFile, "utf8", ( err, data ) => {

      if ( err ) {
        this.conf      = null;
        this.hasConfigLoaded = false ;
        this.comChannel.emit("init_failed", this.avr_avrnum, this.avr_type, err );
      };

      try {
        this.conf  = JSON.parse( data );
      } catch ( err ) {

        this.conf      = null;
        this.hasConfigLoaded = false ;
        this.comChannel.emit("init_failed", this.avr_avrnum, this.avr_type, err );
      }

      this.hasConfigLoaded = true;

      // Fill the input selection array with the entries supported by the AVR type
      this._fillSelectionInfo() ;
      // Fill the surround selection array with the entries supported by the AVR type.
      this._fillSurroundArray();
      // File the eco selection array with entries supported by the AVR.
      this._fillEcoArray();

      this.comChannel.emit("init_success", this.avr_avrnum, this.avr_name, this.avr_type);
      this.eventch.emit("config_loaded");
    });
  }

  /**
   * Creates an array with the supported input source selection for the selected AVR type.
   * @private
   */
  private _fillSelectionInfo(): void {

    for ( let I =0 ; I < this.conf.inputsource.length ; I++ ) {

      if ( typeof( this.conf.inputsource[I] !== "undefined"   &&
                  this.conf.inputsource[I]  !== null )) {

        if( this.conf.inputsource[I].valid   === true &&
            this.conf.inputsource[I].prog_id !== "i_request" ) {

          let item: SelectionInfo = {
            i18n: this.conf.inputsource[I].i18n,
            command: this.conf.inputsource[I].command
          };
          this.selAr.push( item );
        }
      }
    }
  }

  /**
   * Creates an array with the surround selection of the selected AVT type.
   * @private
   */
  private _fillSurroundArray(): void {

    for ( let I =0 ; I < this.conf.surround.length ; I++ ) {

      if ( typeof( this.conf.surround[I] !== "undefined"   &&
                  this.conf.surround[I]  !== null )) {

        if( this.conf.surround[I].valid   === true &&
            this.conf.surround[I].prog_id !== "s_request" ) {

          let item: SelectionInfo = {
            i18n: this.conf.surround[I].i18n,
            command: this.conf.surround[I].command
          };
          this.surroundAr.push( item );
        }
      }
    }
  }

  /**
   * Creates an array with the eco command selection for the selected AVR type.
   * @private
   */
  private _fillEcoArray() : void {

    for ( let I =0 ; I < this.conf.eco.length ; I++ ) {

      if ( typeof( this.conf.eco[I] !== "undefined"   &&
                  this.conf.eco[I]  !== null )) {

        if( this.conf.eco[I].valid   === true &&
            this.conf.eco[I].prog_id !== "eco_request" ) {

          let item: SelectionInfo = {
            i18n: this.conf.eco[I].i18n,
            command: this.conf.eco[I].command
          };
          this.ecoAr.push( item );
        }
      }
    }
  }

  /**
   * EventLoop handles the avr driver control events.
   * @private
   */
  private _eventLoop() : void {

    this.eventch
      /* ============================================================== */
      /* - 'config_loaded':                                             */
      /* -    Sent by 'init' after a succesful loading and parsing of   */
      /* -    AVR configuration file.                                   */
      /* ============================================================== */
      .on( "config_loaded", (): void => {
        this._d(`Configuration loaded. Open a network connection...`);
        this._openConnection();
      })

      /* ============================================================== */
      /* - Network events ( all emitted by _openConnection)             */
      /* - - net_connected                                              */
      /* -      New  acoonection to AVR is established                  */
      /* - - net_disconnected                                           */
      /* -      Disconnected from AVR after avr-disconnect-request      */
      /* - - net_error                                                  */
      /* -      Received a network error                                */
      /* - - net_timedout                                               */
      /* -      Recieived a network time out                            */
      /* ============================================================== */
      .on( "net_connected", () : void => {

        this._d(`Connected with AVR.`);
        this._getAVRstatusUpdate(); // get the status of the AVR

        /* ============================================================ */
        /* Wait 2 sec before informing homey to the status of the AVR   */
        /* can be collected without interference.                       */
        /* Set hasNetworkConnection after the wait time and             */
        /* 'free' the device from Homey.                                */
        /* ============================================================ */

        setTimeout( (): void  => {

          this._d("Informing Homey AVR is available.");
          this.hasNetworkConnection = true ;
          this.comChannel.emit("net_connected", this.avr_avrnum, this.avr_name);
        }, 2000 );
      })
      .on("net_disconnected" , () : void  => {
        /* ============================================================ */
        /* - Notify Homey the network connection is lost.               */
        /* - Try to reconnect again.                                    */
        /* ============================================================ */
        this._d(`Network disconnected....`);
        this.comChannel.emit("net_disconnected", this.avr_avrnum, this.avr_name);
        this.eventch.emit("net_retry");
      })
      .on( "net_error" , (err: Error ) : void  => {
        /* ============================================================ */
        /* - Notify Homey the network connection is disconneted.        */
        /* - Try to reconnect again.                                    */
        /* ============================================================ */
        this._d(`Network error ${err}`);
        this.comChannel.emit("net_error", this.avr_avrnum, this.avr_name, err);
        this.eventch.emit("net_retry");
      })
      .on( "net_timedout" , () : void  => {
        /* ============================================================ */
        /* - Notify Homey the network connection is disconneted.        */
        /* - Try to reconnect again.                                    */
        /* ============================================================ */
        this._d("Network timed out.");
        this.comChannel.emit("net_timed_out", this.avr_avrnum, this.avr_name);
        this.eventch.emit("net_retry");
      })

      /* ============================================================== */
      /* - Network  retry                                               */
      /* - - net_retry                                                  */
      /* -      Try to connect to the AVR again.                        */
      /*        Don't start if a homey disconnect request is pending.   */
      /* ============================================================== */
      .on( "net_retry" , () : void => {
        this._d(`Network retry.`);
        if( this.hasToStop === false ) {
          setTimeout( () => {
            this._openConnection();
          }, TIME_TO_RETRY );
        }
      })

      /* ============================================================== */
      /* - Disconnect request from user/Homey                           */
      /* - - req_disconnect                                             */
      /* ============================================================== */
      .on( "req_disconnect" , () : void => {
        this._d("Request disconnect.");
        this.hasToStop  = true ;
        this.avrSocket.end();
      })

      /* ============================================================== */
      /* - Send buffer events                                           */
      /* - - new_data                                                   */
      /* -      New data is added to the send buffer                    */
      /* - - check_buffer                                               */
      /* -      Check if the send buffer is empty                       */
      /* ============================================================== */
      .on( "new_data" , () : void => {
        if( this.isBufferLoopRunning === false ) {
          this.isBufferLoopRunning = true;
          this._checkSendBuffer();
        }
      })
      .on( "check_buffer", () : void => {
        this._checkSendBuffer();
      })

      /* ============================================================== */
      /* - Catch uncaught events                                        */
      /* ============================================================== */
      .on( "uncaughtException", (err: Error ) : void => {
        this.comChannel.emit(`net_uncaught`, this.avr_avrnum, this.avr_name);
      });
  }

  /**
   * Connects to the AVR ans sets listeners on the possible connection events.
   * @private
   */
  private _openConnection() : void {

    this._d(`Opening AVR network connection to '${this.avr_host}:${this.avr_port}'.`);

    /* ================================================================ */
    /* - Use allowHalfOpen to create a permanent connection to the AVR  */
    /* - over the network otherwise the connection will terminate as    */
    /* - soon as the socket buffer is empty.                            */
    /* ================================================================ */

    this.avrSocket = new net.Socket( {
      allowHalfOpen: true
    });

    this.avrSocket.connect( this.avr_port, this.avr_host);

    this.avrSocket
      .on("connect" , () : void  => {
        this._d(`Connected`);
        this.eventch.emit("net_connected");
      })
      .on("error" , (err: Error ) : void  => {
        this._d(`Network error`);
        this.hasNetworkConnection = false;
        this.avrSocket.end();
        this.avrSocket = null;
        this.eventch.emit("net_error", err);
      })
      .on( "data", (data: Buffer ) : void  => {
        this._d("data");
        this._processData( data );
      })
      .on( "end", () : void  => {
        this._d("Disconnected");
        this.hasNetworkConnection = false;
        this.avrSocket.end();
        this.avrSocket = null;
        this.eventch.emit("net_disconnected");
      })
      .on( "timeout", () : void => {
        this._d("timed out.");
        this.hasNetworkConnection = false;
        this.avrSocket.end();
        this.avrSocket = null;
        this.eventch.emit("net_timed_out");
      })
      .on( "uncaughtException" , (err: Error) : void  => {
        this._d(`UncaughtException ${err}`);
        this.hasNetworkConnection = false;
        this.avrSocket.end();
        this.avrSocket = null;
        this.eventch.emit("net_error", new Error(`uncaught exception - ${err}.`));
      });
  }

  private _checkSendBuffer(): void {

    this._d( `_checkSendBuffer: ${this.insertIndex} / ${this.deleteIndex}`);

    if ( this.insertIndex === this.deleteIndex ) {
      /* ============================================================= */
      /* - Send buffer is empty => nothing to do till new data is      */
      /* - entered into the send buffer.                               */
      /* ============================================================= */
      this.isBufferLoopRunning = false;
      this._d("Send buffer loop stopped - send buffer empty.")
    } else {

      if ( this.sendBuffer[ this.deleteIndex ] === "" ) {
        /* =========================================================== */
        /* - If the command to be send is empty, consider it as        */
        /* - buffer empty and exit the buffer loop.                    */
        /* =========================================================== */
        this.isBufferLoopRunning = false;
        this._d("Send buffer loop stopped - command empty.")
      } else {

        let data = this.sendBuffer[ this.deleteIndex ];
        this.sendBuffer[ this.deleteIndex ] = "";
        this.deleteIndex++ ;

        if ( this.deleteIndex >= MAX_INDEX ) {
          this.deleteIndex = 0;
        }

        this._d(`Setting deleteIndex to ${this.deleteIndex}.`);

        this._sendToAvr( data );
      }
    }
  }

  /**
   * Sends to command to the AVR.
   * It will add a '\r' as required by Marantz.
   * The AVR requires approx 50-70 msec between consecutive commands.
   *
   * @param {string} cmd The command string
   * @private
   */
  private _sendToAvr( cmd: string ): void {

    this._d(`Sending: ${cmd}.`);
    this.avrSocket.write(`${cmd}\r`);

    setTimeout( () => {
      this.eventch.emit("check_buffer");
    }, WAIT_BETWEEN_TRANSMITS );
  }

  /**
   * Insert a command into the send buffer.
   * Updates the insertIndex and start a send buffer loop,
   * @param  {string} cmd  the command string
   * @private
   */
  private _insertIntoSendBuffer( cmd: string ): void  {

    let nextInsertIndex = this.insertIndex + 1 ;

    if ( nextInsertIndex >= MAX_INDEX ) {
      nextInsertIndex = 0;
    }

    if ( nextInsertIndex === this.deleteIndex ) {
      /* ============================================================== */
      /* - Data buffer overrun !.                                       */
      /* - Notify Homey part but dont insert                            */
      /* ============================================================== */
      this.comChannel.emit("error_log", this.avr_avrnum, this.avr_name,
        new Error("Send buffer overrun !."));
    } else {

      this.sendBuffer[ this.insertIndex ] = cmd ;

      this.insertIndex = nextInsertIndex ;

      this._d(`InsertIndex set to ${this.insertIndex}.`);

      this.eventch.emit("new_data");
    }
  }

  private _processData( data: Buffer ): void {

    let xData = data.toString("utf8").replace("\r", "");

    this._d( `Received : '${xData}'.`);

    let newStatus  = "";
    let oldStatus  = "";
    let newi18n    = "";
    let oldi18n    = "";

    /* ============================================================== */
    /* - Note:                                                        */
    /* -  Report changes to the Homey part only if there is a         */
    /* -  network connection with the AVR.                            */
    /* ============================================================== */

    switch ( xData.substr(0,2) ) {

      case "PW":
        /* ========================================================== */
        /* - Main Power                                               */
        /* ========================================================== */

        newStatus = xData;
        oldStatus = this.powerStatus;
        newi18n   = "";
        oldi18n   = "";

        this.powerStatus = newStatus;

        if ( this.hasNetworkConnection === true ) {

          for ( let I = 0 ; I < this.conf.power.length; I++ ) {
            if ( newStatus === this.conf.power[I].command ) {
              newi18n = this.conf.power[I].i18n;
            }
          }

          for ( let I = 0 ; I < this.conf.power.length; I++ ) {
            if ( oldStatus === this.conf.power[I].command ) {
              oldi18n = this.conf.power[I].i18n;
            }
          }

          this.comChannel.emit( "power_status_chg", this.avr_avrnum,
              this.avr_name, newi18n, oldi18n );
        }
        break;
      case "ZM":
        /* ========================================================== */
        /* - Main Zone Power                                          */
        /* ========================================================== */
        this.mainZonePowerStatus = xData;

        if ( this.hasNetworkConnection === true ) {

          for ( let I = 0 ; I < this.conf.main_zone_power.length; I++ ) {
            if ( xData === this.conf.main_zone_power[I].command ) {

              this.comChannel.emit( "mzpower_status_chg", this.avr_avrnum,
                  this.avr_name, this.conf.main_zone_power[I].i18n );
            }
          }
        }
        break;
      case "SI":
        /* ========================================================== */
        /* - Input Source selection                                   */
        /* ========================================================== */
        this.inputSourceSelection = xData;

        if ( this.hasNetworkConnection === true ) {

          for ( let I = 0 ; I < this.conf.inputsource.length; I++ ) {
            if ( xData === this.conf.inputsource[I].command ) {

              this.comChannel.emit( "isource_status_chg", this.avr_avrnum,
                  this.avr_name, this.conf.inputsource[I].i18n );
            }
          }
        }
        break;
      case "MU":
        /* ========================================================== */
        /* - mute                                                     */
        /* ========================================================== */
        this.muteStatus = xData;

        if ( this.hasNetworkConnection === true ) {

          for ( let I = 0 ; I < this.conf.mute.length; I++ ) {
            if ( xData === this.conf.mute[I].command ) {

              this.comChannel.emit( "mute_status_chg", this.avr_avrnum,
                  this.avr_name, this.conf.mute[I].i18n );
            }
          }
        }
        break;
      case "MS":
        /* ========================================================== */
        /* - Surround mode                                            */
        /* ========================================================== */
        this.surroundMode = xData;

        if ( this.hasNetworkConnection === true ) {

          for ( let I = 0 ; I < this.conf.surround.length; I++ ) {
            if ( xData === this.conf.surround[I].command ) {

              this.comChannel.emit( "surround_status_chg", this.avr_avrnum,
                  this.avr_name, this.conf.surround[I].i18n );
            }
          }
        }
        break;
      case "MV":
        /* ========================================================== */
        /* - Volume                                                   */
        /* ========================================================== */
        this._processVolume( xData );
        break;
      case "EC":
        /* ========================================================== */
        /* - Eco mode                                                 */
        /* ========================================================== */
        this.ecoStatus = xData;

        if ( this.hasNetworkConnection === true ) {

          for ( let I = 0 ; I < this.conf.eco.length; I++ ) {
            if ( xData === this.conf.eco[I].command ) {

              this.comChannel.emit( "eco_status_chg", this.avr_avrnum,
                  this.avr_name, this.conf.eco[I].i18n );
            }
          }
        }
        break;
    }
  }

  /**
   * Processes the volume status strng from the AVR.
   * @param {string} volume The volume status.
   * @private
   */
  private _processVolume( volume: string ) : void {

    this._d(`Processing Volume: ${volume}.`);

    if ( volume.match( /^MVMAX .*/) == null ) {
      this._d(`Setting volume status to ${volume}.`);

      this.volumeStatus = volume;

      let re = /^MV(\d+)/i ;

      let Ar = volume.match(re);

      if ( Ar !== null ) {
        this.comChannel.emit("volume_status_chg", this.avr_avrnum,
            this.avr_name, Ar[1] );
      }
    }
  }

  /**
   * Get the status fromthe AVR once the network coonction is established
   * @private
   */
  private _getAVRstatusUpdate(): void {
    this._getAvrPowerStatus();
    this._getAvrMainZonePowerStatus();
    this._getAvrInputSourceSelection();
    this._getAvrMuteStatus();
    this._getAvrVolumeStatus();
    this._getAvrSurroundMode();
    this._getAvrEcoStatus();
  }

  /* ================================================================== */
  /* - Debug methods                                                    */
  /* ================================================================== */

  /**
   * Enable debug output messages to console.
   */
  public setConsoleToDebug() : void {
    this.consoleOut = true ;
    this._d(`AVR debug switch on.`);
  }

  public setConsoleOff() : void {
    this._d(`AVR debug switch off.`);
    this.consoleOut = false;
  }

  /**
   * Override avr type filtering (testing only!.)
   * @private
   */
  setTest() : void {
    this.filter = false ;
  }

  /**
   * Return to standard filtering mode (testing only!)
   * @private
   */
  clearTest(): void {
    this.filter = false;
  }

  /**
   * Send (conditionally) a debug message to console.log (debug only!)
   * @private
   * @param {string} str the debug message.
   */
  private _d( str: string ) : void {

    if ( this.consoleOut === true ) {
      this.comChannel.emit( "debug_log", this.avr_avrnum,
        this.avr_name, str );
    }
  }

  /* ================================================================== */
  /* - get AVR initial parameters                                       */
  /* ================================================================== */

  /**
   * Get the current hostname
   * @return {string} The hostname or IP address.
   */
  public getHostname(): string {
    return this.avr_host;
  }

  /**
   * Get the current port number
   * @return {number} The current port number.
   */
  public getPort() : number {
    return this.avr_port ;
  }

  /**
   * Get the current AVR type.
   * @return {string} The current AVR type.
   */
  public getType(): string {
    return this.avr_type;
  }

  /**
   * Get the current home name of the AVR.
   * @return {string} The current name.
   */
  public getName(): string {
    return this.avr_name ;
  }

  /**
   * Get the internal indev/
   * @return {number} The internal index
   */
  public getNum(): number {
    return this.avr_avrnum;
  }

  /**
   * Is the AVR configuration loaded?
   * @return {boolean} true => loaded, false => not loaded.
   */
  isConfigLoaded(): boolean {
    return this.hasConfigLoaded;
  }

  /* ================================================================== */
  /* - Public non AVR commands                                          */
  /* ================================================================== */

  /**
   * Disconnect on request of the user or Homey.
   */
  disconnect() : void {

    this._d(`Disconnecting on request.`);

    this.eventch.emit("req_disconnect");
  }

  /* ================================================================== */
  /* - Power methods                                                    */
  /* ================================================================== */

  /**
   * Find the command of the requested power action and send it to the AVR.
   * @param {string} cmd The "prog_id" string of the requested command.
   * @private
   */
  private _powerCommand( cmd: string ) : void {

    for ( let I = 0 ; I < this.conf.power.length; I++ ) {
      if ( this.filter == false ) {
        if ( this.conf.power[I].prog_id === cmd ) {
          this._insertIntoSendBuffer( this.conf.power[I].command );
        }
      } else {
        if ( this.conf.power[I].prog_id === cmd &&
             this.conf.power[I].valid  === true ) {

          this._insertIntoSendBuffer( this.conf.power[I].command );
        }
      }
    }
  }

  /**
   * Switch on the power of the AVR
   */
  public powerOn() : void {
    this._powerCommand( "power_on" );
  }

  /**
   * Switch the AVR power off / standby.
   */
  public powerOff() : void {
    this._powerCommand( "power_off" );
  }

  /**
   * Request power status from the AVR.
   * @private
   */
  private _getAvrPowerStatus() : void {
    this._powerCommand( "power_request" );
  }

  /**
   * Get the i18n current power status.
   * @return {string} The i18n current power status string
   */
  public getPoweri18nStatus() : string {

    let retStr = "error.cmdnf";

    for ( let I = 0 ; I < this.conf.power.length ; I++ ) {
      if ( this.powerStatus === this.conf.power[I].command ) {
        retStr = this.conf.power[I].i18n ;
        break;
      }
    }
    return retStr;
  }

  /**
   * Get the boolean power status. (true => power on, false => power off).
   * @return {boolean} Power status.
   */
  public getPowerOnOffState(): boolean {

    for ( let I = 0 ; I < this.conf.power.length; I++ ) {
      if ( this.conf.power[I].prog_id === "power_on" ) {
        if ( this.conf.power[I].command === this.powerStatus ) {
          return true;
        } else {
          return false;
        }
      }
    }
  }

  /* ================================================================== */
  /* - Main zone power methods                                          */
  /* ================================================================== */

  /**
   * Find the command of the requested main zone power action
   * and send it to the AVR.
   * @param {string} cmd The "prog_id" string of the requested command.
   * @private
   */
  private _mainZonepowerCommand( cmd: string ) : void {

    for ( let I = 0 ; I < this.conf.main_zone_power.length; I++ ) {
      if ( this.filter == false ) {
        if ( this.conf.main_zone_power[I].prog_id === cmd ) {
          this._insertIntoSendBuffer( this.conf.main_zone_power[I].command );
        }
      } else {
        if ( this.conf.main_zone_power[I].prog_id === cmd &&
             this.conf.main_zone_power[I].valid  === true ) {

          this._insertIntoSendBuffer( this.conf.main_zone_power[I].command );
        }
      }
    }
  }

  /**
   * Switch on the main zone power of the AVR
   */
  public mainZonePowerOn() : void {
    this._mainZonepowerCommand( "mzpower_on" );
  }

  /**
   * Switch the AVR main zone power off / standby.
   */
  public mainZonePowerOff() : void {
    this._mainZonepowerCommand( "mzpower_off" );
  }

  /**
   * Request main zone power status from the AVR.
   * @private
   */
  private _getAvrMainZonePowerStatus() : void {
    this._mainZonepowerCommand( "mzpower_request" );
  }

  /**
   * Get the i18n current power status.
   * @return {string} The i18n current power status string
   */
  public getMainZonePoweri18nStatus() : string {

    let retStr = "error.cmdnf";

    for ( let I = 0 ; I < this.conf.main_zone_power.length ; I++ ) {
      this._d(`${this.mainZonePowerStatus} <> ${this.conf.main_zone_power[I].command}.`);
      if ( this.mainZonePowerStatus === this.conf.main_zone_power[I].command ) {
        retStr = this.conf.main_zone_power[I].i18n ;
        break;
      }
    }
    return retStr;
  }

  /**
   * Get the boolean main zone power status. (true => power on, false => power off).
   * @return {boolean} Power status.
   */
  public getMainZonePowerOnOffState(): boolean {

    for ( let I = 0 ; I < this.conf.main_zone_power.length; I++ ) {
      if ( this.conf.main_zone_power[I].prog_id === "mzpower_on" ) {
        if ( this.conf.main_zone_power[I].command === this.mainZonePowerStatus ) {
          return true;
        }
      }
    }
    return false;
  }

  /* ================================================================== */
  /* - Mute methods                                                     */
  /* ================================================================== */

  /**
   * Find the command of the requested mute action
   * and send it to the AVR.
   * @param {string} cmd The "prog_id" string of the requested command.
   * @private
   */
  private _muteCommand( cmd: string ) : void {

    for ( let I = 0 ; I < this.conf.mute.length; I++ ) {
      if ( this.filter == false ) {
        if ( this.conf.mute[I].prog_id === cmd ) {
          this._insertIntoSendBuffer( this.conf.mute[I].command );
        }
      } else {
        if ( this.conf.mute[I].prog_id === cmd &&
             this.conf.mute[I].valid  === true ) {

          this._insertIntoSendBuffer( this.conf.mute[I].command );
        }
      }
    }
  }

  /**
   * Switch mute on.
   */
  public muteOn(): void {
    this._muteCommand( "mute_on" );
  }

  /**
   * Switch mute off
   */
  public muteOff() : void {
    this._muteCommand( "mute_off" );
  }

  /**
   * Get the current mute status from the AVR
   * @private
   */
  private _getAvrMuteStatus() : void {
    this._muteCommand( "mute_request" );
  }

  /**
   * Get the i18n current mute status.
   * @return {string} The i18n current mute status string
   */
  public getMutei18nStatus() : string {

    let retStr = "error.cmdnf";

    for ( let I = 0 ; I < this.conf.mute.length ; I++ ) {
      if ( this.muteStatus === this.conf.mute[I].command ) {
        retStr = this.conf.mute[I].i18n ;
        break;
      }
    }
    return retStr;
  }

  /**
   * Get the boolean mute status. (true => on, false => off).
   * @return {boolean} Mute status.
   */
  public getMuteOnOffState(): boolean {

    for ( let I = 0 ; I < this.conf.mute.length; I++ ) {
      if ( this.conf.mute[I].prog_id === "mute_on" ) {
        if ( this.conf.mute[I].command === this.muteStatus ) {
          return true;
        }
      }
    }
    return false;
  }

  /* ================================================================== */
  /* - InputSource methods                                                     */
  /* ================================================================== */

  /**
   * Find the command of the requested inputsource action
   * and send it to the AVR.
   * @param {string} cmd The "prog_id" string of the requested command.
   * @private
   */
  private _inputSourceCommand( cmd: string ) : void {

    for ( let I = 0 ; I < this.conf.inputsource.length; I++ ) {
      if ( this.filter == false ) {
        if ( this.conf.inputsource[I].prog_id === cmd ) {
          this._insertIntoSendBuffer( this.conf.inputsource[I].command );
        }
      } else {
        if ( this.conf.inputsource[I].prog_id === cmd &&
             this.conf.inputsource[I].valid  === true ) {

          this._insertIntoSendBuffer( this.conf.inputsource[I].command );
        }
      }
    }
  }

  /**
   * Get the supported input selection for the AVR type.
   * @return {string[]}  Array (i18n,command) of the supported sources.
   */
  public getValidInputSelection() : SelectionInfo[] {
    return this.selAr;
  }

  /**
   * Select given input Source.
   * @param {string} command_id The input source command.
   */
  public selectInputSource( command_id: string ) : void {
    this._inputSourceCommand( command_id );
  }

  /**
   * Select Phono as inputsource.
   */
  public selectInputSourcePhono() : void {
    this._inputSourceCommand( "i_phono");
  }

  /**
   * Select CD as input source.
   */
  public selectInputSourceCd() : void {
    this._inputSourceCommand( "i_cd" );
  }

  /**
   * Select DVD as input source.
   */
  public selectInputSourceDvd() : void {
    this._inputSourceCommand( "i_dvd" );
  }

  /**
   * Select Bluray as input source
   */
  public selectInputSourceBluray(): void {
    this._inputSourceCommand( "i_bd" );
  }

  /**
   * Select TV as input source
   */
  public selectInputSourceTv() : void {
    this._inputSourceCommand( "i_tv" );
  }

  /**
   * Select SAT/CBL as input source.
   */
  public selectInputSourceSatCbl() : void {
    this._inputSourceCommand( "i_sat_cbl" );
  }

  /**
   * Select SAT as input source.
   */
  public selectInputSourceSat() : void {
    this._inputSourceCommand( "i_sat" );
  }

  /**
   * Select MPlay as input source
   */
  public selectInputSourceMplay(): void {
    this._inputSourceCommand( "i_mplay" );
  }

  /**
   * Select VCR as input source.
   */
  public selectInputSourceVcr() : void {
    this._inputSourceCommand( "i_vcr" );
  }

  /**
   * Select GAME as input source
   */
  public selectInputSourceGame(): void {
    this._inputSourceCommand( "i_game" );
  }

  /**
   * Select V-AUX as input source
   */
  public selectInputSourceVaux(): void {
    this._inputSourceCommand( "i_vaux" );
  }

  /**
   * Select TUNER as input source
   */
  public selectInputSourceTuner() : void {
    this._inputSourceCommand( "i_tuner" );
  }

  /**
   * Select Spotify as input source.
   */
  public selectInputSourceSpotify() : void {
    this._inputSourceCommand( "i_spotify" );
  }

  /**
   * Select Napster as input source.
   */
  public selectInputSourceNapster() : void {
    this._inputSourceCommand( "i_napster" );
  }

  /**
   * Select FLICKR as input source.
   */
  public selectInputSourceFlickr() : void {
    this._inputSourceCommand( "i_flickr" );
  }

  /**
   * Select Internet Radio as input source.
   */
  public selectInputSourceIradio(): void {
    this._inputSourceCommand( "i_iradio" );
  }

  /**
   * Seletc Favorites aas input source.
   */
  public selectInputSourceFavorites(): void {
    this._inputSourceCommand( "i_favorites" );
  }

  /**
   * Select AUX1 as input source/
   */
  public selectInputSourceAux1() : void {
    this._inputSourceCommand( "i_aux1" );
  }

  /**
   * Select AUX2 as input source/
   */
  public selectInputSourceAux2() : void {
    this._inputSourceCommand( "i_aux2" );
  }

  /**
   * Select AUX3 as input source/
   */
  public selectInputSourceAux3() : void {
    this._inputSourceCommand( "i_aux3" );
  }

  /**
   * Select AUX4 as input source/
   */
  public selectInputSourceAux4() : void {
    this._inputSourceCommand( "i_aux4" );
  }

  /**
   * Select AUX5 as input source/
   */
  public selectInputSourceAux5() : void {
    this._inputSourceCommand( "i_aux5" );
  }

  /**
   * Select AUX6 as input source/
   */
  public selectInputSourceAux6() : void {
    this._inputSourceCommand( "i_aux6" );
  }

  /**
   * Select AUX7 as input source/
   */
  public selectInputSourceAux7() : void {
    this._inputSourceCommand( "i_aux7" );
  }

  /**
   * Select Net/USB as input source.
   */
  public selectInputSourceNetUsb(): void {
    this._inputSourceCommand( "i_net_usb" );
  }

  /**
   * Select NET as input source.
   */
  public selectInputSourceNet(): void {
    this._inputSourceCommand( "i_net" );
  }

  /**
   * Select Blutooth as input source.
   */
  public selectInputSourceBluetooth(): void {
    this._inputSourceCommand( "i_bt" );
  }

  /**
   * Select MXport as input source.
   */
  public selectInputSourceMxport(): void {
    this._inputSourceCommand( "i_mxport" );
  }

  /**
   * Select USB/IPOD as input source.
   */
  public selectInputSourceUsbIpod(): void {
    this._inputSourceCommand( "i_usb_ipod" );
  }

  /**
   * Get the current input source selection from the AVR.
   * @private
   */
  private _getAvrInputSourceSelection() : void {
    this._inputSourceCommand( "i_request" );
  }

  public getInputSourceI18n(): string  {

    let retStr = "error.cmdnf";

    for ( let I = 0 ; I < this.conf.inputsource.length; I++ ) {

      if ( this.inputSourceSelection === this.conf.inputsource[I].command ) {
        retStr = this.conf.inputsource[I].i18n;
        break;
      }
    }
    return retStr ;
  }

  /* ================================================================== */
  /* - Volume methods                                                   */
  /* ================================================================== */

  /**
   * Find the command of the requested volume action
   * and send it to the AVR.
   * @param {string} cmd The "prog_id" string of the requested command.
   * @private
   */
  private _volumeCommand( cmd: string, level: number ) : void {

    let levelStr = "";

    if ( level !== -1 ) {
      levelStr = level.toString();
    }

    for ( let I = 0 ; I < this.conf.volume.length; I++ ) {
      if ( this.filter == false ) {
        if ( this.conf.volume[I].prog_id === cmd ) {
          this._insertIntoSendBuffer( this.conf.volume[I].command + `${levelStr}`);
        }
      } else {
        if ( this.conf.volume[I].prog_id === cmd &&
             this.conf.volume[I].valid  === true ) {

          this._insertIntoSendBuffer( this.conf.volume[I].command + `${levelStr}` );
        }
      }
    }
  }

  /**
   * Increase volume
   */
  public volumeUp() : void {
    this._volumeCommand( "volume_up", -1 );
  }

  /**
   * Decrease volume.
   */
  public volumeDown() : void {
    this._volumeCommand( "volume_down", -1 );
  }

  /**
   * Set volume to 'level'.
   * @param {number} level New volume level.
   */
  public setVolume( level: number ): void {
    if ( level >= 0 && level < MAX_VOLUME ) {
      this._volumeCommand( "volume_set", level );
    }
  }

  /**
   * Get the current volume setting from the AVR
   * @private
   */
  private _getAvrVolumeStatus() : void {
    this._volumeCommand( "volume_request" , -1 );
  }

  /**
   * Get the current volume setting if known otherwise "_unknown_".
   * @return {string} The volume.
   */
  public getVolume(): string {
    this._d(`volume is ${this.volumeStatus}.`);

    let re = /^MV(\d+)/i ;

    let Ar = this.volumeStatus.match( re );

    if ( Ar !== null ) {
      return Ar[1];
    } else {
      return "_unknown_";
    }
  }

  /* ================================================================== */
  /* - Surround methods                                                 */
  /* ================================================================== */

  /**
   * Find the command of the requested surround action
   * and send it to the AVR.
   * @param {string} cmd The "prog_id" string of the requested command.
   * @private
   */
  private _surroundCommand( cmd: string ) : void {

    for ( let I = 0 ; I < this.conf.surround.length; I++ ) {
      if ( this.filter == false ) {
        if ( this.conf.surround[I].prog_id === cmd ) {
          this._insertIntoSendBuffer( this.conf.surround[I].command );
        }
      } else {
        if ( this.conf.surround[I].prog_id === cmd &&
             this.conf.surround[I].valid  === true ) {

          this._insertIntoSendBuffer( this.conf.surround[I].command );
        }
      }
    }
  }

  /**
   * Get the support surround commands for th AVR type.
   * @return {SelectionInfo[]} The supported surround command array.
   */
  public getValidSurround() : SelectionInfo[] {
    return this.surroundAr;
  }

  /**
   * Set surround mode to "command".
   * @param {string} command The diesired surround mode.
   */
  public setSurrroundCommand( command: string ) : void {
    this._surroundCommand( command );
  }

  /**
   * Set surround mode to "movies".
   */
  public setSurroundModeToMovies() : void {
    this._surroundCommand( "s_movie" );
  }

  /**
   * Set surround mode to "music".
   */
  public setSurroundModeToMusic() : void {
    this._surroundCommand( "s_music" );
  }

  /**
   * Set surround mode to 'game'.
   */
  public setSurroundModeToGame() : void {
    this._surroundCommand( "s_game" );
  }

  /**
   * Set surround mode to 'direct'.
   */
  public setSurroundModeToDirect() : void {
    this._surroundCommand( "s_direct" );
  }

  /**
   * Set surrond mode to 'pure-direct'.
   */
  public setSurroundModeToPureDirect(): void {
    this._surroundCommand( "s_pure" );
  }

  /**
   * Set surround mode to "stereo".
   */
  public setSurroundModeToStereo() : void {
    this._surroundCommand( "s_stereo" );
  }

  /**
   * Set surround mode to "auto".
   */
  public setSurroundModeToAuto() : void {
    this._surroundCommand( "s_auto" );
  }

  /**
   * Set surround mode to 'neural'.
   */
  public setSurroundModeToNeural() : void {
    this._surroundCommand( "s_neural" );
  }

  /**
   * Set surround mode  to "standard".
   */
  public setSurroundModeToStandard() : void {
    this._surroundCommand( "s_standard" );
  }

  /**
   * Set surround mode to 'dolby'.
   */
  public setSurroundModeToDolby() : void {
    this._surroundCommand( "s_dobly" );
  }

  /**
   * Set surround mode to "dts".
   */
  public setSurroundModeToDts() : void {
    this._surroundCommand( "s_dts" );
  }

  /**
   * Set surround mode to "multi channel stereo".
   */
  public setSurroundModeToMultiChannel(): void {
    this._surroundCommand( "s_mchstereo" );
  }

  /**
   * Set surround mode to "matrix".
   */
  public setSurroundModeToMatrix() : void {
    this._surroundCommand( "s_matrix" );
  }

  /**
   * Set surround mode to "virtual".
   */
  public setSurroundModeToVirtual() : void {
    this._surroundCommand( "s_virtual" );
  }

  /**
   * Set surround mode to "left".
   */
  public setSurroundModeToLeft(): void {
    this._surroundCommand( "s_left" );
  }

  /**
   * Set surround mode to 'right'.
   */
  public setSurroundModeToRight() : void {
    this._surroundCommand( "s_right" );
  }

  /**
   * Get the current surround mode from the AVR.
   * $private
   */
  private _getAvrSurroundMode() : void {
    this._surroundCommand( "s_request" );
  }

  /**
   * Get the i18n surround mode text.
   * @return {string} The i18n string.
   */
  public geti18nSurroundMode() : string {

    let retStr = "error.cmdnf";

    for ( let I = 0 ; I < this.conf.surround.length ; I++ ) {
      if ( this.surroundMode === this.conf.surround[I].command ) {
        retStr = this.conf.surround[I].i18n ;
        break;
      }
    }
    return retStr;
  }

  /* ================================================================== */
  /* - Eco methods                                                      */
  /* ================================================================== */

  /**
   * Find the command of the requested eco action
   * and send it to the AVR.
   * @param {string} cmd The "prog_id" string of the requested command.
   * @private
   */
  private _ecoCommand( cmd: string ) : void {

    for ( let I = 0 ; I < this.conf.eco.length; I++ ) {
      if ( this.filter == false ) {
        if ( this.conf.eco[I].prog_id === cmd ) {
          this._insertIntoSendBuffer( this.conf.eco[I].command );
        }
      } else {
        if ( this.conf.eco[I].prog_id === cmd &&
             this.conf.eco[I].valid  === true ) {

          this._insertIntoSendBuffer( this.conf.eco[I].command );
        }
      }
    }
  }

  /**
   * Get the supported eco modes of the AVR type.
   * @return {SelectionInfo[]} The supported eco command.
   */
  public getValidEcoModes(): SelectionInfo[] {
    return this.ecoAr;
  }

  /**
   * Send a eco command to the AVR.
   * @param {string} command The eco command
   */
  public sendEcoCommand( command: string ) : void {
    if ( command !== "ECO_NOT_SUPPORTED" ) {
      this._ecoCommand( command );
    } else {
      this._d(`Eco is not supported for this type.`);
    }
  }

  /**
   * Check if this type supports eco commands (true=> yes, false=> no)
   * @return {boolean} The eco support status.
   */
  public hasEco() : boolean {
    if ( this.conf.eco[0].valid === true ) {
      return true;
    } else {
      return false;
    }
  }

  /**
   * Switch eco mode on.
   */
  public ecoOn() : void {
    if ( this.hasEco() === true ) {
      this._ecoCommand( "eco_on" );
    }
  }

  /**
   * Switch eco mode off.
   */
  public ecoOff() : void {
    if ( this.hasEco() === true ) {
      this._ecoCommand( "eco_off" );
    }
  }

  /**
   * Switch eco mode to auto.
   */
  public ecoAuto() : void {
    if ( this.hasEco() === true ) {
      this._ecoCommand( "eco_auto" );
    }
  }

  /**
   * Get the current eco Mode from the AVR.
   */
  private _getAvrEcoStatus() : void {
    if ( this.hasEco() === true ) {
      this._ecoCommand( "eco_request" );
    }
  }

  public geti18nEcoMode() : string {

    let retStr = "error.cmdnf";

    for ( let I = 0 ; I < this.conf.eco.length; I++ ) {

      if ( this.ecoStatus === this.conf.eco[I].command ) {
        retStr = this.conf.eco[I].i18n;
        break;
      }
    }

    return retStr;
  }
}

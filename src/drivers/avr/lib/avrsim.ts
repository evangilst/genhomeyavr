"use strict";
/* ================================================================== */
/* = Note:                                                          = */
/* = This is a generated javascript file.                           = */
/* = Don't edit the javascript file directly or change might be     = */
/* = lost with the next build.                                      = */
/* = Edit the typescipt file instead and re-generate the javascript = */
/* = file.                                                          = */
/* ================================================================== */

import * as net   from "net";

let IPPORT = 2222;

class AvrSim {

  port:       number;

  powerStatus:    string;
  mzpowerStatus:  string;
  muteStatus:     string;
  inputSel:       string;
  volumeStatus:   number;
  surroundMode:   string;
  ecoMode:        string;

  socket:         net.Socket;

  constructor( sPort: number ) {

    this.port               = sPort;

    this.powerStatus        = "PWSTANDBY";
    this.mzpowerStatus      = "ZMOFF";
    this.muteStatus         = "MUOFF";
    this.inputSel           = "SICD",
    this.volumeStatus       = 45;
    this.surroundMode       = "MSAUTO";
    this.ecoMode            = "ECCON";

    this.socket             = null;
  }

  public connect(): void {
    let server = net.createServer( (socket) => {
      this.socket = socket;
      console.log("Server started.");

      this.socket
        .on( "data" , (data: Buffer) => {
          this._processData( data );
        })
        .on( "error", (err) => {
          console.error(`${err}.`);
        });
    });

    server.listen( this.port, (): void => {
      console.log(`Server listening on ${this.port}.`);
    });
  }

  public close() {
    this.socket.destroy();
  }

  private _processData( data: Buffer ): void {

    let xData = data.toString().replace("\r", "");

    let dateStr = new Date().toISOString();
    console.log( `${dateStr} Received: '${xData}'.`);

    switch ( xData.substr(0,2) ) {

      case "PW":
        /* =================================================== */
        /* = Main power                                      = */
        /* =================================================== */
        if ( xData !== "PW?" ) {
          this.powerStatus = xData ;
        }
        console.log(`Returning: '${this.powerStatus}'.`);
        this.socket.write( `${this.powerStatus}\r`);
        break;

      case "ZM" :
        /* =================================================== */
        /* = Main zone power                                 = */
        /* =================================================== */
        if ( xData !== "ZM?" ) {
          this.mzpowerStatus = xData ;
        }
        console.log(`Returning: '${this.mzpowerStatus}'.`);
        this.socket.write( `${this.mzpowerStatus}\r`);
        break;

      case "MU":
        /* =================================================== */
        /* = Mute                                            = */
        /* =================================================== */
        if ( xData !== "PW?" ) {
          this.muteStatus = xData ;
        }
        console.log(`Returning: '${this.muteStatus}'.`);
        this.socket.write( `${this.muteStatus}\r`);
        break;

      case "SI":
        /* =================================================== */
        /* = inputSource selection                           = */
        /* =================================================== */
        if ( xData !== "SI?" ) {
          this.inputSel = xData ;
        }
        console.log(`Returning: '${this.inputSel}'.`);
        this.socket.write( `${this.inputSel}\r`);
        break;

      case "MS":
        /* =================================================== */
        /* = surround mode                                   = */
        /* =================================================== */
        if ( xData !== "MS?" ) {
          this.surroundMode = xData ;
        }
        console.log(`Returning: '${this.surroundMode}'.`);
        this.socket.write( `${this.surroundMode}\r`);
        break;

      case "EC":
        /* =================================================== */
        /* = eco mode                                        = */
        /* =================================================== */
        if ( xData !== "ECO?" ) {
          this.ecoMode = xData ;
        }
        console.log(`Returning: '${this.ecoMode}'.`);
        this.socket.write( `${this.ecoMode}\r`);
        break;

      case "MV":
        /* =================================================== */
        /* = Volume                                          = */
        /* =================================================== */

        let re = /^MV(\d+)/i;

        if ( xData === "MVUP" ) {
          this.volumeStatus++ ;
        } else if ( xData === "MVDOWN" ) {
          this.volumeStatus-- ;
        } else {
          let Ar = xData.match( re );

          if ( Ar !== null ) {
            this.volumeStatus = Number(Ar[1]);
          }
        }
        console.log( `Returning: MV${this.volumeStatus}.`);
        this.socket.write( `MV${this.volumeStatus}\r`);
        break;
    }
  }
}

let avrSimulator = new AvrSim( IPPORT );

avrSimulator.connect();

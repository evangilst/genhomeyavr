/**
 * AVRSIM
 *     a basic AVR simulator to test the fucntionality of the homeyavr program
 *     without a 'real' AVR.
 */
"use strict";

let IPPORT = 2222;

let net = require("net");

/**
 * class AvrSim
 */
class AvrSim {

    /**
     * Create a new instance of AvrSim.
     *
     * @param      {number}  sPort   The internet port to be use for listening.
     */
    constructor( sPort ) {

        this.port   = sPort;
        this.socket = null;

        this.powerstatus   = "PWSTANDBY";
        this.mzpowerstatus = "ZMOFF";
        this.mute          = "MUOFF";
        this.inputsel      = "SICD";
        this.volumestatus  = 45;
        this.surroundMode  = "MSAUTO";
        this.ecoMode       = "ECOON";
    }

    /**
     * Start up the specific listeners.
     */
    connect() {
        net.createServer ( (socket) => {
            this.socket = socket;

            socket
                .on( "listening", () => {
                    console.log(`AvrSim is listening on port ${this.port}.`);
                })

                .on( "data" , (data) => {
                    this.processData( data );
                })

                .on( "error" , (err) => {
                    console.log(`Error: ${err}.`);
                });
        }).listen( this.port );
    }

    /**
     * Stop listening.
     */
    close() {
        this.socket.destroy();
    }

    /**
     * Process the received data and return the appropriated response.
     *
     * @param      {buffer}  data    The received data
     */
    processData( data ) {
        let xData = String(data);

        xData = xData.replace("\r", "");

        let date = new Date();
        let dateStr = date.toISOString();
        console.log(`${dateStr} Received : '${xData}'.`);

        if ( xData.substr(0,2) === "PW") {
            if ( xData !== "PW?" ) {
                this.powerstatus = xData ;
            }
            console.log(`Returning : ${this.powerstatus}.`);
            this.socket.write( this.powerstatus);

        } else if ( xData.substr(0,2) === "ZM") {

            if ( xData !== "ZM?" ) {
                this.mzpowerstatus = xData ;
            }
            console.log(`Returning : ${this.mzpowerstatus}.`);
            this.socket.write( this.mzpowerstatus);

        } else if ( xData.substr(0,2) === "MU") {

            if ( xData !== "MU?" ) {
                this.mute = xData ;
            }
            console.log(`Returning : ${this.mute}.`);
            this.socket.write( this.mute);

        } else if ( xData.substr(0,2) === "SI") {

            if ( xData !== "SI?" ) {
                this.inputsel = xData ;
            }
            console.log(`Returning : ${this.inputsel}.`);
            this.socket.write( this.inputsel);

        } else if ( xData.substr(0,2) === "MV") {

            let re = /^MV(\d+)/i;

            if ( xData === "MVUP" ) {
                this.volumestatus++;

            } else if ( xData === "MVDOWN") {
                this.volumestatus--;

            } else {

                let Ar = xData.match(re);

                if ( Ar !== null ) {
                    this.volumestatus = Ar[1];
                    console.log(`Returning: MV${this.volumestatus}.`);
                }
            }
            console.log(`Returning : MV${this.volumestatus}.`);
            this.socket.write( "MV" + this.volumestatus );
        } else if ( xData.substr(0,2) === "MS") {

            if ( xData !== "MS?" ) {
                this.surroundMode = xData ;
            }
            console.log(`Returning : ${this.surroundMode}.`);
            this.socket.write( this.surroundMode);
        } else if ( xData.substr(0,2) === "EC") {

            if ( xData !== "ECO?" ) {
                this.ecoMode = xData ;
            }
            console.log(`Returning : ${this.ecoMode }.`);
            this.socket.write( this.ecoMode );
        }
    }
}

let avrSim = new AvrSim( IPPORT );

avrSim.connect();

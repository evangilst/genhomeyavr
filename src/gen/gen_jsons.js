"use strict";

/**
 * GEN-JSONS
 *
 *     program to generate the AVR type json files from 1 single source (avrcodes.xlsx).
 *     Generation result will be in .../test/conf and need to be copied to the correct place.
 */

var XLSX = require("excel");
var fs   = require("fs");

XLSX("./avrcodes.xlsx", function(err, data) {

    var avrName = [];

    var rowAr = [];

    rowAr = data[0];

    for ( var col = 5; col < data[0].length; col++ ) {

        var power = [];
        var mpower = [];
        var volume = [];
        var mute = [];
        var input = [];
        var eco = [];
        var surround = [];

        rowAr = data[0];

        var avrname = rowAr[col];

        for ( var row = 1 ; row < data.length; row++ ) {

            var workRow = data[row];

            var group   = workRow[0];

            var valid = false;
            if ( workRow[col] === "X" ) {
                valid = true;
            }

            var x = {};
            x.prog_id = workRow[2];
            x.valid   = valid;
            x.command = workRow[1];
            x.text    = workRow[4];
            x.i18n    = workRow[3] || "";

            if ( group === "power" ) {
                power.push(x);
            } else if ( group === "main_zone_power" ) {
                mpower.push(x);
            } else if ( group === "volume" ) {
                volume.push(x);
            } else if ( group === "mute" ) {
                mute.push(x);
            } else if ( group === "inputsource" ) {
                input.push(x);
            } else if ( group === "eco") {
                eco.push(x);
            } else if ( group === "surround") {
                surround.push(x);
            } else {
                console.log("Unknown group : '", group, "'.");
            }
        }

        var y = { "power" : power, "main_zone_power": mpower , "volume": volume,
                   "mute": mute , "inputsource": input, "eco": eco,
                   "surround": surround};

        var outputFile = "./conf/" + avrname + ".json";

        fs.writeFile( outputFile, JSON.stringify(y, null, 4), function(err) {
            if (err) {
                console.log( err );
            } else {
                console.log("Saved : " + outputFile );
            }
        });
    }



    for( var I = 4 ; I < rowAr.length ; I++ ) {
        avrName[I] = rowAr[I];
    }

});

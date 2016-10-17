# HomeyAvr

Application to connect Homey to a marantz AVR.

Working:
* power commands for the AVR and main zone.
  - On
  - Off
* mute commands:
  - On
  - Off
* Volume commands:
  - Up
  - Down
  - Set (volume between 0 and 80)
* Eco mode (if AVR supported).
  - On
  - Off
  - Auto
* Input source selection:
  - All but selection is limited to the supported source of the selected type.
* Surround mode selection:
  - All but selection is limited to the supported source of the selected type.

* Trigger:
  - power
  - mute
  - eco


Marantz AVR supported :<br />
av8802, av8801, av7702, av7701, av7005,
sr7010, sr7009, sr7008, sr7007, sr7005,
sr6010, sr6009, sr6008, sr6007, sr6006, sr6005,
sr5010, sr5009, sr5008, sr5006, sr5005,
nr1606, nr1605, nr1604, nr1603, nr1602,
nr1505, nr1504


* All selection strings and messages are using the "locale/<LANG>.json" files.

Application updates the internal status of the AVR constantly, even if the command
is given by a different application or by remote control, as long there is a
network connection to the AVR and the AVR is transmitting the changes.

<strong>Note</strong>:
<em>This is a generated homey application.
Don't edit the files directly but edit the source files and re-generate.</em><br />
Source: https://github.com/evgilst/genhomeyavr  

---
### Version 2.0.0
Converted to typescript.

---
### Version 1.0.0
(babel generated)

Not working:
* Save settings.
  0.8.39 does not closed the settings window after save-settings and
  the changed values are not saved by Homey.
  Program will change the running parameters but after a restart the old values will be
  supplied by Homey and used.

To do:
* Use capabilities in the web interface as example light.
  Currently there are no capabilities defined (yet??) for the 'other' class.
  Changing the class to 'light' will give the on/off capability in the web interface.

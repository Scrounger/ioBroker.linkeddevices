<h1>
	<img src="admin/linkeddevices.png" width="32"/>
	ioBroker.linkeddevices
</h1>

[![NPM version](http://img.shields.io/npm/v/iobroker.linkeddevices.svg)](https://www.npmjs.com/package/iobroker.linkeddevices)
[![Downloads](https://img.shields.io/npm/dm/iobroker.linkeddevices.svg)](https://www.npmjs.com/package/iobroker.linkeddevices)
[![Number of Installations](http://iobroker.live/badges/linkeddevices-installed.svg)](https://www.npmjs.com/package/iobroker.linkeddevices)
[![Dependency Status](https://img.shields.io/david/Scrounger/iobroker.linkeddevices.svg)](https://david-dm.org/Scrounger/iobroker.linkeddevices)
[![Known Vulnerabilities](https://snyk.io/test/github/Scrounger/ioBroker.linkeddevices/badge.svg)](https://snyk.io/test/github/Scrounger/ioBroker.linkeddevices)

[![NPM](https://nodei.co/npm/iobroker.linkeddevices.png?downloads=true)](https://nodei.co/npm/iobroker.linkeddevices/)

**Tests:**: [![Travis-CI](http://img.shields.io/travis/Scrounger/ioBroker.linkeddevices/master.svg)](https://travis-ci.org/Scrounger/ioBroker.linkeddevices)

## linkeddevices adapter for ioBroker
[![paypal](https://www.paypalobjects.com/en_US/i/btn/btn_donateCC_LG.gif)](https://www.paypal.com/cgi-bin/webscr?cmd=_s-xclick&hosted_button_id=YHPPW474N5CKQ&source=url)

Create linked objects (datapoints) of your devices with a self-defined structure. This makes it possible to create a structure in ioBroker, where all objects are centralized, e.g. to be used in the vis or scripts. This offers the advantage, for example, that in a hardware exchange, only the linked objects must be recreated and all vis and scripts work again.

With the adapter you can convert objects or convert them to other types (not yet fully implemented).

<img src="screenshots/structure.png?sanitize=true&raw=true" title="Beispiel für selbst definierte Struktur"/>

This adapter is inspired at [virtual devices script by Pman](https://forum.iobroker.net/topic/7751/virtual-devices).

# Objekt (Datenpunkt) verlinken
Ein Objekt (Datenpunkt) kannst du über den Button 'Einstellungen' im Menü 'Objekt' erstellen.

<img src="screenshots/object_tree_custom_button.png?sanitize=true&raw=true" title="Menü 'Objekt'"/>

## Objekt (Datenpunkt) Einstellungen
<img src="screenshots/custom_dialog.png?sanitize=true&raw=true" title="Objekt Einstellungen"/>

Die folgenden Grundeinstellungen müssen für das verlinkte Objekt vorgenommen werden:

|  Eingabefeld | Beschreibung  |
|---|---|
| Aktiviert | ein Verlinkung für das Objekt aktivieren |
| Präfix für ID des verlinkten Objektes | Bezeichung die der Id des verlinkten Objektes vorangestellt werden soll |
| ID des verlinkten Objekts | Id des verlinkten Objektes |
| Zusammengesetze Id des verlinkten Objektes | Zeigt an wie die Id des verlinkten Objektes aussehen wird - Zusammensetzung von *'Präfix für ID des verlinkten Objektes' & 'ID des verlinkten Objekts'* |

Weiter könnt ihr noch folgende Einstellungen vornehmen:

|  Eingabefeld | Beschreibung  |
|---|---|
| Name des verlinkten Objekts | Hier könnt ihr einen Namen für das verlinkte Objekte festlegen |
| Experteneinstellungen für verlinktes Objekt vom Typ 'X' | weitere Einstellungen die abhängig vom Typ des Objektes sind. ([Zusätzliche Informationen hierzu findest du weiter unten](https://github.com/Scrounger/ioBroker.linkeddevices/blob/master/README.md#experteneinstellungen-f%C3%BCr-verlinktes-objekt-vom-typ-x)) <ul><li>[Zahl readonly](https://github.com/Scrounger/ioBroker.linkeddevices/blob/master/README.md#experteneinstellungen-f%C3%BCr-verlinktes-objekt-vom-typ-zahl-readonly)</li><li>[Zahl](https://github.com/Scrounger/ioBroker.linkeddevices/blob/master/README.md#experteneinstellungen-f%C3%BCr-verlinktes-objekt-vom-typ-zahl)</li></ul> |

**Beispiel:** Die oben im Screenshot dargestellten Eingaben erzeugen das folgende verlinkte Objekt:
<img src="screenshots/example_create_linkedObject.png?sanitize=true&raw=true" title="Objekt Einstellungen"/>

## Experteneinstellungen für verlinktes Objekt vom Typ 'X'
Abhängig vom Typ (Zahl, Logigwert, Zeichenkette, etc.) des zu verlinkenden Objektes, könnt Ihr weitere Einstellungen, wie z.B. Umrechnungen oder Umwandlungen in einen anderen Typ für das verlinkte Objekt einstellen.

### Experteneinstellungen für verlinktes Objekt vom Typ 'Zahl' readonly
<img src="screenshots/expert_settings_number_readonly.png?sanitize=true&raw=true" title="Objekt Einstellungen"/>

#### 'Zahl' readonly: Konvertiere in Typ 'nicht umwandeln'
<img src="screenshots/expert_settings_number_readonly_no_conversion.png?sanitize=true&raw=true" title="Objekt Einstellungen"/>

|  Eingabefeld | Beschreibung  | erlaubte Eingabe | Beispiel (siehe Bild) |
|---|---|---|---|
| Ändere Einheit 'X' in | Einheit für das verlinkte Objekt festlegen | keine Beschränkung | Objekt hat Einheit 'kWh', verlinktes Objekt hat Einheit 'Wh' |
| max. Anzahl der Nachkommastellen | max. Anzahl der Nachkommastellen für das verlinkte Objekt festlegen | Zahlen | Wert des Objekts '100.561' ergibt für das verlinkte Objekt den Wert '101' |
| Ändere min 'X' in | minimaler Wert der das verlinkte Objekt annehmen darf | Zahlen | - |
| Ändere max 'X' auf | maximaler Wert der das verlinkte Objekt annehmen darf | Zahlen | - |
| Umrechnung für verlinktes 'read' Objekt | mathematische Umrechnung des Wertes des Objektes | _+ - / *,. ()_ & *Zahlen* | Wert des Objektes '279688.9' mit Umrechnung '/1000' zeigt beim verlinkten Objekt den Wert '280.6889' an |

#### 'Zahl' readonly: Konvertiere in Typ 'Logikwert'
<img src="screenshots/expert_settings_number_readonly_convert_to_boolean.png?sanitize=true&raw=true" title="Objekt Einstellungen"/>

|  Eingabefeld | Beschreibung  | erlaubte Eingabe | Beispiel (siehe Bild) |
|---|---|---|---|
| Bedingung 'true' für verlinktes Objekt | Wert des Objektes, für den das verlinkte Objekt auf 'true' gesetzt werden soll | *= != > < >= <=* + *Zahlen* | Für Werte '>100' des Objekt ist das verlinkte Objekt 'true' |

### Experteneinstellungen für verlinktes Objekt vom Typ 'Zahl'

#### 'Zahl': Konvertiere in Typ 'nicht umwandeln'
<img src="screenshots/expert_settings_number_no_conversion.png?sanitize=true&raw=true" title="Objekt Einstellungen"/>

|  Eingabefeld | Beschreibung  | erlaubte Eingabe | Beispiel (siehe Bild) |
|---|---|---|---|
| Ändere Einheit 'X' in | Einheit für das verlinkte Objekt festlegen | keine Beschränkung | Objekt hat keine Einheit, verlinktes Objekt hat Einheit '%' |
| max. Anzahl der Nachkommastellen | max. Anzahl der Nachkommastellen für das verlinkte Objekt festlegen | Zahlen | Wert des Objekts '100.561' ergibt für das verlinkte Objekt den Wert '101' |
| Ändere min 'X' in | minimaler Wert der das verlinkte Objekt annehmen darf | Zahlen | - |
| Ändere max 'X' auf | maximaler Wert der das verlinkte Objekt annehmen darf | Zahlen | - |
| Umrechnung für verlinktes Objekt | mathematische Umrechnung des Wertes des Objektes | _/ *,._ & *Zahlen* | Wert des Objektes '180' mit Umrechnung '*100/255' zeigt beim verlinkten Objekt den Wert '71' an. Umgekehrt wird der Kehrwert bei der Berechnung gebildet, d.h. wenn das verlinte Objekt den Wert '71' hat, hat das Objekt den Wert '180'. Das kann z.B. für Hue Lampen verwendet werden, um den Wertebereich von '0-255' in '0%-100%' umzuwandeln |

## Changelog

### 0.2.1
* (Scrounger) boolean to string converter added
* (Scrounger) bug fixes

### 0.2.0
* (Scrounger) number to boolean converter added
* (Scrounger) number expert settings for min, max added
* (Scrounger) bug fixes

### 0.1.5
* (Scrounger) expert settings properties renamed -> you must recreate your expert settings for all parent objects !!!
* (Scrounger) custom dialog prepared for convert to other type
* (Scrounger) bug fixes

### 0.1.0
* (Scrounger) custom dialog layout changed
* (Scrounger) conversion bug fixes
* (Scrounger) change unit bug fixes

### 0.0.4
* (Scrounger) main function added
* (Scrounger) change unit for linked objects
* (Scrounger) set number of decimal places for linked objects
* (Scrounger) set conversion for read only linked objects

### 0.0.1
* (Scrounger) initial release

## License
MIT License

Copyright (c) 2019 Scrounger

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
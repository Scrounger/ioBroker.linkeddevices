# ioBroker linkeddevices adapter


## Link the object (data point)
An object can be created via the `Settings` button in the `Object` menu.

> This button is only visible with history adapter installed!

![Strukture](media/object_tree_custom_button.png)

## Object (data point) settings
![Strukture](media/custom_dialog.PNG)

The following basic settings must be made for the linked object:


|  input box | describtion  |
|---|---|
| enabled | die Verlinkung für das Objekt aktivieren |
| prefix for id of linked object | Bezeichung die der ID des verlinkten Objektes vorangestellt werden soll |
| id of linked object | ID des verlinkten Objektes |
| composite id of linked object | Zeigt an wie die Id des verlinkten Objektes aussehen wird - Zusammensetzung von *Präfix für ID des verlinkten Objektes* & *ID des verlinkten Objekts*

Weiterhin sind noch folgende Einstellungen möglich:

|  input box | describtion  |
|---|---|
| name of linked object | Hier kann ein Name für das verlinkte Objekte festlegt werden |
| expert settings for linked object with type X | weitere Einstellungen die abhängig vom Objekttyp sind. ([Zusätzliche Informationen hierzu weiter unten](#experteneinstellungen-für-verlinktes-objekt-vom-typ-x)) <ul><li>[number (readonly)](#experteneinstellungen-für-verlinktes-objekt-vom-typ-zahl-readonly)</li><li>[number](#experteneinstellungen-für-verlinktes-objekt-vom-typ-zahl)</li></ul> |



**Example:** Die oben im Screenshot dargestellten Eingaben erzeugen
das folgende verlinkte Objekt:

![Strukture](media/example_create_linkedObject.PNG)

## expert settings for linked object with type X

Abhängig vom Typ (Zahl, Logigwert, Zeichenkette, etc.) des zu verlinkenden
Objektes, können weitere Einstellungen, wie z.B. Umrechnungen oder
Umwandlungen in einen anderen Typ für das verlinkte Objekt eingestellt
werden.

### expert settings for linked object with type 'number (readonly)'
![Strukture](media/expert_settings_number_readonly.PNG)

#### number (readonly): do not convert
![Strukture](media/expert_settings_number_readonly_no_conversion.PNG)

|  input box | describtion  | allowed input | example (see picture) |
|---|---|---|---|
| change unit '%' to | Einheit für das verlinkte Objekt festlegen | keine Beschränkung | Objekt hat Einheit 'kWh', verlinktes Objekt hat Einheit 'Wh' |
| max. number of decimal places | max. Anzahl der Nachkommastellen für das verlinkte Objekt festlegen | numbers | Wert des Objekts '100.561' ergibt für das verlinkte Objekt den Wert '101' |
| change min '0' to | minimaler Wert der das verlinkte Objekt annehmen darf | numbers | - |
| change max '100' to | maximaler Wert der das verlinkte Objekt annehmen darf | numbers | - |
| calculation for 'read' object | mathematische Umrechnung des Wertes des Objektes | _+ - / *,. ()_ & *numbers* | Wert des Objektes '279688.9' mit Umrechnung '/1000' zeigt beim verlinkten Objekt den Wert '280.6889' an |

#### number (readonly): condition 'true' for linked object
![Strukture](media/expert_settings_number_readonly_convert_to_boolean.PNG)

|  input box | describtion  | allowed input | example (see picture) |
|---|---|---|---|
| value if linked object is 'true' | Wert des Objektes, für den das verlinkte Objekt auf 'true' gesetzt werden soll | *= != > < >= <=* + *numbers* | Für Werte '>100' des Objekt ist das verlinkte Objekt 'true' |

### expert settings for linked object with type 'number'

#### number: concert to type do not convert
![Strukture](media/expert_settings_number_no_conversion.PNG)


|  input box | describtion  | allowed input | example (see picture) |
|---|---|---|---|
| change unit '%' to | Einheit für das verlinkte Objekt festlegen | keine Beschränkung | Objekt hat keine Einheit, verlinktes Objekt hat Einheit '%' |
| max. number of decimal places | max. Anzahl der Nachkommastellen für das verlinkte Objekt festlegen | numbers | Wert des Objekts '100.561' ergibt für das verlinkte Objekt den Wert '101' |
| change min '0' to | minimaler Wert der das verlinkte Objekt annehmen darf | numbers | - |
| change max '100' to | maximaler Wert der das verlinkte Objekt annehmen darf | numbers | - |
| calculation for linked object | mathematische Umrechnung des Wertes des Objektes | _/ *,._ & *numbers* | Wert des Objektes '180' mit Umrechnung '*100/255' zeigt beim verlinkten Objekt den Wert '71' an. Umgekehrt wird der Kehrwert bei der Berechnung gebildet, d.h. wenn das verlinte Objekt den Wert '71' hat, hat das Objekt den Wert '180'. Das kann z.B. für Hue Lampen verwendet werden, um den Wertebereich von '0-255' in '0%-100%' umzuwandeln |

#### number: convert to type boolean
![Strukture](media/expert_settings_number_convert_to_boolean.PNG)

|  input box | describtion  | allowed input | example (see picture) |
|---|---|---|---|
| condition 'true' for linked object | Wert des Objektes, für den das verlinkte Objekt auf 'true' gesetzt werden soll | *= != > < >= <=* + *numbers* | Für Werte '>30' des Objekt ist das verlinkte Objekt 'true' |
| value if linked object is 'true' | Wert des Objektes wenn das verlinkte Objekt 'true' ist | numbers | Wird das verlinkte Objekt auf 'true' gesetzt, wird der Wert des Objektes '30' |
| value if linked object is 'false' | Wert des Objektes wenn das verlinkte Objekt 'false' ist | numbers | Wird das verlinkte Objekt auf 'false' gesetzt, wird der Wert des Objektes '10' |


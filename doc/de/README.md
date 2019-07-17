# ioBroker linkeddevices adapter

!> Achtung, Seite befindet sich noch in Bearbeitung

Create linked objects (datapoints) of your devices with a self-defined structure. This makes it possible to create a structure in ioBroker, where all objects are centralized, e.g. to be used in the vis or scripts. This offers the advantage, for example, that in a hardware exchange, only the linked objects must be recreated and all vis and scripts work again.

With the adapter you can convert objects or convert them to other types (not yet fully implemented).

<img src="screenshots/structure.png?sanitize=true&raw=true" title="Beispiel f�r selbst definierte Struktur"/>

This adapter is inspired at [virtual devices script by Pman](https://forum.iobroker.net/topic/7751/virtual-devices).

# Objekt (Datenpunkt) verlinken
Ein Objekt (Datenpunkt) kannst du �ber den Button 'Einstellungen' im Men� 'Objekt' erstellen.

<img src="screenshots/object_tree_custom_button.png?sanitize=true&raw=true" title="Men� 'Objekt'"/>

## Objekt (Datenpunkt) Einstellungen
<img src="screenshots/custom_dialog.png?sanitize=true&raw=true" title="Objekt Einstellungen"/>

Die folgenden Grundeinstellungen m�ssen f�r das verlinkte Objekt vorgenommen werden:

|  Eingabefeld | Beschreibung  |
|---|---|
| Aktiviert | ein Verlinkung f�r das Objekt aktivieren |
| Pr�fix f�r ID des verlinkten Objektes | Bezeichung die der Id des verlinkten Objektes vorangestellt werden soll |
| ID des verlinkten Objekts | Id des verlinkten Objektes |
| Zusammengesetze Id des verlinkten Objektes | Zeigt an wie die Id des verlinkten Objektes aussehen wird - Zusammensetzung von *'Pr�fix f�r ID des verlinkten Objektes' & 'ID des verlinkten Objekts'* |

Weiter k�nnt ihr noch folgende Einstellungen vornehmen:

|  Eingabefeld | Beschreibung  |
|---|---|
| Name des verlinkten Objekts | Hier k�nnt ihr einen Namen f�r das verlinkte Objekte festlegen |
| Experteneinstellungen f�r verlinktes Objekt vom Typ 'X' | weitere Einstellungen die abh�ngig vom Typ des Objektes sind. ([Zus�tzliche Informationen hierzu findest du weiter unten](https://github.com/Scrounger/ioBroker.linkeddevices/blob/master/README.md#experteneinstellungen-f%C3%BCr-verlinktes-objekt-vom-typ-x)) <ul><li>[Zahl (readonly)](https://github.com/Scrounger/ioBroker.linkeddevices/blob/master/README.md#experteneinstellungen-f%C3%BCr-verlinktes-objekt-vom-typ-zahl-readonly)</li><li>[Zahl](https://github.com/Scrounger/ioBroker.linkeddevices/blob/master/README.md#experteneinstellungen-f%C3%BCr-verlinktes-objekt-vom-typ-zahl)</li></ul> |

**Beispiel:** Die oben im Screenshot dargestellten Eingaben erzeugen das folgende verlinkte Objekt:
<img src="screenshots/example_create_linkedObject.png?sanitize=true&raw=true" title="Objekt Einstellungen"/>

## Experteneinstellungen f�r verlinktes Objekt vom Typ 'X'
Abh�ngig vom Typ (Zahl, Logigwert, Zeichenkette, etc.) des zu verlinkenden Objektes, k�nnt Ihr weitere Einstellungen, wie z.B. Umrechnungen oder Umwandlungen in einen anderen Typ f�r das verlinkte Objekt einstellen.

### Experteneinstellungen f�r verlinktes Objekt vom Typ 'Zahl (readonly)'
<img src="screenshots/expert_settings_number_readonly.png?sanitize=true&raw=true" title="Objekt Einstellungen"/>

#### 'Zahl (readonly)': Konvertiere in Typ 'nicht umwandeln'
<img src="screenshots/expert_settings_number_readonly_no_conversion.png?sanitize=true&raw=true" title="Objekt Einstellungen"/>

|  Eingabefeld | Beschreibung  | erlaubte Eingabe | Beispiel (siehe Bild) |
|---|---|---|---|
| �ndere Einheit 'X' in | Einheit f�r das verlinkte Objekt festlegen | keine Beschr�nkung | Objekt hat Einheit 'kWh', verlinktes Objekt hat Einheit 'Wh' |
| max. Anzahl der Nachkommastellen | max. Anzahl der Nachkommastellen f�r das verlinkte Objekt festlegen | Zahlen | Wert des Objekts '100.561' ergibt f�r das verlinkte Objekt den Wert '101' |
| �ndere min 'X' in | minimaler Wert der das verlinkte Objekt annehmen darf | Zahlen | - |
| �ndere max 'X' auf | maximaler Wert der das verlinkte Objekt annehmen darf | Zahlen | - |
| Umrechnung f�r verlinktes 'read' Objekt | mathematische Umrechnung des Wertes des Objektes | _+ - / *,. ()_ & *Zahlen* | Wert des Objektes '279688.9' mit Umrechnung '/1000' zeigt beim verlinkten Objekt den Wert '280.6889' an |

#### 'Zahl (readonly)': Konvertiere in Typ 'Logikwert'
<img src="screenshots/expert_settings_number_readonly_convert_to_boolean.png?sanitize=true&raw=true" title="Objekt Einstellungen"/>

|  Eingabefeld | Beschreibung  | erlaubte Eingabe | Beispiel (siehe Bild) |
|---|---|---|---|
| Bedingung 'true' f�r verlinktes Objekt | Wert des Objektes, f�r den das verlinkte Objekt auf 'true' gesetzt werden soll | *= != > < >= <=* + *Zahlen* | F�r Werte '>100' des Objekt ist das verlinkte Objekt 'true' |

### Experteneinstellungen f�r verlinktes Objekt vom Typ 'Zahl'

#### 'Zahl': Konvertiere in Typ 'nicht umwandeln'
<img src="screenshots/expert_settings_number_no_conversion.png?sanitize=true&raw=true" title="Objekt Einstellungen"/>

|  Eingabefeld | Beschreibung  | erlaubte Eingabe | Beispiel (siehe Bild) |
|---|---|---|---|
| �ndere Einheit 'X' in | Einheit f�r das verlinkte Objekt festlegen | keine Beschr�nkung | Objekt hat keine Einheit, verlinktes Objekt hat Einheit '%' |
| max. Anzahl der Nachkommastellen | max. Anzahl der Nachkommastellen f�r das verlinkte Objekt festlegen | Zahlen | Wert des Objekts '100.561' ergibt f�r das verlinkte Objekt den Wert '101' |
| �ndere min 'X' in | minimaler Wert der das verlinkte Objekt annehmen darf | Zahlen | - |
| �ndere max 'X' auf | maximaler Wert der das verlinkte Objekt annehmen darf | Zahlen | - |
| Umrechnung f�r verlinktes Objekt | mathematische Umrechnung des Wertes des Objektes | _/ *,._ & *Zahlen* | Wert des Objektes '180' mit Umrechnung '*100/255' zeigt beim verlinkten Objekt den Wert '71' an. Umgekehrt wird der Kehrwert bei der Berechnung gebildet, d.h. wenn das verlinte Objekt den Wert '71' hat, hat das Objekt den Wert '180'. Das kann z.B. f�r Hue Lampen verwendet werden, um den Wertebereich von '0-255' in '0%-100%' umzuwandeln |

#### 'Zahl': Konvertiere in Typ 'Logikwert'
<img src="screenshots/expert_settings_number_convert_to_boolean.png?sanitize=true&raw=true" title="Objekt Einstellungen"/>

|  Eingabefeld | Beschreibung  | erlaubte Eingabe | Beispiel (siehe Bild) |
|---|---|---|---|
| Bedingung 'true' f�r verlinktes Objekt | Wert des Objektes, f�r den das verlinkte Objekt auf 'true' gesetzt werden soll | *= != > < >= <=* + *Zahlen* | F�r Werte '>30' des Objekt ist das verlinkte Objekt 'true' |
| Wert wenn verlinktes Objekt 'true' ist | Wert des Objektes wenn das verlinkte Objekt 'true' ist | Zahlen | Wird das verlinkte Objekt auf 'true' gesetzt, wird der Wert des Objektes '30' |
| Wert wenn verlinktes Objekt 'false' ist | Wert des Objektes wenn das verlinkte Objekt 'false' ist | Zahlen | Wird das verlinkte Objekt auf 'false' gesetzt, wird der Wert des Objektes '10' |


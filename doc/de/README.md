# ioBroker linkeddevices adapter


Mit diesem Adapter ist es möglich eigene Objekte (Datenpunkte) von
Geräten in einer selbst definierten Struktur zu erstellen.
Durch die zentralisierte Darstellung an einem Ort können die Objekte
einfach z.B. in Vis oder Skripten verwendet werden. Weiterhin müssen
z.B. bei einem Hardwareaustausch nur die verknüpften Objekte neu erstellt
werden, alle VIS Views und Skripte funktionieren sofort wieder.

Außerdem können mit dem Adapter Objekte in andere Typen konvertiert
werden (noch nicht vollständig implementiert).

![Strukture](media/structure.png)

Dieser Adapter ist inspiriert durch das [Virtual Devices Skript von Pman](https://forum.iobroker.net/topic/7751/virtual-devices).

## Objekt (Datenpunkt) verlinken
Ein Objekt (Datenpunkt) kann über den Button `Einstellungen` im Menü
`Objekt` erstellt werden.

> Dieser Button ist nur sichtbar mit installiertem History Adapter!

![Strukture](media/object_tree_custom_button.png)

## Objekt (Datenpunkt) Einstellungen
![Strukture](media/custom_dialog.png)

Die folgenden Grundeinstellungen müssen für das verlinkte Objekt
vorgenommen werden:


|  Eingabefeld | Beschreibung  |
|---|---|
| Aktiviert | die Verlinkung für das Objekt aktivieren |
| Präfix für ID des verlinkten Objektes | Bezeichung die der ID des verlinkten Objektes vorangestellt werden soll |
| ID des verlinkten Objekts | ID des verlinkten Objektes |
| Zusammengesetze ID des verlinkten Objektes | Zeigt an wie die Id des verlinkten Objektes aussehen wird - Zusammensetzung von *Präfix für ID des verlinkten Objektes* & *ID des verlinkten Objekts*

Weiterhin sind noch folgende Einstellungen möglich:

|  Eingabefeld | Beschreibung  |
|---|---|
| Name des verlinkten Objekts | Hier kann ein Name für das verlinkte Objekte festlegt werden |
| Experteneinstellungen für verlinktes Objekt vom Typ 'X' | weitere Einstellungen die abhängig vom Objekttyp sind. ([Zusätzliche Informationen hierzu weiter unten](#experteneinstellungen-für-verlinktes-objekt-vom-typ-x)) <ul><li>[Zahl (readonly)](#experteneinstellungen-für-verlinktes-objekt-vom-typ-zahl-readonly)</li><li>[Zahl](#experteneinstellungen-für-verlinktes-objekt-vom-typ-zahl)</li></ul> |



**Beispiel:** Die oben im Screenshot dargestellten Eingaben erzeugen
das folgende verlinkte Objekt:

![Strukture](media/example_create_linkedObject.png)

## Experteneinstellungen für verlinktes Objekt vom Typ X

Abhängig vom Typ (Zahl, Logikwert, Zeichenkette, etc.) des zu verlinkenden
Objektes, können weitere Einstellungen, wie z.B. Umrechnungen oder
Umwandlungen in einen anderen Typ für das verlinkte Objekt eingestellt
werden.

### Experteneinstellungen für verlinktes Objekt vom Typ 'Zahl (readonly)'
![Strukture](media/expert_settings_number_readonly.png)

#### Zahl (readonly): Konvertiere in Typ 'nicht umwandeln'
![Strukture](media/expert_settings_number_readonly_no_conversion.png)

|  Eingabefeld | Beschreibung  | erlaubte Eingabe | Beispiel (siehe Bild) |
|---|---|---|---|
| Ändere Einheit 'X' in | Einheit für das verlinkte Objekt festlegen | keine Beschränkung | Objekt hat Einheit 'kWh', verlinktes Objekt hat Einheit 'Wh' |
| max. Anzahl der Nachkommastellen | max. Anzahl der Nachkommastellen für das verlinkte Objekt festlegen | Zahlen | Wert des Objekts '100.561' ergibt für das verlinkte Objekt den Wert '101' |
| Ändere min 'X' in | minimaler Wert der das verlinkte Objekt annehmen darf | Zahlen | - |
| Ändere max 'X' auf | maximaler Wert der das verlinkte Objekt annehmen darf | Zahlen | - |
| Umrechnung für verlinktes 'read' Objekt | mathematische Umrechnung des Wertes des Objektes | _+ - / *,. ()_ & *Zahlen* | Wert des Objektes '279688.9' mit Umrechnung '/1000' zeigt beim verlinkten Objekt den Wert '280.6889' an |

#### Zahl (readonly): Konvertiere in Typ 'Logikwert'
![Strukture](media/expert_settings_number_readonly_convert_to_boolean.png)

|  Eingabefeld | Beschreibung  | erlaubte Eingabe | Beispiel (siehe Bild) |
|---|---|---|---|
| Bedingung 'true' für verlinktes Objekt | Wert des Objektes, für den das verlinkte Objekt auf 'true' gesetzt werden soll | *= != > < >= <=* + *Zahlen* | Für Werte '>100' des Objekt ist das verlinkte Objekt 'true' |

#### Zahl (readonly): Konvertiere in Typ 'Dauer'
Zur Info der Typ 'Dauer' ist eine 'Zeichenkette'
![Strukture](media/expert_settings_number_convert_to_duration.png)

|  Eingabefeld | Beschreibung  | erlaubte Eingabe | Beispiel (siehe Bild) |
|---|---|---|---|
| Umrechnung in Sekunden | Zur Berechnung der Dauer muss der Wert in Sekunden vorliegen. Liegt der Wert z.B. in Millisekunden vor, so müsst ihr '/1000' eintragen. Wenn er z.B. in Stunden vorliegt, dann müsst ihr '/3600' eintragen | _/ *_ & *Zahlen* | - |
| Anzeigeformat der Dauer | Hier könnt ihr die Formatierung für die Dauer festlegen | [siehe moment duration format library Doku](https://github.com/jsmreese/moment-duration-format#template-string) | 'y[J] d[T] hh[h] mm[m]' zeigt beim verlinkten Objekt den Wert '1J 11T 00h 24m' an, sofern ioBroker Sprache auf Deutsch eingestellt ist |

#### Zahl (readonly): Konvertiere in Typ 'Datum / Uhrzeit'
![Strukture](media/expert_settings_number_convert_to_datetime.png)

|  Eingabefeld | Beschreibung  | erlaubte Eingabe | Beispiel (siehe Bild) |
|---|---|---|---|
| Umrechung in Unixzeit (Sekunden) | Zur Berechnung von Datum und oder Uhrzeit muss der Wert in der (Unixzeit)[https://de.wikipedia.org/wiki/Unixzeit] vorliegen. Liegt der Wert z.B. in Millisekunden vor, so müsst ihr '/1000' eintragen. Wenn er z.B. in Stunden vorliegt, dann müsst ihr '/3600' eintragen | _/ *_ & *Zahlen* | - |
| Anzeigeformat der Datum / Uhrzeit | Hier könnt ihr die Formatierung für das Datum und oder Uhrzeit festlegen | [siehe moment library Doku](https://momentjs.com/docs/#/parsing/string-format/) | 'LLL' zeigt beim verlinkten Objekt den Wert '26. Juli 2019 22:01' an, sofern ioBroker Sprache auf Deutsch eingestellt ist |


### Experteneinstellungen für verlinktes Objekt vom Typ 'Zahl'

#### Zahl: Konvertiere in Typ 'nicht umwandeln'
![Strukture](media/expert_settings_number_no_conversion.png)


|  Eingabefeld | Beschreibung  | erlaubte Eingabe | Beispiel (siehe Bild) |
|---|---|---|---|
| Ändere Einheit 'X' in | Einheit für das verlinkte Objekt festlegen | keine Beschränkung | Objekt hat keine Einheit, verlinktes Objekt hat Einheit '%' |
| max. Anzahl der Nachkommastellen | max. Anzahl der Nachkommastellen für das verlinkte Objekt festlegen | Zahlen | Wert des Objekts '100.561' ergibt für das verlinkte Objekt den Wert '101' |
| Ändere min 'X' in | minimaler Wert der das verlinkte Objekt annehmen darf | Zahlen | - |
| Ändere max 'X' auf | maximaler Wert der das verlinkte Objekt annehmen darf | Zahlen | - |
| Umrechnung für verlinktes Objekt | mathematische Umrechnung des Wertes des Objektes | _/ *,._ & *Zahlen* | Wert des Objektes '180' mit Umrechnung '*100/255' zeigt beim verlinkten Objekt den Wert '71' an. Umgekehrt wird der Kehrwert bei der Berechnung gebildet, d.h. wenn das verlinkte Objekt den Wert '71' hat, hat das Objekt den Wert '180'. Das kann z.B. für Hue Lampen verwendet werden, um den Wertebereich von '0-255' in '0%-100%' umzuwandeln |

#### Zahl: Konvertiere in Typ 'Logikwert'
![Strukture](media/expert_settings_number_convert_to_boolean.png)

|  Eingabefeld | Beschreibung  | erlaubte Eingabe | Beispiel (siehe Bild) |
|---|---|---|---|
| Bedingung 'true' für verlinktes Objekt | Wert des Objektes, für den das verlinkte Objekt auf 'true' gesetzt werden soll | *= != > < >= <=* + *Zahlen* | Für Werte '>30' des Objekt ist das verlinkte Objekt 'true' |
| Wert wenn verlinktes Objekt 'true' ist | Wert des Objektes wenn das verlinkte Objekt 'true' ist | Zahlen | Wird das verlinkte Objekt auf 'true' gesetzt, wird der Wert des Objektes '30' |
| Wert wenn verlinktes Objekt 'false' ist | Wert des Objektes wenn das verlinkte Objekt 'false' ist | Zahlen | Wird das verlinkte Objekt auf 'false' gesetzt, wird der Wert des Objektes '10' |

### Experteneinstellungen für verlinktes Objekt vom Typ 'Zeichenkette'
![Strukture](media/expert_settings_string.png)

#### Zeichenkette: Konvertiere in Typ 'nicht umwandeln'
![Strukture](media/expert_settings_string_no_conversion.png)

|  Eingabefeld | Beschreibung  | erlaubte Eingabe | Beispiel (siehe Bild) |
|---|---|---|---|

### Experteneinstellungen für verlinktes Objekt vom Typ 'Logikwert'
![Strukture](media/expert_settings_boolean.png)

#### Logikwert: Konvertiere in Typ 'Zeichenkette'
![Strukture](media/expert_settings_boolean_convert_to_string.png)

|  Eingabefeld | Beschreibung  | erlaubte Eingabe | Beispiel (siehe Bild) |
|---|---|---|---|

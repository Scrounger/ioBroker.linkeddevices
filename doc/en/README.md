# ioBroker linkeddevices adapter


## Link the object (data point)
An object can be created via the `Settings` button in the `Object` menu.

> This button is only visible with history adapter installed!

![Strukture](media/object_tree_custom_button.png)

## Object (data point) Einstellungen
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

Abhängig vom Typ (Zahl, Logigwert, Zeichenkette, etc.) des zu verlinkenden
Objektes, können weitere Einstellungen, wie z.B. Umrechnungen oder
Umwandlungen in einen anderen Typ für das verlinkte Objekt eingestellt
werden.

### Experteneinstellungen für verlinktes Objekt vom Typ 'Zahl (readonly)'
![Strukture](media/expert_settings_number_readonly.png)

#### Zahl (readonly): Konvertiere in Typ nicht umwandeln
![Strukture](media/expert_settings_number_readonly_no_conversion.png)

|  Eingabefeld | Beschreibung  | erlaubte Eingabe | Beispiel (siehe Bild) |
|---|---|---|---|
| Ändere Einheit 'X' in | Einheit für das verlinkte Objekt festlegen | keine Beschränkung | Objekt hat Einheit 'kWh', verlinktes Objekt hat Einheit 'Wh' |
| max. Anzahl der Nachkommastellen | max. Anzahl der Nachkommastellen für das verlinkte Objekt festlegen | Zahlen | Wert des Objekts '100.561' ergibt für das verlinkte Objekt den Wert '101' |
| Ändere min 'X' in | minimaler Wert der das verlinkte Objekt annehmen darf | Zahlen | - |
| Ändere max 'X' auf | maximaler Wert der das verlinkte Objekt annehmen darf | Zahlen | - |
| Umrechnung für verlinktes 'read' Objekt | mathematische Umrechnung des Wertes des Objektes | _+ - / *,. ()_ & *Zahlen* | Wert des Objektes '279688.9' mit Umrechnung '/1000' zeigt beim verlinkten Objekt den Wert '280.6889' an |

#### Zahl (readonly): Konvertiere in Typ Logikwert
![Strukture](media/expert_settings_number_readonly_convert_to_boolean.png)

|  Eingabefeld | Beschreibung  | erlaubte Eingabe | Beispiel (siehe Bild) |
|---|---|---|---|
| Bedingung 'true' für verlinktes Objekt | Wert des Objektes, für den das verlinkte Objekt auf 'true' gesetzt werden soll | *= != > < >= <=* + *Zahlen* | Für Werte '>100' des Objekt ist das verlinkte Objekt 'true' |

### Experteneinstellungen für verlinktes Objekt vom Typ 'Zahl'

#### Zahl: Konvertiere in Typ nicht umwandeln
![Strukture](media/expert_settings_number_no_conversion.png)


|  Eingabefeld | Beschreibung  | erlaubte Eingabe | Beispiel (siehe Bild) |
|---|---|---|---|
| Ändere Einheit 'X' in | Einheit für das verlinkte Objekt festlegen | keine Beschränkung | Objekt hat keine Einheit, verlinktes Objekt hat Einheit '%' |
| max. Anzahl der Nachkommastellen | max. Anzahl der Nachkommastellen für das verlinkte Objekt festlegen | Zahlen | Wert des Objekts '100.561' ergibt für das verlinkte Objekt den Wert '101' |
| Ändere min 'X' in | minimaler Wert der das verlinkte Objekt annehmen darf | Zahlen | - |
| Ändere max 'X' auf | maximaler Wert der das verlinkte Objekt annehmen darf | Zahlen | - |
| Umrechnung für verlinktes Objekt | mathematische Umrechnung des Wertes des Objektes | _/ *,._ & *Zahlen* | Wert des Objektes '180' mit Umrechnung '*100/255' zeigt beim verlinkten Objekt den Wert '71' an. Umgekehrt wird der Kehrwert bei der Berechnung gebildet, d.h. wenn das verlinte Objekt den Wert '71' hat, hat das Objekt den Wert '180'. Das kann z.B. für Hue Lampen verwendet werden, um den Wertebereich von '0-255' in '0%-100%' umzuwandeln |

#### Zahl: Konvertiere in Typ Logikwert
![Strukture](media/expert_settings_number_convert_to_boolean.png)

|  Eingabefeld | Beschreibung  | erlaubte Eingabe | Beispiel (siehe Bild) |
|---|---|---|---|
| Bedingung 'true' für verlinktes Objekt | Wert des Objektes, für den das verlinkte Objekt auf 'true' gesetzt werden soll | *= != > < >= <=* + *Zahlen* | Für Werte '>30' des Objekt ist das verlinkte Objekt 'true' |
| Wert wenn verlinktes Objekt 'true' ist | Wert des Objektes wenn das verlinkte Objekt 'true' ist | Zahlen | Wird das verlinkte Objekt auf 'true' gesetzt, wird der Wert des Objektes '30' |
| Wert wenn verlinktes Objekt 'false' ist | Wert des Objektes wenn das verlinkte Objekt 'false' ist | Zahlen | Wird das verlinkte Objekt auf 'false' gesetzt, wird der Wert des Objektes '10' |


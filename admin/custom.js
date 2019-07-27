// $.get("adapter/linkeddevices/words.js", function (script) {
// 	let translation = script.substring(script.indexOf('{'), script.length);
// 	translation = translation.substring(0, translation.lastIndexOf(';'));
// 	$.extend(systemDictionary, JSON.parse(translation));
// });

$.get({
    url: 'adapter/linkeddevices/words.js',
    success: function (result) {
        if (result.isOk) {
            let translation = script.substring(script.indexOf('{'), script.length);
            translation = translation.substring(0, translation.lastIndexOf(';'));
            $.extend(systemDictionary, translation);
        }
    },
    async: false
})

// There are two ways how to predefine default settings:
// - with attribute "data-default" (content independent)
// - with function in global variable "defaults". Function name is equal with adapter name.
//   as input function receives object with all information concerning it

// Objekt holen für das der custom Dialog geöffnet wurde 
var currentObj = gMain.objects[gMain.navigateGetParams()];

if (typeof defaults !== 'undefined') {
    defaults.linkeddevices = function (obj, instanceObj) {
        return {
            enabled: false,
            number_unit: obj.common.number_unit
        };
    }
}

if (typeof customPostInits !== 'undefined') {
    customPostInits.linkeddevices = function ($div, values, instanceObj, type, role) {

        $.get("adapter/linkeddevices/words.js", function (script) {
            let translation = script.substring(script.indexOf('{'), script.length);
            translation = translation.substring(0, translation.lastIndexOf(';'));
            $.extend(systemDictionary, JSON.parse(translation));
        });

        var ComboBox = {};
        var Group = {};
        var Input = {};
        var Select = {};
        var Label = {};

        // vars die sich verändern können und für conditions benötigt werden
        var isCustomEnabled = false;
        if (values["enabled"]) isCustomEnabled = values["enabled"];

        var expertSettingsActivated = false;
        if (values["expertSettings"]) expertSettingsActivated = values["expertSettings"];

        var selectedNumberConverter = "";
        if (values["number_convertTo"]) selectedNumberConverter = values["number_convertTo"];

        var selectedBooleanConverter = "";
        if (values["boolean_convertTo"]) selectedBooleanConverter = values["boolean_convertTo"];

        var selectedStringConverter = "";
        if (values["string_convertTo"]) selectedStringConverter = values["string_convertTo"];

        // $div.find('input[id="test"]').val(JSON.stringify(currentObj));
        //$div.find('input[id="test"]').val(Object.keys(gMain));

        $div.find('input[id="test"]').val(gMain.systemConfig.common.language);

        $div.ready(function () {
            //$div.find('.view_Number').hide();
            // Event Document ready -> hier kann select disabled = 'true' gesetzt werden, da sonst options weg sind bzw. enabled nicht geht
            //$div.find('.view_Number_Converter').find('*').prop('disabled', true);

        });

        // Divs in vars packen
        initialize_Divs();

        if (values["isLinked"] != undefined) {
            // Custom Dialog für LinkedObject
            initialize_LinkedObject();

        } else {
            // Custom Dialog für ParentObject
            initialize_ParentObject();

            // EventHandler
            events_ParentObject();

            // ExpertSettings initialisieren
            initialize_ExpertSettings();
        }

        //#region Initialize
        function initialize_Divs() {
            // alle ComboBoxen in vars packen
            ComboBox.enabled = $div.find('input[data-field="enabled"]');
            ComboBox.expertSettings = $div.find('input[data-field="expertSettings"]');
            ComboBox.isLinked = $div.find('input[id="CB_isLinked"]');

            // alle groups in vars packen			
            Group.linkedObject = $div.find('.linkedObject_view');
            Group.parentObject = $div.find('.parentObject_view');
            Group.expertSettings = $div.find('.view_expertSettings');

            // Group: type 'number'
            Group.Number = $div.find('.view_Number');
            Group.Number_Converter_None = $div.find('.view_Number_Converter_None');
            Group.Number_Converter_Boolean = $div.find('.view_Number_Converter_Boolean');
            Group.Number_Converter_Boolean_notReadOnly = $div.find('.view_Number_Converter_Boolean_notReadOnly');
            Group.Number_Conversion = $div.find('.view_Number_conversion');
            Group.Number_Conversion_ReadOnly = $div.find('.view_Number_conversion_readOnly');
            Group.Number_Converter_String = $div.find('.view_Number_Converter_String');
            Group.Number_Converter_String_Duration = $div.find('.view_Number_Converter_String_Duration');
            Group.Number_Converter_String_DateTime = $div.find('.view_Number_Converter_String_DateTime');
            Group.Number_Converter_Multi = $div.find('.view_Number_Converter_Multi');

            // Group: type 'boolean'
            Group.Boolean = $div.find('.view_Boolean');
            Group.Boolean_Converter_String = $div.find('.view_Boolean_Converter_String');

            // Group: type 'string'
            Group.String = $div.find('.view_String');
            Group.String_Converter_None = $div.find('.view_String_Converter_None');


            // alle input in vars packen
            Input.parentId = $div.find('input[id="IN_parentId"]');
            Input.stateId = $div.find('input[id="IN_stateId"]');
            Input.prefixId = $div.find('input[id="IN_prefixId"]');
            Input.linkedId = $div.find('input[data-field="linkedId"]');

            // Input: type 'number'
            Input.number_maxDecimal = $div.find('input[data-field="number_maxDecimal"]');
            Input.number_max = $div.find('input[data-field="number_max"]');
            Input.number_min = $div.find('input[data-field="number_min"]');
            Input.number_calculation = $div.find('input[data-field="number_calculation"]');
            Input.number_calculation_readOnly = $div.find('input[data-field="number_calculation_readOnly"]');
            Input.number_to_multi_condition = $div.find('input[data-field="number_to_multi_condition"]');
            Input.number_to_boolean_condition = $div.find('input[data-field="number_to_boolean_condition"]');
            Input.number_to_boolean_value_true = $div.find('input[data-field="number_to_boolean_value_true"]');
            Input.number_to_boolean_value_false = $div.find('input[data-field="number_to_boolean_value_false"]');
            Input.number_to_string_condition = $div.find('input[data-field="number_to_string_condition"]');
            Input.number_to_duration_convert_seconds = $div.find('input[data-field="number_to_duration_convert_seconds"]');
            Input.number_to_duration_format = $div.find('input[data-field="number_to_duration_format"]');
            Input.number_to_datetime_convert_seconds = $div.find('input[data-field="number_to_datetime_convert_seconds"]');
            Input.number_to_datetime_format = $div.find('input[data-field="number_to_datetime_format"]');

            // Input: type 'boolean'
            Input.boolean_to_string_value_true = $div.find('input[data-field="boolean_to_string_value_true"]');
            Input.boolean_to_string_value_false = $div.find('input[data-field="boolean_to_string_value_false"]');

            // Input: type 'string'
            Input.string_prefix = $div.find('input[data-field="string_prefix"]');
            Input.string_suffix = $div.find('input[data-field="string_suffix"]');


            // alle select in var packen
            Select.number_convertTo = $div.find('select[data-field="number_convertTo"]');
            Select.boolean_convertTo = $div.find('select[data-field="boolean_convertTo"]');
            Select.string_convertTo = $div.find('select[data-field="string_convertTo"]');

            // alle label / span in var packen
            Label.expertSettings = $div.find('span[id="SP_expertSettings"]');
            Label.number_unit = $div.find('label[id="LB_number_unit"]');
            Label.number_max = $div.find('label[id="LB_number_max"]');
            Label.number_min = $div.find('label[id="LB_number_min"]');
        }

        function initialize_LinkedObject() {
            // Custom Dialog für LinkedObject: Views initialisieren
            Group.linkedObject.show();
            Group.parentObject.hide();

            // Checkbox Wert setzen
            ComboBox.isLinked.prop('checked', values["isLinked"]);
            // parentId anzeigen
            Input.parentId.val(values["parentId"]);
        }

        function initialize_ParentObject() {
            // Custom Dialog für ParentObject: Views initialisieren
            Group.parentObject.show();
            Group.linkedObject.hide();

            if (values["linkedId"]) {
                // ParentObject ist verlinkt
                var linkedId = values["linkedId"];

                // linkedId aufteilen in prefix & stateId
                if (values["linkedId"].indexOf(".") > 0) {
                    Input.stateId.val(linkedId.substring(linkedId.lastIndexOf(".") + 1, linkedId.length));
                    Input.prefixId.val(linkedId.substring(0, linkedId.lastIndexOf(".")));
                } else {
                    Input.stateId.val(linkedId);
                }
            } else if (currentObj && currentObj._id) {
                // ParentObject ist noch nicht verlinkt
                var objId = currentObj._id;

                // stateId des ParentObjects holen
                Input.stateId.val(objId.substring(objId.lastIndexOf(".") + 1, objId.length));
                Input.linkedId.val(objId.substring(objId.lastIndexOf(".") + 1, objId.length));
            }
        }

        function initialize_ExpertSettings() {
            if (isCustomEnabled && (type === 'number' || type === 'string' || type === 'boolean')) {
                // Experteneinstellungen anzeigen, sofern für type vorhanden
                Group.expertSettings.show();

                if (type === 'number' && currentObj.common.write === false) {
                    Label.expertSettings.text(_("expert settings for linked object with type '%s'", _(currentObj.common.type) + " (read only)"));
                } else {
                    Label.expertSettings.text(_("expert settings for linked object with type '%s'", _(currentObj.common.type)));

                    // selector: Konvertierung entfernen, die nur bei read only möglich sind 
                    Select.number_convertTo.find('option[value="duration"]').remove();
                    Select.number_convertTo.find('option[value="datetime"]').remove();
                }

                // Views initalisieren
                initialize_ExpertSettings_Number();
                initialize_ExpertSettings_Boolean();
                initialize_ExpertSettings_String();

                // EventHandler für alle ExpertSettings
                events_ExpertSettings();

            } else {
                Group.expertSettings.hide();
            }
        }

        function initialize_ExpertSettings_String() {
            // ExpertSettings für type 'string' initialisieren	
            // wenn expertSettings aktiviert sind und typ = string -> Eingabefelder anzeigen

            if (type === 'string' && expertSettingsActivated) {
                Group.String.show();


                // Event Handler für ExpertSettings mit type 'string'
                events_ExpertSettings_String();

            } else {
                // Ausblenden und alle Eingaben löschen
                Group.String.hide();
                Group.String.find("input, select").val("");
            }
        }

        function initialize_ExpertSettings_Number() {
            // ExpertSettings für type 'number' initialisieren				

            // wenn expertSettings aktiviert sind und typ = number -> Eingabefelder anzeigen
            if (type === 'number' && expertSettingsActivated) {
                Group.Number.show();

                Label.number_unit.text(_("change unit '%s' to", currentObj.common.unit));
                Label.number_max.text(_("change max '%s' to", currentObj.common.max));
                Label.number_min.text(_("change min '%s' to", currentObj.common.min));

                // Prüfen ob Typ Konverter ausgewählt ist
                if (selectedNumberConverter === "") {
                    Group.Number_Converter_None.show();

                    // Number ist read only
                    if (currentObj.common.read === true && currentObj.common.write === false) {
                        Group.Number_Conversion_ReadOnly.show();
                        Group.Number_Conversion.hide();
                    } else {
                        Group.Number_Conversion.show();
                        Group.Number_Conversion_ReadOnly.hide();
                    }

                    Group.Number_Converter_Boolean.hide();
                    Group.Number_Converter_Boolean.find("input").val("");
                    Group.Number_Converter_String.hide()
                    Group.Number_Converter_String.find("input").val("");
                    Group.Number_Converter_String_Duration.hide()
                    Group.Number_Converter_String_Duration.find("input").val("");
                    Group.Number_Converter_String_DateTime.hide();
                    Group.Number_Converter_String_DateTime.find("input").val("");
                    Group.Number_Converter_Multi.hide()
                    Group.Number_Converter_Multi.find("input").val("");
                } else if (selectedNumberConverter === "boolean") {
                    Group.Number_Converter_Boolean.show();

                    // Number ist read only
                    if (currentObj.common.read === true && currentObj.common.write === false) {
                        Group.Number_Converter_Boolean_notReadOnly.hide();
                    } else {
                        Group.Number_Converter_Boolean_notReadOnly.show();
                    }

                    Group.Number_Converter_None.hide();
                    Group.Number_Converter_None.find("input").val("");
                    Group.Number_Converter_String.hide()
                    Group.Number_Converter_String.find("input").val("");
                    Group.Number_Converter_String_Duration.hide()
                    Group.Number_Converter_String_Duration.find("input").val("");
                    Group.Number_Converter_String_DateTime.hide();
                    Group.Number_Converter_String_DateTime.find("input").val("");
                    Group.Number_Converter_Multi.hide()
                    Group.Number_Converter_Multi.find("input").val("");

                } else if (selectedNumberConverter === "string") {
                    Group.Number_Converter_String.show()

                    Group.Number_Converter_None.hide();
                    Group.Number_Converter_None.find("input").val("");
                    Group.Number_Converter_Boolean.hide();
                    Group.Number_Converter_Boolean.find("input").val("");
                    Group.Number_Converter_Multi.hide()
                    Group.Number_Converter_Multi.find("input").val("");
                    Group.Number_Converter_String_Duration.hide()
                    Group.Number_Converter_String_Duration.find("input").val("");
                    Group.Number_Converter_String_DateTime.hide();
                    Group.Number_Converter_String_DateTime.find("input").val("");

                } else if (selectedNumberConverter === "multi") {
                    Group.Number_Converter_Multi.show()

                    Group.Number_Converter_None.hide();
                    Group.Number_Converter_None.find("input").val("");
                    Group.Number_Converter_Boolean.hide();
                    Group.Number_Converter_Boolean.find("input").val("");
                    Group.Number_Converter_String.hide()
                    Group.Number_Converter_String.find("input").val("");
                    Group.Number_Converter_String_Duration.hide()
                    Group.Number_Converter_String_Duration.find("input").val("");
                    Group.Number_Converter_String_DateTime.hide();
                    Group.Number_Converter_String_DateTime.find("input").val("");

                } else if (selectedNumberConverter === "duration" && currentObj.common.read === true && currentObj.common.write === false) {
                    Group.Number_Converter_String_Duration.show()

                    if (Input.number_to_duration_format.val() == "") {
                        Input.number_to_duration_format.val("dd[T] hh[h] mm[m]");
                    }

                    Group.Number_Converter_None.hide();
                    Group.Number_Converter_None.find("input").val("");
                    Group.Number_Converter_Boolean.hide();
                    Group.Number_Converter_Boolean.find("input").val("");
                    Group.Number_Converter_String.hide()
                    Group.Number_Converter_String.find("input").val("");
                    Group.Number_Converter_String_DateTime.hide();
                    Group.Number_Converter_String_DateTime.find("input").val("");
                    Group.Number_Converter_Multi.hide()
                    Group.Number_Converter_Multi.find("input").val("");
                } else if (selectedNumberConverter === "datetime" && currentObj.common.read === true && currentObj.common.write === false) {
                    Group.Number_Converter_String_DateTime.show()

                    if (Input.number_to_datetime_format.val() == "") {
                        Input.number_to_datetime_format.val("LLL");
                    }

                    Group.Number_Converter_None.hide();
                    Group.Number_Converter_None.find("input").val("");
                    Group.Number_Converter_Boolean.hide();
                    Group.Number_Converter_Boolean.find("input").val("");
                    Group.Number_Converter_String.hide()
                    Group.Number_Converter_String.find("input").val("");
                    Group.Number_Converter_String_Duration.hide()
                    Group.Number_Converter_String_Duration.find("input").val("");
                    Group.Number_Converter_Multi.hide()
                    Group.Number_Converter_Multi.find("input").val("");
                }

                // Event Handler für ExpertSettings mit type 'number'
                events_ExpertSettings_Number();

            } else {
                // Ausblenden und alle Eingaben löschen
                Group.Number.hide();
                Group.Number.find("input, select").val("");
            }
        }

        function initialize_ExpertSettings_Boolean() {
            // ExpertSettings für type 'boolean' initialisieren				

            // wenn expertSettings aktiviert sind und typ = boolean -> Eingabefelder anzeigen
            if (type === 'boolean' && expertSettingsActivated) {
                Group.Boolean.show();

                // Prüfen ob Typ Konverter ausgewählt ist
                if (selectedBooleanConverter === "") {
                    Group.Boolean_Converter_String.hide();
                    Group.Boolean_Converter_String.find("input").val("");

                } else if (selectedBooleanConverter === "string") {
                    Group.Boolean_Converter_String.show();
                }

                // Event Handler für ExpertSettings mit type 'boolean'
                events_ExpertSettings_Boolean();

            } else {
                // Ausblenden und alle Eingaben löschen
                Group.Boolean.hide();
                Group.Boolean.find("input, select").val("");
            }
        }

        //#endregion

        //#region Events
        function events_ParentObject() {
            ComboBox.enabled.on('change', function () {
                // var checked = $(this).prop('checked');
                isCustomEnabled = this.checked;
                initialize_ExpertSettings();
            });

            Input.prefixId.on('input', function () {
                // Bei Eingabe 'linkedId' zusammensetzen und prüfen auf erlaubte Zeichen
                let notAllowedSigns = /[*?"'\[\]]/;

                if (this.value.length > 0 && notAllowedSigns.test(this.value)) {
                    // prüfen auf zulässige Zeichen
                    this.value = this.value.replace(notAllowedSigns, '');
                    gMain.showError(_("not allowed chars for Id"));
                } else {
                    // 'linkedId' zusammensetzen
                    let prefixId = Input.prefixId.val();
                    let stateId = Input.stateId.val();

                    if (prefixId) {
                        Input.linkedId.val((prefixId + "." + stateId).replace("..", "."));
                    } else {
                        Input.linkedId.val(stateId);
                    }
                }
            });

            Input.stateId.on('input', function () {
                // Bei Eingabe 'linkedId' zusammensetzen und prüfen auf erlaubte Zeichen
                let notAllowedSigns = /[*?"'\[\]]/;

                if (this.value.length > 0 && notAllowedSigns.test(this.value)) {
                    // prüfen auf zulässige Zeichen
                    this.value = this.value.replace(notAllowedSigns, '');
                    gMain.showError(_("not allowed chars for Id"));
                } else {
                    // Bei Eingabe 'linkedId' zusammensetzen und prüfen auf erlaubte Zeichen
                    let prefixId = Input.prefixId.val();
                    let stateId = Input.stateId.val();

                    if (prefixId) {
                        Input.linkedId.val((prefixId + "." + stateId).replace("..", "."));
                    } else {
                        Input.linkedId.val(stateId);
                    }
                }
            });
        }

        function events_ExpertSettings() {
            // Event für CheckBox ExpertSettings
            ComboBox.expertSettings.on('change', function () {
                // var checked = $(this).prop('checked');
                expertSettingsActivated = this.checked;

                initialize_ExpertSettings_Number();
                initialize_ExpertSettings_Boolean();
                initialize_ExpertSettings_String();
            });
        }

        function events_ExpertSettings_Number() {
            // Anzahl Nachkommastellen - Eingabe prüfen
            Input.number_maxDecimal.keyup(function () {
                // Nur Nummern zulassen
                let allowedSigns = /[^0-9]/;

                if (allowedSigns.test(this.value)) {
                    gMain.showError(_("only numbers allowed"));
                }
                this.value = this.value.replace(allowedSigns, '');
            });

            Input.number_max.keyup(function () {
                // Nur Nummern zulassen
                let allowedSigns = /[^0-9]/;

                if (allowedSigns.test(this.value)) {
                    gMain.showError(_("only numbers allowed"));
                }
                this.value = this.value.replace(allowedSigns, '');
            });

            Input.number_min.keyup(function () {
                // Nur Nummern zulassen
                let allowedSigns = /[^0-9]/;

                if (allowedSigns.test(this.value)) {
                    gMain.showError(_("only numbers allowed"));
                }
                this.value = this.value.replace(allowedSigns, '');
            });

            // Umrechnung für read & write - Eingabe prüfen
            Input.number_calculation.keyup(function () {
                // Nur Nummern und math operators * | / zulassen
                let allowedSigns = /[^0-9\.\,\*\/]/;

                if (this.value.length > 0) {
                    if (allowedSigns.test(this.value)) {
                        // prüfen auf zulässige Zeichen
                        gMain.showError(_("only numbers and math operators allowed"));
                    } else if (!this.value.startsWith("*") && !this.value.startsWith("/")) {
                        // muss mit math operator beginnen
                        this.value = "";
                        gMain.showError(_("only numbers and math operators allowed"));
                    }
                }
                this.value = this.value.replace(allowedSigns, '');
            });

            // Umrechnung für read only - Eingabe prüfen
            Input.number_calculation_readOnly.keyup(function () {
                // Nur Nummern und math operators zulassen
                let allowedSigns = /[^0-9\.\,\*\+\-\/\(\)]/;

                if (this.value.length > 0) {
                    if (allowedSigns.test(this.value)) {
                        // prüfen auf zulässige Zeichen
                        gMain.showError(_("only numbers and math operators allowed for read only object"));
                    } else if (!this.value.startsWith("+") && !this.value.startsWith("-") && !this.value.startsWith("*") && !this.value.startsWith("/")) {
                        // muss mit math operator beginnen
                        this.value = "";
                        gMain.showError(_("only numbers and math operators allowed for read only object"));
                    }
                }
                this.value = this.value.replace(allowedSigns, '');
            });

            Input.number_to_duration_convert_seconds.keyup(function () {
                // Nur Nummern und math operators * | / zulassen
                let allowedSigns = /[^0-9\*\/]/;

                if (this.value.length > 0) {
                    if (allowedSigns.test(this.value)) {
                        // prüfen auf zulässige Zeichen
                        gMain.showError(_("only numbers and math operators allowed2"));
                    } else if (!this.value.startsWith("*") && !this.value.startsWith("/")) {
                        // muss mit math operator beginnen
                        this.value = "";
                        gMain.showError(_("only numbers and math operators allowed2"));
                    }
                }
                this.value = this.value.replace(allowedSigns, '');
            });

            Input.number_to_datetime_convert_seconds.keyup(function () {
                // Nur Nummern und math operators * | / zulassen
                let allowedSigns = /[^0-9\*\/]/;

                if (this.value.length > 0) {
                    if (allowedSigns.test(this.value)) {
                        // prüfen auf zulässige Zeichen
                        gMain.showError(_("only numbers and math operators allowed2"));
                    } else if (!this.value.startsWith("*") && !this.value.startsWith("/")) {
                        // muss mit math operator beginnen
                        this.value = "";
                        gMain.showError(_("only numbers and math operators allowed2"));
                    }
                }
                this.value = this.value.replace(allowedSigns, '');
            });

            Select.number_convertTo.on('change', function () {
                selectedNumberConverter = this.value;
                initialize_ExpertSettings_Number();
            });

            Input.number_to_boolean_condition.keyup(function () {
                // Nur Nummern und math operators * | / zulassen
                let allowedSigns = /[^0-9\.\,\=\!\>\<]/;

                if (this.value.length > 0) {
                    if (allowedSigns.test(this.value)) {
                        // prüfen auf zulässige Zeichen
                        gMain.showError(_("only numbers and mathematical operators allowed as a condition"));
                    } else if (!this.value.startsWith("=") && !this.value.startsWith("<") && !this.value.startsWith(">") && !this.value.startsWith("!")) {
                        // muss mit math operator beginnen
                        this.value = "";
                        gMain.showError(_("only numbers and mathematical operators allowed as a condition"));
                    } else if (this.value.startsWith("!") && !this.value.startsWith("!=") && this.value.length > 1) {
                        // muss mit math operator beginnen
                        this.value = "";
                        gMain.showError(_("only numbers and mathematical operators allowed as a condition"));
                    }
                }
                this.value = this.value.replace(allowedSigns, '');
            });

        }

        function events_ExpertSettings_Boolean() {

            Select.boolean_convertTo.on('change', function () {
                selectedBooleanConverter = this.value;
                initialize_ExpertSettings_Boolean();
            });
        }

        function events_ExpertSettings_String() {

            Select.string_convertTo.on('change', function () {
                selectedStringConverter = this.value;
                initialize_ExpertSettings_String();
            });
        }
        //#endregion
    }
}

if (typeof customPostOnSave !== 'undefined') {
    customPostOnSave.linkeddevices = function ($div, instance) {
        gMain.showMessage("Halllo");
        return 'Please enter ID';
        // if (!$div.find('input[data-field="test"]').val() === "") {
        // 	return _('Please enter ID');
        // }
    }
}

// This will be called by the admin adapter when the settings page loads
const ORDER = {
    ASC: 'asc',
    DESC: 'desc'
}

var sortLinkedId = ORDER.ASC;
var sortParentId = ORDER.DESC;
var myNamespace;

async function load(settings, onChange) {
    // Namespace bauen
    myNamespace = adapter + '.' + instance;

    // example: select elements with id=key and class=value and insert value
    if (!settings) return;
    $('.value').each(function () {
        var $key = $(this);
        var id = $key.attr('id');
        if ($key.attr('type') === 'checkbox') {
            // do not call onChange direct, because onChange could expect some arguments
            $key.prop('checked', settings[id])
                .on('change', () => onChange())
                ;
        } else {
            // do not call onChange direct, because onChange could expect some arguments
            $key.val(settings[id])
                .on('change', () => onChange())
                .on('keyup', () => onChange())
                ;
        }
    });

    getIsAdapterAlive(function (isAlive) {
        // var $btnRefresh = $('.btn-refresh');

        // $btnRefresh.on('click', function () {
        // 	readLinkedObjects();
        // });
    });


    // Table erzeugen
    createTable(onChange);

    $('th[data-name="linkedId"]').on('click', function () {
        var tableData = table2values('events');
        $('th[data-name="parentId"]').text(_("linked with"))

        switch (sortLinkedId) {
            case ORDER.ASC:
                sortLinkedId = ORDER.DESC;
                myValues2table('events', sortByKey(tableData, "linkedId", false), onChange, tableOnReady);
                $(this).text(`${_("id of linked object")} ▾`);
                break;
            case ORDER.DESC:
                sortLinkedId = ORDER.ASC;
                myValues2table('events', sortByKey(tableData, "linkedId", true), onChange, tableOnReady);
                $(this).text(`${_("id of linked object")} ▴`);
                break;
        }
    });

    $('th[data-name="parentId"]').on('click', function () {
        var tableData = table2values('events');
        $('th[data-name="linkedId"]').text(_("id of linked object"))

        switch (sortParentId) {
            case ORDER.ASC:
                sortParentId = ORDER.DESC;
                myValues2table('events', sortByKey(tableData, "parentId", false), onChange, tableOnReady);
                $(this).text(`${_("linked with")} ▾`);
                break;
            case ORDER.DESC:
                sortParentId = ORDER.ASC;
                myValues2table('events', sortByKey(tableData, "parentId", true), onChange, tableOnReady);
                $(this).text(`${_("linked with")} ▴`);
                break;
        }
    });

    onChange(false);

    // reinitialize all the Materialize labels on the page if you are dynamically adding inputs:
    if (M) M.updateTextFields();
}

// This will be called by the admin adapter when the user presses the save button
function save(callback) {
    // example: select elements with class=value and build settings object
    var obj = {};
    $('.value').each(function () {
        var $this = $(this);
        if ($this.attr('type') === 'checkbox') {
            obj[$this.attr('id')] = $this.prop('checked');
        } else {
            obj[$this.attr('id')] = $this.val();
        }
    });
    callback(obj);
}

async function createTable(onChange) {
    try {
        let tableData = [];		// Array für tableFkt

        // Alle linkedDevices Objekte der Instanz holen
        let linkedDevicesList = await getForeignObjects(myNamespace + '.*');

        if (linkedDevicesList) {
            for (var id in linkedDevicesList) {
                // benötigte Daten in Array für tableFkt packen
                let linkedObj = linkedDevicesList[id];

                if (linkedObj && linkedObj.common && linkedObj.common.custom && linkedObj.common.custom[myNamespace]) {
                    let parentId = '';
                    var parentName = '';

                    if (linkedObj.common.custom[myNamespace].isLinked) {
                        // Verlinkung exitsiert -> parentId übergeben
                        parentId = linkedObj.common.custom[myNamespace].parentId

                        // Name des parent Objektes holen
                        let parentObj = await getObject(parentId);
                        if (parentObj && parentObj.common && parentObj.common.name) {
                            parentName = parentObj.common.name;
                        }
                    }

                    tableData.push({ "linkedId": id, "parentId": parentId, "isLinked": linkedObj.common.custom[myNamespace].isLinked, "parentName": parentName });
                }
            }

            // Daten an Tabelle übergeben und anzeigen
            $('th[data-name="linkedId"]').text(`${_("id of linked object")} ▴`);
            myValues2table('events', sortByKey(tableData, "linkedId", true), onChange, tableOnReady);
        }

    } catch (err) {
        showError(err);
    }
}

function tableOnReady() {
    $('#events .table-values-div .table-values .values-buttons[data-command="assignLink"]').on('click', function () {
        let id = $(this).data('index');
        initSelectId(function (sid) {
            sid.selectId('show', null, function (newId) {
                if (newId) {
                    $('#events .values-input[data-name="linkedId"][data-index="' + id + '"]').val(newId).trigger('change');
                    socket.emit('getObject', newId, function (err, obj) {

                        if (obj._id.includes(adapter + '.' + instance)) {
                            showMessage("nix da!");
                            return
                        }

                        $('#events .values-input[data-name="parentId"][data-index="' + id + '"]').val(obj._id).trigger('change');
                    });
                }
            });
        });
    });
}

var selectId;
function initSelectId(callback) {
    if (selectId) {
        return callback(selectId);
    }
    socket.emit('getObjects', function (err, objs) {
        selectId = $('#dialog-select-member').selectId('init', {
            noMultiselect: true,
            objects: objs,
            imgPath: '../../lib/css/fancytree/',
            filter: { type: 'state' },
            name: 'scenes-select-state',
            expertModeRegEx: /^system\.|^iobroker\.|^_|^[\w-]+$|^enum\.|^[\w-]+\.admin|^script\./,
            texts: {
                select: _('Select'),
                cancel: _('Cancel'),
                all: _('All'),
                id: _('ID'),
                name: _('Name'),
                role: _('Role'),
                room: _('Room'),
                value: _('Value'),
                selectid: _('Select ID'),
                from: _('From'),
                lc: _('Last changed'),
                ts: _('Time stamp'),
                wait: _('Processing...'),
                ack: _('Acknowledged'),
                selectAll: _('Select all'),
                unselectAll: _('Deselect all'),
                invertSelection: _('Invert selection')
            },
            columns: ['image', 'name']
        });
        callback(selectId);
    });
}

function getForeignObjects(pattern, callback) {
    socket.emit('getForeignObjects', pattern, function (err, res) {
        if (!err && res) {
            if (callback) callback(err, res);
        } else {
            if (callback) callback(null);
        }
    });
}

async function getForeignObjects(pattern) {
    return new Promise((resolve, reject) => {
        socket.emit('getForeignObjects', pattern, function (err, res) {
            if (!err && res) {
                resolve(res);
            } else {
                resolve(null);
            }
        });
    });
}

async function getObject(id) {
    return new Promise((resolve, reject) => {
        socket.emit('getObject', id, function (err, res) {
            if (!err && res) {
                resolve(res);
            } else {
                resolve(null);
            }
        });
    });
}

function sortByKey(array, key, sortASC) {
    return array.sort(function (a, b) {
        var x = a[key];
        var y = b[key];

        if (sortASC) {
            return ((x < y) ? -1 : ((x > y) ? 1 : 0));
        } else {
            return ((x > y) ? -1 : ((x < y) ? 1 : 0));
        }
    });
}

function myValues2table(divId, values, onChange, onReady, maxRaw) {
    if (typeof values === 'function') {
        typeof onChange === 'number' ? maxRaw = onChange : maxRaw = null;
        onChange = values;
        values = divId;
        divId = '';
    }

    if (typeof onReady === 'number') {
        maxRaw = onReady;
        onReady = null;
    } else if (typeof maxRaw === 'undefined') {
        maxRaw = null;
    }

    values = values || [];
    var names = [];
    var $div;
    if (!divId) {
        $div = $('body');
    } else {
        $div = $('#' + divId);
    }
    var $add = $div.find('.table-button-add');
    $add.data('raw', values.length);

    if (maxRaw) {
        $add.data('maxraw', maxRaw);
    }

    if (!$add.data('inited')) {
        $add.data('inited', true);

        var addText = $add.text();

        if (!isMaterialize) {
            $add.button({
                icons: { primary: 'ui-icon-plus' },
                text: !!addText,
                label: addText ? _(addText) : undefined
            });
        }

        $add.on('click', function () {
            if (!$add.data('maxraw') || ($add.data('raw') < $add.data('maxraw'))) {
                var $table = $div.find('.table-values');
                var values = $table.data('values');
                var names = $table.data('names');
                var obj = {};
                for (var i = 0; i < names.length; i++) {
                    if (!names[i]) continue;
                    obj[names[i].name] = names[i].def;
                }
                values.push(obj);
                onChange && onChange();
                setTimeout(function () {
                    myValues2table(divId, values, onChange, onReady);
                }, 100);
                $add.data('raw', $add.data('raw') + 1);
            } else {
                confirmMessage(_('maxTableRaw') + ': ' + $add.data('maxraw'), _('maxTableRawInfo'), 'alert', ['Ok']);
            }
        });
    }

    if (values) {
        var buttons = [];
        var $table = $div.find('.table-values');
        $table.data('values', values);

        $table.find('th').each(function () {
            var name = $(this).data('name');
            if (name) {
                var obj = {
                    name: name,
                    type: $(this).data('type') || 'text',
                    def: $(this).data('default'),
                    style: $(this).data('style'),
                    tdstyle: $(this).data('tdstyle')
                };
                if (obj.type === 'checkbox') {
                    if (obj.def === 'false') obj.def = false;
                    if (obj.def === 'true') obj.def = true;
                    obj.def = !!obj.def;
                } else if (obj.type === 'select' || obj.type === 'select multiple') {
                    var vals = ($(this).data('options') || '').split(';');
                    obj.options = {};
                    for (var v = 0; v < vals.length; v++) {
                        var parts = vals[v].split('/');
                        obj.options[parts[0]] = _(parts[1] || parts[0]);
                        if (v === 0) obj.def = (obj.def === undefined) ? parts[0] : obj.def;
                    }
                } else {
                    obj.def = obj.def || '';
                }
                names.push(obj);
            } else {
                names.push(null);
            }

            name = $(this).data('buttons');

            if (name) {
                var bs = name.split(' ');
                buttons.push(bs);
            } else {
                buttons.push(null);
            }
        });

        $table.data('names', names);

        var text = '';
        for (var v = 0; v < values.length; v++) {
            var idName = values[v] && values[v].id;
            if (!idName && values[v]) {
                if (names[0] === '_index') {
                    idName = values[v][names[1]];
                } else {
                    idName = values[v][names[0]];
                }
            }
            text += '<tr ' + (idName ? 'data-id="' + idName + '"' : '') + ' data-index="' + v + '">';

            for (var i = 0; i < names.length; i++) {
                text += '<td';
                var line = '';
                var style = '';
                var tdstyle = '';
                if (names[i]) {
                    if (names[i].name !== '_index') {
                        tdstyle = names[i].tdstyle || '';
                        if (tdstyle && tdstyle[0] !== ';') tdstyle = ';' + tdstyle;
                    }
                    if (names[i].name === '_index') {
                        style = (names[i].style ? names[i].style : 'text-align: right;');
                        line += (v + 1);
                    } else if (names[i].type === 'checkbox') {
                        // Mod: disabled Checkbox
                        line += '<input style="' + (names[i].style || '') + '" class="values-input filled-in" type="checkbox" data-index="' + v + '" data-name="' + names[i].name + '" ' + (values[v][names[i].name] ? 'checked' : '') + '" data-old-value="' + (values[v][names[i].name] === undefined ? '' : values[v][names[i].name]) + '" disabled="true"/>';
                        if (isMaterialize) {
                            line += '<span></span>';
                        }
                    } else if (names[i].type.substring(0, 6) === 'select') {
                        line += (names[i].type.substring(7, 16) === 'multiple' ? '<select multiple style="' : '<select style="') + (names[i].style ? names[i].style : 'width: 100%') + '" class="values-input" data-index="' + v + '" data-name="' + names[i].name + '">';
                        var options;
                        if (names[i].name === 'room') {
                            options = $table.data('rooms');
                        } else if (names[i].name === 'func') {
                            options = $table.data('functions');
                            if (names[i].type === 'select multiple') delete options[_('none')];
                        } else {
                            options = names[i].options;
                        }

                        var val = (values[v][names[i].name] === undefined ? '' : values[v][names[i].name]);
                        if (typeof val !== 'object') val = [val];
                        for (var p in options) {
                            line += '<option value="' + p + '" ' + (val.indexOf(p) !== -1 ? ' selected' : '') + '>' + options[p] + '</option>';
                        }
                        line += '</select>';
                    } else {
                        // Mod: readonly input (text)
                        line += '<input class="values-input" style="' + (names[i].style ? names[i].style : 'width: 100%') + '" type="' + names[i].type + '" data-index="' + v + '" data-name="' + names[i].name + '" readonly/>';
                    }
                }

                if (buttons[i]) {
                    style = 'text-align: center; white-space: nowrap;';
                    for (var b = 0; b < buttons[i].length; b++) {
                        if ((!v && buttons[i][b] === 'up') || (v === values.length - 1 && buttons[i][b] === 'down')) {
                            if (isMaterialize) {
                                line += '<a data-command="' + buttons[i][b] + '" class="values-buttons btn-floating btn-small waves-effect waves-light disabled"><i class="material-icons">add</i></a>';
                            } else {
                                line += '<button data-command="' + buttons[i][b] + '" class="values-buttons" disabled>&nbsp;</button>';
                            }
                        } else if (buttons[i][b] === 'assignLink') {
                            // Mod: abhängig ob verlinkt ist Button disabled
                            if (isMaterialize) {
                                if (JSON.stringify(values[v].isLinked) === "true") {
                                    line += '<a data-index="' + v + '" data-command="' + buttons[i][b] + '" class="values-buttons btn-floating btn-small waves-effect waves-light" disabled="true"><i class="material-icons">link</i></a>';
                                } else {
                                    line += '<a data-index="' + v + '" data-command="' + buttons[i][b] + '" class="values-buttons btn-floating btn-small waves-effect waves-light"><i class="material-icons">link</i></a>';
                                }
                            } else {
                                if (JSON.stringify(values[v].isLinked) === "true") {
                                    line += '<button data-index="' + v + '" data-command="' + buttons[i][b] + '" class="values-buttons" disabled="true"></button>';
                                } else {
                                    line += '<button data-index="' + v + '" data-command="' + buttons[i][b] + '" class="values-buttons"></button>';
                                }
                            }
                        } else if (buttons[i][b] === 'openCustom') {
                            if (isMaterialize) {
                                if (JSON.stringify(values[v].isLinked) === "true") {
                                    line += '<a data-index="' + v + '" data-command="' + buttons[i][b] + '" class="values-buttons btn-floating btn-small waves-effect waves-light"><i class="material-icons">link</i></a>';
                                } else {
                                    line += '<a data-index="' + v + '" data-command="' + buttons[i][b] + '" class="values-buttons btn-floating btn-small waves-effect waves-light" disabled="true"><i class="material-icons">link</i></a>';
                                }
                            } else {
                                if (JSON.stringify(values[v].isLinked) === "true") {
                                    line += '<button data-index="' + v + '" data-command="' + buttons[i][b] + '" class="values-buttons"></button>';
                                } else {
                                    line += '<button data-index="' + v + '" data-command="' + buttons[i][b] + '" class="values-buttons" disabled="true"></button>';
                                }
                            }
                        } else {
                            if (isMaterialize) {
                                line += '<a data-index="' + v + '" data-command="' + buttons[i][b] + '" class="values-buttons btn-floating btn-small waves-effect waves-light"><i class="material-icons">add</i></a>';
                            } else {
                                line += '<button data-index="' + v + '" data-command="' + buttons[i][b] + '" class="values-buttons"></button>';
                            }
                        }
                    }
                }
                if (style.length || tdstyle.length) {
                    text += ' style="' + style + tdstyle + '">' + line + '</td>';
                } else {
                    text += '>' + line + '</td>';
                }
            }

            text += '</tr>';
        }
        var $lines = $div.find('.table-lines');
        if (!$lines.length) {
            $table.append('<tbody class="table-lines"></tbody>');
            $lines = $div.find('.table-lines');
        }

        $lines.html(text);

        $lines.find('.values-input').each(function () {
            var $this = $(this);
            var type = $this.attr('type');
            var name = $this.data('name');
            var id = $this.data('index');
            $this.data('old-value', values[id][name]);
            if (type === 'checkbox') {
                $this.prop('checked', values[id][name]);
            } else {
                $this.val(values[id][name]);
            }
        });
        $lines.find('.values-buttons').each(function () {
            var command = $(this).data('command');
            if (command === 'copy') {
                if (!isMaterialize) {
                    $(this).button({
                        icons: { primary: 'ui-icon-copy' },
                        text: false
                    })
                        .css({ width: '1em', height: '1em' });
                } else {
                    $(this).find('i').html('content_copy');
                }

                $(this).on('click', function () {
                    if (!$add.data('maxraw') || ($add.data('raw') < $add.data('maxraw'))) {
                        var id = $(this).data('index');
                        var elem = JSON.parse(JSON.stringify(values[id]));
                        values.push(elem);
                        onChange && onChange();

                        setTimeout(function () {
                            if (typeof tableEvents === 'function') {
                                tableEvents(values.length - 1, elem, 'add');
                            }

                            myValues2table(divId, values, onChange, onReady);
                        }, 100);

                        if ($add.data('maxraw')) {
                            $add.data('raw', $add.data('raw') + 1);
                        }
                    }
                });
            } else
                if (command === 'delete') {
                    if (!isMaterialize) {
                        $(this).button({
                            icons: { primary: 'ui-icon-trash' },
                            text: false
                        })
                            .css({ width: '1em', height: '1em' });
                    } else {
                        $(this).addClass('red').find('i').html('delete');
                    }

                    $(this).on('click', function () {
                        var id = $(this).data('index');
                        var elem = values[id];
                        values.splice(id, 1);
                        onChange && onChange();

                        setTimeout(function () {
                            if (typeof tableEvents === 'function') {
                                tableEvents(id, elem, 'delete');
                            }

                            myValues2table(divId, values, onChange, onReady);
                        }, 100);

                        if ($add.data('maxraw')) {
                            $add.data('raw', $add.data('raw') - 1);
                        }
                    });
                } else if (command === 'up') {
                    if (!isMaterialize) {
                        $(this).button({
                            icons: { primary: 'ui-icon-triangle-1-n' },
                            text: false
                        })
                            .css({ width: '1em', height: '1em' })
                    } else {
                        $(this).find('i').html('arrow_upward');
                    }
                    $(this).on('click', function () {
                        var id = $(this).data('index');
                        var elem = values[id];
                        values.splice(id, 1);
                        values.splice(id - 1, 0, elem);
                        onChange && onChange();
                        setTimeout(function () {
                            myValues2table(divId, values, onChange, onReady);
                        }, 100);
                    });
                } else if (command === 'down') {
                    if (!isMaterialize) {
                        $(this).button({
                            icons: { primary: 'ui-icon-triangle-1-s' },
                            text: false
                        })
                            .css({ width: '1em', height: '1em' });
                    } else {
                        $(this).find('i').html('arrow_downward');
                    }
                    $(this).on('click', function () {
                        var id = $(this).data('index');
                        var elem = values[id];
                        values.splice(id, 1);
                        values.splice(id + 1, 0, elem);
                        onChange && onChange();
                        setTimeout(function () {
                            myValues2table(divId, values, onChange, onReady);
                        }, 100);
                    });
                } else if (command === 'pair') {
                    if (!isMaterialize) {
                        $(this).button({
                            icons: { primary: 'ui-icon-transferthick-e-w' },
                            text: false
                        })
                            .css({ width: '1em', height: '1em' });
                    } else {
                        $(this).find('i').html('leak_add');
                    }
                    $(this).on('click', function () {
                        if (typeof tableEvents === 'function') {
                            var id = $(this).data('index');
                            var elem = values[id];
                            tableEvents(id, elem, 'pair');
                        }
                    }).attr('title', _('pair'));
                } else if (command === 'unpair') {
                    if (!isMaterialize) {
                        $(this).button({
                            icons: { primary: 'ui-icon-scissors' },
                            text: false
                        })
                            .css({ width: '1em', height: '1em' });
                    } else {
                        $(this).find('i').html('leak_remove');
                    }
                    $(this).on('click', function () {
                        if (typeof tableEvents === 'function') {
                            var id = $(this).data('index');
                            var elem = values[id];
                            tableEvents(id, elem, 'unpair');
                        }
                    }).attr('title', _('unpair'));
                } else if (command === 'edit') {
                    if (!isMaterialize) {
                        $(this).button({
                            icons: { primary: 'ui-icon-pencil' },
                            text: false
                        })
                            .css({ width: '1em', height: '1em' });
                    } else {
                        $(this).find('i').html('edit');
                    }
                    $(this).on('click', function () {
                        var id = $(this).data('index');
                        if (typeof editLine === 'function') {
                            setTimeout(function () {
                                editLine(id, JSON.parse(JSON.stringify(values[id])), function (err, id, newValues) {
                                    if (!err) {
                                        if (JSON.stringify(values[id]) !== JSON.stringify(newValues)) {
                                            onChange && onChange();
                                            values[id] = newValues;
                                            myValues2table(divId, values, onChange, onReady);
                                        }
                                    }
                                });
                            }, 100);
                        }
                    });
                } else if (command === 'assignLink') {
                    // Mod: eigener button für link
                    if (!isMaterialize) {
                        $(this).button({
                            icons: { primary: 'ui-icon-pencil' },
                            text: false
                        })
                            .css({ width: '1em', height: '1em' });
                    } else {
                        $(this).find('i').html('link');     //Icon festlegen
                    }
                    $(this).on('click', function () {
                        var id = $(this).data('index');
                    }).attr('title', _('assign link'));
                } else if (command === 'openCustom') {
                    // Mod: eigener button für custom dlg
                    if (!isMaterialize) {
                        $(this).button({
                            icons: { primary: 'ui-icon-gear' },
                            text: false
                        })
                            .css({ width: '1em', height: '1em' });
                    } else {
                        $(this).find('i').html('build');     //Icon festlegen
                    }
                    $(this).on('click', function () {
                        var id = $(this).data('index');
                    }).attr('title', _('Settings'));
                }
        });

        $lines.find('.values-input').on('change.adaptersettings', function () {
            if ($(this).attr('type') === 'checkbox') {
                if ($(this).prop('checked').toString() !== $(this).data('old-value')) onChange();
                values[$(this).data('index')][$(this).data('name')] = $(this).prop('checked');
            } else {
                if ($(this).val() !== $(this).data('old-value')) onChange();
                values[$(this).data('index')][$(this).data('name')] = $(this).val();
            }
        }).on('keyup', function () {
            $(this).trigger('change.adaptersettings');
        });
    }
    if (isMaterialize) {
        if (!divId) {
            M.updateTextFields();
            $('select').select();
        } else {
            M.updateTextFields('#' + divId);
            $('#' + divId).find('select').select();
        }

        // workaround for materialize checkbox problem
        $div.find('input[type="checkbox"]+span').off('click').on('click', function () {
            var $input = $(this).prev();
            if (!$input.prop('disabled')) {
                $input.prop('checked', !$input.prop('checked')).trigger('change');
            }
        });
    }
    if (typeof onReady === 'function') onReady();
}
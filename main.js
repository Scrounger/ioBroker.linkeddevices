"use strict";

/*
 * Created with @iobroker/create-adapter v1.12.1
 */

// The adapter-core module gives you access to the core ioBroker functions
// you need to create an adapter
const utils = require("@iobroker/adapter-core");
const mathjs = require("mathjs");
const fs = require('fs');

const moment = require("moment");
const momentDurationFormatSetup = require("moment-duration-format");
momentDurationFormatSetup(moment);

// Default values, falls system config nicht geladen werden kann
var mySystemConfig = { language: "en", dateFormat: "DD.MM.YYYY", durationFormat: "dd[T] hh[h] mm[m]" };

// Load your modules here, e.g.:
// const fs = require("fs");

class Linkeddevices extends utils.Adapter {

	/**
	 * @param {Partial<utils.AdapterOptions>} [options={}]
	 */
	constructor(options) {
		super({
			...options,
			name: "linkeddevices",
		});
		this.on("ready", this.onReady.bind(this));
		this.on("objectChange", this.onObjectChange.bind(this));
		this.on("stateChange", this.onStateChange.bind(this));
		// this.on("message", this.onMessage.bind(this));
		this.on("unload", this.onUnload.bind(this));
		this.on("message", this.onMessage.bind(this))

	}

	/**
	 * Is called when databases are connected and adapter received configuration.
	 */
	async onReady() {
		this.log.debug("[onReady] deleteDeadLinkedObjects: '" + this.config.deleteDeadLinkedObjects + "'");


		// Initialize your adapter here
		await this.initialObjects()

		// subscribe für alle Objekt, um Änderungen die diesen Adapter betreffen mitzubekommen
		this.subscribeForeignObjects("*");

		// The adapters config (in the instance object everything under the attribute "native") is accessible via
		// this.config:
		// this.log.info("config option1: " + this.config.option1);
		// this.log.info("config option2: " + this.config.option2);



		/*
		For every state in the system there has to be also an object of type state
		Here a simple template for a boolean variable named "testVariable"
		Because every adapter instance uses its own unique namespace variable names can't collide with other adapters variables
		*/
		// await this.setObjectAsync("testVariable", {
		// 	type: "state",
		// 	common: {
		// 		name: "testVariable",
		// 		type: "boolean",
		// 		role: "indicator",
		// 		read: true,
		// 		write: true,
		// 	},
		// 	native: {},
		// });



		/*
		setState examples
		you will notice that each setState will cause the stateChange event to fire (because of above subscribeStates cmd)
		*/
		// the variable testVariable is set to true as command (ack=false)
		// await this.setStateAsync("testVariable", true);

		// same thing, but the value is flagged "ack"
		// ack should be always set to true if the value is received from or acknowledged from the target system
		// await this.setStateAsync("testVariable", { val: true, ack: true });

		// same thing, but the state is deleted after 30s (getState will return null afterwards)
		// await this.setStateAsync("testVariable", { val: true, ack: true, expire: 30 });

		// examples for the checkPassword/checkGroup functions
		// let result = await this.checkPasswordAsync("admin", "iobroker");
		// this.log.info("check user admin pw ioboker: " + result);

		// result = await this.checkGroupAsync("admin", "admin");
		// this.log.info("check group user admin group admin: " + result);
	}

	/**
	 * Is called when adapter shuts down - callback has to be called under any circumstances!
	 * @param {() => void} callback
	 */
	onUnload(callback) {
		try {
			this.log.info("cleaned everything up...");
			callback();
		} catch (e) {
			callback();
		}
	}

	/**
	 * Is called if a subscribed object changes
	 * @param {string} id
	 * @param {ioBroker.Object | null | undefined} obj
	 */
	async onObjectChange(id, obj) {
		if (obj) {
			if (!id.startsWith(this.namespace) && obj.common && obj.common.custom && obj.common.custom[this.namespace]) {

				if (this.dicLinkedParentObjects && id in this.dicLinkedParentObjects) {
					//bereits verlinktes parentObject wurde geändert -> ist im dicLinkedParentObjects enthalten
					let linkedId = this.getLinkedObjectId(obj);

					// Prüfen ob die linkedId schon verwendet wird, bzw. ob es die gleiche ist oder wenn 'isLinked === false' ist
					if (!this.isLinkedIdInUse(obj, linkedId)) {
						// nicht verwendet

						if (this.dicLinkedParentObjects[id] === linkedId) {
							// linkedId wurde für parentObject nicht geändert -> Eingaben wurden nur aktualisiert
							this.log.info("[onObjectChange] parentObject '" + id + "' properties changed");
							await this.createLinkedObject(obj);
						} else {
							// alte linkedId aus dic holen
							let oldLinkedId = this.dicLinkedParentObjects[id];
							let oldLinkedObj = await this.getForeignObjectAsync(oldLinkedId);

							// linkedId wurde für parentObject geändert -> neue linkedId für parentObject in dic schreiben
							this.dicLinkedParentObjects[id] = linkedId;

							this.log.info("[onObjectChange] linkedId '" + oldLinkedId + "' changed to '" + linkedId + "' for parentObject '" + id + "'");

							// linkedObject "custom.isLinked = false" Status setzen
							await this.resetLinkedObjectStatusById(oldLinkedId);

							// linkedObject löschen -> abhängig von Config
							await this.removeNotLinkedObject(oldLinkedId);

							// LinkedObject erzeugen, oldLinkeObject mit übergeben, damit custom settings von anderen adaptern mit verschoben werden
							// @ts-ignore
							await this.createLinkedObject(obj, oldLinkedObj);
						}
					} else {
						// wird bereits verwendet -> 'custom.linkedId' vom parentObject auf alte linkedId zurücksetzen
						let oldLinkedId = this.dicLinkedParentObjects[id];

						this.log.info("[onObjectChange] reset linkedId to '" + oldLinkedId + "' for parentObject '" + id + "'");

						// namespace aus oldLinkedId entfernen
						oldLinkedId = oldLinkedId.replace(this.namespace + ".", "");

						// alte linkedId in parentObject schreiben
						obj.common.custom[this.namespace].linkedId = oldLinkedId;
						await this.setForeignObjectAsync(id, obj);
					}

					this.storeInfoStates();
				} else {
					// neues parentObject hinzugefügt bzw. aktiviert ('enabled==true') -> nicht im dicLinkedParentObjects enthalten
					let linkedId = this.getLinkedObjectId(obj);
					this.log.info("[onObjectChange] new parentObject '" + id + "' linked to '" + linkedId + "'");

					// Prüfen ob die linkedId schon verwendet wird
					if (!this.isLinkedIdInUse(obj, linkedId)) {
						// nicht verwendet
						await this.createLinkedObject(obj);
					} else {
						// wird bereits verwendet -> 'parentObj.common.custom[linkeddevices.x]' löschen
						if (obj.common.custom[this.namespace].enabled === true) {
							delete obj.common.custom[this.namespace];
							await this.setForeignObjectAsync(obj._id, obj);

							this.logDicLinkedObjectsStatus();
							this.logDicLinkedParentObjects();
						}
					}

					this.storeInfoStates();
				}

				if (this.dicLinkedParentObjects) {
					this.log.info("[onObjectChange] count of active linkedObjects: " + Object.keys(this.dicLinkedParentObjects).length)
				}
			} else {
				// bereits verlinktes parentObject wurde deaktiviert
				if (!id.startsWith(this.namespace) && this.dicLinkedParentObjects && id in this.dicLinkedParentObjects) {
					this.log.info("[onObjectChange] parentObject '" + id + "' deactivated");

					// alte linkedId holen und aus dicLinkedObjectsStatus löschen
					let oldLinkedId = this.dicLinkedParentObjects[id];
					if (this.dicLinkedObjectsStatus) this.dicLinkedObjectsStatus[oldLinkedId] = false;

					// parentObject aus dicLinkedParentObjects löschen
					delete this.dicLinkedParentObjects[id];
					this.logDicLinkedParentObjects();


					// linkedObject "custom.isLinked = false" Status setzen
					await this.resetLinkedObjectStatusById(oldLinkedId);

					// linkedObject löschen -> abhängig von Config
					await this.removeNotLinkedObject(oldLinkedId);

					if (this.dicLinkedParentObjects) {
						this.log.info("[onObjectChange] count of active linkedObjects: " + Object.keys(this.dicLinkedParentObjects).length)
					}

					this.storeInfoStates();
				}
				//INFO: bereits verlinktes parentObject wurde gelöscht -> wird nicht über objectChange erkannt
			}
		} else {
			// Objekt wurde gelöscht
			if (this.dicLinkedParentObjects && id in this.dicLinkedParentObjects) {
				let linkedId = this.dicLinkedParentObjects[id];
				let linkedObject = await this.getForeignObjectAsync(linkedId);

				if (linkedObject && linkedObject.common && linkedObject.common.custom && linkedObject.common.custom[this.namespace] && linkedObject.common.custom[this.namespace].isLinked) {
					linkedObject.common.custom[this.namespace].isLinked = false;
					linkedObject.common.icon = 'linkeddevices_missing.png';

					this.setForeignObject(linkedId, linkedObject);

					this.log.info(`parentObject '${id}' deleted, linkedObject '${linkedId}' status 'isLinked' set to '${linkedObject.common.custom[this.namespace].isLinked}'`);

					delete this.dicLinkedParentObjects[id];
					this.logDicLinkedParentObjects();

					this.storeInfoStates();
				}
			}
		}

		// if (obj) {
		// 	// The object was changed
		// 	this.log.info(`object ${id} changed: ${JSON.stringify(obj)}`);
		// } else {
		// 	// The object was deleted
		// 	this.log.info(`object ${id} deleted`);
		// 	this.log.info(JSON.stringify(obj));
		// }
	}

	/**
	 * Is called if a subscribed state changes
	 * @param {string} id
	 * @param {ioBroker.State | null | undefined} state
	 */
	async onStateChange(id, state) {
		try {
			// 'state' hat sich geändert -> darauf wird nur reagiert wenn nicht der Adapter selbst auslöser ist
			if (state && state.from != `system.adapter.${this.namespace}`) {
				let changedValue = state.val;

				// parentObject 'state' hat sich geändert -> linkedObject 'state' ändern
				if (this.dicLinkedParentObjects && id in this.dicLinkedParentObjects) {
					let linkedObjId = this.dicLinkedParentObjects[id];

					// ggf. kann für das linkedObject eine Umrechnung festgelegt sein
					changedValue = await this.getConvertedValue(linkedObjId, changedValue);

					await this.logStateChange(id, state, linkedObjId, "parentObject", changedValue);

					await this.setForeignStateAsync(linkedObjId, { val: changedValue, ack: state.ack });
				}

				// linkedObject 'state' hat sich geändert -> parentObject 'state' ändern
				else if (this.dicLinkedObjectsStatus && id in this.dicLinkedObjectsStatus) {
					// @ts-ignore
					let parentObjId = Object.keys(this.dicLinkedParentObjects).find(key => this.dicLinkedParentObjects[key] === id);

					// Wenn 'custom.isLinked = true', dann auf Änderung reagieren, da Verlinkung existiert
					if (this.dicLinkedObjectsStatus[id] === true && parentObjId) {

						// ggf. kann für das linkedObject eine Umrechnung festgelegt sein -> parentObject zurück rechnen
						changedValue = await this.getConvertedValue(parentObjId, changedValue, true);

						await this.logStateChange(id, state, parentObjId, "linkedObject", changedValue);

						await this.setForeignStateAsync(parentObjId, { val: changedValue, ack: state.ack });
					}
				}
			}
		} catch (err) {
			this.log.error(`[onStateChange] changedId '${id}', error: ${err.message}, stack: ${err.stack}`);
		}
	}

	/**
	 * Some message was sent to this instance over message box. Used by email, pushover, text2speech, ...
	 * Using this method requires "common.message" property to be set to true in io-package.json
	 * @param {ioBroker.Message} obj
	 */
	async onMessage(obj) {
		this.log.debug(`message received: ${JSON.stringify(obj)}`);

		if (typeof obj === 'object') {
			if (obj.command === 'assignTo' && obj.message) {
				// @ts-ignore
				if (obj.message.linkedId && obj.message.parentId) {

					// @ts-ignore
					let result = await this.assignToParentObject(obj.message.linkedId, obj.message.parentId);

					// Send response in callback if required
					if (obj.callback && result) {
						this.sendTo(obj.from, obj.command, result, obj.callback);
					}
				} else {
					this.log.error("missing linkedId and parentId in message of sendTo command!")
				}
			} else if (obj.command === 'autoRepair') {
				let result = await this.autoRepair();

				// Send response in callback if required
				if (obj.callback && result) {
					this.sendTo(obj.from, obj.command, result, obj.callback);
				}
			} else if (obj.command === 'suggestions_prefixId') {
				// message from custom dialog
				let objOfInstance = await this.getForeignObjectsAsync(`${this.namespace}.*`);
				let prefixIdSuggestionList = [];

				for (var id in objOfInstance) {
					let linkedObject = objOfInstance[id];

					if (linkedObject && linkedObject.common && linkedObject.common.custom && linkedObject.common.custom[this.namespace]) {
						// nur Objekte betrachten die custom vom Namespace haben -> es kann sein das andere Objekte existieren
						let cleanId = id.replace(`${this.namespace}.`, '');

						// alle prefixIds von rechts immer bis zum '.' durchlaufen und übergeben
						let prefixId = cleanId;
						for (var i = 0; i <= cleanId.split(".").length - 1; i++) {
							prefixId = prefixId.substring(0, prefixId.lastIndexOf('.'))

							if (prefixId) {
								if (!prefixIdSuggestionList.includes(prefixId)) {
									// nur zu prefixId array hinzufügen wenn noch nicht vorhanden
									prefixIdSuggestionList.push(prefixId);
								}
							}
						}
					}
				}
				this.sendTo(obj.from, obj.command, prefixIdSuggestionList, obj.callback);

			} else if (obj.command === 'suggestions_stateId') {
				// message from custom dialog
				let objOfInstance = await this.getForeignObjectsAsync(`${this.namespace}.*`);
				let stateIdSuggestionList = [];

				for (var id in objOfInstance) {
					let linkedObject = objOfInstance[id];

					if (linkedObject && linkedObject.common && linkedObject.common.custom && linkedObject.common.custom[this.namespace]) {
						// nur Objekte betrachten die custom vom Namespace haben -> es kann sein das andere Objekte existieren
						let cleanId = id.replace(`${this.namespace}.`, '');

						let stateId = cleanId.substring(cleanId.lastIndexOf('.'), cleanId.length).replace('.', '');
						if (!stateIdSuggestionList.includes(stateId)) {
							// nur zu prefixId array hinzufügen wenn noch nicht vorhanden
							stateIdSuggestionList.push(stateId);
						}
					}
				}
				this.sendTo(obj.from, obj.command, stateIdSuggestionList, obj.callback);

			} else if (obj.command === 'suggestions_name') {
				// message from custom dialog
				let objOfInstance = await this.getForeignObjectsAsync(`${this.namespace}.*`);
				let nameSugestionList = [];

				for (var id in objOfInstance) {
					let linkedObject = objOfInstance[id];

					if (linkedObject && linkedObject.common && linkedObject.common.custom && linkedObject.common.custom[this.namespace]) {
						if (linkedObject.common.name) {
							let name = linkedObject.common.name;

							if (typeof (name) === 'object') {
								var sysConfig = await this.getForeignObjectAsync('system.config');

								if (sysConfig && sysConfig.common) {
									if (sysConfig.common.language) {
										name = name[sysConfig.common.language];
									} else {
										name = name['en'];
									}
								}
							}

							if (!nameSugestionList.includes(name)) {
								// nur zu prefixId array hinzufügen wenn noch nicht vorhanden
								nameSugestionList.push(name);
							}
						}
					}
				}
				this.sendTo(obj.from, obj.command, nameSugestionList, obj.callback);

			} else if (obj.command === 'getParentName') {
				// message from custom dialog
				if (obj.message && obj.message['parentId']) {
					let parentObj = await this.getForeignObjectAsync(obj.message['parentId']);

					if (parentObj && parentObj.common && parentObj.common.name) {
						this.sendTo(obj.from, obj.command, parentObj.common.name, obj.callback);
					} else {
						this.sendTo(obj.from, obj.command, "Error", obj.callback);
					}
				} else {
					this.sendTo(obj.from, obj.command, "Error", obj.callback);
				}
			}
		}
	}

	async autoRepair() {
		this.log.info(`[autoRepair] start auto repair...`);

		let error = false;

		try {
			let linkedObjList = await this.getAdapterObjectsAsync();
			for (let linkedId in linkedObjList) {
				let linkedObj = linkedObjList[linkedId];

				// alle nicht mehr verlinkten objekte suchen
				if (linkedObj && linkedObj.common && linkedObj.common.custom && linkedObj.common.custom[this.namespace] && linkedObj.common.custom[this.namespace].isLinked === false) {

					if (linkedObj.common.custom[this.namespace].parentId) {
						let parentId = linkedObj.common.custom[this.namespace].parentId;

						// prüfen ob parentObjekt noch existiert
						let parentObject = await this.getForeignObjectAsync(parentId);

						if (parentObject) {
							// parentObjekt existiert noch -> reparieren
							this.log.debug(`[autoRepair] parentObject '${parentId}' of linkedObject '${linkedId} still exist -> try to repair the link'`);

							let result = await this.assignToParentObject(linkedId, parentId);

							if (result) {
								if (result.success === true) {
									this.log.info(`[autoRepair] link repaired for linkedObject '${linkedId} (parentObject '${parentId}')`);
								} else {
									this.log.error(`[autoRepair] link not repaired for linkedObject '${linkedId} (parentObject '${parentId}') -> error: ${result.error}`);
									error = true;
								}
							}
						} else {
							// parentObjekt existiert nicht mehr
							this.log.debug(`[autoRepair] parentObject '${parentId}' of linkedObject '${linkedId} not exist anymore'`);
						}
					} else {
						// linkedObjekt hat keine parentId
						this.log.warn(`[autoRepair] linkedObject '${linkedId} has no parentId!'`)
					}
				}
			}

			this.log.info(`[autoRepair] auto repair finished`);

			return { success: true, error: error };
		} catch (err) {
			this.log.error(`[autoRepair] error: ${err.message}`);
			this.log.error("[autoRepair] stack: " + err.stack);

			return { success: true, error: err.message };
		}
	}
	/**
	 * @param {string} linkedId
	 * @param {string} parentId
	 */
	async assignToParentObject(linkedId, parentId) {
		this.log.debug(`[assignToParentObject] start linkedObject '${linkedId}' assigning to parentObject '${parentId}'`);

		// notwendige custom daten an neu zugeordnete parentObjekte übergeben
		try {
			let linkedObject = await this.getForeignObjectAsync(linkedId);
			let parentObject = await this.getForeignObjectAsync(parentId);

			if (linkedObject && linkedObject.common && linkedObject.common.custom && linkedObject.common.custom[this.namespace]) {
				if (parentObject && parentObject.common) {

					// common Daten des linkedObjects holen, die beim parentObject in den Settings konfiguriert werden können
					let customForParentObj = {};

					let expertSettings = false;

					if (linkedObject.common.name) {
						if (parentObject.common.name) {
							if (parentObject.common.name != linkedObject.common.name) {
								// nur übergeben wenn unterschiedlich zwischen linkedObject & parentObject ist
								customForParentObj["name"] = linkedObject.common.name;
							}
						} else {
							customForParentObj["name"] = linkedObject.common.name;
						}
					}

					if (linkedObject.common.role) {
						if (parentObject.common.role) {
							if (parentObject.common.role != linkedObject.common.role) {
								// nur übergeben wenn unterschiedlich zwischen linkedObject & parentObject ist
								customForParentObj["role"] = linkedObject.common.role;
							}
						} else {
							customForParentObj["role"] = linkedObject.common.role;
						}
					}

					if (linkedObject.common.unit) {
						if (parentObject.common.unit) {
							if (parentObject.common.unit != linkedObject.common.unit) {
								// nur übergeben wenn unterschiedlich zwischen linkedObject & parentObject ist
								customForParentObj["number_unit"] = linkedObject.common.unit;
								expertSettings = true;
							}
						} else {
							if (linkedObject.common.type === 'number' && parentObject.common.type === 'string') {
								// string_to_number: unit muss in andere prop gespreichert werden
								customForParentObj["string_to_number_unit"] = linkedObject.common.unit;
								expertSettings = true;
							} else {
								customForParentObj["number_unit"] = linkedObject.common.unit;
								expertSettings = true;
							}
						}
					}

					if (linkedObject.common.max) {
						if (parentObject.common.max) {
							if (parentObject.common.max != linkedObject.common.max) {
								// nur übergeben wenn unterschiedlich zwischen linkedObject & parentObject ist
								customForParentObj["number_max"] = linkedObject.common.max;
								expertSettings = true;
							}
						} else {
							customForParentObj["number_max"] = linkedObject.common.max;
							expertSettings = true;
						}
					}

					if (linkedObject.common.min) {
						if (parentObject.common.min) {
							if (parentObject.common.min != linkedObject.common.min) {
								// nur übergeben wenn unterschiedlich zwischen linkedObject & parentObject ist
								customForParentObj["number_min"] = linkedObject.common.min;
								expertSettings = true;
							}
						} else {
							customForParentObj["number_min"] = linkedObject.common.min;
							expertSettings = true;
						}
					}

					if (linkedObject.common.type) {
						if (parentObject.common.type && parentObject.common.type != linkedObject.common.type) {
							// nur übergeben wenn Einheit unterschiedlich zwischen linkedObject & parentObject ist
							let convertToKey = parentObject.common.type + "_convertTo";

							if (linkedObject.common.custom && linkedObject.common.custom[this.namespace] && linkedObject.common.custom[this.namespace].number_to_duration_format) {
								// Spezial Format: Duration
								customForParentObj[convertToKey] = "duration"
								expertSettings = true;
							} else if (linkedObject.common.custom && linkedObject.common.custom[this.namespace] && linkedObject.common.custom[this.namespace].number_to_datetime_format) {
								// Spezial Format: DateTime
								customForParentObj[convertToKey] = "datetime"
								expertSettings = true;
							} else if (linkedObject.common.custom && linkedObject.common.custom[this.namespace] && linkedObject.common.custom[this.namespace].string_to_duration_format) {
								// Spezial Format: Duration
								customForParentObj[convertToKey] = "duration"
								expertSettings = true;
							} else if (linkedObject.common.custom && linkedObject.common.custom[this.namespace] && linkedObject.common.custom[this.namespace].string_to_datetime_format) {
								// Spezial Format: DateTime
								customForParentObj[convertToKey] = "datetime"
								expertSettings = true;
							} else {
								// kein Spezial Format
								customForParentObj[convertToKey] = linkedObject.common.type;
								expertSettings = true;
							}
						}
					}

					// custom Data vom linked Object holen und um nicht benötigte keys für das parentObject bereinigen
					let customFromLinkedObject = linkedObject.common.custom[this.namespace];

					if (customFromLinkedObject.enabled) {
						delete customFromLinkedObject.enabled;
					}

					if (customFromLinkedObject.parentId) {
						delete customFromLinkedObject.parentId;
					}

					if (customFromLinkedObject.parentType) {
						delete customFromLinkedObject.parentType;
					}

					if (customFromLinkedObject.isLinked || !customFromLinkedObject.isLinked) {
						delete customFromLinkedObject.isLinked;
					}

					// bereinigt custom Data und common Data vom linkedObject zusammenführen
					if (Object.keys(customFromLinkedObject).length > 0) {
						// Wenn custom Daten in linkedObject vorhanden -> dann expertSettings setzen
						expertSettings = true;
					}
					Object.assign(customForParentObj, customFromLinkedObject);

					// weitere benötigte Daten hinzufügen
					customForParentObj.enabled = true;
					customForParentObj.linkedId = linkedObject._id.replace(this.namespace + ".", "");
					customForParentObj.expertSettings = expertSettings;

					// custom Data an parentObject übergeben
					if (parentObject.common.custom) {
						// custom von anderen Adaptern vorhanden
						parentObject.common.custom[this.namespace] = customForParentObj;
					} else {
						// kein custom vorhanden
						parentObject.common.custom = { [this.namespace]: customForParentObj };
					}

					// parentObject aktualisieren -> linkedObject Daten werden automatisch wegen neustart des Adapters nach dem speichern aktualisiert
					await this.setForeignObjectAsync(parentId, parentObject);

					this.log.info(`[assignToParentObject] linkedObject '${linkedId}' assigned to parentObject '${parentId}' successful`);

					return { success: true, error: null };
				}
			}
		} catch (err) {
			this.log.error(`[assignToParentObject] linkedObject '${linkedId}', parentObject '${parentId}' error: ${err.message}`);
			this.log.error("[assignToParentObject] stack: " + err.stack);

			return { success: true, error: err.message };
		}
	}

	/**
	 * @param {string} id
	 * @param {ioBroker.State} state
	 * @param {string} objId
	 * @param {string} logPrefix
	 */
	async logStateChange(id, state, objId, logPrefix, changedValue) {
		let objState = await this.getForeignStateAsync(objId);

		let logChangeStateFor = "parentObject";
		if (logPrefix === "parentObject") {
			logChangeStateFor = "linkedObject";
		}

		if (objState) {
			if (state.val != objState.val || state.ack != objState.ack) {
				this.log.debug(`[onStateChange] ${logPrefix} state '${id}' changed to '${state.val}' (ack = ${state.ack}) --> set ${logChangeStateFor} state '${objId}' to '${changedValue}'`)
			} else if (state.ts != objState.ts) {
				this.log.debug(`[onStateChange] ${logPrefix} state '${id}' timestamp changed --> set ${logChangeStateFor} state '${objId}' to '${changedValue}'`)
			} else {
				this.log.debug(`[onStateChange] ${logPrefix} state '${id}' other changes  --> set ${logChangeStateFor} state '${objId}' to '${changedValue}'`)
			}
		} else {
			this.log.debug(`[onStateChange] ${logPrefix} empty state '${id}' set to '${state.val}' (ack = ${state.ack}) --> set ${logChangeStateFor} state '${objId}' to '${changedValue}'`)
		}
	}

	async initialObjects() {
		this.log.info('[initialObjects] started...')

		// benötigte Daten aus System Config holen
		this.getSystemConfig();

		// all unsubscripe to begin completly new
		this.unsubscribeForeignStates("*");

		this.dicLinkedObjectsStatus = {};				// Dic für 'isLinked' Status aller linkedObjects
		this.dicLinkedParentObjects = {};				// Dic für parentObjects die mit einem linkedObject verlinkt sind

		await this.resetAllLinkedObjectsStatus();
		await this.createAllLinkedObjects();
		await this.removeAllNotLinkedObjects();

		if (this.dicLinkedObjectsStatus) this.log.debug("[initialObjects] 'dicLinkedObjectsStatus' items count: " + Object.keys(this.dicLinkedObjectsStatus).length);

		this.storeInfoStates();

		// subscribe für alle 'states' des Adapters, um Änderungen mitzubekommen
		await this.subscribeStatesAsync('*');

		this.log.info('[initialObjects] finished')
	}

	sort_by_key(array, key) {
		return array.sort(function (a, b) {
			var x = a[key]; var y = b[key];
			return ((x < y) ? -1 : ((x > y) ? 1 : 0));
		});
	}

	async getSystemConfig() {
		// benötigte Daten aus System Config holen
		var sysConfig = Object(await this.getForeignObjectAsync('system.config'));

		if (sysConfig && sysConfig.common) {

			if (sysConfig.common.language) {
				// language übergeben
				mySystemConfig.language = sysConfig.common.language;
			}

			if (sysConfig.common.dateFormat) {
				mySystemConfig.dateFormat = sysConfig.common.dateFormat;
			}

			this.log.debug(`[getSystemConfig] system configs successful loaded: '${JSON.stringify(mySystemConfig)}'`);
		} else {
			this.log.warn(`[getSystemConfig] could not load system configs! Using adapter default values '${JSON.stringify(mySystemConfig)}'`);
		}
	}

	/*
	* 'custom.isLinked' auf 'False' für alle vorhanden verlinkten datenpunkte setzen -> status wird später zum löschen benötigt
	* auch für parentObject die inzwischen auf 'enabled==false' gesetzt wurden
	*/
	async resetAllLinkedObjectsStatus() {
		// alle Datenpunkte des Adapters durchlaufen
		let linkedObjList = await this.getAdapterObjectsAsync();
		for (let idLinkedObj in linkedObjList) {
			let linkedObj = linkedObjList[idLinkedObj];

			await this.resetLinkedObjectStatus(linkedObj);
		}

		if (this.dicLinkedObjectsStatus) {
			this.log.debug("[resetAllLinkedObjectsStatus] 'dicLinkedObjectsStatus' items count: " + Object.keys(this.dicLinkedObjectsStatus).length);
			this.log.silly("[resetAllLinkedObjectsStatus] linkedObjects status " + JSON.stringify(this.dicLinkedObjectsStatus));
		}
	}

	/**
	 * 'custom.isLinked' auf 'False' für linkedObject setzen
	 * @param {ioBroker.Object} linkedObj
	 */
	async resetLinkedObjectStatus(linkedObj) {
		if (linkedObj && linkedObj.common && linkedObj.common.custom && linkedObj.common.custom[this.namespace] &&
			(linkedObj.common.custom[this.namespace].isLinked || !linkedObj.common.custom[this.namespace].isLinked)) {

			// Wenn Datenpunkt Property 'isLinked' hat, dann auf 'False' setzen
			linkedObj.common.custom[this.namespace].isLinked = false;
			linkedObj.common.icon = 'linkeddevices_missing.png';

			// existierende linkedObjects in dict packen
			if (this.dicLinkedObjectsStatus) this.dicLinkedObjectsStatus[linkedObj._id] = false;

			await this.setForeignObjectAsync(linkedObj._id, linkedObj);
			this.log.debug("[resetLinkedObjectStatus] 'isLinked' status reseted for '" + linkedObj._id + "'");
		}
	}

	/**
	 * 'custom.isLinked' auf 'False' für linkedId setzen
	 * @param {String} linkedId
	 */
	async resetLinkedObjectStatusById(linkedId) {
		let linkedObj = Object();
		linkedObj = await this.getForeignObjectAsync(linkedId);

		await this.resetLinkedObjectStatus(linkedObj);

		this.logDicLinkedObjectsStatus();
	}

	/*
	* alle Obejkte finden, die verlinkt werden sollen und linkedObject erzeugen bzw. aktualisieren 
	*/
	async createAllLinkedObjects() {
		let parentObjList = await this.getForeignObjectsAsync('');
		for (let idParentObj in parentObjList) {
			let parentObj = parentObjList[idParentObj]

			await this.createLinkedObject(parentObj);
		}

		if (this.dicLinkedObjectsStatus) {
			this.log.debug("[createAllLinkedObjects] 'dicLinkedObjectsStatus' items count: " + Object.keys(this.dicLinkedObjectsStatus).length);
			this.log.silly("[createAllLinkedObjects] linkedObjects status " + JSON.stringify(this.dicLinkedObjectsStatus));

			for (var key in this.dicLinkedObjectsStatus) {
				if (this.dicLinkedObjectsStatus.hasOwnProperty(key) && this.dicLinkedObjectsStatus[key] === false) {
					this.log.warn(`linkedObject '${key}' is not linked any more!`);
				}
			}
		}

		if (this.dicLinkedParentObjects) {
			this.log.info("[createAllLinkedObjects] count of active linkedObjects: " + Object.keys(this.dicLinkedParentObjects).length)
			this.log.debug("[createAllLinkedObjects] active linkedObjects " + JSON.stringify(this.dicLinkedParentObjects));
		}
	}

	/**
	 * Create linked object channel if it not exist
	 * @param {string} linkedId
	 */
	async createLinkedObjectChannel(linkedId) {
		// id um namespace bereinigen
		let cleanId = linkedId.replace(`${this.namespace}.`, '');

		// wenn '.' vorhanden, dann channel erstellen
		if (cleanId.includes('.')) {

			let channelId = linkedId;
			for (var i = 0; i <= cleanId.split(".").length - 1; i++) {
				// bis zum namespace channels erstellen
				channelId = channelId.substring(0, channelId.lastIndexOf('.'))

				if (channelId && channelId != this.namespace) {
					let channelExistObj = await this.getObjectAsync(channelId);

					if (!channelExistObj) {
						// channel Objekt existiert nicht -> anlegen
						await this.setObjectNotExistsAsync(channelId, {
							_id: channelId,
							type: "channel",
							common: {
								name: `${channelId.replace(`${this.namespace}.`, '').replace(/\./g, ' ')}`,
								desc: 'Created by linkeddevices'
							},
							native: {}
						});

						this.log.debug(`[createLinkedObjectChannel] channel '${channelId}' created.`);
					} else {
						this.log.debug(`[createLinkedObjectChannel] channel '${channelId}' already exist!`);
					}
				}
			}
		}
	}

	/**
	 * linkedObject mit parentObject erstellen bzw. aktualisieren und 'isLinked' Status setzen (= hat eine existierende Verlinkung)
	 * @param {ioBroker.Object} parentObj
	 * @param {ioBroker.Object} oldLinkedObj
	 */
	async createLinkedObject(parentObj, oldLinkedObj = Object()) {
		try {
			var linkedId = null;

			// Datenpunkte sind von 'linkeddevices' und aktiviert
			if (parentObj && !parentObj._id.startsWith(this.namespace) && parentObj.common && parentObj.common.custom && parentObj.common.custom[this.namespace]
				&& parentObj.common.custom[this.namespace].enabled) {

				// Todo: check structure if channel, device, etc.
				// let tmp = parentObj._id.lastIndexOf(".");
				// this.log.info(parentObj._id.substring(0, tmp));

				if (!parentObj.common.custom[this.namespace].linkedId || !parentObj.common.custom[this.namespace].linkedId.length || parentObj.common.custom[this.namespace].linkedId === "") {
					// 'custom.linkedId' fehlt oder hat keinen Wert
					this.log.error("[createLinkedObject] No 'linkedId' defined for object: '" + parentObj._id + "'");
				} else {
					// 'custom.linkedId' vorhanden 
					linkedId = this.getLinkedObjectId(parentObj);

					if ((/[*?"'\[\]]/).test(linkedId)) {
						// 'custom.linkedId' enthält illegale zeichen
						this.log.error("[createLinkedObject] linkedId: '" + linkedId + "' contains illegal characters (parentId: '" + parentObj._id + "')");

					} else {
						// Create channel object if need.
						await this.createLinkedObjectChannel(linkedId);

						// LinkedObjekt daten übergeben
						let linkedObj = Object();
						linkedObj.type = parentObj.type;


						// common data mit expert settings an linkedObject übergeben
						linkedObj.common = this.getCommonData(parentObj, linkedId);

						// Übernehmen custom data von anderen Adaptern
						await this.setExistingCustomData(linkedId, linkedObj, oldLinkedObj);

						// custom data (expert settings) an linkedObject übergeben
						linkedObj.common.custom[this.namespace] = this.getCustomData(parentObj, linkedId);
						this.log.silly(`[createLinkedObject] custom data set for '${linkedId}' ("${this.namespace}":${JSON.stringify(linkedObj.common.custom[this.namespace])})`)

						// falls native data vorhanden sind -> übergeben
						if (parentObj.native) {
							linkedObj.native = parentObj.native;
							if (Object.keys(linkedObj.native).length > 0) {
								this.log.debug(`[createLinkedObject] native data set for '${linkedId}' ("native":${JSON.stringify(parentObj.native)})`)
							} else {
								this.log.silly(`[createLinkedObject] native data set for '${linkedId}' ("native":${JSON.stringify(parentObj.native)})`)
							}
						}

						let merged = false;

						let existingLinkedObj = await this.getForeignObjectAsync(linkedId);
						if (existingLinkedObj && linkedObj && linkedObj.common && linkedObj.common.custom && linkedObj.common.custom[this.namespace] && linkedObj.common.custom[this.namespace].mergeSettingsOnRestart) {
							// wenn linkedObject bereits existiert und user 'merge' setting aktiviert hat -> linkedObject settings mergen
							merged = true;
							await this.extendForeignObjectAsync(linkedId, linkedObj);
						} else {
							// LinkedObjekt erzeugen oder Änderungen schreiben -> wird vollständig überschrieben
							await this.setForeignObjectAsync(linkedId, linkedObj);
						}

						// ggf. können neue linkedObjects hinzugekommen sein -> in dic packen
						if (this.dicLinkedObjectsStatus) this.dicLinkedObjectsStatus[linkedId] = true;
						this.logDicLinkedObjectsStatus();

						// linked parentObjects in dic speichern
						if (this.dicLinkedParentObjects) this.dicLinkedParentObjects[parentObj._id] = linkedId;
						this.logDicLinkedParentObjects();

						// state value für linkedObject setzen, wird vom parent übernommen
						let parentState = await this.getForeignStateAsync(parentObj._id);
						let linkedState = await this.getForeignStateAsync(linkedId);

						if (parentState) {
							// ggf. kann für das linkedObject eine Umrechnung festgelegt sein
							let parentValue = await this.getConvertedValue(linkedId, parentState.val);

							if (linkedState) {
								if (linkedState.val != parentValue || linkedState.ack != parentState.ack) {
									// Nur aktualisieren, sofern nicht gleich -> damit wird z.B. bei button kein press ausgelöst
									await this.setForeignStateAsync(linkedId, { val: parentValue, ack: true });
									this.log.debug(`[createLinkedObject] update value for '${linkedId}' to '${parentValue}'`);
								} else {
									this.log.debug(`[createLinkedObject] value for '${linkedId}' is up to date`);
								}
							} else {
								// linkedObject hat noch keinen state value
								await this.setForeignStateAsync(linkedId, { val: parentValue, ack: true });
								this.log.debug(`[createLinkedObject] set value for '${linkedId}' to '${parentValue}'`);
							}
						} else {
							this.log.debug(`[createLinkedObject] no value set for '${linkedId}' because parentObject has no value`);
						}

						// subscribe für parentObject 'state', um Änderungen mitzubekommen
						await this.subscribeForeignStatesAsync(parentObj._id);

						if (parentObj.common.type === linkedObj.common.type) {
							this.log.info(`[createLinkedObject] linked object '${parentObj._id}'${(merged) ? ' merged' : ''} to '${linkedId}'`);
						} else {
							this.log.info(`[createLinkedObject] linked object '${parentObj._id}' (${parentObj.common.type})${(merged) ? ' merged' : ''} to '${linkedId}' (${linkedObj.common.type})`);
						}
					}
				}
			}
		} catch (err) {
			this.log.error(`[createLinkedObject] parentObject '${parentObj._id}', linkedObject '${linkedId}' error: ${err.message}`);
			this.log.error("[createLinkedObject] stack: " + err.stack);
		}
	}

	/*
	* alle LinkedObjects löschen, die keine existierende Verlinkung mehr haben ('custom.isLinked' == false), sofern nicht in Config deaktiviert
	*/
	async removeAllNotLinkedObjects() {
		if (this.config.deleteDeadLinkedObjects) {
			// dic verwenden		
			if (this.dicLinkedObjectsStatus) {
				for (var linkedId in this.dicLinkedObjectsStatus) {

					await this.removeNotLinkedObject(linkedId);
				}
			}
		}
	}

	/**
	 * LinkedObject löschen, das keine existierende Verlinkung mehr hat ('custom.isLinked' == false), sofern nicht in Config deaktiviert
	 * @param {string} linkedId
	 */
	async removeNotLinkedObject(linkedId) {
		if (this.config.deleteDeadLinkedObjects) {
			if (this.dicLinkedObjectsStatus && this.dicLinkedObjectsStatus[linkedId] === false) {
				// alle linkedObject ohne existierende Verlinkung löschen
				await this.delForeignObjectAsync(linkedId);

				// linkedId im dicLinkedObjectsStatus löschen
				delete this.dicLinkedObjectsStatus[linkedId];

				this.logDicLinkedParentObjects();
				this.logDicLinkedObjectsStatus();

				this.log.debug("[removeNotLinkedObject] not linkedObject '" + linkedId + "' deleted");
			}
		}
	}

	//#region Functions

	/**
	 * linkedId des linkedObjects erzeugen
	 * @param {ioBroker.Object} parentObj
	 */
	getLinkedObjectId(parentObj) {
		// @ts-ignore
		return this.namespace + "." + parentObj.common.custom[this.namespace].linkedId;
	}

	/**
	 * Common data für linkedObject erzeugen
	 * @param {ioBroker.Object} parentObj
	 * @param {string} linkedId
	 */
	getCommonData(parentObj, linkedId) {
		// Common Data vom parentObject übergeben
		var commonData = parentObj.common;

		// durch den Adapter erzeugte common data
		commonData.icon = "linkeddevices_small.png"
		commonData.desc = "Created by linkeddevices";
		//linkedObj.native = parentObj.native;

		// common data aus expert settings übergeben, sofern vorhanden
		let expertSettings = {};
		if (parentObj && parentObj.common && parentObj.common.custom) {

			if (parentObj.common.custom[this.namespace].name && (parentObj.common.custom[this.namespace].name.length > 0 || parentObj.common.custom[this.namespace].name != "")) {
				// 'name' von expert settings übernehmen
				commonData.name = parentObj.common.custom[this.namespace].name;
				this.log.silly(`[getCommonData] using custom name '${commonData.name}' for '${linkedId}'`)
			}

			if (parentObj.common.custom[this.namespace].role && (parentObj.common.custom[this.namespace].role.length > 0 || parentObj.common.custom[this.namespace].role != "")) {
				// 'role' von expert settings übernehmen
				commonData.role = parentObj.common.custom[this.namespace].role;
				this.log.silly(`[getCommonData] using custom role '${commonData.role}' for '${linkedId}'`)
			}

			// Zunächst prüfen ob typ konvertierung in expert settings eingestellt ist
			if (parentObj.common.custom[this.namespace].number_convertTo) {

				if (parentObj.common.custom[this.namespace].number_convertTo === "duration") {
					// number -> duration: type ist 'string'
					expertSettings.type = "string";
				} else if (parentObj.common.custom[this.namespace].number_convertTo === "datetime") {
					// number -> datetime: type ist 'string'
					expertSettings.type = "string";
				} else {
					// keine spezieller type, kann direkt vom parentObject übernommen werden
					expertSettings.type = parentObj.common.custom[this.namespace].number_convertTo;
				}

			} else if (parentObj.common.custom[this.namespace].boolean_convertTo) {
				expertSettings.type = parentObj.common.custom[this.namespace].boolean_convertTo;

			} else if (parentObj.common.custom[this.namespace].string_convertTo) {

				if (parentObj.common.custom[this.namespace].string_convertTo === "number") {
					// string -> number
					expertSettings.type = "number";

					if (parentObj.common.custom[this.namespace].string_to_number_unit) {
						// evtl. ist eine unit vorgeben
						expertSettings.unit = parentObj.common.custom[this.namespace].string_to_number_unit
					}

				} else if (parentObj.common.custom[this.namespace].string_convertTo === "duration") {
					// string -> duration: type ist 'string'
					expertSettings.type = "string";
				} else if (parentObj.common.custom[this.namespace].string_convertTo === "datetime") {
					// string -> datetime: type ist 'string'
					expertSettings.type = "string";
				} else {
					// keine spezieller type, kann direkt vom parentObject übernommen werden
					expertSettings.type = parentObj.common.custom[this.namespace].string_convertTo;
				}
			}

			if (!expertSettings.type || expertSettings.type === parentObj.common.type) {
				// Keine Typ Konvertierung -> expert Settings laden, die Auswirkung auf common haben

				// Experteneinstellungen für common attribute übergeben
				if (parentObj.common.custom[this.namespace].number_unit) {
					// number: 'number_unit' von expert settings übernehmen
					expertSettings.unit = parentObj.common.custom[this.namespace].number_unit;
				}

				if (parentObj.common.custom[this.namespace].number_min || parentObj.common.custom[this.namespace].number_min === 0) {
					// number: 'number_min' von expert settings übernehmen
					expertSettings.min = parentObj.common.custom[this.namespace].number_min;
				}

				if (parentObj.common.custom[this.namespace].number_max || parentObj.common.custom[this.namespace].number_max === 0) {
					// number: 'number_max' von expert settings übernehmen
					expertSettings.max = parentObj.common.custom[this.namespace].number_max;
				}

			} else {
				// Typ wurde geändert
				if (`${parentObj.common.type}_to_${expertSettings.type}` === "number_to_boolean") {
					// number -> boolean: typ spezifische properties entfernen, ändern oder hinzufügen
					delete commonData.unit;
					delete commonData.max;
					delete commonData.min;
					commonData.def = false;
				} else if (`${parentObj.common.type}_to_${expertSettings.type}` === "number_to_string") {
					// number -> string: typ spezifische properties entfernen, ändern oder hinzufügen
					delete commonData.unit;
					delete commonData.max;
					delete commonData.min;
					commonData.def = "";
				} else if (`${parentObj.common.type}_to_${expertSettings.type}` === "boolean_to_string") {
					// boolean -> string: typ spezifische properties entfernen, ändern oder hinzufügen
					commonData.def = "";
				} else if (`${parentObj.common.type}_to_${expertSettings.type}` === "string_to_boolean") {
					// string -> boolean: typ spezifische properties entfernen, ändern oder hinzufügen
					commonData.def = false;
				} else if (`${parentObj.common.type}_to_${expertSettings.type}` === "string_to_number") {
					delete commonData.def;
				}
			}

			if (Object.keys(expertSettings).length > 0) {
				this.log.debug(`[getCommonData] common expert settings for '${linkedId}': ${JSON.stringify(expertSettings)}`)
			} else {
				this.log.debug(`[getCommonData] no common expert settings for '${linkedId}'`)
			}
		}

		return Object.assign({}, commonData, expertSettings);
	}

	/**
	 * Custom data für linkedObejct erzeugen
	 * @param {ioBroker.Object} parentObj
	 * @param {string} linkedId
	 */
	getCustomData(parentObj, linkedId) {
		// @ts-ignore
		var linkedObjectCustom = { "enabled": true, "parentId": parentObj._id, "parentType": parentObj.common.type, "isLinked": true }

		var expertSettings = {};

		if (parentObj && parentObj.common && parentObj.common.custom && parentObj.common.custom[this.namespace] && parentObj.common.custom[this.namespace].mergeSettingsOnRestart) {
			// 'merge' settings übergeben 
			expertSettings.mergeSettingsOnRestart = parentObj.common.custom[this.namespace].mergeSettingsOnRestart;
		}

		Object.assign(expertSettings, this.getCustomDataTypeNumber(parentObj));
		Object.assign(expertSettings, this.getCustomDataTypeBoolean(parentObj));
		Object.assign(expertSettings, this.getCustomDataTypeString(parentObj));


		if (Object.keys(expertSettings).length > 0) {
			this.log.debug(`[getCustomData] custom expert settings for '${linkedId}': ${JSON.stringify(expertSettings)}`)
		} else {
			this.log.debug(`[getCustomData] no custom expert settings for '${linkedId}'`)
		}

		return Object.assign({}, linkedObjectCustom, expertSettings);
	}

	/**
	 * Custom data für linkedObject erzeugen, wenn parentObject vom type 'number' ist
	 * @param {ioBroker.Object} parentObj
	 */
	getCustomDataTypeNumber(parentObj) {
		var expertSettings = {};

		if (parentObj && parentObj.common && parentObj.common.custom) {

			if (parseInt(parentObj.common.custom[this.namespace].number_maxDecimal) != NaN && (parentObj.common.custom[this.namespace].number_maxDecimal != "" || parentObj.common.custom[this.namespace].number_maxDecimal === 0)) {
				// calculation vorhanden, nur bei type = number
				expertSettings.number_maxDecimal = parentObj.common.custom[this.namespace].number_maxDecimal;
			}

			if (parentObj.common.custom[this.namespace].number_calculation) {
				// number_calculation vorhanden, nur bei type = number
				expertSettings.number_calculation = parentObj.common.custom[this.namespace].number_calculation;
			}

			if (parentObj.common.custom[this.namespace].number_calculation_readOnly) {
				// calculation vorhanden, nur bei type = number
				expertSettings.number_calculation_readOnly = parentObj.common.custom[this.namespace].number_calculation_readOnly;
			}

			// custom settings für type 'number' mit konvertierung nach 'boolean' übergeben
			if (parentObj.common.custom[this.namespace].number_to_boolean_condition) {
				// number -> boolean: linkedObject Bedingung für True
				expertSettings.number_to_boolean_condition = parentObj.common.custom[this.namespace].number_to_boolean_condition;
			}

			if (parentObj.common.custom[this.namespace].number_to_boolean_value_true) {
				// number -> boolean: parentObject Wert für True
				expertSettings.number_to_boolean_value_true = parentObj.common.custom[this.namespace].number_to_boolean_value_true;
			}

			if (parentObj.common.custom[this.namespace].number_to_boolean_value_false) {
				// number -> boolean: parentObject Wert für False
				expertSettings.number_to_boolean_value_false = parentObj.common.custom[this.namespace].number_to_boolean_value_false;
			}

			if (parentObj.common.custom[this.namespace].number_to_duration_convert_seconds) {
				// number -> duration (string): parentObject Umrechnung in sekunden
				expertSettings.number_to_duration_convert_seconds = parentObj.common.custom[this.namespace].number_to_duration_convert_seconds;
			}

			if (parentObj.common.custom[this.namespace].number_to_duration_format) {
				// number -> duration (string): parentObject Anzeigeformat der Dauer
				expertSettings.number_to_duration_format = parentObj.common.custom[this.namespace].number_to_duration_format;
			} else {
				if (parentObj.common.custom[this.namespace].number_convertTo && parentObj.common.custom[this.namespace].number_convertTo === "duration") {
					// Duration Format ist zwinged erforderlich, um Spezial Format zu erkennen.
					expertSettings.number_to_duration_format = mySystemConfig.durationFormat;
					this.log.warn(`[getCustomDataTypeNumber] no duration format set for parentObject '${parentObj._id}' -> using default format '${mySystemConfig.durationFormat}'`)
				}
			}

			if (parentObj.common.custom[this.namespace].number_to_datetime_convert_seconds) {
				// number -> datetime (string): parentObject Umrechnung in sekunden
				expertSettings.number_to_datetime_convert_seconds = parentObj.common.custom[this.namespace].number_to_datetime_convert_seconds;
			}

			if (parentObj.common.custom[this.namespace].number_to_datetime_format) {
				// number -> datetime (string): parentObject Anzeigeformat der DateTime
				expertSettings.number_to_datetime_format = parentObj.common.custom[this.namespace].number_to_datetime_format;
			} else {
				if (parentObj.common.custom[this.namespace].number_convertTo && parentObj.common.custom[this.namespace].number_convertTo === "datetime") {
					// DateTime Format ist zwinged erforderlich, um Spezial Format zu erkennen.
					expertSettings.number_to_datetime_format = mySystemConfig.dateFormat;
					this.log.warn(`[getCustomDataTypeNumber] no datetime format set for parentObject '${parentObj._id}' -> using default format '${mySystemConfig.dateFormat}'`)
				}
			}

		}
		return expertSettings;
	}

	/**
	 * Custom data für linkedObject erzeugen, wenn parentObject vom type 'boolean' ist
	 * @param {ioBroker.Object} parentObj
	 */
	getCustomDataTypeBoolean(parentObj) {
		var expertSettings = {};

		if (parentObj && parentObj.common && parentObj.common.custom) {

			if (parentObj.common.custom[this.namespace].boolean_invert || parentObj.common.custom[this.namespace].boolean_invert === false) {
				// boolean invert
				expertSettings.boolean_invert = parentObj.common.custom[this.namespace].boolean_invert;
			}

			if (parentObj.common.custom[this.namespace].boolean_to_string_value_false) {
				// boolean -> string: linkedObject Wert für False
				expertSettings.boolean_to_string_value_false = parentObj.common.custom[this.namespace].boolean_to_string_value_false;
			}

			if (parentObj.common.custom[this.namespace].boolean_to_string_value_true) {
				// boolean -> string: linkedObject Wert für True
				expertSettings.boolean_to_string_value_true = parentObj.common.custom[this.namespace].boolean_to_string_value_true;
			}
		}
		return expertSettings;
	}

	/**
	 * Custom data für linkedObject erzeugen, wenn parentObject vom type 'string' ist
	 * @param {ioBroker.Object} parentObj
	 */
	getCustomDataTypeString(parentObj) {
		var expertSettings = {};

		if (parentObj && parentObj.common && parentObj.common.custom) {

			if (parentObj.common.custom[this.namespace].string_prefix) {
				expertSettings.string_prefix = parentObj.common.custom[this.namespace].string_prefix;
			}

			if (parentObj.common.custom[this.namespace].string_suffix) {
				expertSettings.string_suffix = parentObj.common.custom[this.namespace].string_suffix;
			}

			if (parentObj.common.custom[this.namespace].string_to_boolean_value_true || parentObj.common.custom[this.namespace].string_to_boolean_value_true === 0) {
				// string -> boolean: linkedObject Wert für True
				expertSettings.string_to_boolean_value_true = parentObj.common.custom[this.namespace].string_to_boolean_value_true;
			}

			if (parentObj.common.custom[this.namespace].string_to_boolean_value_false || parentObj.common.custom[this.namespace].string_to_boolean_value_false === 0) {
				// string -> boolean: linkedObject Wert für False
				expertSettings.string_to_boolean_value_false = parentObj.common.custom[this.namespace].string_to_boolean_value_false;
			}

			if (parseInt(parentObj.common.custom[this.namespace].string_to_number_maxDecimal) != NaN && (parentObj.common.custom[this.namespace].string_to_number_maxDecimal != "" || parentObj.common.custom[this.namespace].string_to_number_maxDecimal === 0)) {
				expertSettings.string_to_number_maxDecimal = parentObj.common.custom[this.namespace].string_to_number_maxDecimal;
			}

			if (parentObj.common.custom[this.namespace].string_to_number_calculation) {
				expertSettings.string_to_number_calculation = parentObj.common.custom[this.namespace].string_to_number_calculation;
			}

			if (parentObj.common.custom[this.namespace].string_to_number_calculation_readOnly) {
				expertSettings.string_to_number_calculation_readOnly = parentObj.common.custom[this.namespace].string_to_number_calculation_readOnly;
			}

			if (parentObj.common.custom[this.namespace].string_to_duration_format) {
				// string -> duration (string): parentObject Anzeigeformat der Dauer
				expertSettings.string_to_duration_format = parentObj.common.custom[this.namespace].string_to_duration_format;
			} else {
				if (parentObj.common.custom[this.namespace].string_convertTo && parentObj.common.custom[this.namespace].string_convertTo === "duration") {
					// Duration Format ist zwinged erforderlich, um Spezial Format zu erkennen.
					expertSettings.string_to_duration_format = mySystemConfig.durationFormat;
					this.log.warn(`[getCustomDataTypeString] no duration format set for parentObject '${parentObj._id}' -> using default format '${mySystemConfig.durationFormat}'`)
				}
			}

			if (parentObj.common.custom[this.namespace].string_to_datetime_parser) {
				// string -> datetime (string): parentObject parser für input format
				expertSettings.string_to_datetime_parser = parentObj.common.custom[this.namespace].string_to_datetime_parser;
			} else {
				if (parentObj.common.custom[this.namespace].string_convertTo && parentObj.common.custom[this.namespace].string_convertTo === "datetime") {
					this.log.error(`[getCustomDataTypeString] no datetime parser set for parentObject '${parentObj._id}' -> check your expertsettings!`)
				}
			}

			if (parentObj.common.custom[this.namespace].string_to_datetime_format) {
				// string -> datetime (string): parentObject Anzeigeformat der DateTime
				expertSettings.string_to_datetime_format = parentObj.common.custom[this.namespace].string_to_datetime_format;
			} else {
				if (parentObj.common.custom[this.namespace].string_convertTo && parentObj.common.custom[this.namespace].string_convertTo === "datetime") {
					// DateTime Format ist zwinged erforderlich, um Spezial Format zu erkennen.
					expertSettings.string_to_datetime_format = mySystemConfig.dateFormat;
					this.log.warn(`[getCustomDataTypeString] no datetime format set for parentObject '${parentObj._id}' -> using default format '${mySystemConfig.dateFormat}'`)
				}
			}
		}
		return expertSettings;
	}

	/**
	 * Sofern von anderen Adaptern custom data existieren, müssen diese bei Änderungen am linkedObject übernommen werden	 
	 * @param {string} linkedId
	 * @param {ioBroker.Object} linkedObj
	 * @param {ioBroker.Object} oldLinkedObj
	 */
	async setExistingCustomData(linkedId, linkedObj, oldLinkedObj) {
		// custom settings von anderen Adaptern ggf. übernehmen
		let existingLinkedObj = Object();
		let isMoved = false;

		if (oldLinkedObj && oldLinkedObj.common && oldLinkedObj.common.custom) {
			// linkedObject wurde 'linkedId' geändert
			existingLinkedObj = oldLinkedObj;
			isMoved = true;
		} else {
			// linkedObject wurde geändert (nicht 'linkedId')
			existingLinkedObj = await this.getForeignObjectAsync(linkedId);
		}

		if (existingLinkedObj && existingLinkedObj.common && existingLinkedObj.common.custom) {
			// custom data anderer adapter übernehmen
			let adapterArr = [];
			for (var adapter in existingLinkedObj.common.custom) {

				if (adapter != this.namespace) {
					// @ts-ignore
					linkedObj.common.custom[adapter] = existingLinkedObj.common.custom[adapter];

					adapterArr.push(adapter);

					if (!isMoved) {
						this.log.silly(`[setExistingCustomData] keep custom data for "${adapter}":${JSON.stringify(existingLinkedObj.common.custom[adapter])} for linkedObject '${linkedId}'`)
					} else {
						this.log.silly(`[setExistingCustomData] move custom data for "${adapter}":${JSON.stringify(existingLinkedObj.common.custom[adapter])} from '${existingLinkedObj._id}' to linkedObject '${linkedId}'`)
					}
				}
			}

			if (adapterArr.length > 0) {
				if (!isMoved) {
					this.log.debug(`[setExistingCustomData] keep custom data for adapters: '${adapterArr.toString().replace(/,/g, ", ")}' for linkedObject '${linkedId}'`)
				} else {
					this.log.debug(`[setExistingCustomData] move custom data for adapters: '${adapterArr.toString().replace(/,/g, ", ")}' from '${existingLinkedObj._id}' to linkedObject '${linkedId}'`)
				}
			}
		}
	}

	/**
	 * Prüfen ob die angegebene linkedId schon verwendet wird
	 * @param {ioBroker.Object} parentObj
	 * @param {string | number} linkedId
	 */
	isLinkedIdInUse(parentObj, linkedId) {

		// Prüfen ob die eingebene linkedId in dicLinkedObjectsStatus ist
		if (this.dicLinkedObjectsStatus && this.dicLinkedObjectsStatus[linkedId] === true) {

			// Prüfen ob Verlinkung für diese linkedId 'custom.isLinked' true ist

			if (this.dicLinkedParentObjects && this.dicLinkedParentObjects[parentObj._id] && this.dicLinkedParentObjects[parentObj._id] === linkedId) {
				// Prüfen ob für diese linkedId das parentObject gleich ist -> es wurde nur etwas verändert
				this.log.debug("[isLinkedIdInUse] parentObject '" + parentObj._id + "' is equal -> update linkedObject '" + linkedId);
				return false;
			} else {
				// parentObject für diese linkedId ist nicht gleich -> linkedId wird schon von einem anderen parentObject verwendet, nur wenn parentId nicht undefined ist!
				// @ts-ignore
				if (this.dicLinkedParentObjects && this.dicLinkedParentObjects[parentObj._id]) {
					this.log.error("[isLinkedIdInUse] linkedId '" + linkedId + "' still in use with parentObject '" + Object.keys(this.dicLinkedParentObjects).find(key => this.dicLinkedParentObjects[key] === linkedId));
					return true;
				}
			}
		}
		if (this.dicLinkedObjectsStatus && this.dicLinkedObjectsStatus[linkedId] === false) {
			// isLinked is 'false' -> überschreiben erlaubt
			this.log.debug("[isLinkedIdInUse] overwirte linkedId '" + linkedId + "' because 'isLinked = false'");
			return false;
		}

		return false;
	}

	/**
	 * @param {string} targetId
	 * @param {any} value
	 */
	async getConvertedValue(targetId, value, targetIsParentObj = false) {
		let targetObj = await this.getForeignObjectAsync(targetId);

		let convertedValue = value;
		if (targetObj && targetObj.common && targetObj.common.custom && targetObj.common.custom[this.namespace]) {
			let sourceId = "";

			try {
				if (targetIsParentObj) {
					// state change linkedObject
					sourceId = this.namespace + "." + targetObj.common.custom[this.namespace].linkedId;
				} else {
					// state change parentObject
					sourceId = targetObj.common.custom[this.namespace].parentId;
				}

				if (targetObj.common.type === "string") {

					if (!targetIsParentObj) {
						// parentObject state ändert sich
						if (targetObj.common.custom[this.namespace].string_prefix || targetObj.common.custom[this.namespace].string_suffix) {
							// string mit prefix / suffix
							let log = false;
							let logMessage = ""

							if (targetObj.common.custom[this.namespace].string_prefix) {
								// suffix zu String hinzufügen
								convertedValue = (`${targetObj.common.custom[this.namespace].string_prefix}${convertedValue}`);

								logMessage = (`prefix: '${targetObj.common.custom[this.namespace].string_prefix}'`);
								log = true;
							}

							if (targetObj.common.custom[this.namespace].string_suffix) {
								// prefix zu String hinzufügen
								convertedValue = (`${convertedValue}${targetObj.common.custom[this.namespace].string_suffix}`);

								if (log) {
									logMessage = (`${logMessage}, suffix: '${targetObj.common.custom[this.namespace].string_suffix}'`);
								} else {
									logMessage = (`suffix: '${targetObj.common.custom[this.namespace].string_suffix}'`);
								}
								log = true;
							}

							if (log) {
								this.log.debug(`[getConvertedValue] parentObject state '${sourceId}' changed to '${value}', using ${logMessage} -> new linkedObject value is '${convertedValue}'`)
							}
						}
					} else {
						// linkedObject state ändert sich
						if (targetObj.common.custom[this.namespace].string_prefix || targetObj.common.custom[this.namespace].string_suffix) {
							// string mit prefix / suffix
							let log = false;
							let logMessage = ""

							if (targetObj.common.custom[this.namespace].string_prefix) {
								if (value.startsWith(targetObj.common.custom[this.namespace].string_prefix)) {
									var regex = new RegExp("^\(" + targetObj.common.custom[this.namespace].string_prefix + ")", "g");
									convertedValue = convertedValue.replace(regex, '')

									logMessage = (`prefix: '${targetObj.common.custom[this.namespace].string_prefix}'`);
									log = true;
								}
							}

							if (targetObj.common.custom[this.namespace].string_suffix) {
								if (value.endsWith(targetObj.common.custom[this.namespace].string_suffix)) {
									var regex = new RegExp("\(" + targetObj.common.custom[this.namespace].string_suffix + ")$", "g");
									convertedValue = convertedValue.replace(regex, '')
								}

								if (log) {
									logMessage = (`${logMessage}, suffix: '${targetObj.common.custom[this.namespace].string_suffix}'`);
								} else {
									logMessage = (`suffix: '${targetObj.common.custom[this.namespace].string_suffix}'`);
								}
								log = true;
							}

							if (log) {
								this.log.debug(`[getConvertedValue] linkedObject state '${sourceId}' changed to '${value}', remove ${logMessage} -> new linkedObject value is '${convertedValue}'`)
							}
						}
					}
				}

				if (targetObj.common.type === "number") {
					// number_calculation nur für type 'number'
					try {
						if (targetObj.common.read && !targetObj.common.write && targetObj.common.custom[this.namespace].number_calculation_readOnly && !targetIsParentObj) {
							// ReadOnly object mit calculation -> umrechnen
							let number_calculation_readOnly = targetObj.common.custom[this.namespace].number_calculation_readOnly.replace(/,/g, ".");
							convertedValue = mathjs.evaluate(`${value} ${number_calculation_readOnly}`)

							this.log.debug(`[getConvertedValue] read only parentObject state '${sourceId}' changed to '${value}', using calculation '${number_calculation_readOnly}' -> new linkedObject value is '${convertedValue}'`)

						} else if (targetObj.common.custom[this.namespace].number_calculation) {
							// object mit number_calculation -> umrechnen
							let number_calculation = targetObj.common.custom[this.namespace].number_calculation.replace(/,/g, ".");

							if (!targetIsParentObj) {
								// Umrechnung für linkedObject -> parentObject state ändert sich
								convertedValue = mathjs.evaluate(`${value} ${number_calculation}`);

								this.log.debug(`[getConvertedValue] parentObject state '${sourceId}' changed to '${value}', using calculation '${number_calculation}' -> linkedObject value is '${convertedValue}'`)
							} else {
								// Umrechnung für parentObject -> Kehrwert nehmen -> linkedObject state ändert sich
								convertedValue = mathjs.evaluate(`${value} * 1/(1${number_calculation})`);
								this.log.debug(`[getConvertedValue] linkedObject state '${sourceId}' changed to '${value}', using calculation '1/(1${number_calculation})' -> parentObject value is '${convertedValue}'`)
							}
						}
					} catch (err) {
						// falls Falsche Formel in custom dialog eingegeben wurde, input value verwenden und Fehler ausgeben
						if (targetIsParentObj) {
							this.log.error(`[getConvertedValue] there is something wrong with your calculation formula, check your expert settings input for '${targetId}'!`);
						} else {
							this.log.error(`[getConvertedValue] there is something wrong with your calculation formula, check your expert settings input for '${sourceId}'!`);
						}

						convertedValue = value;
					}

					if (!targetIsParentObj && (targetObj.common.custom[this.namespace].number_maxDecimal || targetObj.common.custom[this.namespace].number_maxDecimal === 0)) {
						// nur für linkedObject Nachkommastellen festlegen, sofern vorhanden und nicht leer
						var maxDecimal = parseInt(targetObj.common.custom[this.namespace].number_maxDecimal);
						if (!isNaN(maxDecimal)) {
							if (convertedValue !== null && convertedValue !== undefined) {
								convertedValue = mathjs.round(convertedValue, maxDecimal);
							} else {
								this.log.warn(`[getConvertedValue] sourceId '${sourceId}', targetId '${targetId}': value is '${value}' and can't be rounded!`);
							}
						}
					}
				}

				if (targetObj.common.type === "boolean") {
					if (targetObj.common.custom[this.namespace].boolean_invert) {
						convertedValue = !value;

						if (!targetIsParentObj) {
							this.log.debug(`[getConvertedValue] parentObject state '${sourceId}' changed to '${value}', using invert -> linkedObject value is '${convertedValue}'`)
						} else {
							this.log.debug(`[getConvertedValue] linkedObject state '${sourceId}' changed to '${value}', using invert -> parentObject value is '${convertedValue}'`)
						}
					}
				}

				// Type Converison: number -> boolean
				if (`${targetObj.common.custom[this.namespace].parentType}_to_${targetObj.common.type}` === "number_to_boolean" || `${targetObj.common.type}_to_${targetObj.common.custom[this.namespace].number_convertTo}` === "number_to_boolean") {

					// parentObject state hat sich geändert
					if (!targetIsParentObj) {
						// number -> boolean: linkedObject state laut condition umwandeln
						try {
							convertedValue = this.numToBoolConditionParser(value, targetObj.common.custom[this.namespace].number_to_boolean_condition);
							this.log.debug(`[getConvertedValue] parentObject state '${sourceId}' changed to '${value}', using condition '${targetObj.common.custom[this.namespace].number_to_boolean_condition}' -> linkedObject value is '${convertedValue}'`)
						} catch (err) {
							// falls Falsche Formel in custom dialog eingegeben wurde, input value verwenden und Fehler ausgeben
							convertedValue = targetObj.common.def;
							this.log.error(`[getConvertedValue] there is something wrong with your conversion condition, check your expert settings input for '${sourceId}'! -> fallback to linkedObject default '${convertedValue}'`);
						}
					}

					// linkedObject state hat sich geändert
					if (targetIsParentObj) {
						// number -> boolean: parentObject state laut wert für 'true' bzw. 'false' setzen
						if (value && (targetObj.common.custom[this.namespace].number_to_boolean_value_true || targetObj.common.custom[this.namespace].number_to_boolean_value_true === 0)) {
							// linkedObject auf 'true' geändert -> hinterlegten Wert für 'true' übergeben
							convertedValue = parseFloat(targetObj.common.custom[this.namespace].number_to_boolean_value_true);
							this.log.debug(`[getConvertedValue] linkedObject state '${sourceId}' changed to '${true}', using value '${targetObj.common.custom[this.namespace].number_to_boolean_value_true}' -> parentObject value is '${convertedValue}'`)

						} else if (!value && (targetObj.common.custom[this.namespace].number_to_boolean_value_false || targetObj.common.custom[this.namespace].number_to_boolean_value_false === 0)) {
							// linkedObject auf 'false' geändert -> hinterlegten Wert für 'true' übergeben
							convertedValue = parseFloat(targetObj.common.custom[this.namespace].number_to_boolean_value_false);
							this.log.debug(`[getConvertedValue] linkedObject state '${sourceId}' changed to '${false}', using value '${targetObj.common.custom[this.namespace].number_to_boolean_value_false}' -> parentObject value is '${convertedValue}'`)

						} else {
							// keine expertSettings hinterlegt für Wert true bzw. false
							let parentObjState = await this.getForeignStateAsync(targetId);
							if (parentObjState) {
								convertedValue = parentObjState.val;
								this.log.warn(`[getConvertedValue] no values for 'true' / 'false' set in expert settings of parentObject '${targetId}' -> fallback to parentObject value '${parentObjState.val}'`)
							}
						}
					}
				}

				// Type Converison: number -> string (duration, datetime)
				if (`${targetObj.common.custom[this.namespace].parentType}_to_${targetObj.common.type}` === "number_to_string" || `${targetObj.common.type}_to_${targetObj.common.custom[this.namespace].number_convertTo}` === "number_to_string" || `${targetObj.common.type}_to_${targetObj.common.custom[this.namespace].number_convertTo}` === "number_to_duration" || `${targetObj.common.type}_to_${targetObj.common.custom[this.namespace].number_convertTo}` === "number_to_datetime") {

					if (!targetIsParentObj) {
						// parentObject state hat sich geändert

						if (targetObj.common.custom[this.namespace].number_to_duration_format) {
							// number -> duration
							try {
								if (targetObj.common.custom[this.namespace].number_to_duration_convert_seconds) {
									// ggf. ist eine Umrechnung in Sekunden hinterlegt
									convertedValue = mathjs.evaluate(`${value} ${targetObj.common.custom[this.namespace].number_to_duration_convert_seconds}`);
								}

								moment.locale(mySystemConfig.language);
								convertedValue = moment.duration(convertedValue, 'seconds').format(targetObj.common.custom[this.namespace].number_to_duration_format, 0);

								if (targetObj.common.custom[this.namespace].number_to_duration_convert_seconds) {
									this.log.debug(`[getConvertedValue] parentObject state '${sourceId}' changed to '${value}', using calculation '${targetObj.common.custom[this.namespace].number_to_duration_convert_seconds}', format '${targetObj.common.custom[this.namespace].number_to_duration_format}', lang '${moment.locale()}' -> linkedObject value is '${convertedValue}'`);
								} else {
									this.log.debug(`[getConvertedValue] parentObject state '${sourceId}' changed to '${value}', using format '${targetObj.common.custom[this.namespace].number_to_duration_format}', lang '${moment.locale()}' -> linkedObject value is '${convertedValue}'`);
								}
							} catch (err) {
								this.log.error(`[getConvertedValue] there is something wrong with your calculation formula or datetime format, check your expert settings input for '${targetId}'!`);
								this.log.error(`[getConvertedValue] error: ${err.message}, stack: ${err.stack}`);
								convertedValue = "Error";
							}
						}

						if (targetObj.common.custom[this.namespace].number_to_datetime_format) {
							// number -> datetime
							try {
								if (targetObj.common.custom[this.namespace].number_to_datetime_convert_seconds) {
									// ggf. ist eine Umrechnung in Sekunden hinterlegt
									convertedValue = mathjs.evaluate(`${value} ${targetObj.common.custom[this.namespace].number_to_datetime_convert_seconds}`);
								}

								moment.locale(mySystemConfig.language);
								convertedValue = moment.unix(convertedValue).format(targetObj.common.custom[this.namespace].number_to_datetime_format);

								if (targetObj.common.custom[this.namespace].number_to_datetime_convert_seconds) {
									this.log.debug(`[getConvertedValue] parentObject state '${sourceId}' changed to '${value}', using calculation '${targetObj.common.custom[this.namespace].number_to_datetime_convert_seconds}', format '${targetObj.common.custom[this.namespace].number_to_datetime_format}', lang '${moment.locale()}' -> linkedObject value is '${convertedValue}'`);
								} else {
									this.log.debug(`[getConvertedValue] parentObject state '${sourceId}' changed to '${value}', using format '${targetObj.common.custom[this.namespace].number_to_datetime_format}', lang '${moment.locale()}' -> linkedObject value is '${convertedValue}'`);
								}
							} catch (err) {
								this.log.error(`[getConvertedValue] there is something wrong with your calculation formula or datetime format, check your expert settings input for '${targetId}'!`);
								this.log.error(`[getConvertedValue] error: ${err.message}, stack: ${err.stack}`);
								convertedValue = "Error";
							}
						}
					}
				}

				// Type Converison: boolean -> string
				if (`${targetObj.common.custom[this.namespace].parentType}_to_${targetObj.common.type}` === "boolean_to_string" || `${targetObj.common.type}_to_${targetObj.common.custom[this.namespace].boolean_convertTo}` === "boolean_to_string") {

					if (!targetIsParentObj) {
						// parentObject state hat sich geändert
						if (value && targetObj.common.custom[this.namespace].boolean_to_string_value_true) {
							convertedValue = targetObj.common.custom[this.namespace].boolean_to_string_value_true;
							this.log.debug(`[getConvertedValue] parentObject state '${sourceId}' changed to '${value}', using value '${targetObj.common.custom[this.namespace].boolean_to_string_value_true}' -> linkedObject value is '${convertedValue}'`);

						} else if (!value && targetObj.common.custom[this.namespace].boolean_to_string_value_false) {
							convertedValue = targetObj.common.custom[this.namespace].boolean_to_string_value_false;
							this.log.debug(`[getConvertedValue] parentObject state '${sourceId}' changed to '${value}', using value '${targetObj.common.custom[this.namespace].boolean_to_string_value_false}' -> linkedObject value is '${convertedValue}'`);

						} else {
							// keine expertSettings hinterlegt für Wert true bzw. false
							convertedValue = value.toString();
							this.log.warn(`[getConvertedValue] no values for 'true' / 'false' set in expert settings of parentObject '${sourceId}' -> fallback to parentObject value '${convertedValue}'`);
						}
					}

					if (targetIsParentObj) {
						// linkedObject state hat sich geändert
						if (targetObj.common.custom[this.namespace].boolean_to_string_value_true && value === targetObj.common.custom[this.namespace].boolean_to_string_value_true) {
							convertedValue = true;
							this.log.debug(`[getConvertedValue] linkedObject state '${sourceId}' changed to '${value}', using value '${true}' -> parentObject value is '${convertedValue}'`);

						} else if (targetObj.common.custom[this.namespace].boolean_to_string_value_false && value === targetObj.common.custom[this.namespace].boolean_to_string_value_false) {
							convertedValue = false;
							this.log.debug(`[getConvertedValue] linkedObject state '${sourceId}' changed to '${value}', using value '${false}' -> parentObject value is '${convertedValue}'`);

						} else {
							// keine expertSettings hinterlegt für Wert true bzw. false oder string unbekannt
							convertedValue = targetObj.common.def;
							if (!targetObj.common.custom[this.namespace].boolean_to_string_value_true || !targetObj.common.custom[this.namespace].boolean_to_string_value_false) {
								this.log.warn(`[getConvertedValue] no values for 'true' / 'false' set in expert settings of parentObject '${targetId}' -> fallback to parentObject value '${convertedValue}'`);
							} else {
								this.log.warn(`[getConvertedValue] value not set as 'true' / 'false' in expert settings of parentObject '${targetId}' -> fallback to parentObject default '${convertedValue}'`);
							}
						}
					}
				}

				// Type Converison: string -> boolean
				if (`${targetObj.common.custom[this.namespace].parentType}_to_${targetObj.common.type}` === "string_to_boolean" || `${targetObj.common.type}_to_${targetObj.common.custom[this.namespace].string_convertTo}` === "string_to_boolean") {

					if (!targetIsParentObj) {
						// parentObject state hat sich geändert
						if ((targetObj.common.custom[this.namespace].string_to_boolean_value_true || targetObj.common.custom[this.namespace].string_to_boolean_value_true === 0) && value.toString() === targetObj.common.custom[this.namespace].string_to_boolean_value_true.toString()) {
							convertedValue = true;
							this.log.debug(`[getConvertedValue] parentObject state '${sourceId}' changed to '${value}', '${targetObj.common.custom[this.namespace].string_to_boolean_value_true}' is condition for 'true' -> linkedObject value is '${convertedValue}'`);

						} else if ((targetObj.common.custom[this.namespace].string_to_boolean_value_false || targetObj.common.custom[this.namespace].string_to_boolean_value_false === 0) && value.toString() === targetObj.common.custom[this.namespace].string_to_boolean_value_false.toString()) {
							convertedValue = false;
							this.log.debug(`[getConvertedValue] parentObject state '${sourceId}' changed to '${value}', ${targetObj.common.custom[this.namespace].string_to_boolean_value_false}' is condition for 'false' -> linkedObject value is '${convertedValue}'`);

						} else {
							convertedValue = false;

							if ((targetObj.common.custom[this.namespace].string_to_boolean_value_true || targetObj.common.custom[this.namespace].string_to_boolean_value_true === 0) && targetObj.common.custom[this.namespace].string_to_boolean_value_true.toString() && (targetObj.common.custom[this.namespace].string_to_boolean_value_false || targetObj.common.custom[this.namespace].string_to_boolean_value_false === 0) && targetObj.common.custom[this.namespace].string_to_boolean_value_false.toString()) {
								this.log.debug(`[getConvertedValue] string not match with condition in expert settings of parentObject '${sourceId}' -> linkedObject value is '${convertedValue}'`);
							} else {
								this.log.warn(`[getConvertedValue] no values for 'true' / 'false' set in expert settings of parentObject '${sourceId}' -> fallback to '${convertedValue}'`);
							}
						}
					}

					if (targetIsParentObj) {
						// linkedObject state hat sich geändert
						if (value && (targetObj.common.custom[this.namespace].string_to_boolean_value_true || targetObj.common.custom[this.namespace].string_to_boolean_value_true === 0)) {
							convertedValue = targetObj.common.custom[this.namespace].string_to_boolean_value_true.toString();
							this.log.debug(`[getConvertedValue] parentObject state '${sourceId}' changed to '${value}', using value '${targetObj.common.custom[this.namespace].string_to_boolean_value_true}' -> parentObject value is '${convertedValue}'`);

						} else if (!value && (targetObj.common.custom[this.namespace].string_to_boolean_value_false || targetObj.common.custom[this.namespace].string_to_boolean_value_false === 0)) {
							convertedValue = targetObj.common.custom[this.namespace].string_to_boolean_value_false.toString();
							this.log.debug(`[getConvertedValue] parentObject state '${sourceId}' changed to '${value}', using value '${targetObj.common.custom[this.namespace].string_to_boolean_value_false}' -> parentObject value is '${convertedValue}'`);
						} else {
							convertedValue = value.toString();
							this.log.warn(`[getConvertedValue] no values for 'true' / 'false' set in expert settings of parentObject '${sourceId}' -> fallback to linkedObject value '${convertedValue}'`);
						}
					}
				}

				// Type Converison: string -> number
				if (`${targetObj.common.custom[this.namespace].parentType}_to_${targetObj.common.type}` === "string_to_number" || `${targetObj.common.type}_to_${targetObj.common.custom[this.namespace].string_convertTo}` === "string_to_number") {
					if (!targetIsParentObj) {
						// parentObject state vom type string hat sich geändert -> string versuchen in number umwandeln
						value = value.toString().replace(',', '.');
						convertedValue = parseFloat(value);
					}

					if (!isNaN(convertedValue)) {
						// string erfolgreich in number umgewandelt wenn parentObject geändert wurde, linkedObject ist immer vom type number
						try {
							if (targetObj.common.read && !targetObj.common.write && targetObj.common.custom[this.namespace].string_to_number_calculation_readOnly && !targetIsParentObj) {
								// ReadOnly object mit calculation -> umrechnen
								let string_to_number_calculation_readOnly = targetObj.common.custom[this.namespace].string_to_number_calculation_readOnly.replace(/,/g, ".");
								convertedValue = mathjs.evaluate(`${value} ${string_to_number_calculation_readOnly}`)

								this.log.debug(`[getConvertedValue] read only parentObject state '${sourceId}' changed to '${value}', using calculation '${string_to_number_calculation_readOnly}' -> new linkedObject value is '${convertedValue}'`);

							} else if (targetObj.common.custom[this.namespace].string_to_number_calculation) {
								// object mit string_to_number_calculation -> umrechnen
								let string_to_number_calculation = targetObj.common.custom[this.namespace].string_to_number_calculation.replace(/,/g, ".");

								if (!targetIsParentObj) {
									// Umrechnung für linkedObject -> parentObject state ändert sich
									convertedValue = mathjs.evaluate(`${value} ${string_to_number_calculation}`);

									this.log.debug(`[getConvertedValue] parentObject state '${sourceId}' changed to '${value}', using calculation '${string_to_number_calculation}' -> linkedObject value is '${convertedValue}'`)
								} else {
									// Umrechnung für parentObject -> Kehrwert nehmen -> linkedObject state ändert sich
									convertedValue = mathjs.evaluate(`${value} * 1/(1${string_to_number_calculation})`);
									this.log.debug(`[getConvertedValue] linkedObject state '${sourceId}' changed to '${value}', using calculation '1/(1${string_to_number_calculation})' -> parentObject value is '${convertedValue}'`)
								}
							}
						} catch (err) {
							// falls Falsche Formel in custom dialog eingegeben wurde, input value verwenden und Fehler ausgeben
							if (targetIsParentObj) {
								this.log.error(`[getConvertedValue] there is something wrong with your calculation formula, check your expert settings input for '${targetId}'!`);
							} else {
								this.log.error(`[getConvertedValue] there is something wrong with your calculation formula, check your expert settings input for '${sourceId}'!`);
							}

							convertedValue = value;
						}

						if (!targetIsParentObj && (targetObj.common.custom[this.namespace].string_to_number_maxDecimal || targetObj.common.custom[this.namespace].string_to_number_maxDecimal === 0)) {
							// nur für linkedObject Nachkommastellen festlegen, sofern vorhanden und nicht leer
							var maxDecimal = parseInt(targetObj.common.custom[this.namespace].string_to_number_maxDecimal);
							if (!isNaN(maxDecimal)) {
								convertedValue = mathjs.round(convertedValue, maxDecimal);
							}
						}

						if (targetIsParentObj) {
							// ziel ist parentObject vom type string, zahl noch in string umwandeln
							convertedValue = convertedValue.toString();
						}

					} else {
						// value vom type string kann nicht in number umgewandelt werden (nur bei parentObject)
						this.log.error(`[getConvertedValue] string value '${value}' from '${sourceId}' can not be parsed to number! -> value for '${targetId}' is set to 'null'!`);
					}
				}

				// Type Converison: string -> string (duration, datetime)
				if (`${targetObj.common.custom[this.namespace].parentType}_to_${targetObj.common.type}` === "string_to_string" || `${targetObj.common.type}_to_${targetObj.common.custom[this.namespace].string_convertTo}` === "string_to_string" || `${targetObj.common.type}_to_${targetObj.common.custom[this.namespace].string_convertTo}` === "string_to_duration" || `${targetObj.common.type}_to_${targetObj.common.custom[this.namespace].string_convertTo}` === "string_to_datetime") {

					if (!targetIsParentObj) {
						// parentObject state hat sich geändert

						if (targetObj.common.custom[this.namespace].string_to_duration_format) {
							// string -> duration
							try {
								moment.locale(mySystemConfig.language);
								convertedValue = moment.duration(convertedValue).format(targetObj.common.custom[this.namespace].string_to_duration_format, 0);

								this.log.debug(`[getConvertedValue] parentObject state '${sourceId}' changed to '${value}', using format '${targetObj.common.custom[this.namespace].string_to_duration_format}', lang '${moment.locale()}' -> linkedObject value is '${convertedValue}'`);
							} catch (err) {
								this.log.error(`[getConvertedValue] there is something wrong with your duration format, check your expert settings input for '${targetId}'!`);
								this.log.error(`[getConvertedValue] error: ${err.message}, stack: ${err.stack}`);
								convertedValue = "Error";
							}
						}

						if (targetObj.common.custom[this.namespace].string_to_datetime_parser && targetObj.common.custom[this.namespace].string_to_datetime_format) {
							// string -> datetime
							try {
								moment.locale(mySystemConfig.language);
								convertedValue = moment(convertedValue, targetObj.common.custom[this.namespace].string_to_datetime_parser).format(targetObj.common.custom[this.namespace].string_to_datetime_format);

								if (convertedValue != "Invalid date") {
									this.log.debug(`[getConvertedValue] parentObject state '${sourceId}' changed to '${value}', using parser '${targetObj.common.custom[this.namespace].string_to_datetime_parser}', format '${targetObj.common.custom[this.namespace].string_to_datetime_format}', lang '${moment.locale()}' -> linkedObject value is '${convertedValue}'`);
								} else {
									this.log.error(`[getConvertedValue] there is something wrong with your datetime parser, check your expert settings input for '${targetId}'!`);
								}
							} catch (err) {
								this.log.error(`[getConvertedValue] there is something wrong with your datetime parser or format, check your expert settings input for '${targetId}'!`);
								this.log.error(`[getConvertedValue] error: ${err.message}, stack: ${err.stack}`);
								convertedValue = "Error";
							}
						}
					}
				}
			} catch (err) {
				this.log.error(`[getConvertedValue] sourceId '${sourceId}', targetId '${targetId}', value: '${value}', error: ${err.message}, stack: ${err.stack}`);
			}
		}

		return convertedValue;
	}

	/**
	 * @param {number} value
	 * @param {string} condition
	 */
	numToBoolConditionParser(value, condition) {
		condition = condition.replace(/,/g, ".");

		if (condition.startsWith("=") && value === parseFloat(condition.replace("=", ""))) {
			return true;
		}
		if (condition.startsWith("!=") && value != parseFloat(condition.replace("!=", ""))) {
			return true;
		}
		if (condition.startsWith(">=") && value >= parseFloat(condition.replace(">=", ""))) {
			return true;
		}
		if (condition.startsWith("<=") && value <= parseFloat(condition.replace("<=", ""))) {
			return true;
		}
		if (condition.startsWith(">") && value > parseFloat(condition.replace(">", ""))) {
			return true;
		}
		if (condition.startsWith("<") && value < parseFloat(condition.replace("<", ""))) {
			return true;
		}
		return false;
	}

	logDicLinkedObjectsStatus() {
		if (this.dicLinkedObjectsStatus) {
			this.log.silly("[logDicLinkedObjectsStatus] 'dicLinkedObjectsStatus' items count: " + Object.keys(this.dicLinkedObjectsStatus).length);
			this.log.silly("[logDicLinkedObjectsStatus] linkedObjects status " + JSON.stringify(this.dicLinkedObjectsStatus));
		}
	}

	logDicLinkedParentObjects() {
		if (this.dicLinkedParentObjects) {
			this.log.silly("[logDicLinkedParentObjects] count of active linkedObjects: " + Object.keys(this.dicLinkedParentObjects).length)
			this.log.silly("[logDicLinkedParentObjects] active linkedObjects " + JSON.stringify(this.dicLinkedParentObjects));
		}
	}

	storeInfoStates() {
		if (this.dicLinkedParentObjects) {
			this.setForeignStateAsync(`${this.namespace}.info.linkedObjects`, Object.keys(this.dicLinkedParentObjects).length, true);

			let countNotLinkedObjects = 0
			for (var key in this.dicLinkedObjectsStatus) {
				if (this.dicLinkedObjectsStatus.hasOwnProperty(key) && this.dicLinkedObjectsStatus[key] === false) {
					countNotLinkedObjects++;
				}
			}
			this.setForeignStateAsync(`${this.namespace}.info.notlinkedObjects`, countNotLinkedObjects, true);
		}
	}

	//#endregion
}

// @ts-ignore
if (module.parent) {
	// Export the constructor in compact mode
	/**
	 * @param {Partial<ioBroker.AdapterOptions>} [options={}]
	 */
	module.exports = (options) => new Linkeddevices(options);
} else {
	// otherwise start the instance directly
	new Linkeddevices();
}
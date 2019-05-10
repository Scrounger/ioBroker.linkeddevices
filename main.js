"use strict";

/*
 * Created with @iobroker/create-adapter v1.12.1
 */

// The adapter-core module gives you access to the core ioBroker functions
// you need to create an adapter
const utils = require("@iobroker/adapter-core");

// Load your modules here, e.g.:
// const fs = require("fs");

class Linkeddevices extends utils.Adapter {

	/**
	 * @param {Partial<ioBroker.AdapterOptions>} [options={}]
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

	}

	/**
	 * Is called when databases are connected and adapter received configuration.
	 */
	async onReady() {
		this.log.debug("[onReady] notDeleteDeadLinkedObjects: '" + this.config.notDeleteDeadLinkedObjects + "'");


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
		await this.setObjectAsync("testVariable", {
			type: "state",
			common: {
				name: "testVariable",
				type: "boolean",
				role: "indicator",
				read: true,
				write: true,
			},
			native: {},
		});



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
		if (obj && id.indexOf(this.namespace) === -1 && obj.common && obj.common.custom && obj.common.custom[this.namespace]) {

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
			}

			if (this.dicLinkedParentObjects) {
				this.log.info("[onObjectChange] count of active linkedObjects: " + Object.keys(this.dicLinkedParentObjects).length)
			}

		} else {
			// bereits verlinktes parentObject wurde deaktiviert
			if (obj && obj._id.indexOf(this.namespace) === -1 && this.dicLinkedParentObjects && id in this.dicLinkedParentObjects) {
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
			}
		}

		// if (obj) {
		// 	// The object was changed
		// 	this.log.info(`object ${id} changed: ${JSON.stringify(obj)}`);
		// } else {
		// 	// The object was deleted
		// 	this.log.info(`object ${id} deleted`);
		// }
	}

	/**
	 * Is called if a subscribed state changes
	 * @param {string} id
	 * @param {ioBroker.State | null | undefined} state
	 */
	async onStateChange(id, state) {

		// parentObject 'state' hat sich geändert -> linkedObject 'state' ändern
		if (state && this.dicLinkedParentObjects && id in this.dicLinkedParentObjects) {
			let linkedObjId = this.dicLinkedParentObjects[id];
			let linkedObj = await this.getForeignObjectAsync(linkedObjId);
			var linkedObjState = await this.getForeignStateAsync(linkedObjId);

			let changedValue = state.val
			// if (linkedObj && linkedObj.common && linkedObj.common.custom && linkedObj.common.custom[this.namespace] && linkedObj.common.custom[this.namespace].conversion) {
			// 	this.log.debug(`[onStateChange] linkedObject state changed ${linkedObj.common.custom[this.namespace].conversion}`)

			// 	changedValue = eval(`${changedValue}${linkedObj.common.custom[this.namespace].conversion}`)
			// 	this.log.debug(`[onStateChange] parentObject state changed ${changedValue}`)
			// }

			if (!linkedObjState) {
				// Für State ist noch nix gesetzt
				await this.setForeignStateChanged(linkedObjId, changedValue, state.ack);
				this.log.debug(`[onStateChange] parentObject state '${id}' changed to '${state.val}' (ack = ${state.ack}) --> set linkedObject state '${linkedObjId}'`)
			} else {
				var tsDifference = state.ts - linkedObjState.ts;
				if (linkedObjState.val != changedValue || linkedObjState.ack != state.ack) {
					await this.setForeignStateChanged(linkedObjId, changedValue, state.ack);
					this.log.debug(`[onStateChange] parentObject state '${id}' changed to '${state.val}' (ack = ${state.ack}) --> set linkedObject state '${linkedObjId}'`)
				} else if (tsDifference > 250) {
					await this.setForeignStateAsync(linkedObjId, changedValue, state.ack);
					this.log.debug(`[onStateChange] parentObject state.ts '${id}' diffrence '${tsDifference.toString()}' --> set linkedObject state '${linkedObjId}'`)
				}
			}
		}

		// linkedObject 'state' hat sich geändert -> parentObject 'state' ändern
		else if (state && this.dicLinkedObjectsStatus && id in this.dicLinkedObjectsStatus) {
			// @ts-ignore
			let parentObjId = Object.keys(this.dicLinkedParentObjects).find(key => this.dicLinkedParentObjects[key] === id);
			let parentObjState = await this.getForeignStateAsync(parentObjId);

			let linkedObj = await this.getForeignObjectAsync(id);

			let changedValue = state.val
			// if (linkedObj && linkedObj.common && linkedObj.common.custom && linkedObj.common.custom[this.namespace] && linkedObj.common.custom[this.namespace].conversion) {
			// 	let conversion = this.reverseMathString(linkedObj.common.custom[this.namespace].conversion)

			// 	this.log.debug(`[onStateChange] linkedObject state changed ${conversion}`)

			// 	changedValue = eval(`${changedValue}${linkedObj.common.custom[this.namespace].conversion}*-1`)
			// 	this.log.debug(`[onStateChange] linkedObject state changed ${changedValue}`)
			// }

			// 'custom.isLinked = true'
			if (this.dicLinkedObjectsStatus[id] === true) {
				if (!parentObjState) {
					// Für State ist noch nix gesetzt
					await this.setForeignStateChangedAsync(parentObjId, changedValue, state.ack);
					this.log.debug(`[onStateChange] linkedObject state '${id}' changed to '${state.val}' (ack = ${state.ack}) --> set parentObject state '${parentObjId}'`)
				} else {
					var tsDifference = state.ts - parentObjState.ts;
					if (parentObjState.val != changedValue || parentObjState.ack != state.ack) {
						await this.setForeignStateChangedAsync(parentObjId, changedValue, state.ack);
						this.log.debug(`[onStateChange] linkedObject state '${id}' changed to '${state.val}' (ack = ${state.ack}) --> set parentObject state '${parentObjId}'`)
					} else if (tsDifference > 250) {
						await this.setForeignStateAsync(parentObjId, changedValue, state.ack);
						this.log.debug(`[onStateChange] parentObject state.ts '${id}' diffrence '${tsDifference.toString()}' --> set linkedObject state '${parentObjId}'`)
					}
				}
			}
		}

		// if (state) {
		// 	// The state was changed
		// 	this.log.info(`state ${id} changed: ${state.val} (ack = ${state.ack})`);
		// } else {
		// 	// The state was deleted
		// 	this.log.info(`state ${id} deleted`);
		// }
	}

	async initialObjects() {
		this.log.info('[initialObjects] started...')

		// all unsubscripe to begin completly new
		this.unsubscribeForeignStates("*");

		this.dicLinkedObjectsStatus = {};				// Dic für 'isLinked' Status aller linkedObjects
		this.dicLinkedParentObjects = {};				// Dic für parentObjects die mit einem linkedObject verlinkt sind

		await this.resetAllLinkedObjectsStatus();
		await this.createAllLinkedObjects();
		await this.removeAllNotLinkedObjects();

		if (this.dicLinkedObjectsStatus) this.log.debug("[initialObjects] 'dicLinkedObjectsStatus' items count: " + Object.keys(this.dicLinkedObjectsStatus).length);

		// subscribe für alle 'states' des Adapters, um Änderungen mitzubekommen
		await this.subscribeStatesAsync('*');

		this.log.info('[initialObjects] finished')
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
		}

		if (this.dicLinkedParentObjects) {
			this.log.info("[createAllLinkedObjects] count of active linkedObjects: " + Object.keys(this.dicLinkedParentObjects).length)
			this.log.debug("[createAllLinkedObjects] active linkedObjects " + JSON.stringify(this.dicLinkedParentObjects));
		}
	}

	/**
	 * linkedObject mit parentObject erstellen bzw. aktualisieren und 'isLinked' Status setzen (= hat eine existierende Verlinkung)
	 * @param {ioBroker.Object} parentObj
	 * @param {ioBroker.Object} oldLinkedObj
	 */
	async createLinkedObject(parentObj, oldLinkedObj = Object()) {
		try {
			// Datenpunkte sind von 'linkeddevices' und aktiviert
			if (parentObj && parentObj._id.indexOf(this.namespace) === -1 && parentObj.common && parentObj.common.custom && parentObj.common.custom[this.namespace]
				&& parentObj.common.custom[this.namespace].enabled) {

				if (!parentObj.common.custom[this.namespace].linkedId || !parentObj.common.custom[this.namespace].linkedId.length || parentObj.common.custom[this.namespace].linkedId === "") {
					// 'custom.linkedId' fehlt oder hat keinen Wert
					this.log.error("[createLinkedObject] No 'linkedId' defined for object: '" + parentObj._id + "'");
				} else {
					// 'custom.linkedId' vorhanden 
					var linkedId = this.getLinkedObjectId(parentObj);

					if ((/[*?"'\[\]]/).test(linkedId)) {
						// 'custom.linkedId' enthält illegale zeichen
						this.log.error("[createLinkedObject] linkedId: '" + linkedId + "' contains illegal characters (parentId: '" + parentObj._id + "')");

					} else {
						//TODO: prüfen ob definierte linkedId schon in Verwendung

						// 'custom.linkedId' korrekt -> linkedObject erzeugen bzw. aktualisieren
						var linkedId = this.getLinkedObjectId(parentObj);

						let name = null;
						if (parentObj.common.custom[this.namespace].name || parentObj.common.custom[this.namespace].name.length || parentObj.common.custom[this.namespace].name != "") {
							// Property 'name' von Objekt übernehmen, sofern vorhanden
							name = parentObj.common.custom[this.namespace].name;
							this.log.debug("[createLinkedObject] using custom name '" + name + "' for: '" + linkedId + "' (parentObj: '" + parentObj._id + "')");
						} else {
							// 'name' wird von parent übernommen
							name = parentObj.common.name;
							if (parentObj.common.name) {
								this.log.info("[createLinkedObject] no custom name defined for: '" + linkedId + "' (parentObj: '" + parentObj._id + "'). Use object name: '" + parentObj.common.name + "'");
							} else {
								this.log.info("[createLinkedObject] no custom name defined for: '" + linkedId + "' (parentObj: '" + parentObj._id + "')");
							}
						}

						// LinkedObjekt daten übergeben
						let linkedObj = Object();
						linkedObj.type = parentObj.type;
						linkedObj.common = parentObj.common;
						linkedObj.common.name = name;
						linkedObj.common.icon = "linkeddevices_small.png"
						//linkedObj.native = parentObj.native;
						linkedObj.common.desc = "Created by linkeddevices";

						//Experteneinstellungen für common attribute übergeben (Vermutung muss vor custom erfolgen)
						if (parentObj.common.custom[this.namespace].unit) {
							// unit
							linkedObj.common.unit = parentObj.common.custom[this.namespace].unit;
						}

						var conversion = "";
						if (parentObj.common.custom[this.namespace].conversion) {
							// conversion vorhanden, nur bei type = number
							conversion = parentObj.common.custom[this.namespace].conversion;
						}

						// custom settings von anderen Adaptern ggf. übernehmen
						let existingLinkedObj = await this.getForeignObjectAsync(linkedId);
						if (existingLinkedObj && existingLinkedObj.common && existingLinkedObj.common.custom) {
							// linkedObject wurde geändert (nicht linkedId), alle customs vom linkedObject übernehmen -> würde sonst vom parentObject übernommen werden
							this.log.debug(`[createLinkedObject] keep custom settings '${JSON.stringify(existingLinkedObj.common.custom)}' for linkedObject '${linkedId}'`)
							linkedObj.common.custom = existingLinkedObj.common.custom;
						} else {
							if (oldLinkedObj && oldLinkedObj.common && oldLinkedObj.common.custom) {
								// linkedObject wurde linkedId geändert -> custom vom alten linkedObject übernehmen
								linkedObj.common.custom = oldLinkedObj.common.custom;
								this.log.debug(`[createLinkedObject] move custom settings '${JSON.stringify(oldLinkedObj.common.custom)}' from '${oldLinkedObj._id}' to linkedObject '${linkedId}'`)
							} else {
								// linkeObject existiert nicht, alle customs von anderen Adaptern entfernen
								linkedObj.common.custom = {};
							}
						}

						// custom überschreiben, notwenig weil sonst linkedId von parent drin steht
						// enabled notwendig weil sonst bei Verwendung von custom stettings anderer Adapter nach Edit die linkedDevices custom settings weg sind
						linkedObj.common.custom[this.namespace] = { "enabled": true, "parentId": parentObj._id, "isLinked": true, "conversion": conversion };
						this.log.debug(`[createLinkedObject] custom data set for '${linkedId}' ("${this.namespace}":${JSON.stringify(linkedObj.common.custom[this.namespace])})`)

						// if (parentObj.common.custom[this.namespace].conversion) {
						// 	linkedObj.common.custom[this.namespace].conversion = parentObj.common.custom[this.namespace].conversion;
						// }

						// LinkedObjekt erzeugen oder Änderungen schreiben
						await this.setForeignObjectAsync(linkedId, linkedObj);

						// ggf. können neue linkedObjects hinzugekommen sein -> in dic packen
						if (this.dicLinkedObjectsStatus) this.dicLinkedObjectsStatus[linkedId] = true;
						this.logDicLinkedObjectsStatus();

						// linked parentObjects in dic speichern
						if (this.dicLinkedParentObjects) this.dicLinkedParentObjects[parentObj._id] = linkedId;
						this.logDicLinkedParentObjects();

						// state für linkedObject  setzen, wird vom parent übernommen
						let parentObjState = await this.getForeignStateAsync(parentObj._id);
						if (parentObjState) {
							await this.setForeignState(linkedId, parentObjState.val, true);
						}

						// subscribe für parentObject 'state', um Änderungen mitzubekommen
						await this.subscribeForeignStatesAsync(parentObj._id);

						this.log.debug("[createLinkedObject] linkedObject '" + parentObj._id + "' to '" + linkedId + "'");
					}

				}
			}
		} catch (err) {
			this.log.error("[createLinkedObject] error: " + err.message);
			this.log.error("[createLinkedObject] stack: " + err.stack);
		}
	}

	/*
	* alle LinkedObjects löschen, die keine existierende Verlinkung mehr haben ('custom.isLinked' == false), sofern nicht in Config deaktiviert
	*/
	async removeAllNotLinkedObjects() {
		if (!this.config.notDeleteDeadLinkedObjects) {
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
		if (!this.config.notDeleteDeadLinkedObjects) {
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

	/**
	 * linkedId des linkedObjects erzeugen
	 * @param {ioBroker.Object} parentObj
	 */
	getLinkedObjectId(parentObj) {
		// @ts-ignore
		return this.namespace + "." + parentObj.common.custom[this.namespace].linkedId;
	}


	// /**
	//  * Some message was sent to this instance over message box. Used by email, pushover, text2speech, ...
	//  * Using this method requires "common.message" property to be set to true in io-package.json
	//  * @param {ioBroker.Message} obj
	//  */
	// onMessage(obj) {
	// 	if (typeof obj === "object" && obj.message) {
	// 		if (obj.command === "send") {
	// 			// e.g. send email or pushover or whatever
	// 			this.log.info("send command");

	// 			// Send response in callback if required
	// 			if (obj.callback) this.sendTo(obj.from, obj.command, "Message received", obj.callback);
	// 		}
	// 	}
	// }

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
				// parentObject für diese linkedId ist nicht gleich -> linkedId wird schon von einem anderen parentObject verwendet!
				// @ts-ignore
				this.log.error("[isLinkedIdInUse] linkedId '" + linkedId + "' still in use with parentObject '" + Object.keys(this.dicLinkedParentObjects).find(key => this.dicLinkedParentObjects[key] === linkedId));
				return true;
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
	 * @param {any[]} str
	 */
	reverseMathString(str) {
		// Funktion um eine mathematische Formel zu inversion -> aus '+3/5' wird '-3*5'
		let result = "";

		for (var i = 0; i < str.length; i++) {
			let char = str[i];

			if (char === "+") {
				char = char.replace("+", "-");
			} else if (char === "-") {
				char = char.replace("-", "+");
			} else if (char === "*") {
				char = char.replace("*", "/");
			} else if (char === "/") {
				char = char.replace("/", "*");
			}
			result = result + char;
		}
		return result;
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
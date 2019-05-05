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

		this.dicParentId = {};
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
	onObjectChange(id, obj) {
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
						this.createLinkedObject(obj);
					} else {
						// alte linkedId aus dic holen
						let oldLinkedId = this.dicLinkedParentObjects[id];

						// linkedId wurde für parentObject geändert -> neue linkedId für parentObject in dic schreiben
						this.dicLinkedParentObjects[id] = linkedId;

						this.log.info("[onObjectChange] linkedId '" + oldLinkedId + "' changed to '" + linkedId + "' for parentObject '" + id + "'");

						// linkedObject "custom.isLinked = false" setzen oder linkedObject löschen -> abhängig von Config
						this.resetStatusOrRemoveNotLinkedObject(oldLinkedId);

						// LinkedObject erzeugen
						this.createLinkedObject(obj);
					}

				} else {
					// wird bereits verwendet -> 'custom.linkedId' vom parentObject auf alte linkedId zurücksetzen
					let oldLinkedId = this.dicLinkedParentObjects[id];

					this.log.info("[onObjectChange] reset linkedId to '" + oldLinkedId + "' for parentObject '" + id + "'");

					// namespace aus oldLinkedId entfernen
					oldLinkedId = oldLinkedId.replace(this.namespace + ".", "");

					// alte linkedId in parentObject schreiben
					obj.common.custom[this.namespace].linkedId = oldLinkedId;
					this.setForeignObject(id, obj);
				}

			} else {
				// neues parentObject hinzugefügt bzw. aktiviert ('enabled==true') -> nicht im dicLinkedParentObjects enthalten
				let linkedId = this.getLinkedObjectId(obj);
				this.log.info("[onObjectChange] new parentObject '" + id + "' linked to '" + linkedId + "'");

				// Prüfen ob die linkedId schon verwendet wird
				if (!this.isLinkedIdInUse(obj, linkedId)) {
					// nicht verwendet
					this.createLinkedObject(obj);
				} else {
					// wird bereits verwendet -> 'parentObj.common.custom[linkeddevices.x]' löschen
					if (obj.common.custom[this.namespace].enabled === true) {
						delete obj.common.custom[this.namespace];
						this.setForeignObjectAsync(obj._id, obj);

						this.logDicLinkedObjectsStatuss();
						this.logDicLinkedParentObjects();
					}
				}
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

				// linkedObject "custom.isLinked = false" setzen oder linkedObject löschen -> abhängig von Config
				this.resetStatusOrRemoveNotLinkedObject(oldLinkedId);
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
	onStateChange(id, state) {
		if (state) {
			// The state was changed
			this.log.info(`state ${id} changed: ${state.val} (ack = ${state.ack})`);
		} else {
			// The state was deleted
			this.log.info(`state ${id} deleted`);
		}
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

		//this.log.debug(Object.keys(this.dicParentId).length.toString())

		if (this.dicLinkedObjectsStatus) this.log.debug("[initialObjects] 'dicLinkedObjectsStatus' items count: " + Object.keys(this.dicLinkedObjectsStatus).length);

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
			this.log.debug("[resetLinkedObjectStatus] isLinked status reseted for '" + linkedObj._id + "'");
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
	 */
	async createLinkedObject(parentObj) {

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
							this.log.warn("[createLinkedObject] no custom name defined for: '" + linkedId + "' (parentObj: '" + parentObj._id + "'). Use object name: '" + parentObj.common.name + "'");
						} else {
							this.log.warn("[createLinkedObject] no custom name defined for: '" + linkedId + "' (parentObj: '" + parentObj._id + "')");
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
					// custom überschreiben, notwenig weil sonst linkedId von parent drin steht
					linkedObj.common.custom[this.namespace] = { "parentId": parentObj._id, "isLinked": true };

					// LinkedObjekt erzeugen oder Änderungen schreiben
					await this.setForeignObjectAsync(linkedId, linkedObj);

					// ggf. können neue linkedObjects hinzugekommen sein -> in dic packen
					if (this.dicLinkedObjectsStatus) this.dicLinkedObjectsStatus[linkedId] = true;
					this.logDicLinkedObjectsStatuss();

					// linked parentObjects in dic speichern
					if (this.dicLinkedParentObjects) this.dicLinkedParentObjects[parentObj._id] = linkedId;
					this.logDicLinkedParentObjects();

					// state für linkedObject  setzen, wird vom parent übernommen
					let parentObjState = await this.getForeignStateAsync(parentObj._id);
					if (parentObjState) {
						await this.setForeignState(linkedId, parentObjState.val, true);
					}

					this.log.debug("[createLinkedObject] linkedObject '" + parentObj._id + "' to '" + linkedId + "'");

					//this.dicParentId[parentObj._id] = parentObj;
					//await this.subscribeForeignStatesAsync(parentObj._id);

					//await this.subscribeForeignObjects(parentObj._id);


				}
			}
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

				this.log.debug("[removeNotLinkedObject] not linkedObject '" + linkedId + "' deleted");

				//TODO: aus dict werfen
			}
		}
	}

	/**
	 * LinkedObject 'custom.isLinked' auf 'False' setzen oder LinkedObject löschen, hängt von Config ab
	 * @param {any} linkedId
	 */
	async resetStatusOrRemoveNotLinkedObject(linkedId) {
		if (this.config.notDeleteDeadLinkedObjects) {
			// 'custom.isLinked' auf 'False' für linkedId im LinkedObject und dicLinkedObjectsStatus schreiben
			this.resetLinkedObjectStatusById(linkedId);
		} else {
			// linkedId löschen 
			if (this.dicLinkedObjectsStatus) this.dicLinkedObjectsStatus[linkedId] = false;
			this.removeNotLinkedObject(linkedId);
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

	logDicLinkedObjectsStatuss() {
		if (this.dicLinkedObjectsStatus) {
			this.log.debug("[logDicLinkedObjectsStatuss] 'dicLinkedObjectsStatus' items count: " + Object.keys(this.dicLinkedObjectsStatus).length);
			this.log.debug("[logDicLinkedObjectsStatuss] linkedObjects status " + JSON.stringify(this.dicLinkedObjectsStatus));
		}
	}

	logDicLinkedParentObjects() {
		if (this.dicLinkedParentObjects) {
			this.log.debug("[logDicLinkedParentObjects] count of active linkedObjects: " + Object.keys(this.dicLinkedParentObjects).length)
			this.log.debug("[logDicLinkedParentObjects] active linkedObjects " + JSON.stringify(this.dicLinkedParentObjects));
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
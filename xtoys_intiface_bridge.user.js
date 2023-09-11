// ==UserScript==
// @name         XToys Intiface Bridge
// @namespace    https://github.com/lordshiny
// @version      0.8
// @description  Emulates Bluetooth vibrator/stroker and passes it to Intiface
// @author       shiny
// @match        https://xtoys.app/
// @icon         https:/xtoys.app/favicon.ico
// @grant        none
// @run-at       document-end
// ==/UserScript==

(function() {
    'use strict';

    class IntifaceWebSocketClient {
        constructor() {
            // Change the URL to match your WebSocket server
            this.websocket = new WebSocket('ws://127.0.0.1:12345');
            this.sequence_ = 0;

            this.websocket.addEventListener('open', this.websocketConnected_.bind(this));
            this.websocket.addEventListener('message', this.websocketData_.bind(this));
            this.websocket.addEventListener('close', this.websocketClosed_.bind(this));
            this.websocket.addEventListener('error', this.websocketError_.bind(this));
        }

        websocketConnected_(event) {
            console.log('Connected');
            this.sendHandshake();
        }

        websocketClosed_(event) {
            console.log('Closed, clean:', event.wasClean);
        }

        websocketClosed_(event) {
            console.error('Websocket error:', event);
        }

        websocketData_(event) {
            console.log('Got data from server:', event.data);
        }

        sendHandshake() {
            this.sequence_ += 1;
            const data = JSON.stringify([
                {
                    RequestServerInfo: {
                        Id: this.sequence_,
                        ClientName: 'XToys',
                        MessageVersion: 2,
                    },
                },
            ]);
            this.websocket.send(data);
        }

        requestDeviceList() {
            this.sequence_ += 1;
            const data = JSON.stringify([
                {
                    RequestDeviceList: {
                        Id: 2,
                    },
                },
            ]);
            this.websocket.send(data);
        }

        linearCmd(device, position, duration) {
            this.sequence_ += 1;
            const data = JSON.stringify([
                {
                    LinearCmd: {
                        Id: this.sequence_,
                        DeviceIndex: device,
                        Vectors: [{ Index: 0, Duration: duration, Position: position }],
                    },
                },
            ]);
            this.websocket.send(data);
        }

        vibrateCmd(device, strength) {
            this.sequence_ += 1;
            const data = JSON.stringify([
                {
                    VibrateCmd: {
                        Id: this.sequence_,
                        DeviceIndex: device,
                        Speeds: [{ Index: 0, Speed: strength }],
                    },
                },
            ]);
            this.websocket.send(data);
        }
    }


    class FakeBluetoothRemoteGATTCharacteristic {
        constructor(service, uuid, properties) {
            this.service = service;
            this.uuid = uuid;
            this.value = 0x00;
            this.properties = {
                authenticatedSignedWrites: properties.authenticatedSignedWrites || false,
                broadcast: properties.broadcast || false,
                indicate: properties.indicate || false,
                notify: properties.notify || false,
                read: properties.read || false,
                reliableWrite: properties.reliableWrite || false,
                writableAuxiliaries: properties.writableAuxiliaries || false,
                write: properties.write || false,
                writeWithoutResponse: properties.writeWithoutResponse || false
            }

            this.lastPosition = -1;
        }

        getDescriptor(uuid) {
            console.error('! STUB - NOT IMPLEMENTED !');
            return Promise.resolve(null)
        }
        getDescriptors(uuid) {
            console.error('! STUB - NOT IMPLEMENTED !');
            return Promise.resolve([])
        }
        readValue() {
            console.error('! STUB - NOT IMPLEMENTED !');
        }
        startNotifications() {
            console.error('! STUB - NOT IMPLEMENTED !');
            return Promise.resolve(this);
        }
        stopNotifications() {
            console.error('! STUB - NOT IMPLEMENTED !');
            return Promise.resolve();
        }
        writeValue(value) {
            if(value.length == 2) {
                let pos = Number(value[0]);
                let speed = Number(value[1]);
                if(this.lastPosition == -1) {
                    speed = 0;
                } else {
                    let delta = Math.abs(pos - this.lastPosition);
                    speed = 250 * 99 / Math.pow(speed, 1/1.05);
                    speed = Math.max(0, Math.min(speed * delta / 90000, 99), 0);
                    speed = Number.isNaN(speed) ? 0 : speed;
                }
                this.lastPosition = pos;
                this.service.device.intifaceService.linearCmd(this.service.device.intifaceDevice, pos / 99, Math.round(speed * 1000));
            } else {
                let stringValue = Array.from(value).map(i => String.fromCharCode(i)).join('');
                let m = /^Vibrate:(\d+);$/.exec(stringValue);
                if(m) {
                    this.service.device.intifaceService.vibrateCmd(this.service.device.intifaceDevice, Number(m[1]) / 20);
                }
            }
            return Promise.resolve();
        }
        writeValueWithoutResponse() {
            console.error('! STUB - NOT IMPLEMENTED !');
            return Promise.resolve();
        }
        writeValueWithResponse() {
            console.error('! STUB - NOT IMPLEMENTED !');
            return Promise.resolve();
        }

        addEventListener(event, callback) {
            console.error('! STUB - NOT IMPLEMENTED !');
        }
        removeEventListener(event, callback) {
            console.error('! STUB - NOT IMPLEMENTED !');
        }

    }

    class FakeBluetoothRemoteGATTService {
        constructor(device, uuid, isPrimary, characteristics) {
            this.device = device;
            this.uuid = uuid;
            this.isPrimary = isPrimary;
            this.characteristics = characteristics.map(r => new FakeBluetoothRemoteGATTCharacteristic(this, r.uuid, r.properties));
        }

        getCharacteristic(uuid) {
            return Promise.resolve(this.characteristics.find(i => i.uuid == uuid));
        }

        getCharacteristics(uuid) {
            return Promise.resolve(this.characteristics);
        }

        addEventListener(event, callback) {
            console.error('! STUB - NOT IMPLEMENTED !')
        }
    }

    class FakeBluetoothRemoteGATTServer {
        constructor(device) {
            this.device = device;
            this.connected = false;
            this.services = [];
        }

        connect() {
            this.connected = true;
            return Promise.resolve(this);
        }

        disconnect() {
            this.connected = false;
        }

        getPrimaryService(uuid) {
            return this.services.find(i => i.uuid == uuid);
        }

        getPrimaryServices(uuid) {
            return Promise.resolve(this.services);
        }
    }

    class FakeLVSBluetoothRemoteGATTServer extends FakeBluetoothRemoteGATTServer {
        constructor(device) {
            super(device);
            this.services = [
                new FakeBluetoothRemoteGATTService(this.device, '5a300001-0023-4bd4-bbd5-a6920e4c5653', true, [
                    { uuid: '5a300002-0023-4bd4-bbd5-a6920e4c5653', properties: { write: true, writeWithoutResponse: true } },
                    { uuid: '5a300003-0023-4bd4-bbd5-a6920e4c5653', properties: { notify: true } }
                ])
            ];
        }
    }

    class FakeLaunchBluetoothRemoteGATTServer extends FakeBluetoothRemoteGATTServer {
        constructor(device) {
            super(device);
            this.services = [
                new FakeBluetoothRemoteGATTService(this.device, '88f80580-0000-01e6-aace-0002a5d5c51b', true, [
                    { uuid: '88f80581-0000-01e6-aace-0002a5d5c51b', properties: { write: true, writeWithoutResponse: true } },
                    { uuid: '88f80582-0000-01e6-aace-0002a5d5c51b', properties: { notify: true } },
                    //{ uuid: '88f80583-0000-01e6-aace-0002a5d5c51b', properties: { write: true, writeWithoutResponse: true } }
                ])
            ];
        }
    }

    class FakeBluetoothDevice {
        constructor(name) {
            if(!window.singletonIntifaceWebSocketClient){
                window.singletonIntifaceWebSocketClient = new IntifaceWebSocketClient();
            }
            this.intifaceService = window.singletonIntifaceWebSocketClient;
            this.id = crypto.randomUUID();
            this.name = name;

            if(name.startsWith('LVS-')) {
                this.gatt = new FakeLVSBluetoothRemoteGATTServer(this);
            } else if(name.startsWith('KEON')) {
                this.name = 'Launch';
                this.gatt = new FakeLaunchBluetoothRemoteGATTServer(this);
            } else {
                throw new Error('Device not supported');
            }

            this.intifaceDevice = Number(prompt('Intiface Device No:'));
        }

        addEventListener(event, callback) {
            console.error('! STUB - NOT IMPLEMENTED !')
        }
    }

    window.FakeBluetoothRemoteGATTServer = FakeBluetoothRemoteGATTServer;
    window.FakeBluetoothDevice = FakeBluetoothDevice;
    window.singletonIntifaceWebSocketClient = null

    navigator.bluetooth = {
        getAvailability: function() { return Promise.resolve(true); },
        requestDevice: function(options) {
            let prefix = '';
            let filterPrefix = options.filters.find(i => i.namePrefix);
            if(filterPrefix) {
                prefix = filterPrefix.namePrefix;
            } else {
                let filterName = options.filters.find(i => i.name);
                if(filterName) {
                    prefix = filterName.name;
                }
            }
            return Promise.resolve(new FakeBluetoothDevice(prefix + 'FAKEDEVICE'));
        }
    }

})();



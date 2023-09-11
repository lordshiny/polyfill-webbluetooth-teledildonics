# Web Bluetooth Polyfill for Teledildonics

This is a minimal polyfill that emulates the [Web Bluetooth API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Bluetooth_API) to provide a bridge from a browser that does not support Web Bluetooth (i.e. Firefox) to your toys via [Intiface](https://intiface.com/).

To use it, you need to download either [Intiface](https://intiface.com/) or the [intiface-engine](https://github.com/intiface/intiface-engine) first.

To install the userscripts, I recommend using either [Violentmonkey](https://violentmonkey.github.io/) or [Tampermonkey](https://www.tampermonkey.net/).

Turn on your Bluetooth devices.

Start the Intiface server via the GUI or the intiface-engine via `./intiface-engine --websocket-port 12345 --use-bluetooth-le`.

Pay attention to log messages like `Assigning index 1 to Lovense Hush`.

In XToys for vibrators you can add any single channel Lovense device and for Strokes you need to add the Launch device. You do not need to own the exact device, as it was just easiest to implement a bridge for these BLE devices. They will map to any vibration and stroking device supported by Buttplug.io.

When you are ready, click on the connect icon in XToys. It will then ask you for the device index you want this instance to map to. Use the numbers from the logs. 

![Screenshot of XToys](/screenshot.png?raw=true)

> **Warning**\
> The implementation may crash, use at your own risk!

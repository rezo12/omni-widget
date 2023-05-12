<br>

<p align="center"><img src="./docs/logos/omni.png" width="128" height="128"/></p>

<h3 align="center">Omni Widget</h3>
<p align="center"><strong><code>@capitec/omni-widget</code></strong></p>
<p align="center">Framework agnostic, zero dependency web utilities to enable embedding externally hosted web content with bi-directional communication.</p>

<br />

<p align="center">
	<a href="https://npmcharts.com/compare/@capitec/omni-widget?minimal=true"><img alt="Downloads per week" src="https://img.shields.io/npm/dw/@capitec/omni-widget.svg" height="20"/></a>
	<a href="https://www.npmjs.com/package/@capitec/omni-widget"><img alt="NPM Version" src="https://img.shields.io/npm/v/@capitec/omni-widget.svg" height="20"/></a>
	<a href="https://github.com/capitec/omni-widget/actions/workflows/build.yml"><img alt="GitHub Build" src="https://github.com/capitec/omni-widget/actions/workflows/build.yml/badge.svg" height="20"/></a>
	<a href="https://github.com/capitec/omni-widget/blob/develop/LICENSE"><img alt="MIT License" src="https://img.shields.io/github/license/capitec/omni-widget" height="20"/></a>
</p>
<p align="center">
	<a href="https://capitec.github.io/open-source/docs/omni-widget"><img alt="Docs" src="https://img.shields.io/static/v1?label=docs&message=capitec.github.io/open-source&color=blue&style=flat-square" /></a>
</p>

<br/>

<p align="center">
	[<a href="#introduction">Introduction</a>]
	[<a href="#usage">Usage</a>]
	[<a href="#contributors">Contributors</a>]
	[<a href="#license">License</a>]
</p>

<br/>

---

<br />

## Introduction

-   The `<omni-widget>` is a web component that makes hosting external web content easier, with bi-directional communication capabilities.
-   The `Widget` class exposes static functions to make it easier for hosted external web content to interact with its `omni-widget` host.

<br />

## Usage

1️⃣ &nbsp; Install the library in your project.

```bash
npm install @capitec/omni-widget
```

### For hosted widgets

2️⃣ &nbsp; Import the `Widget` class from the package and use relevant static functions for initialisation, event handling and messaging.

```js
import { Widget } from '@capitec/omni-widget';

if (!Widget.isHosted) {
    console.log('Not hosted as a widget!');
} else {
    Widget.initialise(async function (identifier) {
        console.log(`Widget loaded with identifier: '${identifier}'`);
        const response = await Widget.messageApplicationAsync(Widget.currentIdentifier, 'some-event-from-the-widget', {
            message: 'This is event detail.'
        });
    });
    Widget.addEventListener('some-event-for-the-widget', async function (e) {
        console.log(`Widget message: '${JSON.stringify(e.content)}'`);
        e.callback('This is a response');
    });
}
```

### For hosting widgets

2️⃣ &nbsp; Import the package

```js
// JS import
import '@capitec/omni-widget';

// or HTML import
<script type="module" src="/node_modules/omni-widget/dist/index.js"></script>;
```

3️⃣ &nbsp; Use the web component to host the widget.

```html
<omni-widget src="https://some-widget-url.html"></omni-widget>
```

4️⃣ &nbsp; Use instance functions on the component to send messages to the widget.

```js
const widgetResponse = await document
    .querySelector('omni-widget')
    .messageWidgetAsync('some-event-for-the-widget', { message: 'This is event detail.' });
```

5️⃣ &nbsp; Use event listeners to receive messages from the widget.

```js
document.querySelector('omni-widget').addEventListener('some-event-from-the-widget', function (e) {
    const widgetEventInfo = e.detail;
    console.log('Widget event data: ' + JSON.stringify(widgetEventInfo.content));
    widgetEventInfo.callback('This is a response.');
});
```

<br>

### 🚩 Example Usage Project

An example project is available in the [example directory](https://github.com/capitec/omni-widget/tree/develop/example).

<br>

## Contributors

Made possible by these fantastic people. 💖

See the [`CONTRIBUTING.md`](./CONTRIBUTING.md) guide to get involved.

<!-- ALL-CONTRIBUTORS-LIST:START - Do not remove or modify this section -->
<!-- prettier-ignore-start -->
<!-- markdownlint-disable -->
<table>
  <tbody>
    <tr>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/BOTLANNER"><img src="https://avatars.githubusercontent.com/u/16349308?v=4?s=100" width="100px;" alt="BOTLANNER"/><br /><sub><b>BOTLANNER</b></sub></a><br /><a href="https://github.com/capitec/omni-widget/commits?author=BOTLANNER" title="Code">💻</a> <a href="#tool-BOTLANNER" title="Tools">🔧</a></td>
    </tr>
  </tbody>
</table>

<!-- markdownlint-restore -->
<!-- prettier-ignore-end -->

<!-- ALL-CONTRIBUTORS-LIST:END -->

<br>

## License

Licensed under [MIT](LICENSE)

<br>
<br>
<hr>
<br>
<br>
<br>
<p align="center">
    <picture>
        <source media="(prefers-color-scheme: dark)" srcset="./docs/logos/capitec-logo-white.svg">
        <img alt="Capitec Logo" src="./docs/logos/capitec-logo-color.svg" height="28">
    </picture>
</p>
<p align="center">We are hiring 🤝 Join us! 🇿🇦</p>
<p align="center">
    <a href="https://www.capitecbank.co.za/about-us/careers">https://www.capitecbank.co.za/about-us/careers</a>
</p>

<br>
<br>

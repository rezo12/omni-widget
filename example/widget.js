import { Widget } from '@capitec/omni-widget';

function widgetLoad(identifier) {
	console.log(`Widget loaded with identifier: '${identifier}'`);
	if (Widget.isInitialised) {
		Widget.messageApplication(identifier, 'log', 'Widget initialised!');
	}
}

if (!Widget.isHosted) {
	document.body.innerHTML = `<h2>Not a hosted widget!</h2>`;
} else {

	Widget.initialise(widgetLoad);
	Widget.addEventListener('start-chat', async function(e) {
		e.callback('confirmed');
		document.getElementById('text-message').innerText += '\r\n' + 'Chatting: ';
		const message = await Widget.messageApplicationAsync(Widget.currentIdentifier, 'request-input', {
			message: 'Enter a chat message',
			default: 'Hello!'
		});
		document.getElementById('text-message').innerText += '\r\n' + message;
		Widget.messageApplication(Widget.currentIdentifier, 'log', `Message: ${message}`);
	})
}
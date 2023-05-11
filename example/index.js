import '@capitec/omni-widget';

function logFromWidget(e) {
	const message = e.detail.content;
	console.log(message);
}

function inputToWidget(e) {
	const request = e.detail.content;
	const response = prompt(request.message, request.default);
	e.detail.callback(response);
}

document.addEventListener("DOMContentLoaded", function() {
	document.querySelector('omni-widget').addEventListener('log', logFromWidget);
	document.querySelector('omni-widget').addEventListener('request-input', inputToWidget);
});

async function chat() {
	const confirmation = await document.querySelector('omni-widget').messageWidgetAsync('start-chat', undefined, undefined, 'confirmation');
	if (confirmation) {
		console.log('Chat started');
	}
}

document.querySelector('button').addEventListener('click', chat);
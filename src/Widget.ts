/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/restrict-plus-operands */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-misused-promises */
/* eslint-disable @typescript-eslint/explicit-function-return-type */
/* eslint-disable tsdoc/syntax */
/**
 * Component that hosts a remote widget.
 * The `Widget` class provides static functions that can be used to interop from a `<omni-widget>` component hosted frame to the hosting window.
 * The `<omni-widget>` component provides public instance functions that can be used to interop from the hosting window to the hosted frame.
 *
 * @import
 * ```js
 * import '@capitec/omni-components/widget';
 * ```
 *
 * @example
 * ```html
 * <omni-widget src="https://some-widget-url"></omni-widget>
 * ```
 *
 * @element omni-widget
 *
 * @fires {CustomEvent<string>} frame-load - Dispatched from the component and also sent as a bridged message to the hosted widget frame, after the frame initially loads.
 * @fires {CustomEvent<BridgeInfo>} bridge-message - Dispatched when a bridged message is received.
 * @fires {CustomEvent<WidgetEventDetail>} event-name - Dispatched when a bridged message is received. The `event-name` is set by the `bridgeEvent` property of the received message data.
 *
 * @csspart frame - Internal `HTMLIFrameElement` instance to be targeted via `::part(frame)` selector in css.
 *
 */
export class Widget extends HTMLElement {
    /**
     * Internal instance of `HTMLIFrameElement`
     */
    public readonly iframe: HTMLIFrameElement;

    /**
     * The URI path to the widget.
     * @attr
     */
    public get src(): string {
        return this.getAttribute('src') ?? this.iframe.src;
    }

    public set src(value: string) {
        if (this.getAttribute('src') !== value) {
            this.setAttribute('src', value);
        }
        if (this.iframe.getAttribute('src') !== value) {
            this.iframe.setAttribute('src', value);
        }
        if (this.iframe.src !== value) {
            this.iframe.src = value;
        }
    }

    /**
     * Unique identifier for widget with which to track widget specific events
     */
    public readonly identifier: string = Widget.uuidv4();

    /**
     * Determines whether the current window is hosted within a frame. Will be `false` if current window is the top level window.
     */
    public static get isHosted(): boolean {
        return window !== window.parent;
    }

    private static _currentIdentifier?: string;

    /**
     * If current window is hosted within a frame by the `omni-widget` component and the widget has been initialised, will be the current identifier for the widget to use when sending messages.
     */
    public static get currentIdentifier(): string | undefined {
        return Widget._currentIdentifier;
    }

    private static set currentIdentifier(identifier: string | undefined) {
        Widget._currentIdentifier = identifier;
    }

    /**
     * Will be true if the current window is hosted within a frame by the `omni-widget` component and the widget has been initialised.
     */
    public static get isInitialised(): boolean {
        return Boolean(Widget.currentIdentifier);
    }

    private componentMessageListener = ((event: MessageEvent) => {
        const eventData = event.data as BridgeInfo<unknown>;
        // Check if received message is a widget message from this wrapper's hosted widget
        if (
            typeof event.data === `object` &&
            eventData.bridgeEvent &&
            eventData.identifier === this.identifier &&
            eventData.fromApplication !== true
        ) {
            this.widgetMessageReceived(event as MessageEvent<BridgeInfo<unknown>>);
        }
    }).bind(this);

    /**
     * Initialises the component.
     *
     * @hideconstructor
     */
    constructor() {
        super();

        // Create the element shadow root.
        const shadow = this.attachShadow({ mode: 'open' }); // Set component styles.

        const style = document.createElement('style');
        style.textContent = `
            .body {
                border: none;
            }

            :host {
                position: relative;
            }
		`;
        shadow.appendChild(style);

        this.iframe = document.createElement('iframe');
        // this.iframe.src = this.src;
        if (this.id) {
            this.iframe.id = this.id;
        }
        this.iframe.classList.add('body');
        this.iframe.style.width = '100%';
        this.iframe.style.height = '100%';
        this.iframe.setAttribute('part', 'frame');

        this.iframe.addEventListener('load', () => this.frameLoaded());

        shadow.appendChild(this.iframe);
    }

    /**
     * List of attributes that will trigger `attributeChangedCallback` when set.
     */
    static get observedAttributes() {
        return ['src'];
    }

    /**
     * Setup the component once added to the DOM.
     */
    connectedCallback(): void {
        // Listen for messages on the application window. Used for communication with the child widget.
        window.addEventListener(`message`, this.componentMessageListener);
    }

    /**
     * Clean up the component once removed from the DOM.
     */
    disconnectedCallback(): void {
        //Cleanup listeners
        window.removeEventListener(`message`, this.componentMessageListener);
    }

    /**
     * Callback on change for any attribute listed in `observedAttributes`.
     */
    attributeChangedCallback(name: string, oldValue: string, newValue: string): void {
        if (name === 'src') {
            this.src = newValue;
        }
    }

    /**
     * Generate a unique identifier string
     */
    static uuidv4(): string {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        if (crypto && crypto.randomUUID) {
            try {
                const uuid = crypto.randomUUID();
                if (uuid) {
                    return uuid;
                }
            } catch (error) {
                console.warn(error);
            }
        }

        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        return ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, (c) =>
            (c ^ (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (c / 4)))).toString(16)
        );
    }

    // eslint-disable-next-line @typescript-eslint/require-await
    private async frameLoaded() {
        // Raise frame load event
        this.dispatchEvent(
            new CustomEvent('frame-load', {
                bubbles: true,
                composed: true,
                cancelable: false,
                detail: this.identifier
            })
        );
        this.messageWidget('frame-load', this.identifier);
    }

    private widgetMessageReceived<T>(event: MessageEvent<BridgeInfo<T>>) {
        // Create and dispatch custom event based on bridge event info
        const evt: CustomEventInit<WidgetEventDetail<T>> = {
            detail: {
                content: event.data.detail,
                // Check whether a temporary callback event has been provided, and if so, setup function to return the callback response.
                callback: event.data.callbackId
                    ? (detail: unknown) => {
                          this.messageWidget(event.data.callbackId as string, detail);
                      }
                    : undefined
            } as WidgetEventDetail<T>,
            bubbles: true,
            composed: true,
            cancelable: true
        };
        this.dispatchEvent(
            new CustomEvent('bridge-message', {
                bubbles: true,
                cancelable: true,
                composed: true,
                detail: event.data
            })
        );
        this.dispatchEvent(new CustomEvent(event.data.bridgeEvent, evt));
    }

    /**
     * Send a bridged message to the hosted widget frame.
     * @param eventName The event this message correlates to.
     * @param detail Custom detail to attach as event detail.
     * @param callback (Optional) Callback function to invoke on widget response.
     * @param timeout (Optional) Duration to wait for callback.
     * @param timeoutCallback (Optional) Callback function to invoke if response timeout is exceeded
     * @param callbackIdentifierPrefix (Optional) Prefix to apply on generated widget callback id
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    messageWidget<T = any, U = any>(
        eventName: string,
        detail?: T,
        callback?: (detail: U) => void,
        timeout?: number,
        timeoutCallback?: () => void,
        callbackIdentifierPrefix = 'widget-callback'
    ) {
        const frameWindow = this.iframe.contentWindow;
        let callbackId: string | undefined = undefined;

        if (callback) {
            let resolved: boolean | null = null;

            // If callback function is specified, setup temporary event for callback response
            callbackId = `${callbackIdentifierPrefix}|${Widget.uuidv4()}`;

            let callbackHandler = (e: Event) => {
                if (resolved === null) {
                    resolved = true;
                    window.removeEventListener(callbackId as string, callbackHandler);
                    // eslint-disable-next-line callback-return
                    callback((e as CustomEvent).detail);
                }
            };

            callbackHandler = callbackHandler.bind(this);
            if (timeout) {
                setTimeout(() => {
                    if (resolved === null) {
                        resolved = false;
                        window.removeEventListener(callbackId as string, callbackHandler);
                        if (timeoutCallback) {
                            timeoutCallback();
                        }
                    }
                }, timeout);
            }
            window.addEventListener(callbackId, callbackHandler);
        }

        const bridgeEvent: BridgeInfo<T> = {
            bridgeEvent: eventName,
            detail: detail,
            identifier: this.identifier,
            fromApplication: true,
            callbackId: callbackId
        };
        frameWindow?.postMessage(bridgeEvent, `*`);
    }

    /**
     * Asynchronously sends a bridged message to the hosted widget frame, then awaits and returns its response.
     * @param eventName The event this message correlates to.
     * @param detail Custom detail to attach as event detail.
     * @param timeout (Optional) Duration to wait for before rejecting the promise. If not specified, will wait indefinitely
     * @param callbackIdentifierPrefix (Optional) Prefix to apply on generated widget callback id.
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    messageWidgetAsync<T = any, U = any>(eventName: string, detail?: T, timeout?: number, callbackIdentifierPrefix = 'widget-callback') {
        return new Promise<U>((resolve, reject) => {
            try {
                this.messageWidget(
                    eventName,
                    detail,
                    resolve,
                    timeout,
                    timeout ? () => reject(new Error(`No response received for '${eventName}' in the given timeout: ${timeout}ms`)) : undefined,
                    callbackIdentifierPrefix
                );
            } catch (error) {
                reject(error);
            }
        });
    }

    /**
     * Send a bridged message to the hosting application frame as a widget.
     *
     * @param identifier Identifier to represent widget.
     * @param eventName Name of event to send to application.
     * @param detail Custom detail to attach as event detail.
     * @param callback (Optional) Callback function to invoke on widget response.
     * @param timeout (Optional) Duration to wait for callback.
     * @param timeoutCallback (Optional) Callback function to invoke if response timeout is exceeded
     * @param callbackIdentifierPrefix (Optional) Prefix to apply on generated widget callback id
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    public static messageApplication<T, U = any>(
        identifier: string,
        eventName: string,
        detail?: T,
        callback?: (detail: U) => void,
        timeout?: number,
        timeoutCallback?: () => void,
        callbackIdentifierPrefix = 'widget-callback'
    ) {
        if (window === window.parent) {
            throw new Error('No parent application to message!');
        }

        // Build up bridge event with provided detail
        const bridgeEvent: BridgeInfo = {
            bridgeEvent: eventName,
            detail: detail,
            fromApplication: false,
            identifier: identifier,
            callbackId: undefined as string | undefined
        };

        if (callback) {
            let resolved: boolean | null = null;

            // If callback function is specified, setup temporary event for callback response
            const callbackId = `${callbackIdentifierPrefix}|${Widget.uuidv4()}`;
            bridgeEvent.callbackId = callbackId;

            const callbackHandler = (e: WidgetEventDetail) => {
                if (resolved === null) {
                    resolved = true;
                    Widget.removeEventListener(callbackListener);
                    // eslint-disable-next-line callback-return
                    callback(e.content);
                }
            };
            if (timeout) {
                setTimeout(() => {
                    if (resolved === null) {
                        resolved = false;
                        Widget.removeEventListener(callbackListener);
                        if (timeoutCallback) {
                            timeoutCallback();
                        }
                    }
                }, timeout);
            }
            const callbackListener = Widget.addEventListener(callbackId, callbackHandler);
        }
        window.parent.postMessage(JSON.parse(JSON.stringify(bridgeEvent)), `*`);
    }

    /**
     * Asynchronously sends a bridged message to the hosting application frame as a widget, then awaits and returns its response.
     * @param identifier Identifier to represent widget.
     * @param eventName The event this message correlates to.
     * @param detail Custom detail to attach as event detail.
     * @param timeout (Optional) Duration to wait for before rejecting the promise. If not specified, will wait indefinitely.
     * @param callbackIdentifierPrefix (Optional) Prefix to apply on generated widget callback id
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    public static messageApplicationAsync<T, U = any>(
        identifier: string,
        eventName: string,
        detail: T,
        timeout = 3000,
        callbackIdentifierPrefix = 'widget-callback'
    ) {
        return new Promise<U>((resolve, reject) => {
            try {
                Widget.messageApplication(
                    identifier,
                    eventName,
                    detail,
                    resolve,
                    timeout,
                    () => reject(new Error(`No response received for '${eventName}' in the given timeout: ${timeout}ms`)),
                    callbackIdentifierPrefix
                );
            } catch (error) {
                reject(error);
            }
        });
    }

    /**
     * Set up a callback for the `frame-load` event from the widget component in a hosting application.
     * Can be used by a widget application to retrieve its identifier from the widget component.
     * @param frameLoaded The callback to invoke when the `frame-load` event occurs.
     */
    public static initialise(frameLoaded: (identifier: string) => void) {
        // Listen for messages on the widget window. Used for communication with the parent application
        const listener = Widget.addEventListener(`frame-load`, (event: WidgetEventDetail<string>) => {
            Widget.currentIdentifier = event.content;
            Widget.removeEventListener(listener);
            frameLoaded(event.content);
        });
    }

    /**
     * Set up a callback for the specified event from the widget component in a hosting application.
     * @param eventName The event name to listen for when receiving bridged messages.
     * @param listener The callback to invoke when the specified event occurs.
     * @returns Event listener instance that can be used to remove the listener via `Widget.removeEventListener`
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    public static addEventListener<T = any, U = any>(eventName: string, listener: (event: WidgetEventDetail<T, U>) => void) {
        // Listen for messages on the widget window. Used for communication with the parent application
        const messageListener = (event: MessageEvent<BridgeInfo<T>>) => {
            // Check if received message is a parent application message
            if (
                typeof event.data === `object` &&
                event.data.bridgeEvent &&
                event.data.fromApplication === true &&
                event.data.bridgeEvent === eventName
            ) {
                Widget.currentIdentifier = event.data.identifier;
                listener({
                    content: event.data.detail as T,
                    callback: event.data.callbackId
                        ? (detail: U) => {
                              Widget.messageApplication(event.data.identifier, event.data.callbackId as string, detail);
                          }
                        : undefined
                });
            }
        };
        window.addEventListener(`message`, messageListener);
        return messageListener;
    }

    /**
     * Remove the listener from the widget component in a hosting application.
     * @param messageListener The listener instance created by `Widget.addEventListener` to remove
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    public static removeEventListener<T = any>(messageListener: (event: MessageEvent<BridgeInfo<T>>) => void) {
        window.removeEventListener(`message`, messageListener);
    }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type BridgeInfo<T = any> = {
    callbackId?: string;
    detail?: T;
    bridgeEvent: string;
    identifier: string;
    fromApplication?: boolean;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type WidgetEventDetail<T = any, U = any> = {
    content: T;
    callback?: (detail: U) => void;
};

customElements.define('omni-widget', Widget);

declare global {
    interface HTMLElementTagNameMap {
        'omni-widget': Widget;
    }
}

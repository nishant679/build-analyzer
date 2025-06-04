import * as vscode from 'vscode';
import * as path from 'path';

/**
 * Manages the lifecycle and communication of the VS Code Webview panel.
 */
export class WebviewManager {
    // Static property to hold the single instance of the Webview panel.
    // This ensures only one panel is open at a time for the visualizer.
    public static currentPanel: vscode.WebviewPanel | undefined;

    private readonly _extensionContext: vscode.ExtensionContext;
    private _disposables: vscode.Disposable[] = []; // Array to hold disposables for cleanup

    /**
     * Constructs a new WebviewManager.
     * @param context The extension context, used to get extension's URI for webview resources.
     */
    constructor(context: vscode.ExtensionContext) {
        this._extensionContext = context;
    }

    /**
     * Creates and shows a new Webview panel, or reveals an existing one.
     */
    public createOrShowWebview() {
        const column = vscode.window.activeTextEditor
            ? vscode.window.activeTextEditor.viewColumn
            : undefined;

        // If we already have a panel, show it.
        if (WebviewManager.currentPanel) {
            WebviewManager.currentPanel.reveal(column);
            return;
        }

        // Otherwise, create a new panel.
        WebviewManager.currentPanel = vscode.window.createWebviewPanel(
            'buildVisualizer', // Identifies the type of the webview. Used internally
            'Build Visualizer', // Title of the panel displayed to the user
            column || vscode.ViewColumn.One, // Editor column to show the new webview panel in.
            {
                // Enable JavaScript in the webview
                enableScripts: true,
                // Restrict the webview to only loading content from our extension's 'out' directory
                localResourceRoots: [
                    vscode.Uri.joinPath(this._extensionContext.extensionUri, 'out', 'webview')
                ],
                // Retain context when hidden
                retainContextWhenHidden: true
            }
        );

        // Set the HTML content for the webview.
        WebviewManager.currentPanel.webview.html = this._getHtmlForWebview(WebviewManager.currentPanel.webview);

        // Handle messages from the webview.
        WebviewManager.currentPanel.webview.onDidReceiveMessage(
            message => {
                // Forward the message to any registered listeners.
                this._disposables.forEach(d => {
                    if ((d as any)._callback) { // Check if it's our custom message listener
                        (d as any)._callback(message);
                    }
                });
            },
            null,
            this._disposables
        );

        // Handle when the panel is closed.
        // This is important to clean up resources.
        WebviewManager.currentPanel.onDidDispose(
            () => this.dispose(),
            null,
            this._disposables
        );
    }

    /**
     * Sends a message to the Webview panel.
     * @param message The message object to send.
     */
    public postMessageToWebview(message: any) {
        if (WebviewManager.currentPanel) {
            WebviewManager.currentPanel.webview.postMessage(message);
        }
    }

    /**
     * Registers a callback function to be called when the Webview sends a message.
     * @param callback The function to call with the message.
     */
    public onDidReceiveMessageFromWebview(callback: (message: any) => void) {
        // Store the callback in disposables to manage its lifecycle.
        // This is a simple way to manage multiple listeners if needed.
        const disposable = new vscode.Disposable(() => { });
        (disposable as any)._callback = callback; // Attach callback for internal use
        this._disposables.push(disposable);
    }

    /**
     * Disposes of the current Webview panel and cleans up resources.
     */
    public dispose() {
        if (WebviewManager.currentPanel) {
            WebviewManager.currentPanel.dispose();
            WebviewManager.currentPanel = undefined;
        }

        while (this._disposables.length) {
            const x = this._disposables.pop();
            if (x) {
                x.dispose();
            }
        }
    }

    /**
     * Generates the HTML content for the Webview.
     * This HTML loads the bundled React application.
     * @param webview The webview instance to get resource URIs for.
     * @returns The HTML string.
     */
    private _getHtmlForWebview(webview: vscode.Webview): string {
        // Get the URI for the bundled JavaScript and CSS files.
        // These URIs must be converted to webview-compatible URIs.
        const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(
            this._extensionContext.extensionUri, 'out', 'webview', 'bundle.js'
        ));
        const styleUri = webview.asWebviewUri(vscode.Uri.joinPath(
            this._extensionContext.extensionUri, 'out', 'webview', 'styles.css'
        ));

        // Use a Content Security Policy (CSP) to restrict what resources can be loaded in the webview.
        // This is crucial for security.
        const cspSource = webview.cspSource;

        return `<!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Build Visualizer</title>
                <link href="${styleUri}" rel="stylesheet">
                <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${cspSource} https:; script-src 'nonce-react-app' ${cspSource}; style-src ${cspSource} 'unsafe-inline';">
            </head>
            <body>
                <div id="root"></div>
                <script nonce="nonce-react-app" src="${scriptUri}"></script>
            </body>
            </html>`;
    }
}

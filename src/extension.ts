import * as vscode from 'vscode';
import { WebviewManager } from './webview/webviewManager';
import { loadAndProcessStatsFile } from './data/processing';
import { NormalizedBuildStats } from './data/types';

/**
 * Activates the VS Code extension.
 * This function is called when your extension is activated.
 * The activationEvents in package.json determine when this is called.
 *
 * @param context The extension context provided by VS Code.
 */
export function activate(context: vscode.ExtensionContext) {
  // Log that the extension is active.
  console.log('Congratulations, "build-visualizer" is now active!');

  // Create an instance of the WebviewManager.
  // This class handles the creation, display, and communication with the Webview panel.
  const webviewManager = new WebviewManager(context);

  // Register the 'buildVisualizer.show' command.
  // This command will be available in the VS Code Command Palette.
  let disposable = vscode.commands.registerCommand('buildVisualizer.show', async () => {
    // Show or create the Webview panel.
    webviewManager.createOrShowWebview();

    // Set up a listener for messages coming from the Webview.
    // This allows the Webview to send requests or data back to the extension host.
    webviewManager.onDidReceiveMessageFromWebview(async (message) => {
      switch (message.type) {
        case 'WEBVIEW_READY':
          // When the Webview signals it's ready, prompt the user for a stats file.
          vscode.window.showInformationMessage('Build Visualizer Webview is ready!');
          await promptAndLoadStatsFile();
          break;
        case 'REQUEST_LOAD_STATS_FILE':
          // If the Webview requests to load a stats file (e.g., from a button click).
          await promptAndLoadStatsFile(message.payload.filePath);
          break;
        case 'ERROR':
          // Handle errors reported by the Webview.
          vscode.window.showErrorMessage(`Webview Error: ${message.payload.message}`);
          break;
        // Add more cases for other message types if needed for future features.
      }
    });

    /**
     * Prompts the user to select a stats file, loads it, processes it,
     * and sends the normalized data to the Webview.
     * @param initialPath Optional path to pre-fill the file picker.
     */
    const promptAndLoadStatsFile = async (initialPath?: string) => {
      // Show an open dialog to let the user pick a file.
      const options: vscode.OpenDialogOptions = {
        canSelectMany: false,
        openLabel: 'Select Build Stats File',
        filters: {
          'JSON Files': ['json'],
          'All Files': ['*']
        },
        // If an initial path is provided, set it as the default URI.
        defaultUri: initialPath ? vscode.Uri.file(initialPath) : undefined
      };

      const fileUri = await vscode.window.showOpenDialog(options);

      if (fileUri && fileUri.length > 0) {
        const filePath = fileUri[0].fsPath;
        try {
          // Load and process the stats file using the processing module.
          const normalizedStats: NormalizedBuildStats = await loadAndProcessStatsFile(filePath);

          // Send the processed data to the Webview.
          webviewManager.postMessageToWebview({
            type: 'BUILD_STATS_UPDATE',
            payload: normalizedStats
          });

          // Also send the file path back to the webview so it can display it.
          webviewManager.postMessageToWebview({
            type: 'FILE_PATH_UPDATE',
            payload: { filePath: filePath }
          });

          vscode.window.showInformationMessage(`Loaded and visualized: ${filePath}`);
        } catch (error: any) {
          // Handle any errors during file loading or processing.
          vscode.window.showErrorMessage(`Failed to load or process stats file: ${error.message}`);
          // Send an error message to the Webview as well.
          webviewManager.postMessageToWebview({
            type: 'ERROR',
            payload: { message: `Failed to load or process stats file: ${error.message}` }
          });
        }
      } else {
        vscode.window.showInformationMessage('No stats file selected.');
      }
    };
  });

  // Add the command to the extension's subscriptions, so it's disposed when the extension is deactivated.
  context.subscriptions.push(disposable);
}

/**
 * Deactivates the VS Code extension.
 * This function is called when your extension is deactivated.
 */
export function deactivate() {
  console.log('Extension "build-visualizer" is now deactivated.');
}

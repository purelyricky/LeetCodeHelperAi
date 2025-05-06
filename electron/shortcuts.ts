import { globalShortcut, app } from "electron"
import { IShortcutsHelperDeps, state } from "./main"
import { configHelper } from "./ConfigHelper"

export class ShortcutsHelper {
  private deps: IShortcutsHelperDeps

  constructor(deps: IShortcutsHelperDeps) {
    this.deps = deps
  }

  private adjustOpacity(delta: number): void {
    const mainWindow = this.deps.getMainWindow();
    if (!mainWindow) return;
  
    let currentOpacity = mainWindow.getOpacity();
    console.log(`Current opacity before adjustment: ${currentOpacity}`);
  
    // IMPROVED: Much more aggressive increase when opacity is very low
    let newOpacity;
    if (currentOpacity < 0.3 && delta > 0) {
      // When increasing from very low opacity (nearly invisible),
      // jump straight to 1.0 for immediate visibility
      newOpacity = 1.0;
      console.log("Low opacity detected, jumping to full opacity for immediate visibility");
    } else {
      // Normal adjustments with safeguards
      newOpacity = Math.max(0.1, Math.min(1.0, currentOpacity + delta));
    }
  
    console.log(`Adjusting opacity from ${currentOpacity} to ${newOpacity}`);
  
    // Apply opacity change
    mainWindow.setOpacity(newOpacity);
  
    // Save the opacity setting to config
    try {
      configHelper.setOpacity(newOpacity);
    } catch (error) {
      console.error('Error saving opacity to config:', error);
    }
  
    // Enhanced visibility handling - make sure window becomes visible and active
    if (newOpacity > 0.1) {
      console.log("Opacity increased, ensuring window is visible and active");
      
      // IMPORTANT: The ordering here matters
      mainWindow.show();
      mainWindow.moveTop();
      
      // Ensure proper focus
      setTimeout(() => {
        if (!mainWindow.isDestroyed()) {
          mainWindow.focus();
        }
      }, 50);
      
      state.isWindowVisible = true;
    }
  }


  public registerGlobalShortcuts(): void {
    globalShortcut.register("CommandOrControl+H", async () => {
      const mainWindow = this.deps.getMainWindow()
      if (mainWindow) {
        console.log("Taking screenshot...")
        try {
          const screenshotPath = await this.deps.takeScreenshot()
          const preview = await this.deps.getImagePreview(screenshotPath)
          mainWindow.webContents.send("screenshot-taken", {
            path: screenshotPath,
            preview
          })
        } catch (error) {
          console.error("Error capturing screenshot:", error)
        }
      }
    })

    globalShortcut.register("CommandOrControl+Enter", async () => {
      await this.deps.processingHelper?.processScreenshots()
    })

    globalShortcut.register("CommandOrControl+R", () => {
      console.log(
        "Command + R pressed. Canceling requests and resetting queues..."
      )

      // Cancel ongoing API requests
      this.deps.processingHelper?.cancelOngoingRequests()

      // Clear both screenshot queues
      this.deps.clearQueues()

      console.log("Cleared queues.")

      // Update the view state to 'queue'
      this.deps.setView("queue")

      // Notify renderer process to switch view to 'queue'
      const mainWindow = this.deps.getMainWindow()
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send("reset-view")
        mainWindow.webContents.send("reset")
      }
    })

    // New shortcuts for moving the window
    globalShortcut.register("CommandOrControl+Left", () => {
      console.log("Command/Ctrl + Left pressed. Moving window left.")
      this.deps.moveWindowLeft()
    })

    globalShortcut.register("CommandOrControl+Right", () => {
      console.log("Command/Ctrl + Right pressed. Moving window right.")
      this.deps.moveWindowRight()
    })

    globalShortcut.register("CommandOrControl+Down", () => {
      console.log("Command/Ctrl + down pressed. Moving window down.")
      this.deps.moveWindowDown()
    })

    globalShortcut.register("CommandOrControl+Up", () => {
      console.log("Command/Ctrl + Up pressed. Moving window Up.")
      this.deps.moveWindowUp()
    })

    globalShortcut.register("CommandOrControl+B", () => {
      console.log("Command/Ctrl + B pressed. Toggling window visibility.")
      this.deps.toggleMainWindow()
    })

    globalShortcut.register("CommandOrControl+Q", () => {
      console.log("Command/Ctrl + Q pressed. Quitting application.")
      app.quit()
    })

    // Adjust opacity shortcuts
    globalShortcut.register("CommandOrControl+[", () => {
      console.log("Command/Ctrl + [ pressed. Decreasing opacity.")
      this.adjustOpacity(-0.1)
    })

    globalShortcut.register("CommandOrControl+]", () => {
      console.log("Command/Ctrl + ] pressed. Increasing opacity.")
      this.adjustOpacity(0.1)
    })

    // Zoom controls
    globalShortcut.register("CommandOrControl+-", () => {
      console.log("Command/Ctrl + - pressed. Zooming out.")
      const mainWindow = this.deps.getMainWindow()
      if (mainWindow) {
        const currentZoom = mainWindow.webContents.getZoomLevel()
        mainWindow.webContents.setZoomLevel(currentZoom - 0.5)
      }
    })

    globalShortcut.register("CommandOrControl+0", () => {
      console.log("Command/Ctrl + 0 pressed. Resetting zoom.")
      const mainWindow = this.deps.getMainWindow()
      if (mainWindow) {
        mainWindow.webContents.setZoomLevel(0)
      }
    })

    globalShortcut.register("CommandOrControl+=", () => {
      console.log("Command/Ctrl + = pressed. Zooming in.")
      const mainWindow = this.deps.getMainWindow()
      if (mainWindow) {
        const currentZoom = mainWindow.webContents.getZoomLevel()
        mainWindow.webContents.setZoomLevel(currentZoom + 0.5)
      }
    })

    // Delete last screenshot shortcut
    globalShortcut.register("CommandOrControl+L", () => {
      console.log("Command/Ctrl + L pressed. Deleting last screenshot.")
      const mainWindow = this.deps.getMainWindow()
      if (mainWindow) {
        // Send an event to the renderer to delete the last screenshot
        mainWindow.webContents.send("delete-last-screenshot")
      }
    })

    globalShortcut.register("CommandOrControl+T", () => {
      console.log("Command/Ctrl + T pressed. Toggling click-through mode.")
      this.deps.toggleClickThrough()
    })

    // Unregister shortcuts when quitting
    app.on("will-quit", () => {
      globalShortcut.unregisterAll()
    })

    globalShortcut.register("CommandOrControl+Shift+V", () => {
      console.log("EMERGENCY VISIBILITY triggered with Cmd/Ctrl+Shift+V");
      const mainWindow = this.deps.getMainWindow();
      if (mainWindow) {
        // Directly set opacity to 1.0 and force window to be visible
        mainWindow.setOpacity(1.0);
        mainWindow.show();
        mainWindow.moveTop();
        mainWindow.focus();
        
        // Update state and config
        state.isWindowVisible = true;
        configHelper.setOpacity(1.0);
        
        // Also call the main forceShowWindow for complete activation
        this.deps.forceShowWindow();
      }
    })
    // Add the existing force visibility shortcut
    globalShortcut.register("CommandOrControl+Shift+B", () => {
      console.log("Command/Ctrl + Shift + B pressed. Forcing window visibility.");
      this.deps.forceShowWindow();
    });
  }
}

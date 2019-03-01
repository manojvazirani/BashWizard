import electron, { BrowserWindow, dialog, FileFilter, Menu } from "electron";
import fs from "fs";
import path from "path";
import { IBashWizardMainService, IBashWizardSettings, BashWizardTheme } from "../Models/commonModel";





export class BashWizardMainService implements IBashWizardMainService {
    private myBrowserWindow: BrowserWindow;
    constructor(private browserWindow: BrowserWindow) {
        this.myBrowserWindow = browserWindow;
    }
    public setWindowTitle(name: string) {

        this.myBrowserWindow.setTitle("Bash Wizard: " + name);
    }
    public getOpenFile(dlgTitle: string, exts: FileFilter[]): Promise<string> {
        return new Promise<string>((resolve, reject) => {
            const fileNames = dialog.showOpenDialog({
                title: dlgTitle,
                filters: exts
            });

            if (fileNames === undefined || fileNames.length !== 1) {
                return reject;
            }

            return resolve(fileNames[0]);
        });
    }


    public getSaveFile(dlgTitle: string, exts: FileFilter[]): Promise<string> {
        return new Promise<string>((resolve, reject) => {
            const fileName: string | undefined = dialog.showSaveDialog({
                title: dlgTitle,
                filters: exts
            });

            if (fileName === undefined) {
                return reject;
            }
            console.log(`getSaveFile: ${fileName}`)
            return resolve(fileName);
        });
    }

    public readText(filePath: string): Promise<string> {
        return new Promise<string>((resolve, reject) => {
            fs.readFile(
                path.normalize(filePath),
                (err: NodeJS.ErrnoException, data: Buffer) => {
                    if (err) {
                        return reject(err);
                    }
                    this.setWindowTitle(filePath);
                    resolve(data.toString());
                }
            );
        });
    }

    public writeText(filePath: string, contents: string): Promise<void> {
        this.setWindowTitle(filePath);
        const buffer = Buffer.alloc(contents.length, contents);
        return new Promise<void>((resolve, reject) => {
            try {
                const containerName: fs.PathLike = path.normalize(
                    path.dirname(filePath)
                );
                const exists = fs.existsSync(containerName);
                if (!exists) {
                    fs.mkdirSync(containerName);
                }

                fs.writeFile(path.normalize(filePath), buffer, err => {
                    if (err) {
                        return reject(err);
                    }

                    resolve();
                });
            }
            catch (e) {
                reject();
            }
        });
    }
    private getSettingFileName(): string {
        let localDir: string = "./"
        try {

            localDir = (electron.app || electron.remote.app).getPath('userData');
        }
        catch{
            console.log("couldn't get localDir");
        }
        const fileName: string = path.join(localDir + "\\BashWizardSettings.json");
        console.log(`[config file = ${fileName}]`);
        return fileName;
    }
    private getDefaultSettings(): IBashWizardSettings {
        const settings: IBashWizardSettings = {
            autoSave: false,
            theme: BashWizardTheme.Light,
            alwaysLoadChangedFile: false,
            showDebugger: false
        }
        return settings;

    }
    public getAndApplySettings(): Promise<IBashWizardSettings> {
        let settings: IBashWizardSettings;
        const settingsFile = this.getSettingFileName();
        return new Promise<IBashWizardSettings>(async (resolve, reject) => {
            try {

                console.log("service is getting settings")
                const contents: string = fs.readFileSync(settingsFile).toString();
                settings = JSON.parse(contents);
                return resolve(settings);
            }
            catch (error) {
                console.log("getAndApplySettings error %s", error);
                settings = this.getDefaultSettings();
                return resolve(settings); // we never pass the exception back to the client
            }
            finally {
                fs.writeFileSync(settingsFile, JSON.stringify(settings));
                this.applySettings(settings);
            }
        });
    }

    public saveAndApplySettings(settings: IBashWizardSettings): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            try {
                this.applySettings(settings);
                fs.writeFileSync(this.getSettingFileName(), JSON.stringify(settings));
                resolve();
            }
            catch (e) {
                reject(e);
            }
        });
    }

    public updateSetting(key: keyof IBashWizardSettings, value: any): Promise<void> {
        return new Promise<void>(async (resolve, reject) => {
            try {
                console.log(`updating setting: [${key}=${value}]`);
                const settings: IBashWizardSettings = await this.getAndApplySettings()
                settings[key] = value;
                fs.writeFileSync(this.getSettingFileName(), JSON.stringify(settings));
                resolve();
            }
            catch (e) {
                reject(e);
            }
        });
    }

    private applySettings(settings: IBashWizardSettings): void {

        console.log("applying settings: %s", JSON.stringify(settings))
        if (settings === undefined) {
            return;
        }

        const menu: Menu | null = Menu.getApplicationMenu();
        if (menu === null) {
            throw new Error("No menu in react app!");
        }

        menu.getMenuItemById("auto-save").checked = settings.autoSave;
        menu.getMenuItemById("auto-load").checked = settings.alwaysLoadChangedFile;
        menu.getMenuItemById("toggle-dev-tools").checked = settings.showDebugger;
        if (settings.showDebugger) {
            this.myBrowserWindow.webContents.openDevTools();
        } else {
            this.myBrowserWindow.webContents.closeDevTools();
        }
    }


}

export default BashWizardMainService;
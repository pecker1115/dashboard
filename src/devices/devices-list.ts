import { LitElement, html, css } from "lit";
import { customElement, state } from "lit/decorators.js";
import {
  getDevices,
  ImportableDevice,
  ListDevicesResult,
} from "../api/devices";
import { openWizardDialog } from "../wizard";
import "@material/mwc-button";
import { subscribeOnlineStatus } from "../online_status";
import "./configured-device-card";
import "./importable-device-card";

@customElement("esphome-devices-list")
class ESPHomeDevicesList extends LitElement {
  @state() private _devices?: ListDevicesResult;
  @state() private _onlineStatus?: Record<string, boolean>;
  @state() private _highlightedName?: string;

  private _updateDevicesInterval?: number;
  private _onlineStatusUnsub?: () => void;

  protected render() {
    if (this._devices === undefined) {
      return html``;
    }
    if (
      this._devices.configured.length === 0 &&
      this._devices.importable.length === 0
    ) {
      return html`
        <div class="welcome-container">
          <h5>Welcome to ESPHome</h5>
          <p>It looks like you don't yet have any devices.</p>
          <p>
            <mwc-button
              raised
              label="Add device"
              icon="add"
              @click=${openWizardDialog}
            ></mwc-button>
          </p>
        </div>
      `;
    }

    const importable = this._devices.importable;

    return html`
      <div class="container">
        ${importable.length
          ? html`
              <h5>Discovered ESPHome devices</h5>
              <div class="grid import-container">
                ${importable.map(
                  (device) => html`
                    <esphome-importable-device-card
                      .device=${device}
                      @imported=${() => this._handleImported(device)}
                    ></esphome-importable-device-card>
                  `
                )}
              </div>
            `
          : ""}

        <div class="grid">
          ${this._devices.configured.map(
            (device) => html` <esphome-configured-device-card
              .device=${device}
              @deleted=${this._updateDevices}
              .onlineStatus=${(this._onlineStatus || {})[device.configuration]}
              .highlight=${device.name === this._highlightedName}
              data-name=${device.name}
            ></esphome-configured-device-card>`
          )}
        </div>
      </div>
    `;
  }

  static styles = css`
    .container {
      margin: 20px auto;
      width: 90%;
      max-width: 1920px;
    }
    .import-container {
      border-bottom: 1px solid black;
    }
    .grid {
      display: grid;
      grid-template-columns: 1fr;
      grid-template-columns: 1fr 1fr 1fr;
      grid-column-gap: 1.5rem;
    }
    @media only screen and (max-width: 1100px) {
      .grid {
        grid-template-columns: 1fr 1fr;
        grid-column-gap: 1.5rem;
      }
    }
    @media only screen and (max-width: 750px) {
      .grid {
        grid-template-columns: 1fr;
        grid-column-gap: 0;
      }
    }
    esphome-configured-device-card,
    esphome-importable-device-card {
      margin: 0.5rem 0 1rem 0;
    }
    .welcome-container {
      text-align: center;
      margin-top: 40px;
    }
    h5 {
      font-size: 1.64rem;
      line-height: 110%;
      font-weight: 400;
      margin: 1rem 0 0.65rem 0;
    }
    hr {
      margin-top: 16px;
      margin-bottom: 16px;
    }
    mwc-button {
      --mdc-theme-primary: #4caf50;
    }
  `;

  private async _updateDevices() {
    this._devices = await getDevices();
  }

  private async _handleImported(entry: ImportableDevice) {
    this._highlightedName = entry.name;
    await this._updateDevices();
    const elem = this.renderRoot!.querySelector(
      `esphome-configured-device-card[data-name='${entry.name}']`
    );
    if (elem) {
      elem.scrollIntoView({ behavior: "smooth" });
    }
  }

  public connectedCallback() {
    super.connectedCallback();
    const updateAndSchedule = async () => {
      await this._updateDevices();
      this._updateDevicesInterval = window.setInterval(async () => {
        await this._updateDevices();
      }, 5000);
    };
    updateAndSchedule();
    this._onlineStatusUnsub = subscribeOnlineStatus((res) => {
      this._onlineStatus = res;
    });
  }

  public disconnectedCallback() {
    super.disconnectedCallback();
    if (this._updateDevicesInterval) {
      window.clearInterval(this._updateDevicesInterval);
    }
    if (this._onlineStatusUnsub) {
      this._onlineStatusUnsub();
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "esphome-devices-list": ESPHomeDevicesList;
  }
}

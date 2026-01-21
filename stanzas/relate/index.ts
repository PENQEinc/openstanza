import Stanza from "togostanza/stanza";
import { init } from "./app";
import { getMarginsFromCSSString } from "../../lib/utils";
import { Conf } from "./conf";
import { appendCustomCss } from "togostanza-utils";

export default class Relate extends Stanza {
  css(key: string) {
    return getComputedStyle(this.element).getPropertyValue(key);
  }

  async render() {
    this.renderTemplate({ template: "stanza.template.hbs", parameters: {} });

    appendCustomCss(this, this.params["--togostanza-custom-css"]);

    const root = this.element.shadowRoot?.querySelector("main");

    if (!root) return;

    const folderURL = this.params["data-folder-url"] as string;
    const analysisID = this.params["data-id"] as string;
    const hammapURL = this.params["data-url"] as string;

    Promise.resolve().then(async () => {
      await document.fonts.ready;
      Conf.initialise({
        padding: getMarginsFromCSSString(
          this.css("--togostanza-canvas-padding")
        ),
        fontHeightPx: parseInt(
          this.css("--togostanza-fonts-font_size_primary")
        ),
      });

      const datasetSummaryEl =
        this.element.shadowRoot?.querySelector("#dataset-summary");
      if (!datasetSummaryEl) return;

      init({
        root,
        datasetSummaryEl: datasetSummaryEl as HTMLElement,
        folderURL,
        hapmapFileURL: hammapURL,
        id: analysisID,
      });
    });
  }
}

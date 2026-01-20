import { Dataset } from "./classes/Dataset";
import { DendrogramView } from "./classes/DendrogramView";
import { HaploEthnicities } from "./classes/HaploEthnicities";
import { HaplotypesView } from "./classes/HaplotypesView";
import { RegionSelectorView } from "./classes/RegionSelectorView";
import { StageView } from "./classes/StageView";
import { Conf } from "./conf";

export async function init({
  root,
  folderURL,
  hapmapFileURL,
  id,
}: {
  root: HTMLElement;
  folderURL: string;
  hapmapFileURL: string;
  id: string;
}) {
  await Dataset.initialise({ id, folderURL });
  await HaploEthnicities.initialise(hapmapFileURL);
  makeStyleSheet(root);
  const stageView = StageView.initialise(root);
  const haplotypesView = HaplotypesView.initialise(root);
  const regionSelectorView = RegionSelectorView.initialise(root);
  const dendrogramView = DendrogramView.initialise(root);
  Conf.instance.topPaddingOffset =
    regionSelectorView.getAdjustedScaleLabelHeight();
  regionSelectorView.updatePosition();

  dendrogramView.clear();

  // Draw mutations
  haplotypesView.draw();
  regionSelectorView.draw();
  // Define tree options in selector
  stageView.update();
}

function makeStyleSheet(root: Element) {
  const popnames = Array.from(HaploEthnicities.instance.data.values()).map(
    (d) => d.popname
  );
  // Create style sheet
  const colors = Object.fromEntries(
    popnames.map((popname, index) => [
      popname,
      `hsl(${(index * 360) / popnames.length}, 50%, 50%)`,
    ])
  );

  const existingStyle: HTMLStyleElement | null = (
    root.getRootNode() as ShadowRoot
  ).querySelector("style#relate");
  if (existingStyle) {
    existingStyle.remove();
  }
  const style = document.createElement("style");

  style.classList.add("ethnic");
  style.id = "relate";

  root.getRootNode()?.appendChild(style);
  const styleSheet = style.sheet;
  for (const popname in colors) {
    styleSheet?.insertRule(
      `path[data-ethnic="${popname}"] { fill: ${colors[popname]}; }`
    );
    styleSheet?.insertRule(
      `text > tspan[data-ethnic=${popname}] { fill: ${colors[popname]}; }`
    );
  }
}

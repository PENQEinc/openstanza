import { Margins } from "../../lib/utils";
import { Dataset } from "./classes/Dataset";
import { RegionSelectorView } from "./classes/RegionSelectorView";

type Params = { padding: Margins; fontHeightPx: number };
// Height (width after rotating) of the dendrogram
const CLUSTER_WIDTH = 300;
const MUTATION_WIDTH = 1.5;

class Conf {
  static #instance: Conf;

  static initialise(params: Params) {
    this.#instance = new Conf(params);
    return this.#instance;
  }

  static get instance() {
    return this.#instance;
  }

  #topPaddingOffset = 0;

  constructor(private params: Params) {}

  set topPaddingOffset(value: number) {
    this.#topPaddingOffset = value;
  }

  get haplotypeViewWidth() {
    return Math.max(8, this.params.fontHeightPx);
  }
  get haplotypeViewGap() {
    return 4;
  }
  get stagePadding() {
    return {
      ...this.params.padding,
      top: Math.max(this.params.padding.top, this.#topPaddingOffset),
    };
  }
  get clusterWidth() {
    return CLUSTER_WIDTH;
  }
  get mutationWidth() {
    return MUTATION_WIDTH * Dataset.instance.mutations.length;
  }
  get mutationTop() {
    return this.stagePadding.top;
  }
  get innerHeight() {
    return (
      this.haplotypeViewWidth * Dataset.instance.haplotypes.length +
      this.haplotypeViewGap * (Dataset.instance.haplotypes.length - 1)
    );
  }
  get stageHeight() {
    return this.stagePadding.top + this.innerHeight + this.stagePadding.bottom;
  }
  get stageWidth() {
    if (!RegionSelectorView.instance) {
      throw new Error("RegionSelectorView instance not found");
    }
    return (
      this.stagePadding.left +
      Math.max(this.mutationWidth, RegionSelectorView.instance.width) +
      this.clusterWidth +
      this.stagePadding.right
    );
  }

  get regions() {
    return Dataset.instance.ancestors.map((ancestor) => ancestor.region);
  }
}

export { Conf };
